import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { getManagedUserData, getNonAdminUsers, isAdminRole } from '../../lib/managed-users.js';
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

type ManagedDepartment = {
  name: string;
  code: string;
  course: string;
  totalSemesters: number;
};

const normalizeDepartmentKey = (value: string): string => value.trim().toLowerCase();

const buildDepartmentLookup = async (): Promise<Map<string, ManagedDepartment>> => {
  const departments = await prisma.department.findMany({
    select: { name: true, code: true, course: true, totalSemesters: true },
  });
  const lookup = new Map<string, ManagedDepartment>();

  departments.forEach((department) => {
    lookup.set(normalizeDepartmentKey(department.name), department);
    lookup.set(normalizeDepartmentKey(department.code), department);
  });

  return lookup;
};

const findManagedDepartment = (
  lookup: Map<string, ManagedDepartment>,
  value: string,
): ManagedDepartment | undefined => lookup.get(normalizeDepartmentKey(value));

const resolveManagedDepartment = async (value: string): Promise<ManagedDepartment> => {
  const department = findManagedDepartment(await buildDepartmentLookup(), value);
  if (!department) {
    throw new HttpError(400, 'Department must be selected from the Departments page list.');
  }
  return department;
};

const assertSemesterAllowed = (semester: number | undefined, department: ManagedDepartment): void => {
  if (semester && semester > department.totalSemesters) {
    throw new HttpError(400, `Semester must be within ${department.totalSemesters} semesters for ${department.name}.`);
  }
};

/* ── Stats endpoint for dashboard metrics ── */
userRouter.get(
  '/stats',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const { managedPersons, users } = await getManagedUserData();
    const departmentCount = await prisma.department.count();

    const recentlyAddedThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const verifiedCount = managedPersons.filter((person) => person.isVerified).length;

    res.json({
      totalUsers: managedPersons.length,
      registeredAccounts: users.length,
      students: managedPersons.filter((person) => person.role === 'student').length,
      teachers: managedPersons.filter((person) => person.role === 'teacher').length,
      verified: verifiedCount,
      pendingVerification: managedPersons.length - verifiedCount,
      departmentCount,
      recentlyAdded: managedPersons.filter((person) =>
        person.createdAt && new Date(person.createdAt).getTime() >= recentlyAddedThreshold,
      ).length,
    });
  }),
);

userRouter.get(
  '/registered-persons',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const { managedPersons } = await getManagedUserData();
    res.json(managedPersons);
  }),
);

userRouter.post(
  '/registered-persons/bulk',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = z.array(personSchema).parse(req.body);

    let added = 0;
    const duplicates: string[] = [];
    const errors: string[] = [];
    const departmentLookup = await buildDepartmentLookup();
    for (const person of payload) {
      const department = findManagedDepartment(departmentLookup, person.department);
      if (!department) {
        errors.push(`${person.email}: department must match the Departments page list`);
        continue;
      }
      if (person.role === 'student' && person.semester && person.semester > department.totalSemesters) {
        errors.push(`${person.email}: semester must be within ${department.totalSemesters} semesters for ${department.name}`);
        continue;
      }

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
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: person.id },
            { email: person.email.toLowerCase() },
            ...(person.enrollmentNo ? [{ enrollmentNo: person.enrollmentNo }] : []),
            ...(person.employeeId ? [{ employeeId: person.employeeId }] : []),
          ],
        },
      });

      if (existing || existingUser) {
        duplicates.push(person.email);
        continue;
      }

      await prisma.registeredPerson.create({
        data: {
          id: person.id,
          name: person.name,
          email: person.email.toLowerCase(),
          role: mapper.roleFromClient(person.role),
          department: department.name,
          enrollmentNo: person.enrollmentNo,
          employeeId: person.employeeId,
          semester: person.semester,
          course: person.role === 'student' ? department.course : person.course,
          subjects: serializer.fromSubjectList(person.subjects),
          phone: person.phone,
        },
      });
      added += 1;
    }

    res.json({ count: added, duplicates, errors });
  }),
);

