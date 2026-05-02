import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const noticeRouter = Router();

noticeRouter.use(requireAuth);

noticeRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const notices = await prisma.notice.findMany({
      orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
    });

    res.json(notices.map((notice) => serializer.notice(notice)));
  }),
);

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(['academic', 'event', 'urgent', 'general']),
  author: z.string().min(1),
  pinned: z.boolean().default(false),
});

noticeRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);

    const notice = await prisma.notice.create({
      data: {
        title: payload.title,
        content: payload.content,
        category: mapper.noticeCategoryFromClient(payload.category),
        authorName: payload.author,
        pinned: payload.pinned,
        authorId: req.auth!.userId,
      },
    });

    res.status(201).json(serializer.notice(notice));
  }),
);

noticeRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const notice = await prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      throw new HttpError(404, 'Notice not found');
    }

    await prisma.notice.delete({ where: { id } });
    res.status(204).send();
  }),
);
