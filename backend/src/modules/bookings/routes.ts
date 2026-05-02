import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
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
  asyncHandler(async (_req, res) => {
    const bookings = await prisma.booking.findMany({
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    });

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
});

bookingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);

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
        roomName: payload.roomName,
        bookedByName: payload.bookedBy,
        date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        purpose: payload.purpose,
        status: 'PENDING',
        bookedById: req.auth!.userId,
      },
    });

    res.status(201).json(serializer.booking(booking));
  }),
);

bookingRouter.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new HttpError(404, 'Booking not found');
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(serializer.booking(updated));
  }),
);
