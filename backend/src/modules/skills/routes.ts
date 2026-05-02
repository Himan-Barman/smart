import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const skillsRouter = Router();

skillsRouter.use(requireAuth);

skillsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const skills = await prisma.skill.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { name: 'asc' },
    });

    res.json(skills.map((skill) => serializer.skill(skill)));
  }),
);

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
});

skillsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);

    const existing = await prisma.skill.findFirst({
      where: {
        userId: req.auth!.userId,
        name: payload.name,
      },
    });

    if (existing) {
      throw new HttpError(409, 'Skill already exists');
    }

    const skill = await prisma.skill.create({
      data: {
        name: payload.name,
        category: payload.category,
        level: mapper.skillLevelFromClient(payload.level),
        userId: req.auth!.userId,
      },
    });

    res.status(201).json(serializer.skill(skill));
  }),
);

skillsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      throw new HttpError(404, 'Skill not found');
    }

    if (skill.userId !== req.auth!.userId) {
      throw new HttpError(403, 'Cannot remove another user skill');
    }

    await prisma.skill.delete({ where: { id } });
    res.status(204).send();
  }),
);
