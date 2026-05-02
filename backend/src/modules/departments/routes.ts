import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { mapper } from '../../lib/mappers.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const departmentRouter = Router();

departmentRouter.use(requireAuth);

const getDepartmentList = async () => {
  const departments = await prisma.department.findMany({
    include: {
      semesters: {
        include: {
          subjects: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return departments.map((department) => serializer.department(department));
};

departmentRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getDepartmentList());
  }),
);

const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  course: z.string().min(1),
  totalSemesters: z.number().int().min(1).max(16),
  hod: z.string().min(1),
});

departmentRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = departmentSchema.parse(req.body);

    const existing = await prisma.department.findUnique({ where: { code: payload.code } });
    if (existing) {
      throw new HttpError(409, 'Department with this code already exists');
    }

    await prisma.department.create({
      data: {
        id: `DEPT-${Date.now().toString(36).toUpperCase()}`,
        name: payload.name,
        code: payload.code,
        course: payload.course,
        totalSemesters: payload.totalSemesters,
        hod: payload.hod,
      },
    });

    res.status(201).json(await getDepartmentList());
  }),
);

departmentRouter.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = departmentSchema.partial().parse(req.body);

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Department not found');
    }

    await prisma.department.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.code ? { code: payload.code } : {}),
        ...(payload.course ? { course: payload.course } : {}),
        ...(payload.totalSemesters ? { totalSemesters: payload.totalSemesters } : {}),
        ...(payload.hod ? { hod: payload.hod } : {}),
      },
    });

    res.json(await getDepartmentList());
  }),
);

departmentRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Department not found');
    }

    await prisma.department.delete({ where: { id } });
    res.status(204).send();
  }),
);

const subjectSchema = z.object({
  semester: z.number().int().min(1),
  subject: z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    credits: z.number().int().min(1).max(10),
    type: z.enum(['core', 'elective', 'lab', 'project']),
  }),
});

departmentRouter.post(
  '/:id/subjects',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const departmentId = req.params.id;
    const payload = subjectSchema.parse(req.body);

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      throw new HttpError(404, 'Department not found');
    }

    const semester = await prisma.departmentSemester.upsert({
      where: {
        departmentId_semester: {
          departmentId,
          semester: payload.semester,
        },
      },
      update: {},
      create: {
        departmentId,
        semester: payload.semester,
      },
    });

    await prisma.departmentSubject.create({
      data: {
        name: payload.subject.name,
        code: payload.subject.code,
        credits: payload.subject.credits,
        type: mapper.subjectTypeFromClient(payload.subject.type),
        semesterId: semester.id,
      },
    });

    res.status(201).json(await getDepartmentList());
  }),
);

departmentRouter.delete(
  '/:id/subjects/:subjectId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const departmentId = req.params.id;
    const subjectId = req.params.subjectId;

    const subject = await prisma.departmentSubject.findUnique({
      where: { id: subjectId },
      include: {
        semester: true,
      },
    });

    if (!subject || subject.semester.departmentId !== departmentId) {
      throw new HttpError(404, 'Subject not found for this department');
    }

    await prisma.departmentSubject.delete({ where: { id: subjectId } });

    const semesterSubjects = await prisma.departmentSubject.count({
      where: { semesterId: subject.semesterId },
    });

    if (semesterSubjects === 0) {
      await prisma.departmentSemester.delete({ where: { id: subject.semesterId } });
    }

    res.status(204).send();
  }),
);
