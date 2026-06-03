import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import {
  bookingTargetLabel,
  findBookingRecipientIds,
  findVisibleBookingsForUser,
  normalizeBookingAudience,
} from '../../lib/booking-targeting.js';
import { departmentsMatch } from '../../lib/department-matching.js';
import { HttpError } from '../../lib/errors.js';
import { createUserNotifications } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { ensureBookingSchema } from '../../lib/room-booking-schema.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const bookingRouter = Router();

bookingRouter.use(requireAuth);

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

bookingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const bookings = await findVisibleBookingsForUser(req.auth!.userId);

    res.json(bookings.map((booking) => serializer.booking(booking)));
  }),
);

const createSchema = z.object({
  roomId: z.string().min(1),
  roomName: z.string().min(1),
  bookedBy: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  purpose: z.string().min(1),
  targetRole: z.enum(['all', 'admin', 'teacher', 'student']).default('all'),
  targetDepartment: z.string().optional().nullable(),
  targetSemester: z.coerce.number().int().positive().optional().nullable(),
  targetCourse: z.string().optional().nullable(),
});

const bookingDescription = (roomName: string, date: string, startTime: string, endTime: string, purpose: string): string =>
  `${roomName} booked on ${date} from ${startTime} to ${endTime}. ${purpose}`;

bookingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);
    await ensureBookingSchema();

    if (req.auth!.role === 'student') {
      throw new HttpError(403, 'Students can only view room bookings.');
    }

    if (toMinutes(payload.endTime) <= toMinutes(payload.startTime)) {
      throw new HttpError(400, 'End time must be after start time.');
    }

    const room = await prisma.room.findUnique({ where: { id: payload.roomId } });
    if (!room) {
      throw new HttpError(404, 'Room not found');
    }

    if (!room.available) {
      throw new HttpError(409, 'This room is currently marked unavailable.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, name: true, role: true, department: true },
    });

    if (!user) throw new HttpError(401, 'User not found');

    const departments = await prisma.department.findMany({ select: { name: true, code: true, course: true } });
    const requestedAudience = normalizeBookingAudience(payload);
    const isTeacher = req.auth!.role === 'teacher';

    if (
      isTeacher &&
      requestedAudience.targetDepartment &&
      !departmentsMatch(departments, requestedAudience.targetDepartment, user.department)
    ) {
      throw new HttpError(403, 'Teachers can book rooms only for their own department.');
    }

    const audience = isTeacher
      ? {
          ...requestedAudience,
          targetRole: 'STUDENT' as const,
          targetDepartment: requestedAudience.targetDepartment ?? user.department,
        }
      : requestedAudience;

    const date = new Date(`${payload.date}T00:00:00.000Z`);

    const sameDayBookings = await prisma.booking.findMany({
      where: {
        roomId: payload.roomId,
        date,
        status: { not: 'CANCELLED' },
      },
    });

    const hasConflict = sameDayBookings.some((booking) => {
      const existingStart = toMinutes(booking.startTime);
      const existingEnd = toMinutes(booking.endTime);
      const nextStart = toMinutes(payload.startTime);
      const nextEnd = toMinutes(payload.endTime);

      return nextStart < existingEnd && existingStart < nextEnd;
    });

    if (hasConflict) {
      throw new HttpError(409, 'Booking conflict: Room is already booked for this time range.');
    }

    const booking = await prisma.booking.create({
      data: {
        roomId: payload.roomId,
        roomName: room.name,
        bookedByName: user.name || payload.bookedBy,
        date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        purpose: payload.purpose,
        status: 'CONFIRMED',
        bookedById: req.auth!.userId,
        targetRole: audience.targetRole,
        targetDepartment: audience.targetDepartment,
        targetSemester: audience.targetSemester,
        targetCourse: audience.targetCourse,
      },
    });

    try {
      const recipientIds = await findBookingRecipientIds(booking);
      await createUserNotifications(
        recipientIds,
        `Room booked: ${booking.roomName}`,
        bookingDescription(booking.roomName, payload.date, booking.startTime, booking.endTime, booking.purpose),
        'INFO',
      );
    } catch (error) {
      console.error('Room booking notification fanout failed', {
        bookingId: booking.id,
        target: bookingTargetLabel(booking),
        bookedById: req.auth!.userId,
      }, error);
    }

    res.status(201).json(serializer.booking(booking));
  }),
);

bookingRouter.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await ensureBookingSchema();

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new HttpError(404, 'Booking not found');
    }

    if (req.auth!.role === 'student') {
      throw new HttpError(403, 'Students can only view room bookings.');
    }

    if (req.auth!.role !== 'admin' && booking.bookedById !== req.auth!.userId) {
      throw new HttpError(403, 'You can cancel only bookings created by you.');
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(serializer.booking(updated));
  }),
);
