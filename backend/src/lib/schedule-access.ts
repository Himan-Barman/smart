import type { Prisma } from '@prisma/client';
import { mapper } from './mappers.js';
import { prisma } from './prisma.js';

type AuthRole = 'admin' | 'teacher' | 'student';

const orderBy: Prisma.ScheduleSlotOrderByWithRelationInput[] = [
  { day: 'asc' },
  { startTime: 'asc' },
];

export const findScheduleForUser = async (userId: string, authRole: AuthRole) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      department: true,
      employeeId: true,
      semester: true,
      course: true,
    },
  });

  if (!user) return [];

  const role = mapper.roleToClient(user.role) || authRole;

  if (role === 'admin') {
    return prisma.scheduleSlot.findMany({ orderBy });
  }

  if (role === 'student') {
    if (!user.semester || !user.course) return [];

    return prisma.scheduleSlot.findMany({
      where: {
        department: user.department,
        semester: user.semester,
        course: user.course,
      },
      orderBy,
    });
  }

  const teacherIds = [user.id, user.employeeId].filter((value): value is string => Boolean(value));

  return prisma.scheduleSlot.findMany({
    where: {
      OR: [
        { department: user.department },
        ...(teacherIds.length > 0 ? [{ facultyId: { in: teacherIds } }] : []),
      ],
    },
    orderBy,
  });
};
