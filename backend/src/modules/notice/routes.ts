import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { departmentsMatch } from '../../lib/department-matching.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { createUserNotifications } from '../../lib/notifications.js';
import { ensureNoticeSchema } from '../../lib/notice-schema.js';
import {
  findNoticeRecipientIds,
  findVisibleNoticesForUser,
  normalizeNoticeAudience,
} from '../../lib/notice-targeting.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const noticeRouter = Router();

noticeRouter.use(requireAuth);

noticeRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const notices = await findVisibleNoticesForUser(req.auth!.userId);
    res.json(notices.map((notice) => serializer.notice(notice)));
  }),
);

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(['academic', 'event', 'urgent', 'general']),
  author: z.string().min(1),
  pinned: z.boolean().default(false),
  targetRole: z.enum(['all', 'admin', 'teacher', 'student']).default('all'),
  targetDepartment: z.string().optional().nullable(),
  targetSemester: z.coerce.number().int().positive().optional().nullable(),
  targetCourse: z.string().optional().nullable(),
});

const notificationTypeFor = (category: z.infer<typeof createSchema>['category']) =>
  category === 'urgent' ? 'WARNING' : 'INFO';

const notificationDescription = (content: string): string => {
  const clean = content.replace(/\s+/g, ' ').trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}...` : clean;
};

noticeRouter.post(
  '/',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);
    await ensureNoticeSchema();

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, name: true, role: true, department: true },
    });

    if (!user) throw new HttpError(401, 'User not found');

    const departments = await prisma.department.findMany({ select: { name: true, code: true, course: true } });
    const requestedAudience = normalizeNoticeAudience(payload);
    const isTeacher = req.auth!.role === 'teacher';

    if (isTeacher) {
      if (payload.targetRole && payload.targetRole !== 'student' && payload.targetRole !== 'all') {
        throw new HttpError(403, 'Teachers can send notices only to students.');
      }

      if (
        requestedAudience.targetDepartment &&
        !departmentsMatch(departments, requestedAudience.targetDepartment, user.department)
      ) {
        throw new HttpError(403, 'Teachers can send notices only for their own department.');
      }
    }

    const audience = isTeacher
      ? {
          ...requestedAudience,
          targetRole: 'STUDENT' as const,
          targetDepartment: requestedAudience.targetDepartment ?? user.department,
        }
      : requestedAudience;

    const notice = await prisma.notice.create({
      data: {
        title: payload.title,
        content: payload.content,
        category: mapper.noticeCategoryFromClient(payload.category),
        authorName: user.name || payload.author,
        pinned: payload.pinned,
        authorId: req.auth!.userId,
        targetRole: audience.targetRole,
        targetDepartment: audience.targetDepartment,
        targetSemester: audience.targetSemester,
        targetCourse: audience.targetCourse,
      },
    });

    try {
      const recipientIds = await findNoticeRecipientIds(notice);
      await createUserNotifications(
        recipientIds,
        `New notice: ${notice.title}`,
        notificationDescription(notice.content),
        notificationTypeFor(payload.category),
      );
    } catch (error) {
      console.error('Notice notification fanout failed', {
        noticeId: notice.id,
        authorId: req.auth!.userId,
        targetRole: notice.targetRole,
        targetDepartment: notice.targetDepartment,
        targetSemester: notice.targetSemester,
        targetCourse: notice.targetCourse,
      }, error);
    }

    res.status(201).json(serializer.notice(notice));
  }),
);

noticeRouter.delete(
  '/:id',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const notice = await prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      throw new HttpError(404, 'Notice not found');
    }

    if (req.auth!.role !== 'admin' && notice.authorId !== req.auth!.userId) {
      throw new HttpError(403, 'You can delete only notices authored by you.');
    }

    await prisma.notice.delete({ where: { id } });
    res.status(204).send();
  }),
);
