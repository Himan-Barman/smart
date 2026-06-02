import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { AttendanceSession, RegisteredPerson, ScheduleSlot, User } from '@prisma/client';
import { z } from 'zod';
import {
  QR_TTL_MS,
  findActiveAttendanceSessionForUser,
  findAttendanceSessionsForUser,
  getAttendanceUser,
  publicStudentId,
  roleOf,
  scheduleCanBeManagedBy,
  sessionCanBeManagedBy,
  studentMatchesSession,
  type AttendanceUser,
  type AttendanceSessionWithRecords,
} from '../../lib/attendance-access.js';
import { ensureAttendanceSchema } from '../../lib/attendance-schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { departmentsMatch, normalizeDepartmentKey } from '../../lib/department-matching.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const attendanceRouter = Router();

const QR_GRACE_MS = 10_000;
const QR_HISTORY_LIMIT = 6;
const CAMPUS_UTC_OFFSET_MINUTES = 330;
const CAMPUS_TIME_ZONE = 'Asia/Kolkata';
let attendanceSchemaWarningShown = false;

attendanceRouter.use(requireAuth);
attendanceRouter.use(asyncHandler(async (_req, _res, next) => {
  try {
    await ensureAttendanceSchema();
  } catch (error) {
    if (!attendanceSchemaWarningShown) {
      attendanceSchemaWarningShown = true;
      console.error('Attendance schema sync failed; continuing with existing schema', error);
    }
  }
  next();
}));

const nowTime = (): string =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const nextQrExpiry = (): Date => new Date(Date.now() + QR_TTL_MS);

const parseTimeToMinutes = (time?: string | null): number | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const campusDateParts = (date: Date): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
  };
};

const campusDateTimeToUtc = (
  parts: { year: number; month: number; day: number },
  minuteOfDay: number,
): Date => {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes) - CAMPUS_UTC_OFFSET_MINUTES * 60_000);
};

const scheduledEndForSession = (
  session: Pick<AttendanceSession, 'date'>,
  schedule: Pick<ScheduleSlot, 'endTime'>,
): Date | null => {
  const endMinutes = parseTimeToMinutes(schedule.endTime);
  if (endMinutes === null) return null;
  return campusDateTimeToUtc(campusDateParts(session.date), endMinutes);
};

const randomQr = (sessionId?: string): string =>
  `SMARTCAMPUS|ATT|${sessionId ?? 'NEW'}|${Date.now()}|${randomUUID()}`;

const qrIssuedAt = (qr: string): number | null => {
  const parts = qr.split('|');
  const issuedAt = Number(parts[3]);
  return Number.isFinite(issuedAt) && issuedAt > 0 ? issuedAt : null;
};

const qrCodesForSession = (session: Pick<AttendanceSession, 'currentQR' | 'qrHistory'>): string[] => [
  session.currentQR,
  ...(serializer.toSubjectList(session.qrHistory) ?? []),
].filter(Boolean);

const qrIsValidForSession = (
  session: Pick<AttendanceSession, 'currentQR' | 'qrHistory' | 'qrExpiresAt'>,
  scannedQr: string,
): boolean => {
  if (!qrCodesForSession(session).includes(scannedQr)) return false;

  const issuedAt = qrIssuedAt(scannedQr);
  if (issuedAt) return Date.now() <= issuedAt + QR_TTL_MS + QR_GRACE_MS;
  if (!session.qrExpiresAt) return scannedQr === session.currentQR;

  return Date.now() <= session.qrExpiresAt.getTime() + QR_GRACE_MS;
};

const sessionMode = (value?: string): 'qr' | 'manual' | 'hybrid' => {
  if (value === 'manual') return 'manual';
  if (value === 'hybrid') return 'hybrid';
  return 'qr';
};

const startSchema = z.object({
  scheduleId: z.string().optional(),
  mode: z.enum(['qr', 'manual', 'hybrid']).default('qr'),
  courseName: z.string().min(1).optional(),
  courseCode: z.string().min(1).optional(),
  faculty: z.string().min(1).optional(),
  facultyId: z.string().min(1).optional(),
  room: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  semester: z.number().int().positive().optional(),
  course: z.string().min(1).optional(),
  section: z.string().optional(),
});

const markSchema = z.object({
  qrCode: z.string().min(1),
});

const manualSchema = z.object({
  records: z.array(z.object({
    studentId: z.string().min(1),
    studentName: z.string().min(1).optional(),
    present: z.boolean(),
  })).min(1),
});