userRouter.post(
  '/registered-persons',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = personSchema.parse(req.body);
    const department = await resolveManagedDepartment(payload.department);
    if (payload.role === 'student') {
      assertSemesterAllowed(payload.semester, department);
    }

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
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: payload.id },
          { email: payload.email.toLowerCase() },
          ...(payload.enrollmentNo ? [{ enrollmentNo: payload.enrollmentNo }] : []),
          ...(payload.employeeId ? [{ employeeId: payload.employeeId }] : []),
        ],
      },
    });

    if (existing || existingUser) {
      throw new HttpError(409, 'A person with same ID/email already exists.');
    }

    const person = await prisma.registeredPerson.create({
      data: {
        id: payload.id,
        name: payload.name,
        email: payload.email.toLowerCase(),
        role: mapper.roleFromClient(payload.role),
        department: department.name,
        enrollmentNo: payload.enrollmentNo,
        employeeId: payload.employeeId,
        semester: payload.semester,
        course: payload.role === 'student' ? department.course : payload.course,
        subjects: serializer.fromSubjectList(payload.subjects),
        phone: payload.phone,
      },
    });

    res.status(201).json({
      ...serializer.registeredPerson(person),
      isVerified: false,
      createdAt: person.createdAt.toISOString(),
    });
  }),
);

userRouter.delete(
  '/registered-persons/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.registeredPerson.findUnique({ where: { id } });
    if (!existing) {
      res.status(204).send();
      return;
    }

    await prisma.registeredPerson.delete({ where: { id } });
    res.status(204).send();
  }),
);

userRouter.get(
  '/accounts',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const users = await getNonAdminUsers();
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
      subjects: z.array(z.string()).optional(),
      phone: z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.registeredPerson.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!existing) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || isAdminRole(user.role)) {
        throw new HttpError(404, 'Person not found');
      }

      if (updates.email && updates.email.toLowerCase() !== user.email.toLowerCase()) {
        const duplicatePerson = await prisma.registeredPerson.findUnique({
          where: { email: updates.email.toLowerCase() },
        });
        const duplicateUser = await prisma.user.findUnique({
          where: { email: updates.email.toLowerCase() },
        });

        if (duplicatePerson || duplicateUser) {
          throw new HttpError(409, 'Email already in use');
        }
      }

      const role = mapper.roleToClient(user.role);
      const department = updates.department ? await resolveManagedDepartment(updates.department) : null;
      let syncedCourse: string | undefined;
      if (role === 'student') {
        const activeDepartment = department ?? (
          updates.semester !== undefined || updates.course !== undefined
            ? await resolveManagedDepartment(user.department)
            : null
        );
        if (activeDepartment) {
          assertSemesterAllowed(updates.semester ?? user.semester ?? undefined, activeDepartment);
          syncedCourse = activeDepartment.course;
        }
      } else if (updates.course !== undefined) {
        syncedCourse = updates.course;
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.email && { email: updates.email.toLowerCase() }),
          ...(department && { department: department.name }),
          ...(updates.semester !== undefined && { semester: updates.semester }),
          ...(syncedCourse !== undefined && { course: syncedCourse }),
          ...(updates.subjects !== undefined && { subjects: serializer.fromSubjectList(updates.subjects) }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
        },
      });

      res.json({
        ...serializer.user(updatedUser),
        isVerified: true,
        createdAt: updatedUser.createdAt.toISOString(),
      });
      return;
    }

    if (updates.email && updates.email.toLowerCase() !== existing.email) {
      const duplicatePerson = await prisma.registeredPerson.findUnique({
        where: { email: updates.email.toLowerCase() },
      });
      const duplicateUser = await prisma.user.findUnique({
        where: { email: updates.email.toLowerCase() },
      });

      if (duplicatePerson || duplicateUser) {
        throw new HttpError(409, 'Email already in use');
      }
    }

    const department = updates.department ? await resolveManagedDepartment(updates.department) : null;
    let syncedCourse: string | undefined;
    if (existing.role === 'STUDENT') {
      const activeDepartment = department ?? (
        updates.semester !== undefined || updates.course !== undefined
          ? await resolveManagedDepartment(existing.department)
          : null
      );
      if (activeDepartment) {
        assertSemesterAllowed(updates.semester ?? existing.semester ?? undefined, activeDepartment);
        syncedCourse = activeDepartment.course;
      }
    } else if (updates.course !== undefined) {
      syncedCourse = updates.course;
    }

    const updated = await prisma.registeredPerson.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.email && { email: updates.email.toLowerCase() }),
        ...(department && { department: department.name }),
        ...(updates.semester !== undefined && { semester: updates.semester }),
        ...(syncedCourse !== undefined && { course: syncedCourse }),
        ...(updates.subjects !== undefined && { subjects: serializer.fromSubjectList(updates.subjects) }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
      },
      include: { user: { select: { id: true } } },
    });

    if (existing.user) {
      await prisma.user.update({
        where: { id: existing.user.id },
        data: {
          name: updated.name,
          email: updated.email,
          department: updated.department,
          semester: updated.semester,
          course: updated.course,
          subjects: updated.subjects,
          phone: updated.phone,
        },
      });
    }

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
    if (isAdminRole(user.role)) {
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
