import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { withDbReadRetry } from '../../lib/db-read-retry.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = await withDbReadRetry('notification read', () =>
      prisma.notification.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { date: 'desc' },
      }),
    );

    res.json(notifications.map((notification) => serializer.notification(notification)));
  }),
);

notificationRouter.post(
  '/mark-all-read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.auth!.userId, isRead: false },
      data: { isRead: true },
    });

    res.status(204).send();
  }),
);

notificationRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.auth!.userId) {
      throw new HttpError(404, 'Notification not found');
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(204).send();
  }),
);
