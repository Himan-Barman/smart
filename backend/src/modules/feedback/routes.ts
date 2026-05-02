import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth);

feedbackRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { date: 'desc' },
    });

    res.json(feedbacks.map((feedback) => serializer.feedback(feedback)));
  }),
);

const createSchema = z.object({
  type: z.enum(['course', 'faculty', 'infrastructure', 'general']),
  subject: z.string().min(1),
  message: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  anonymous: z.boolean().default(false),
});

feedbackRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);

    const feedback = await prisma.feedback.create({
      data: {
        type: mapper.feedbackTypeFromClient(payload.type),
        subject: payload.subject,
        message: payload.message,
        rating: payload.rating,
        anonymous: payload.anonymous,
        status: 'PENDING',
        userId: req.auth!.userId,
      },
    });

    res.status(201).json(serializer.feedback(feedback));
  }),
);

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved']),
});

feedbackRouter.patch(
  '/:id/status',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = updateStatusSchema.parse(req.body);

    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback) {
      throw new HttpError(404, 'Feedback not found');
    }

    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      reviewed: 'REVIEWED',
      resolved: 'RESOLVED',
    };

    const updated = await prisma.feedback.update({
      where: { id },
      data: { status: statusMap[payload.status] },
    });

    res.json(serializer.feedback(updated));
  }),
);
