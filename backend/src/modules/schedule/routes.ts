import { Router } from 'express';
import type { ScheduleSlot } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { createUserNotifications } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { findScheduleForUser } from '../../lib/schedule-access.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const scheduleRouter = Router();

scheduleRouter.use(requireAuth);

scheduleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schedule = await findScheduleForUser(req.auth!.userId, req.auth!.role);

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

type ManagedDepartment = {
  name: string;
  code: string;
  course: string;
  totalSemesters: number;
  semesters: Array<{
    semester: number;
    subjects: Array<{
      name: string;
      code: string;
    }>;
  }>;
};

const normalizeDepartmentKey = (value: string): string => value.trim().toLowerCase();
const normalizeOptionalKey = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const resolveManagedDepartment = async (value: string): Promise<ManagedDepartment> => {
  const departments = await prisma.department.findMany({
    select: {
      name: true,
      code: true,
      course: true,
      totalSemesters: true,
      semesters: {
        select: {
          semester: true,
          subjects: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });
  const department = departments.find((candidate) =>
    normalizeDepartmentKey(candidate.name) === normalizeDepartmentKey(value) ||
    normalizeDepartmentKey(candidate.code) === normalizeDepartmentKey(value),
  );

  if (!department) {
    throw new HttpError(400, 'Department must be selected from the Departments page list.');
  }

  return department;
};

const assertSemesterAllowed = (semester: number | undefined, department: ManagedDepartment): void => {
  if (semester && semester > department.totalSemesters) {
    throw new HttpError(400, `Semester must be within ${department.totalSemesters} semesters for ${department.name}.`);
  }
};

const timeToMinutes = (value: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const assertTimeAllowed = (startTime: string, endTime: string): void => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null) {
    throw new HttpError(400, 'Class time must use 24-hour HH:mm format.');
  }

  if (start >= end) {
    throw new HttpError(400, 'Class end time must be after start time.');
  }

  if (start < 8 * 60 || end > 18 * 60) {
    throw new HttpError(400, 'Class schedule must stay inside the academic day: 08:00 to 18:00.');
  }
};

const resolveDepartmentSubject = (
  department: ManagedDepartment,
  semester: number,
  subjectName: string,
  courseCode: string,
) => {
  const semesterData = department.semesters.find((entry) => entry.semester === semester);
  if (!semesterData) {
    throw new HttpError(400, `Semester ${semester} is not configured for ${department.name}. Add subjects on the Departments page first.`);
  }

  const subjectByCode = semesterData.subjects.find(
    (subject) => normalizeDepartmentKey(subject.code) === normalizeDepartmentKey(courseCode),
  );
  const subjectByName = semesterData.subjects.find(
    (subject) => normalizeDepartmentKey(subject.name) === normalizeDepartmentKey(subjectName),
  );
  const subject = subjectByCode ?? subjectByName;

  if (!subject) {
    throw new HttpError(400, 'Subject must be selected from the configured subjects for this department and semester.');
  }

  return subject;
};

type ScheduleWriteData = Omit<ScheduleSlot, 'id' | 'createdAt' | 'updatedAt'>;

const sectionsOverlap = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return true;
  return normalizeDepartmentKey(a) === normalizeDepartmentKey(b);
};

const hasTimeOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
  const startA = timeToMinutes(aStart);
  const endA = timeToMinutes(aEnd);
  const startB = timeToMinutes(bStart);
  const endB = timeToMinutes(bEnd);

  if (startA === null || endA === null || startB === null || endB === null) return false;
  return startA < endB && startB < endA;
};