type AttendanceScope = {
  courseName: string;
  courseCode: string;
  faculty: string;
  facultyId?: string | null;
  department: string;
  semester?: number | null;
  course?: string | null;
  section?: string | null;
  room?: string | null;
  scheduleId?: string | null;
};

type RosterStudent = {
  id: string;
  name: string;
  email: string;
  department: string;
  enrollmentNo?: string | null;
  semester?: number | null;
  course?: string | null;
  hasAccount: boolean;
};

const getCurrentAttendanceUser = async (userId: string): Promise<AttendanceUser> => {
  const user = await getAttendanceUser(userId);
  if (!user) throw new HttpError(401, 'User not found');
  return user;
};

const scheduleToScope = (schedule: ScheduleSlot): AttendanceScope => ({
  courseName: schedule.subject,
  courseCode: schedule.courseCode,
  faculty: schedule.faculty,
  facultyId: schedule.facultyId,
  department: schedule.department,
  semester: schedule.semester,
  course: schedule.course,
  section: schedule.section,
  room: schedule.room,
  scheduleId: schedule.id,
});

const payloadToScope = (payload: z.infer<typeof startSchema>, user: AttendanceUser): AttendanceScope => {
  if (!payload.courseName || !payload.courseCode || !payload.department || !payload.semester || !payload.course) {
    throw new HttpError(400, 'Manual attendance must include course, department, and semester when no schedule is selected.');
  }

  return {
    courseName: payload.courseName,
    courseCode: payload.courseCode,
    faculty: payload.faculty ?? user.name,
    facultyId: payload.facultyId ?? user.employeeId ?? user.id,
    department: payload.department,
    semester: payload.semester,
    course: payload.course,
    section: payload.section,
    room: payload.room,
    scheduleId: payload.scheduleId,
  };
};

const resolveStartScope = async (
  payload: z.infer<typeof startSchema>,
  user: AttendanceUser,
): Promise<AttendanceScope> => {
  if (!payload.scheduleId) {
    if (roleOf(user) === 'teacher') {
      throw new HttpError(400, 'Teacher attendance must be linked to a scheduled class.');
    }
    return payloadToScope(payload, user);
  }

  const schedule = await prisma.scheduleSlot.findUnique({ where: { id: payload.scheduleId } });
  if (!schedule) throw new HttpError(404, 'Schedule slot not found');
  if (!scheduleCanBeManagedBy(user, schedule)) {
    throw new HttpError(403, 'You can start attendance only for your assigned classes.');
  }

  return scheduleToScope(schedule);
};

const closeExistingSessionsForScope = async (scope: AttendanceScope, teacherId: string): Promise<void> => {
  await prisma.attendanceSession.updateMany({
    where: {
      isActive: true,
      OR: [
        ...(scope.scheduleId ? [{ scheduleId: scope.scheduleId }] : []),
        {
          startedById: teacherId,
          courseCode: scope.courseCode,
          department: scope.department,
          semester: scope.semester ?? undefined,
        },
      ],
    },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
  });
};

const appendQrHistory = (historyValue: string | null, qr: string): string => {
  const history = serializer.toSubjectList(historyValue) ?? [];
  return serializer.fromSubjectList([...history, qr].slice(-QR_HISTORY_LIMIT)) ?? qr;
};

const autoStopSessionIfScheduledEndPassed = async <T extends Pick<
  AttendanceSession,
  'id' | 'isActive' | 'scheduleId' | 'date' | 'createdAt'
> & { attendees?: AttendanceSessionWithRecords['attendees'] }>(
  session: T,
): Promise<AttendanceSessionWithRecords | T> => {
  if (!session.isActive || !session.scheduleId) return session;

  const schedule = await prisma.scheduleSlot.findUnique({
    where: { id: session.scheduleId },
    select: { endTime: true },
  });

  if (!schedule) return session;

  const scheduledEnd = scheduledEndForSession(session, schedule);
  if (!scheduledEnd || scheduledEnd.getTime() > Date.now()) return session;

  const endedAt = new Date(Math.max(scheduledEnd.getTime(), session.createdAt.getTime()));
  return prisma.attendanceSession.update({
    where: { id: session.id },
    data: {
      isActive: false,
      endedAt,
      duration: Math.max(0, Math.round((endedAt.getTime() - session.createdAt.getTime()) / 60_000)),
    },
    include: { attendees: true },
  });
};

