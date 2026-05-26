import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { hashPassword } from '../../lib/password.js';

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

/* ── Stats endpoint for dashboard metrics ── */
userRouter.get(
  '/stats',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const [
      totalPersons,
      totalUsers,
      students,
      teachers,
      verifiedCount,
      departmentCount,
      recentlyAdded,
    ] = await Promise.all([
      prisma.registeredPerson.count(),
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.registeredPerson.count({ where: { role: 'STUDENT' } }),
      prisma.registeredPerson.count({ where: { role: 'TEACHER' } }),
      // Count persons that have a linked user (verified)
      prisma.registeredPerson.count({
        where: { user: { isNot: null } },
      }),
      // Count distinct departments
      prisma.registeredPerson.groupBy({ by: ['department'] }).then((g) => g.length),
      // Recently added (last 7 days)
      prisma.registeredPerson.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalUsers: totalPersons,
      registeredAccounts: totalUsers,
      students,
      teachers,
      verified: verifiedCount,
      pendingVerification: totalPersons - verifiedCount,
      departmentCount,
      recentlyAdded,
    });
  }),
);

userRouter.get(
  '/registered-persons',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const persons = await prisma.registeredPerson.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true } } },
    });
    res.json(persons.map((person) => ({
      ...serializer.registeredPerson(person),
      isVerified: person.user !== null,
      createdAt: person.createdAt.toISOString(),
    })));
  }),
);

userRouter.post(
  '/registered-persons/bulk',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = z.array(personSchema).parse(req.body);

    let added = 0;
    const duplicates: string[] = [];
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

      if (existing) {
        duplicates.push(person.email);
        continue;
      }

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

    res.json({ count: added, duplicates });
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

/* ── Update registered person ── */
userRouter.patch(
  '/registered-persons/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const updates = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      department: z.string().min(1).optional(),
      semester: z.number().int().positive().optional(),
      course: z.string().optional(),
      phone: z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.registeredPerson.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Person not found');
    }

    const updated = await prisma.registeredPerson.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.email && { email: updates.email.toLowerCase() }),
        ...(updates.department && { department: updates.department }),
        ...(updates.semester !== undefined && { semester: updates.semester }),
        ...(updates.course !== undefined && { course: updates.course }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
      },
      include: { user: { select: { id: true } } },
    });

    res.json({
      ...serializer.registeredPerson(updated),
      isVerified: updated.user !== null,
      createdAt: updated.createdAt.toISOString(),
    });
  }),
);

/* ── Delete user account ── */
userRouter.delete(
  '/accounts/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpError(404, 'User account not found');
    }
    if (user.role === 'ADMIN') {
      throw new HttpError(403, 'Cannot delete admin accounts');
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  }),
);

/* ── Reset password ── */
userRouter.post(
  '/accounts/:id/reset-password',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    // Generate a temporary password
    const tempPassword = 'Smart@' + Math.random().toString(36).slice(2, 8);
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    res.json({ success: true, temporaryPassword: tempPassword });
  }),
);
