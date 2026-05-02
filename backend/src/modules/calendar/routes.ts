import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const calendarRouter = Router();

calendarRouter.use(requireAuth);

const listCalendar = async () => {
  const years = await prisma.academicYear.findMany({
    include: {
      semesters: {
        include: {
          events: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return years.map((year) => ({
    id: year.id,
    year: year.label,
    currentYear: year.isCurrent,
    semesters: year.semesters
      .sort((a, b) => a.semNum - b.semNum)
      .map((semester) => ({
        id: semester.id,
        num: semester.semNum,
        label: `Semester ${semester.semNum}`,
        startDate: semester.startDate.toISOString().split('T')[0],
        endDate: semester.endDate.toISOString().split('T')[0],
        events: semester.events
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
          .map((event) => ({
            id: event.id,
            title: event.title,
            startDate: event.startDate.toISOString().split('T')[0],
            endDate: event.endDate ? event.endDate.toISOString().split('T')[0] : undefined,
            type: event.type,
            description: event.description ?? undefined,
          })),
      })),
  }));
};

calendarRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listCalendar());
  }),
);

const eventSchema = z.object({
  semesterId: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  type: z.enum(['academic', 'exam', 'holiday', 'event', 'registration']),
  description: z.string().optional(),
});

calendarRouter.post(
  '/events',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = eventSchema.parse(req.body);

    const semester = await prisma.academicSemester.findUnique({ where: { id: payload.semesterId } });
    if (!semester) {
      throw new HttpError(404, 'Semester not found');
    }

    await prisma.calendarEvent.create({
      data: {
        semesterId: payload.semesterId,
        title: payload.title,
        description: payload.description,
        startDate: new Date(`${payload.startDate}T00:00:00.000Z`),
        endDate: payload.endDate ? new Date(`${payload.endDate}T00:00:00.000Z`) : null,
        type: payload.type,
      },
    });

    res.status(201).json(await listCalendar());
  }),
);

calendarRouter.patch(
  '/events/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = eventSchema.partial().parse(req.body);

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Event not found');
    }

    await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(payload.semesterId ? { semesterId: payload.semesterId } : {}),
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.startDate ? { startDate: new Date(`${payload.startDate}T00:00:00.000Z`) } : {}),
        ...(payload.endDate !== undefined ? { endDate: payload.endDate ? new Date(`${payload.endDate}T00:00:00.000Z`) : null } : {}),
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      },
    });

    res.json(await listCalendar());
  }),
);

calendarRouter.delete(
  '/events/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Event not found');
    }

    await prisma.calendarEvent.delete({ where: { id } });
    res.status(204).send();
  }),
);