const rotateAttendanceQr = async (id: string) => {
  const existing = await prisma.attendanceSession.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Attendance session not found');

  const qr = randomQr(existing.id);
  return prisma.attendanceSession.update({
    where: { id },
    data: {
      currentQR: qr,
      qrHistory: appendQrHistory(existing.qrHistory, qr),
      qrExpiresAt: nextQrExpiry(),
    },
    include: { attendees: true },
  });
};

const academicYearFor = (date: Date): string => {
  const year = date.getFullYear();
  const startsThisYear = date.getMonth() >= 6;
  const start = startsThisYear ? year : year - 1;
  return `${start}-${start + 1}`;
};

const semesterYear = (semester?: number | null): number | null =>
  semester ? Math.ceil(semester / 2) : null;

const recordScopeFor = (session: Pick<
  AttendanceSession,
  'date' | 'department' | 'semester' | 'course' | 'courseName' | 'courseCode' | 'facultyId' | 'faculty' | 'room' | 'scheduleId'
>) => ({
  academicYear: academicYearFor(session.date),
  year: semesterYear(session.semester),
  department: session.department,
  semester: session.semester,
  course: session.course,
  subjectName: session.courseName,
  courseCode: session.courseCode,
  facultyId: session.facultyId,
  facultyName: session.faculty,
  room: session.room,
  scheduleId: session.scheduleId,
});

const studentRecordId = (student: Pick<User, 'id' | 'enrollmentNo'> | Pick<RegisteredPerson, 'id' | 'enrollmentNo'>): string =>
  student.enrollmentNo || student.id;

