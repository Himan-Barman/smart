import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { RegisteredPerson, ScheduleSlot, User } from '@prisma/client';
import { z } from 'zod';
import {
  QR_TTL_MS,
  findActiveAttendanceSessionForUser,
  findAttendanceSessionsForUser,
  getAttendanceUser,
  publicStudentId,
  scheduleCanBeManagedBy,
  sessionCanBeManagedBy,
  studentMatchesSession,
  type AttendanceUser,
} from '../../lib/attendance-access.js';
import { ensureAttendanceSchema } from '../../lib/attendance-schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { departmentsMatch, normalizeDepartmentKey } from '../../lib/department-matching.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);
attendanceRouter.use(asyncHandler(async (_req, _res, next) => {
  await ensureAttendanceSchema();
  next();
}));

const nowTime = (): string =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const nextQrExpiry = (): Date => new Date(Date.now() + QR_TTL_MS);

const randomQr = (sessionId?: string): string =>
  `SMARTCAMPUS|ATT|${sessionId ?? 'NEW'}|${Date.now()}|${randomUUID()}`;

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
  if (!payload.scheduleId) return payloadToScope(payload, user);

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
  return serializer.fromSubjectList([...history, qr].slice(-120)) ?? qr;
};

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
    const session = await findActiveAttendanceSessionForUser(req.auth!.userId, req.auth!.role);
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

    const qr = randomQr(existing.id);
    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: {
        currentQR: qr,
        qrHistory: appendQrHistory(existing.qrHistory, qr),
        qrExpiresAt: nextQrExpiry(),
      },
      include: { attendees: true },
    });

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
    if (!await studentMatchesSession(user, session)) throw new HttpError(403, 'This attendance session is not for your department and semester.');
    if (session.mode === 'MANUAL') throw new HttpError(400, 'This session is manual attendance only.');
    if (payload.qrCode !== session.currentQR) throw new HttpError(400, 'QR code expired or invalid');
    if (session.qrExpiresAt && session.qrExpiresAt.getTime() < Date.now()) throw new HttpError(400, 'QR code expired. Scan the latest QR.');

    const studentId = publicStudentId(user);
    const existing = session.attendees.find((attendee) => normalizeDepartmentKey(attendee.studentId) === normalizeDepartmentKey(studentId));
    if (existing?.status === 'PRESENT') throw new HttpError(409, 'Attendance already marked');

    const data = {
      studentId,
      studentName: user.name,
      timestamp: nowTime(),
      qrCode: payload.qrCode,
      verified: true,
      status: 'PRESENT',
      mode: 'QR',
      department: session.department,
      semester: session.semester,
      course: session.course,
      courseCode: session.courseCode,
      scheduleId: session.scheduleId,
      markedById: user.id,
      markedAt: new Date(),
      userId: user.id,
    };

    const attendee = existing
      ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
      : await prisma.attendanceRecord.create({ data: { sessionId: id, ...data } });

    res.json({
      success: true,
      attendee: serializer.attendanceSession(session, [attendee]).attendees[0],
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
          department: session.department,
          semester: session.semester,
          course: session.course,
          courseCode: session.courseCode,
          scheduleId: session.scheduleId,
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
          department: session.department,
          semester: session.semester,
          course: session.course,
          courseCode: session.courseCode,
          scheduleId: session.scheduleId,
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
    res.json(sessions.map((session) => serializer.attendanceSession(session, session.attendees)));
  }),
);
