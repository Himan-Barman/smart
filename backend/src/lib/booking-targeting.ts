import type { Booking, Department, User } from '@prisma/client';
import { departmentsMatch, normalizeDepartmentKey } from './department-matching.js';
import { mapper } from './mappers.js';
import { prisma } from './prisma.js';
import { ensureBookingSchema } from './room-booking-schema.js';

export type BookingTargetRoleClient = 'all' | 'admin' | 'teacher' | 'student';
export type BookingTargetRole = 'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export type BookingAudienceInput = {
  targetRole?: BookingTargetRoleClient | null;
  targetDepartment?: string | null;
  targetSemester?: number | null;
  targetCourse?: string | null;
};

type BookingAudience = Pick<
  Booking,
  'targetRole' | 'targetDepartment' | 'targetSemester' | 'targetCourse' | 'bookedById'
>;

type BookingAudienceUser = Pick<User, 'id' | 'role' | 'department' | 'semester' | 'course'>;
type DepartmentAlias = Pick<Department, 'name' | 'code' | 'course'>;

const cleanText = (value?: string | null): string | null => {
  const next = value?.trim();
  return next ? next : null;
};

export const bookingTargetRoleFromClient = (value?: string | null): BookingTargetRole => {
  if (value === 'admin') return 'ADMIN';
  if (value === 'teacher') return 'TEACHER';
  if (value === 'student') return 'STUDENT';
  return 'ALL';
};

export const bookingTargetRoleToClient = (value?: string | null): BookingTargetRoleClient => {
  if (value === 'ADMIN') return 'admin';
  if (value === 'TEACHER' || value === 'FACULTY') return 'teacher';
  if (value === 'STUDENT') return 'student';
  return 'all';
};

export const normalizeBookingAudience = (input: BookingAudienceInput) => ({
  targetRole: bookingTargetRoleFromClient(input.targetRole),
  targetDepartment: cleanText(input.targetDepartment),
  targetSemester: input.targetSemester ?? null,
  targetCourse: cleanText(input.targetCourse),
});

const userTargetRole = (user: Pick<User, 'role'>): BookingTargetRole =>
  mapper.roleToClient(user.role).toUpperCase() as BookingTargetRole;

const roleLabel = (role: BookingTargetRoleClient): string => {
  if (role === 'admin') return 'Admins';
  if (role === 'teacher') return 'Teachers';
  if (role === 'student') return 'Students';
  return 'All users';
};

export const bookingTargetLabel = (booking: Pick<
  Booking,
  'targetRole' | 'targetDepartment' | 'targetSemester' | 'targetCourse'
>): string => {
  const role = bookingTargetRoleToClient(booking.targetRole);
  const details = [
    cleanText(booking.targetDepartment),
    booking.targetCourse ? cleanText(booking.targetCourse) : null,
    booking.targetSemester ? `Sem ${booking.targetSemester}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${roleLabel(role)} - ${details.join(' / ')}` : roleLabel(role);
};

export const bookingMatchesUser = (
  booking: BookingAudience,
  user: BookingAudienceUser,
  departments: DepartmentAlias[],
  options: { adminSeesAll?: boolean; includeOwner?: boolean } = {},
): boolean => {
  const role = userTargetRole(user);
  if (options.includeOwner !== false && booking.bookedById === user.id) return true;
  if (options.adminSeesAll !== false && role === 'ADMIN') return true;

  const targetRole = bookingTargetRoleFromClient(bookingTargetRoleToClient(booking.targetRole));
  if (targetRole !== 'ALL' && targetRole !== role) return false;

  if (booking.targetDepartment && !departmentsMatch(departments, user.department, booking.targetDepartment)) {
    return false;
  }

  if (booking.targetSemester && user.semester !== booking.targetSemester) {
    return false;
  }

  if (booking.targetCourse && normalizeDepartmentKey(user.course) !== normalizeDepartmentKey(booking.targetCourse)) {
    return false;
  }

  return true;
};

export const findVisibleBookingsForUser = async (userId: string): Promise<Booking[]> => {
  await ensureBookingSchema();

  const [user, departments, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, department: true, semester: true, course: true },
    }),
    prisma.department.findMany({ select: { name: true, code: true, course: true } }),
    prisma.booking.findMany({ orderBy: [{ date: 'desc' }, { startTime: 'asc' }] }),
  ]);

  if (!user) return [];
  return bookings.filter((booking) => bookingMatchesUser(booking, user, departments));
};

export const findBookingRecipientIds = async (booking: BookingAudience): Promise<string[]> => {
  await ensureBookingSchema();

  const [departments, users] = await Promise.all([
    prisma.department.findMany({ select: { name: true, code: true, course: true } }),
    prisma.user.findMany({
      select: {
        id: true,
        role: true,
        department: true,
        semester: true,
        course: true,
      },
    }),
  ]);

  return users
    .filter((user) => bookingMatchesUser(booking, user, departments, { adminSeesAll: false, includeOwner: false }))
    .map((user) => user.id);
};
