import type { AttendanceRecord, AttendanceSession, Prisma, ScheduleSlot } from '@prisma/client';
import { departmentsMatch, normalizeDepartmentKey } from './department-matching.js';
import { mapper } from './mappers.js';
import { prisma } from './prisma.js';

export const QR_TTL_MS = 5_000;

export const attendanceUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  enrollmentNo: true,
  employeeId: true,
  semester: true,
  course: true,
} as const;

export type AttendanceUser = Prisma.UserGetPayload<{ select: typeof attendanceUserSelect }>;
export type AttendanceSessionWithRecords = AttendanceSession & { attendees: AttendanceRecord[] };

const sessionWithAttendees = {
  attendees: true,
} satisfies Prisma.AttendanceSessionInclude;

export const publicStudentId = (user: Pick<AttendanceUser, 'id' | 'enrollmentNo'>): string =>
  user.enrollmentNo || user.id;

export const roleOf = (user: Pick<AttendanceUser, 'role'>): 'admin' | 'teacher' | 'student' =>
  mapper.roleToClient(user.role);

export const getAttendanceUser = (userId: string): Promise<AttendanceUser | null> =>
  prisma.user.findUnique({ where: { id: userId }, select: attendanceUserSelect });

const getDepartments = () => prisma.department.findMany({ select: { name: true, code: true, course: true } });

const teacherIds = (user: Pick<AttendanceUser, 'id' | 'employeeId'>): string[] =>
  [user.id, user.employeeId].filter((value): value is string => Boolean(value)).map(normalizeDepartmentKey);

export const studentMatchesSession = async (
  user: AttendanceUser,
  session: Pick<AttendanceSession, 'department' | 'semester'>,
): Promise<boolean> => {
  if (roleOf(user) !== 'student' || !user.semester || !session.semester) return false;
  const departments = await getDepartments();
  return departmentsMatch(departments, user.department, session.department) && user.semester === session.semester;
};

export const scheduleCanBeManagedBy = (
  user: AttendanceUser,
  schedule: Pick<ScheduleSlot, 'facultyId' | 'department'>,
): boolean => {
  const role = roleOf(user);
  if (role === 'admin') return true;
  if (role !== 'teacher') return false;
  return teacherIds(user).includes(normalizeDepartmentKey(schedule.facultyId));
};

export const sessionCanBeManagedBy = async (
  user: AttendanceUser,
  session: Pick<AttendanceSession, 'startedById' | 'facultyId' | 'department'>,
): Promise<boolean> => {
  const role = roleOf(user);
  if (role === 'admin') return true;
  if (role !== 'teacher') return false;
  if (session.startedById === user.id) return true;
  if (session.facultyId && teacherIds(user).includes(normalizeDepartmentKey(session.facultyId))) return true;

  const departments = await getDepartments();
  return departmentsMatch(departments, user.department, session.department);
};

export const findActiveAttendanceSessionForUser = async (
  userId: string,
  authRole: 'admin' | 'teacher' | 'student',
): Promise<AttendanceSessionWithRecords | null> => {
  const user = await getAttendanceUser(userId);
  if (!user) return null;

  const role = roleOf(user) || authRole;
  const sessions = await prisma.attendanceSession.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: sessionWithAttendees,
  });

  if (role === 'admin') return sessions[0] ?? null;

  for (const session of sessions) {
    if (role === 'teacher' && await sessionCanBeManagedBy(user, session)) return session;
    if (role === 'student' && await studentMatchesSession(user, session)) return session;
  }

  return null;
};

export const findAttendanceSessionsForUser = async (
  userId: string,
  authRole: 'admin' | 'teacher' | 'student',
  take = 80,
): Promise<AttendanceSessionWithRecords[]> => {
  const user = await getAttendanceUser(userId);
  if (!user) return [];

  const role = roleOf(user) || authRole;
  const sessions = await prisma.attendanceSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: sessionWithAttendees,
    take,
  });

  if (role === 'admin') return sessions;

  const visible: AttendanceSessionWithRecords[] = [];
  for (const session of sessions) {
    if (role === 'teacher' && await sessionCanBeManagedBy(user, session)) {
      visible.push(session);
    } else if (role === 'student') {
      const hasRecord = session.attendees.some((record) =>
        record.userId === user.id || normalizeDepartmentKey(record.studentId) === normalizeDepartmentKey(publicStudentId(user)),
      );
      if (hasRecord || await studentMatchesSession(user, session)) {
        visible.push(session);
      }
    }
  }

  return visible;
};
