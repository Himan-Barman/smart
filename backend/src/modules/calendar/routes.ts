import { Router } from 'express';
import type { AcademicSemester, CalendarEvent } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { WEST_BENGAL_GOVERNMENT_HOLIDAYS_2026 } from '../../lib/government-holidays.js';
import { notifyAllNonAdminUsers } from '../../lib/notifications.js';
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
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['academic', 'exam', 'holiday', 'event', 'registration']),
  description: z.string().optional(),
});

const semesterSchema = z.object({
  semNum: z.number().int().min(1).max(12),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const academicYearSchema = z.object({
  label: z.string().min(4),
  isCurrent: z.boolean().optional(),
  semesters: z.array(semesterSchema).min(1),
});

const academicYearUpdateSchema = z.object({
  label: z.string().min(4).optional(),
  isCurrent: z.boolean().optional(),
  semesters: z.array(semesterSchema).min(1).optional(),
});

const dateOnly = (date: Date): string => date.toISOString().split('T')[0] ?? '';

const parseDateOnly = (value: string, label: string): Date => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dateOnly(date) !== value) {
    throw new HttpError(400, `${label} must be a valid date in YYYY-MM-DD format.`);
  }
  return date;
};

const getSemester = async (semesterId: string): Promise<AcademicSemester> => {
  const semester = await prisma.academicSemester.findUnique({ where: { id: semesterId } });
  if (!semester) {
    throw new HttpError(404, 'Semester not found');
  }
  return semester;
};

const assertEventDatesAllowed = (semester: AcademicSemester, startDate: Date, endDate: Date | null): void => {
  const effectiveEnd = endDate ?? startDate;
  if (startDate.getTime() > effectiveEnd.getTime()) {
    throw new HttpError(400, 'Event end date must be the same as or after the start date.');
  }

  if (startDate.getTime() < semester.startDate.getTime() || effectiveEnd.getTime() > semester.endDate.getTime()) {
    throw new HttpError(
      400,
      `Event dates must stay inside Semester ${semester.semNum}: ${dateOnly(semester.startDate)} to ${dateOnly(semester.endDate)}.`,
    );
  }
};

const assertSemesterDatesAllowed = (startDate: Date, endDate: Date): void => {
  if (startDate.getTime() > endDate.getTime()) {
    throw new HttpError(400, 'Semester end date must be the same as or after the start date.');
  }
};

const calendarEventDescription = (event: Pick<CalendarEvent, 'title' | 'startDate' | 'endDate' | 'type'>): string => {
  const range = event.endDate ? `${dateOnly(event.startDate)} to ${dateOnly(event.endDate)}` : dateOnly(event.startDate);
  return `${event.title} (${event.type.toLowerCase()}) - ${range}`;
};

const syncGovernmentHolidays = async (): Promise<{ created: number; existing: number; skipped: number }> => {
  const semesters = await prisma.academicSemester.findMany();
  let created = 0;
  let existing = 0;
  let skipped = 0;

  for (const holiday of WEST_BENGAL_GOVERNMENT_HOLIDAYS_2026) {
    const holidayDate = parseDateOnly(holiday.date, 'Holiday date');
    const semester = semesters.find(
      (candidate) =>
        holidayDate.getTime() >= candidate.startDate.getTime() &&
        holidayDate.getTime() <= candidate.endDate.getTime(),
    );

    if (!semester) {
      skipped += 1;
      continue;
    }

    const current = await prisma.calendarEvent.findFirst({
      where: {
        semesterId: semester.id,
        title: holiday.title,
        startDate: holidayDate,
        type: 'holiday',
      },
    });

    if (current) {
      existing += 1;
      if (current.description !== holiday.description) {
        await prisma.calendarEvent.update({
          where: { id: current.id },
          data: { description: holiday.description },
        });
      }
      continue;
    }

    await prisma.calendarEvent.create({
      data: {
        semesterId: semester.id,
        title: holiday.title,
        description: holiday.description,
        startDate: holidayDate,
        endDate: null,
        type: 'holiday',
      },
    });
    created += 1;
  }

  return { created, existing, skipped };
};

calendarRouter.post(
  '/years',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = academicYearSchema.parse(req.body);
    const semesters = payload.semesters.map((semester) => {
      const startDate = parseDateOnly(semester.startDate, 'Semester start date');
      const endDate = parseDateOnly(semester.endDate, 'Semester end date');
      assertSemesterDatesAllowed(startDate, endDate);
      return { ...semester, startDate, endDate };
    });

    if (payload.isCurrent ?? true) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }

    await prisma.academicYear.create({
      data: {
        id: `AY-${Date.now().toString(36).toUpperCase()}`,
        label: payload.label,
        startDate: semesters.reduce((min, semester) => (semester.startDate < min ? semester.startDate : min), semesters[0]!.startDate),
        endDate: semesters.reduce((max, semester) => (semester.endDate > max ? semester.endDate : max), semesters[0]!.endDate),
        isCurrent: payload.isCurrent ?? true,
        semesters: {
          create: semesters.map((semester) => ({
            semNum: semester.semNum,
            startDate: semester.startDate,
            endDate: semester.endDate,
          })),
        },
      },
    });

    await notifyAllNonAdminUsers('Academic session added', `Academic year ${payload.label} has been added.`, 'INFO');

    res.status(201).json(await listCalendar());
  }),
);

