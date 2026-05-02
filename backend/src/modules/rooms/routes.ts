import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const roomRouter = Router();

roomRouter.use(requireAuth);

roomRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
    res.json(rooms.map((room) => serializer.room(room)));
  }),
);