const assertNoScheduleConflicts = async (candidate: ScheduleWriteData, ignoreId?: string): Promise<void> => {
  const sameDaySlots = await prisma.scheduleSlot.findMany({
    where: {
      day: candidate.day,
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
  });

  const conflict = sameDaySlots.find((slot) => {
    if (!hasTimeOverlap(candidate.startTime, candidate.endTime, slot.startTime, slot.endTime)) return false;

    const classGroupConflict =
      normalizeDepartmentKey(slot.department) === normalizeDepartmentKey(candidate.department) &&
      slot.semester === candidate.semester &&
      normalizeDepartmentKey(slot.course) === normalizeDepartmentKey(candidate.course) &&
      sectionsOverlap(slot.section, candidate.section);

    const facultyConflict = normalizeDepartmentKey(slot.facultyId) === normalizeDepartmentKey(candidate.facultyId);
    const roomConflict = normalizeOptionalKey(slot.room) === normalizeOptionalKey(candidate.room);

    return classGroupConflict || facultyConflict || roomConflict;
  });

  if (!conflict) return;

  throw new HttpError(
    409,
    `Schedule conflict with ${conflict.subject} (${conflict.startTime}-${conflict.endTime}) on ${mapper.dayToClient(conflict.day)}.`,
  );
};

const buildScheduleData = (
  payload: z.infer<typeof slotInputSchema>,
  department: ManagedDepartment,
): ScheduleWriteData => {
  assertSemesterAllowed(payload.semester, department);
  assertTimeAllowed(payload.startTime, payload.endTime);

  const subject = resolveDepartmentSubject(department, payload.semester, payload.subject, payload.courseCode);

  return {
    day: mapper.dayFromClient(payload.day),
    startTime: payload.startTime,
    endTime: payload.endTime,
    subject: subject.name,
    courseCode: subject.code,
    faculty: payload.faculty.trim(),
    facultyId: payload.facultyId.trim(),
    room: payload.room.trim(),
    type: mapper.scheduleTypeFromClient(payload.type),
    department: department.name,
    semester: payload.semester,
    course: department.course,
    section: payload.section?.trim() || null,
  };
};

const buildPatchScheduleData = (
  existing: ScheduleSlot,
  payload: Partial<z.infer<typeof slotInputSchema>>,
  department: ManagedDepartment,
): ScheduleWriteData => {
  const startTime = payload.startTime ?? existing.startTime;
  const endTime = payload.endTime ?? existing.endTime;
  const semester = payload.semester ?? existing.semester;
  const subjectName = payload.subject ?? existing.subject;
  const courseCode = payload.courseCode ?? existing.courseCode;

  assertSemesterAllowed(semester, department);
  assertTimeAllowed(startTime, endTime);

  const subject = resolveDepartmentSubject(department, semester, subjectName, courseCode);

  return {
    day: payload.day ? mapper.dayFromClient(payload.day) : existing.day,
    startTime,
    endTime,
    subject: subject.name,
    courseCode: subject.code,
    faculty: (payload.faculty ?? existing.faculty).trim(),
    facultyId: (payload.facultyId ?? existing.facultyId).trim(),
    room: (payload.room ?? existing.room).trim(),
    type: payload.type ? mapper.scheduleTypeFromClient(payload.type) : existing.type,
    department: department.name,
    semester,
    course: department.course,
    section: payload.section !== undefined ? (payload.section.trim() || null) : existing.section,
  };
};

const scheduleDescription = (slot: ScheduleSlot): string =>
  `${slot.subject} (${slot.courseCode}) on ${mapper.dayToClient(slot.day)} ${slot.startTime}-${slot.endTime}, ${slot.department} Semester ${slot.semester}`;

const findScheduleRecipients = async (slots: ScheduleSlot[]): Promise<string[]> => {
  if (slots.length === 0) return [];

  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      department: true,
      employeeId: true,
      semester: true,
      course: true,
    },
  });

  return users
    .filter((user) => {
      const role = mapper.roleToClient(user.role);
      if (role === 'admin') return false;

      return slots.some((slot) => {
        if (role === 'teacher') {
          return normalizeOptionalKey(user.id) === normalizeDepartmentKey(slot.facultyId) ||
            normalizeOptionalKey(user.employeeId) === normalizeDepartmentKey(slot.facultyId);
        }

        return normalizeDepartmentKey(user.department) === normalizeDepartmentKey(slot.department) &&
          user.semester === slot.semester &&
          normalizeOptionalKey(user.course) === normalizeDepartmentKey(slot.course);
      });
    })
    .map((user) => user.id);
};

const notifyScheduleChange = async (
  title: string,
  desc: string,
  slots: ScheduleSlot[],
): Promise<void> => {
  const recipients = await findScheduleRecipients(slots);
  await createUserNotifications(recipients, title, desc, 'INFO');
};

scheduleRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = slotInputSchema.parse(req.body);
    const department = await resolveManagedDepartment(payload.department);
    const data = buildScheduleData(payload, department);
    await assertNoScheduleConflicts(data);

    const slot = await prisma.scheduleSlot.create({
      data: {
        id: `SCH-${Date.now().toString(36).toUpperCase()}`,
        ...data,
      },
    });

    await notifyScheduleChange('New class scheduled', scheduleDescription(slot), [slot]);

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

    const department = await resolveManagedDepartment(payload.department ?? existing.department);
    const data = buildPatchScheduleData(existing, payload, department);
    await assertNoScheduleConflicts(data, id);

    const slot = await prisma.scheduleSlot.update({
      where: { id },
      data,
    });

    await notifyScheduleChange('Class schedule updated', scheduleDescription(slot), [existing, slot]);

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
    await notifyScheduleChange('Class removed from schedule', scheduleDescription(existing), [existing]);
    res.status(204).send();
  }),
);
