import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const grievanceRouter = Router();

grievanceRouter.use(requireAuth);

grievanceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const role = req.auth!.role;
    const userId = req.auth!.userId;

    const where =
      role === 'student'
        ? { submitterId: userId }
        : role === 'teacher'
          ? { OR: [{ assignedTo: 'TEACHER' }, { submitterId: userId }] }
          : undefined;

    const grievances = await prisma.grievance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(grievances.map((grievance) => serializer.grievance(grievance)));
  }),
);

const createSchema = z.object({
  type: z.enum(['academic', 'infrastructure', 'administrative', 'harassment', 'other']),
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  submittedBy: z.string().min(1),
  submitterRole: z.enum(['student', 'teacher', 'admin']),
  assignedTo: z.enum(['teacher', 'admin']),
});

grievanceRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createSchema.parse(req.body);

    const grievance = await prisma.grievance.create({
      data: {
        type: mapper.grievanceTypeFromClient(payload.type),
        subject: payload.subject,
        description: payload.description,
        priority: mapper.grievancePriorityFromClient(payload.priority),
        submittedBy: payload.submittedBy,
        submitterRole: mapper.roleFromClient(payload.submitterRole),
        assignedTo: mapper.assignedToFromClient(payload.assignedTo),
        submitterId: req.auth!.userId,
      },
    });

    res.status(201).json(serializer.grievance(grievance));
  }),
);

const updateSchema = z.object({
  type: z.enum(['academic', 'infrastructure', 'administrative', 'harassment', 'other']).optional(),
  subject: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['submitted', 'in_progress', 'resolved', 'rejected']).optional(),
  assignedTo: z.enum(['teacher', 'admin']).optional(),
  resolution: z.string().nullable().optional(),
});

const grievanceStatusMap: Record<string, string> = {
  submitted: 'SUBMITTED',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED',
  rejected: 'REJECTED',
};

grievanceRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = updateSchema.parse(req.body);

    const grievance = await prisma.grievance.findUnique({ where: { id } });
    if (!grievance) {
      throw new HttpError(404, 'Grievance not found');
    }

    const isSubmitter = grievance.submitterId === req.auth!.userId;
    const isPrivileged = req.auth!.role === 'admin' || req.auth!.role === 'teacher';

    if (!isSubmitter && !isPrivileged) {
      throw new HttpError(403, 'Not allowed to update this grievance');
    }

    const updated = await prisma.grievance.update({
      where: { id },
      data: {
        ...(payload.type ? { type: mapper.grievanceTypeFromClient(payload.type) } : {}),
        ...(payload.subject ? { subject: payload.subject } : {}),
        ...(payload.description ? { description: payload.description } : {}),
        ...(payload.priority ? { priority: mapper.grievancePriorityFromClient(payload.priority) } : {}),
        ...(payload.status ? { status: grievanceStatusMap[payload.status] } : {}),
        ...(payload.assignedTo ? { assignedTo: mapper.assignedToFromClient(payload.assignedTo) } : {}),
        ...(payload.resolution !== undefined ? { resolution: payload.resolution ?? null } : {}),
      },
    });

    res.json(serializer.grievance(updated));
  }),
);