calendarRouter.patch(
  '/years/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = academicYearUpdateSchema.parse(req.body);
    const existing = await prisma.academicYear.findUnique({ where: { id }, include: { semesters: true } });

    if (!existing) {
      throw new HttpError(404, 'Academic year not found');
    }

    const semesters = payload.semesters?.map((semester) => {
      const startDate = parseDateOnly(semester.startDate, 'Semester start date');
      const endDate = parseDateOnly(semester.endDate, 'Semester end date');
      assertSemesterDatesAllowed(startDate, endDate);
      return { ...semester, startDate, endDate };
    });

    if (payload.isCurrent) {
      await prisma.academicYear.updateMany({ where: { id: { not: id } }, data: { isCurrent: false } });
    }

    if (semesters) {
      for (const semester of semesters) {
        await prisma.academicSemester.upsert({
          where: { yearId_semNum: { yearId: id, semNum: semester.semNum } },
          update: {
            startDate: semester.startDate,
            endDate: semester.endDate,
          },
          create: {
            yearId: id,
            semNum: semester.semNum,
            startDate: semester.startDate,
            endDate: semester.endDate,
          },
        });
      }
    }

    const nextSemesters = semesters ?? existing.semesters;

    await prisma.academicYear.update({
      where: { id },
      data: {
        ...(payload.label ? { label: payload.label } : {}),
        ...(payload.isCurrent !== undefined ? { isCurrent: payload.isCurrent } : {}),
        startDate: nextSemesters.reduce((min, semester) => (semester.startDate < min ? semester.startDate : min), nextSemesters[0]!.startDate),
        endDate: nextSemesters.reduce((max, semester) => (semester.endDate > max ? semester.endDate : max), nextSemesters[0]!.endDate),
      },
    });

    await notifyAllNonAdminUsers('Academic session updated', `Academic year ${payload.label ?? existing.label} has been updated.`, 'INFO');

    res.json(await listCalendar());
  }),
);

calendarRouter.delete(
  '/years/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.academicYear.findUnique({ where: { id } });

    if (!existing) {
      throw new HttpError(404, 'Academic year not found');
    }

    await prisma.academicYear.delete({ where: { id } });
    await notifyAllNonAdminUsers('Academic session removed', `Academic year ${existing.label} has been removed.`, 'WARNING');
    res.status(204).send();
  }),
);

calendarRouter.post(
  '/events',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = eventSchema.parse(req.body);

    const semester = await getSemester(payload.semesterId);
    const startDate = parseDateOnly(payload.startDate, 'Start date');
    const endDate = payload.endDate ? parseDateOnly(payload.endDate, 'End date') : null;
    assertEventDatesAllowed(semester, startDate, endDate);

    const event = await prisma.calendarEvent.create({
      data: {
        semesterId: payload.semesterId,
        title: payload.title,
        description: payload.description,
        startDate,
        endDate,
        type: payload.type,
      },
    });

    await notifyAllNonAdminUsers('Academic calendar updated', calendarEventDescription(event), 'INFO');

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

    const semester = await getSemester(payload.semesterId ?? existing.semesterId);
    const startDate = payload.startDate ? parseDateOnly(payload.startDate, 'Start date') : existing.startDate;
    const endDate = payload.endDate !== undefined
      ? (payload.endDate ? parseDateOnly(payload.endDate, 'End date') : null)
      : existing.endDate;
    assertEventDatesAllowed(semester, startDate, endDate);

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(payload.semesterId ? { semesterId: payload.semesterId } : {}),
        ...(payload.title ? { title: payload.title } : {}),
        startDate,
        endDate,
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      },
    });

    await notifyAllNonAdminUsers('Academic calendar updated', calendarEventDescription(event), 'INFO');

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
    await notifyAllNonAdminUsers('Academic calendar event removed', calendarEventDescription(existing), 'WARNING');
    res.status(204).send();
  }),
);

calendarRouter.post(
  '/government-holidays/sync',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const result = await syncGovernmentHolidays();

    if (result.created > 0) {
      await notifyAllNonAdminUsers(
        'Government holidays synced',
        `${result.created} West Bengal government holidays were added to the academic calendar.`,
        'SUCCESS',
      );
    }

    res.json({
      ...result,
      calendar: await listCalendar(),
    });
  }),
);
