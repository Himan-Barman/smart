import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const internshipRouter = Router();

internshipRouter.use(requireAuth);

internshipRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const internships = await prisma.internship.findMany({ orderBy: { deadline: 'asc' } });
    res.json(internships.map((internship) => serializer.internship(internship)));
  }),
);
