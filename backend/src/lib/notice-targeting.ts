import type { Department, Notice, User } from '@prisma/client';
import { departmentsMatch, normalizeDepartmentKey } from './department-matching.js';
import { mapper } from './mappers.js';
import { ensureNoticeSchema } from './notice-schema.js';
import { prisma } from './prisma.js';

export type NoticeTargetRoleClient = 'all' | 'admin' | 'teacher' | 'student';
export type NoticeTargetRole = 'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export type NoticeAudienceInput = {
  targetRole?: NoticeTargetRoleClient | null;
  targetDepartment?: string | null;
  targetSemester?: number | null;
  targetCourse?: string | null;
};

type NoticeAudience = Pick<
  Notice,
  'targetRole' | 'targetDepartment' | 'targetSemester' | 'targetCourse' | 'authorId'
>;

type NoticeAudienceUser = Pick<User, 'id' | 'role' | 'department' | 'semester' | 'course'>;
type DepartmentAlias = Pick<Department, 'name' | 'code' | 'course'>;

const cleanText = (value?: string | null): string | null => {
  const next = value?.trim();
  return next ? next : null;
};

export const noticeTargetRoleFromClient = (value?: string | null): NoticeTargetRole => {
  if (value === 'admin') return 'ADMIN';
  if (value === 'teacher') return 'TEACHER';
  if (value === 'student') return 'STUDENT';
  return 'ALL';
};

export const noticeTargetRoleToClient = (value?: string | null): NoticeTargetRoleClient => {
  if (value === 'ADMIN') return 'admin';
  if (value === 'TEACHER' || value === 'FACULTY') return 'teacher';
  if (value === 'STUDENT') return 'student';
  return 'all';
};

export const normalizeNoticeAudience = (input: NoticeAudienceInput) => ({
  targetRole: noticeTargetRoleFromClient(input.targetRole),
  targetDepartment: cleanText(input.targetDepartment),
  targetSemester: input.targetSemester ?? null,
  targetCourse: cleanText(input.targetCourse),
});

const userTargetRole = (user: Pick<User, 'role'>): NoticeTargetRole =>
  mapper.roleToClient(user.role).toUpperCase() as NoticeTargetRole;

const roleLabel = (role: NoticeTargetRoleClient): string => {
  if (role === 'admin') return 'Admins';
  if (role === 'teacher') return 'Teachers';
  if (role === 'student') return 'Students';
  return 'All users';
};

export const noticeTargetLabel = (notice: Pick<
  Notice,
  'targetRole' | 'targetDepartment' | 'targetSemester' | 'targetCourse'
>): string => {
  const role = noticeTargetRoleToClient(notice.targetRole);
  const details = [
    cleanText(notice.targetDepartment),
    notice.targetCourse ? cleanText(notice.targetCourse) : null,
    notice.targetSemester ? `Sem ${notice.targetSemester}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${roleLabel(role)} - ${details.join(' / ')}` : roleLabel(role);
};

export const noticeMatchesUser = (
  notice: NoticeAudience,
  user: NoticeAudienceUser,
  departments: DepartmentAlias[],
  options: { adminSeesAll?: boolean; includeAuthor?: boolean } = {},
): boolean => {
  const role = userTargetRole(user);
  if (options.includeAuthor !== false && notice.authorId === user.id) return true;
  if (options.adminSeesAll !== false && role === 'ADMIN') return true;

  const targetRole = noticeTargetRoleFromClient(noticeTargetRoleToClient(notice.targetRole));
  if (targetRole !== 'ALL' && targetRole !== role) return false;

  if (notice.targetDepartment && !departmentsMatch(departments, user.department, notice.targetDepartment)) {
    return false;
  }

  if (notice.targetSemester && user.semester !== notice.targetSemester) {
    return false;
  }

  if (notice.targetCourse && normalizeDepartmentKey(user.course) !== normalizeDepartmentKey(notice.targetCourse)) {
    return false;
  }

  return true;
};

export const findVisibleNoticesForUser = async (userId: string): Promise<Notice[]> => {
  await ensureNoticeSchema();

  const [user, departments, notices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, department: true, semester: true, course: true },
    }),
    prisma.department.findMany({ select: { name: true, code: true, course: true } }),
    prisma.notice.findMany({ orderBy: [{ pinned: 'desc' }, { date: 'desc' }] }),
  ]);

  if (!user) return [];
  return notices.filter((notice) => noticeMatchesUser(notice, user, departments));
};

export const findNoticeRecipientIds = async (notice: NoticeAudience): Promise<string[]> => {
  await ensureNoticeSchema();

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
    .filter((user) => noticeMatchesUser(notice, user, departments, { adminSeesAll: false, includeAuthor: false }))
    .map((user) => user.id);
};
