import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const scheduleRouter = Router();

scheduleRouter.use(requireAuth);

scheduleRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const schedule = await prisma.scheduleSlot.findMany({
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    res.json(schedule.map((slot) => serializer.schedule(slot)));
  }),
);

const slotInputSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subject: z.string().min(1),
  courseCode: z.string().min(1),
  faculty: z.string().min(1),
  facultyId: z.string().min(1),
  room: z.string().min(1),
  type: z.enum(['lecture', 'lab', 'tutorial', 'seminar']),
  department: z.string().min(1),
  semester: z.number().int().min(1),
  course: z.string().min(1),
  section: z.string().optional(),
});

scheduleRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = slotInputSchema.parse(req.body);

    const slot = await prisma.scheduleSlot.create({
      data: {
        id: `SCH-${Date.now().toString(36).toUpperCase()}`,
        day: mapper.dayFromClient(payload.day),
        startTime: payload.startTime,
        endTime: payload.endTime,
        subject: payload.subject,
        courseCode: payload.courseCode,
        faculty: payload.faculty,
        facultyId: payload.facultyId,
        room: payload.room,
        type: mapper.scheduleTypeFromClient(payload.type),
        department: payload.department,
        semester: payload.semester,
        course: payload.course,
        section: payload.section,
      },
    });

    res.status(201).json(serializer.schedule(slot));
  }),
);

scheduleRouter.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = slotInputSchema.partial().parse(req.body);

    const existing = await prisma.scheduleSlot.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Schedule slot not found');
    }

    const slot = await prisma.scheduleSlot.update({
      where: { id },
      data: {
        ...(payload.day ? { day: mapper.dayFromClient(payload.day) } : {}),
        ...(payload.startTime ? { startTime: payload.startTime } : {}),
        ...(payload.endTime ? { endTime: payload.endTime } : {}),
        ...(payload.subject ? { subject: payload.subject } : {}),
        ...(payload.courseCode ? { courseCode: payload.courseCode } : {}),
        ...(payload.faculty ? { faculty: payload.faculty } : {}),
        ...(payload.facultyId ? { facultyId: payload.facultyId } : {}),
        ...(payload.room ? { room: payload.room } : {}),
        ...(payload.type ? { type: mapper.scheduleTypeFromClient(payload.type) } : {}),
        ...(payload.department ? { department: payload.department } : {}),
        ...(payload.semester ? { semester: payload.semester } : {}),
        ...(payload.course ? { course: payload.course } : {}),
        ...(payload.section !== undefined ? { section: payload.section } : {}),
      },
    });

    res.json(serializer.schedule(slot));
  }),
);

scheduleRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.scheduleSlot.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Schedule slot not found');
    }

    await prisma.scheduleSlot.delete({ where: { id } });
    res.status(204).send();
  }),
);
