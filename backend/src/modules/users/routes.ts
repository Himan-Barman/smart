import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const userRouter = Router();

userRouter.use(requireAuth);

const personSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['student', 'teacher']),
  department: z.string().min(1),
  enrollmentNo: z.string().optional(),
  employeeId: z.string().optional(),
  semester: z.number().int().positive().optional(),
  course: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

userRouter.get(
  '/registered-persons',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const persons = await prisma.registeredPerson.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(persons.map((person) => serializer.registeredPerson(person)));
  }),
);

userRouter.post(
  '/registered-persons/bulk',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = z.array(personSchema).parse(req.body);

    let added = 0;
    for (const person of payload) {
      const existing = await prisma.registeredPerson.findFirst({
        where: {
          OR: [
            { id: person.id },
            { email: person.email.toLowerCase() },
            ...(person.enrollmentNo ? [{ enrollmentNo: person.enrollmentNo }] : []),
            ...(person.employeeId ? [{ employeeId: person.employeeId }] : []),
          ],
        },
      });

      if (existing) continue;

      await prisma.registeredPerson.create({
        data: {
          id: person.id,
          name: person.name,
          email: person.email.toLowerCase(),
          role: mapper.roleFromClient(person.role),
          department: person.department,
          enrollmentNo: person.enrollmentNo,
          employeeId: person.employeeId,
          semester: person.semester,
          course: person.course,
          subjects: serializer.fromSubjectList(person.subjects),
          phone: person.phone,
        },
      });
      added += 1;
    }

    res.json({ count: added });
  }),
);

userRouter.post(
  '/registered-persons',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = personSchema.parse(req.body);

    const existing = await prisma.registeredPerson.findFirst({
      where: {
        OR: [
          { id: payload.id },
          { email: payload.email.toLowerCase() },
          ...(payload.enrollmentNo ? [{ enrollmentNo: payload.enrollmentNo }] : []),
          ...(payload.employeeId ? [{ employeeId: payload.employeeId }] : []),
        ],
      },
    });

    if (existing) {
      throw new HttpError(409, 'A person with same ID/email already exists.');
    }

    const person = await prisma.registeredPerson.create({
      data: {
        id: payload.id,
        name: payload.name,
        email: payload.email.toLowerCase(),
        role: mapper.roleFromClient(payload.role),
        department: payload.department,
        enrollmentNo: payload.enrollmentNo,
        employeeId: payload.employeeId,
        semester: payload.semester,
        course: payload.course,
        subjects: serializer.fromSubjectList(payload.subjects),
        phone: payload.phone,
      },
    });

    res.status(201).json(serializer.registeredPerson(person));
  }),
);

userRouter.delete(
  '/registered-persons/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.registeredPerson.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Registered person not found');
    }

    await prisma.registeredPerson.delete({ where: { id } });
    res.status(204).send();
  }),
);

userRouter.get(
  '/accounts',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(users.map((user) => serializer.user(user)));
  }),
);
