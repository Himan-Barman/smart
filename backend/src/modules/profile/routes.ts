import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    res.json(serializer.user(user));
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

profileRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const payload = updateSchema.parse(req.body);

    if (Object.keys(payload).length === 0) {
      throw new HttpError(400, 'No changes provided');
    }

    const current = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!current) {
      throw new HttpError(404, 'User not found');
    }

    const nextEmail = payload.email?.toLowerCase();
    if (nextEmail && nextEmail !== current.email) {
      const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (existing) {
        throw new HttpError(409, 'Email already in use');
      }
    }

    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      },
    });

    res.json(serializer.user(user));
  }),
);
