import type { ScheduleSlot } from '@prisma/client';
import { withDbReadRetry } from './db-read-retry.js';
import type { DepartmentIdentity } from './department-matching.js';
import { departmentsMatch, normalizeDepartmentKey } from './department-matching.js';
import { mapper } from './mappers.js';
import { queryRows } from './sql-read.js';

type AuthRole = 'admin' | 'teacher' | 'student';

type ScheduleUserScope = {
  id: string;
  role: string;
  department: string;
  employeeId: string | null;
  semester: number | null;
};

const findAllScheduleSlots = (): Promise<ScheduleSlot[]> =>
  queryRows<ScheduleSlot>(`
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
  `);

const findScheduleUserScope = async (userId: string): Promise<ScheduleUserScope | null> => {
  const users = await queryRows<ScheduleUserScope>(
    `
      SELECT
        "id",
        "role",
        "department",
        "employeeId",
        "semester"
      FROM "User"
      WHERE "id" = $1
      LIMIT 1
    `,
    [userId],
  );

  return users[0] ?? null;
};

const findDepartmentIdentities = (): Promise<DepartmentIdentity[]> =>
  queryRows<DepartmentIdentity>(`
    SELECT
      "name",
      "code",
      "course"
    FROM "Department"
  `);

export const findScheduleForUser = async (userId: string, authRole: AuthRole) => {
  const [user, departments, slots] = await withDbReadRetry('schedule read', () =>
    Promise.all([
      findScheduleUserScope(userId),
      findDepartmentIdentities(),
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