const getRosterForScope = async (scope: Pick<AttendanceScope, 'department' | 'semester'>): Promise<RosterStudent[]> => {
  if (!scope.semester) return [];

  const [departments, users, persons] = await Promise.all([
    prisma.department.findMany({ select: { name: true, code: true, course: true } }),
    prisma.user.findMany({
      where: { role: 'STUDENT', semester: scope.semester },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        enrollmentNo: true,
        semester: true,
        course: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.registeredPerson.findMany({
      where: { role: 'STUDENT', semester: scope.semester },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        enrollmentNo: true,
        semester: true,
        course: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const roster = new Map<string, RosterStudent>();
  const addStudent = (
    student: typeof users[number] | typeof persons[number],
    hasAccount: boolean,
  ) => {
    if (!departmentsMatch(departments, student.department, scope.department)) return;
    const id = studentRecordId(student);
    const key = normalizeDepartmentKey(id || student.email);
    const existing = roster.get(key);
    if (existing?.hasAccount && !hasAccount) return;

    roster.set(key, {
      id,
      name: student.name,
      email: student.email,
      department: student.department,
      enrollmentNo: student.enrollmentNo,
      semester: student.semester,
      course: student.course,
      hasAccount,
    });
  };

  persons.forEach((person) => addStudent(person, false));
  users.forEach((user) => addStudent(user, true));

  return Array.from(roster.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const findRosterStudent = async (
  scope: Pick<AttendanceScope, 'department' | 'semester'>,
  studentId: string,
): Promise<{ rosterStudent: RosterStudent; userId?: string | null }> => {
  const roster = await getRosterForScope(scope);
  const key = normalizeDepartmentKey(studentId);
  const rosterStudent = roster.find((student) =>
    normalizeDepartmentKey(student.id) === key ||
    normalizeDepartmentKey(student.enrollmentNo) === key ||
    normalizeDepartmentKey(student.email) === key,
  );

  if (!rosterStudent) {
    throw new HttpError(404, 'Student is not part of this department and semester.');
  }

  const account = await prisma.user.findFirst({
    where: {
      role: 'STUDENT',
      OR: [
        { id: rosterStudent.id },
        { enrollmentNo: rosterStudent.id },
        { email: rosterStudent.email },
      ],
    },
    select: { id: true },
  });

  return { rosterStudent, userId: account?.id };
};

attendanceRouter.get(
  '/session/active',
  asyncHandler(async (req, res) => {
    let session = await findActiveAttendanceSessionForUser(req.auth!.userId, req.auth!.role);
    if (session) {
      session = await autoStopSessionIfScheduledEndPassed(session) as AttendanceSessionWithRecords;
      if (!session.isActive) {
        res.json(null);
        return;
      }
    }

    if (
      session &&
      req.auth!.role !== 'student' &&
      session.isActive &&
      session.mode.toUpperCase() !== 'MANUAL' &&
      (!session.qrExpiresAt || session.qrExpiresAt.getTime() <= Date.now())
    ) {
      const user = await getCurrentAttendanceUser(req.auth!.userId);
      if (await sessionCanBeManagedBy(user, session)) {
        session = await rotateAttendanceQr(session.id);
      }
    }

    res.json(session ? serializer.attendanceSession(session, session.attendees) : null);
  }),
);

attendanceRouter.get(
  '/roster',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const user = await getCurrentAttendanceUser(req.auth!.userId);
    const scheduleId = typeof req.query.scheduleId === 'string' ? req.query.scheduleId : undefined;
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;

    let scope: AttendanceScope | null = null;
    if (scheduleId) {
      const schedule = await prisma.scheduleSlot.findUnique({ where: { id: scheduleId } });
      if (!schedule) throw new HttpError(404, 'Schedule slot not found');
      if (!scheduleCanBeManagedBy(user, schedule)) throw new HttpError(403, 'You cannot view this class roster.');
      scope = scheduleToScope(schedule);
    } else if (sessionId) {
      const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new HttpError(404, 'Attendance session not found');
      if (!await sessionCanBeManagedBy(user, session)) throw new HttpError(403, 'You cannot view this class roster.');
      scope = session;
    }

    if (!scope) throw new HttpError(400, 'scheduleId or sessionId is required.');
    res.json(await getRosterForScope(scope));
  }),
);

attendanceRouter.post(
  '/session/start',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const payload = startSchema.parse(req.body);
    const user = await getCurrentAttendanceUser(req.auth!.userId);
    const mode = sessionMode(payload.mode);
    const scope = await resolveStartScope(payload, user);

    await closeExistingSessionsForScope(scope, user.id);

    const seedQr = randomQr();
    const session = await prisma.attendanceSession.create({
      data: {
        courseName: scope.courseName,
        courseCode: scope.courseCode,
        faculty: scope.faculty,
        facultyId: scope.facultyId,
        department: scope.department,
        semester: scope.semester,
        course: scope.course,
        section: scope.section,
        mode: mode.toUpperCase(),
        date: new Date(),
        startTime: nowTime(),
        currentQR: seedQr,
        qrHistory: seedQr,
        qrExpiresAt: mode === 'manual' ? null : nextQrExpiry(),
        isActive: true,
        scheduleId: scope.scheduleId,
        room: scope.room,
        startedById: user.id,
      },
      include: { attendees: true },
    });

    res.status(201).json(serializer.attendanceSession(session, session.attendees));
  }),
);

attendanceRouter.post(
  '/session/:id/stop',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const user = await getCurrentAttendanceUser(req.auth!.userId);

    const existing = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!existing) throw new HttpError(404, 'Attendance session not found');
    if (!await sessionCanBeManagedBy(user, existing)) throw new HttpError(403, 'You cannot stop this session.');

    const session = await prisma.attendanceSession.update({
      where: { id },
      data: {
        isActive: false,
        endedAt: new Date(),
        duration: Math.max(0, Math.round((Date.now() - existing.createdAt.getTime()) / 60_000)),
      },
      include: { attendees: true },
    });

    res.json(serializer.attendanceSession(session, session.attendees));
  }),
);

attendanceRouter.post(
  '/session/:id/refresh',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const user = await getCurrentAttendanceUser(req.auth!.userId);

    const existing = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Attendance session not found');
    if (!await sessionCanBeManagedBy(user, existing)) throw new HttpError(403, 'You cannot refresh this session.');
    if (!existing.isActive) throw new HttpError(400, 'Attendance session is not active');

    const autoStopped = await autoStopSessionIfScheduledEndPassed(existing);
    if (!autoStopped.isActive) {
      const attendees = 'attendees' in autoStopped ? autoStopped.attendees : [];
      res.json(serializer.attendanceSession(autoStopped as AttendanceSession, attendees));
      return;
    }

    const updated = await rotateAttendanceQr(existing.id);

    res.json(serializer.attendanceSession(updated, updated.attendees));
  }),
);

