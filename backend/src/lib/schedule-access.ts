import type { ScheduleSlot } from '@prisma/client';
import { withDbReadRetry } from './db-read-retry.js';
import { departmentsMatch, normalizeDepartmentKey } from './department-matching.js';
import { mapper } from './mappers.js';
import { prisma } from './prisma.js';

type AuthRole = 'admin' | 'teacher' | 'student';

const findAllScheduleSlots = (): Promise<ScheduleSlot[]> =>
  prisma.$queryRaw<ScheduleSlot[]>`
    SELECT
      "id",
      "day",
      "startTime",
      "endTime",
      "subject",
      "courseCode",
      "faculty",
      "facultyId",
      "room",
      "type",
      "department",
      "semester",
      "course",
      "section",
      "createdAt",
      "updatedAt"
    FROM "ScheduleSlot"
    ORDER BY
      CASE "day"
        WHEN 'MONDAY' THEN 1
        WHEN 'TUESDAY' THEN 2
        WHEN 'WEDNESDAY' THEN 3
        WHEN 'THURSDAY' THEN 4
        WHEN 'FRIDAY' THEN 5
        WHEN 'SATURDAY' THEN 6
        ELSE 7
      END,
      "startTime" ASC
  `;

export const findScheduleForUser = async (userId: string, authRole: AuthRole) => {
  const [user, departments, slots] = await withDbReadRetry('schedule read', () =>
    Promise.all([
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
      findAllScheduleSlots(),
    ]),
  );

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
