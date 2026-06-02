import type { Prisma } from '@prisma/client';
import { departmentsMatch, normalizeDepartmentKey } from './department-matching.js';
import { mapper } from './mappers.js';
import { prisma } from './prisma.js';

type AuthRole = 'admin' | 'teacher' | 'student';

const orderBy: Prisma.ScheduleSlotOrderByWithRelationInput[] = [
  { day: 'asc' },
  { startTime: 'asc' },
];

export const findScheduleForUser = async (userId: string, authRole: AuthRole) => {
  const [user, departments, slots] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        department: true,
        employeeId: true,
        semester: true,
      },
    }),
    prisma.department.findMany({ select: { name: true, code: true, course: true } }),
    prisma.scheduleSlot.findMany({ orderBy }),
  ]);

  if (!user) return [];

  const role = mapper.roleToClient(user.role) || authRole;

  if (role === 'admin') {
    return slots;
  }

  if (role === 'student') {
    if (!user.semester) return [];

    return slots.filter((slot) =>
      departmentsMatch(departments, slot.department, user.department) &&
      slot.semester === user.semester,
    );
  }

  const teacherIds = [user.id, user.employeeId]
    .filter((value): value is string => Boolean(value))
    .map(normalizeDepartmentKey);

  return slots.filter((slot) =>
    departmentsMatch(departments, slot.department, user.department) ||
    teacherIds.includes(normalizeDepartmentKey(slot.facultyId)),
  );
};