attendanceRouter.post(
  '/session/:id/mark',
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = markSchema.parse(req.body);
    const user = await getCurrentAttendanceUser(req.auth!.userId);

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!session || !session.isActive) throw new HttpError(400, 'No active session');
    const autoStopped = await autoStopSessionIfScheduledEndPassed(session) as AttendanceSessionWithRecords;
    if (!autoStopped.isActive) throw new HttpError(400, 'This attendance session has ended.');
    if (!await studentMatchesSession(user, session)) throw new HttpError(403, 'This attendance session is not for your department and semester.');
    if (session.mode === 'MANUAL') throw new HttpError(400, 'This session is manual attendance only.');
    if (!qrIsValidForSession(autoStopped, payload.qrCode)) throw new HttpError(400, 'QR code expired or invalid. Scan the latest QR.');

    const studentId = publicStudentId(user);
    const existing = autoStopped.attendees.find((attendee) => normalizeDepartmentKey(attendee.studentId) === normalizeDepartmentKey(studentId));
    if (existing?.status === 'PRESENT') {
      res.json({
        success: true,
        message: 'Attendance already marked',
        attendee: serializer.attendanceSession(autoStopped, [existing]).attendees[0],
        session: serializer.attendanceSession(autoStopped, autoStopped.attendees),
      });
      return;
    }

    const data = {
      studentId,
      studentName: user.name,
      timestamp: nowTime(),
      qrCode: payload.qrCode,
      verified: true,
      status: 'PRESENT',
      mode: 'QR',
      ...recordScopeFor(autoStopped),
      markedById: user.id,
      markedAt: new Date(),
      userId: user.id,
    };

    const attendee = await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: id,
          studentId,
        },
      },
      update: data,
      create: { sessionId: id, ...data },
    });

    const updated = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { attendees: true },
    });

    res.json({
      success: true,
      attendee: serializer.attendanceSession(autoStopped, [attendee]).attendees[0],
      session: updated ? serializer.attendanceSession(updated, updated.attendees) : undefined,
    });
  }),
);

attendanceRouter.post(
  '/session/:id/manual',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = manualSchema.parse(req.body);
    const user = await getCurrentAttendanceUser(req.auth!.userId);

    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) throw new HttpError(404, 'Attendance session not found');
    if (!await sessionCanBeManagedBy(user, session)) throw new HttpError(403, 'You cannot mark this session.');
    if (!session.isActive) throw new HttpError(400, 'Attendance session is not active.');
    if (!session.scheduleId) throw new HttpError(400, 'Manual attendance must be linked to a scheduled class.');
    if (!['MANUAL', 'HYBRID'].includes(session.mode.toUpperCase())) {
      throw new HttpError(400, 'This session is not open for manual attendance.');
    }

    const schedule = await prisma.scheduleSlot.findUnique({ where: { id: session.scheduleId } });
    if (!schedule) throw new HttpError(404, 'Schedule slot not found');
    if (!scheduleCanBeManagedBy(user, schedule)) {
      throw new HttpError(403, 'You can mark attendance only for your assigned scheduled class.');
    }

    for (const record of payload.records) {
      const { rosterStudent, userId } = await findRosterStudent(session, record.studentId);
      const status = record.present ? 'PRESENT' : 'ABSENT';
      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: id,
            studentId: rosterStudent.id,
          },
        },
        update: {
          studentName: record.studentName ?? rosterStudent.name,
          timestamp: nowTime(),
          qrCode: null,
          verified: true,
          status,
          mode: 'MANUAL',
          ...recordScopeFor(session),
          markedById: user.id,
          markedAt: new Date(),
          userId,
        },
        create: {
          sessionId: id,
          studentId: rosterStudent.id,
          studentName: record.studentName ?? rosterStudent.name,
          timestamp: nowTime(),
          qrCode: null,
          verified: true,
          status,
          mode: 'MANUAL',
          ...recordScopeFor(session),
          markedById: user.id,
          markedAt: new Date(),
          userId,
        },
      });
    }

    const updated = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!updated) throw new HttpError(404, 'Attendance session not found');
    res.json(serializer.attendanceSession(updated, updated.attendees));
  }),
);

attendanceRouter.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await findAttendanceSessionsForUser(req.auth!.userId, req.auth!.role);
    const normalizedSessions: AttendanceSessionWithRecords[] = [];
    for (const session of sessions) {
      normalizedSessions.push(await autoStopSessionIfScheduledEndPassed(session) as AttendanceSessionWithRecords);
    }
    res.json(normalizedSessions.map((session) => serializer.attendanceSession(session, session.attendees)));
  }),
);
