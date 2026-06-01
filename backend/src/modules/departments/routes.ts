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

const departmentSubjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  credits: z.number().int().min(1).max(10),
  type: z.enum(['core', 'elective', 'lab', 'project']),
});

const departmentSemesterSchema = z.object({
  semester: z.number().int().min(1),
  subjects: z.array(departmentSubjectSchema).default([]),
});

const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  course: z.string().min(1),
  totalSemesters: z.number().int().min(1).max(16),
  hod: z.string().min(1),
  semesters: z.array(departmentSemesterSchema).optional(),
});

type DepartmentPayload = z.infer<typeof departmentSchema>;
const departmentUpdateSchema = departmentSchema.partial();
type DepartmentUpdatePayload = z.infer<typeof departmentUpdateSchema>;

const normalizeDepartmentPayload = (payload: DepartmentPayload): DepartmentPayload => ({
  ...payload,
  name: payload.name.trim(),
  code: payload.code.trim().toUpperCase(),
  course: payload.course.trim(),
  hod: payload.hod.trim(),
  semesters: payload.semesters?.map((semester) => ({
    semester: semester.semester,
    subjects: semester.subjects.map((subject) => ({
      ...subject,
      name: subject.name.trim(),
      code: subject.code.trim().toUpperCase(),
    })).filter((subject) => subject.name && subject.code),
  })),
});

const normalizeDepartmentUpdate = (payload: DepartmentUpdatePayload): DepartmentUpdatePayload => ({
  ...payload,
  ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
  ...(payload.code !== undefined ? { code: payload.code.trim().toUpperCase() } : {}),
  ...(payload.course !== undefined ? { course: payload.course.trim() } : {}),
  ...(payload.hod !== undefined ? { hod: payload.hod.trim() } : {}),
  ...(payload.semesters !== undefined ? {
    semesters: payload.semesters.map((semester) => ({
      semester: semester.semester,
      subjects: semester.subjects.map((subject) => ({
        ...subject,
        name: subject.name.trim(),
        code: subject.code.trim().toUpperCase(),
      })).filter((subject) => subject.name && subject.code),
    })),
  } : {}),
});

const assertDepartmentStructure = (payload: Pick<DepartmentPayload, 'totalSemesters' | 'semesters'>): void => {
  if (!payload.semesters) return;

  const seenSemesters = new Set<number>();
  for (const semester of payload.semesters) {
    if (semester.semester > payload.totalSemesters) {
      throw new HttpError(400, `Semester ${semester.semester} exceeds total semesters.`);
    }
    if (seenSemesters.has(semester.semester)) {
      throw new HttpError(400, `Semester ${semester.semester} is duplicated.`);
    }
    seenSemesters.add(semester.semester);

    const seenCodes = new Set<string>();
    for (const subject of semester.subjects) {
      const code = subject.code.trim().toUpperCase();
      if (seenCodes.has(code)) {
        throw new HttpError(400, `Subject code ${code} is duplicated in semester ${semester.semester}.`);
      }
      seenCodes.add(code);
    }
  }
};

const semesterCreateData = (semesters: DepartmentPayload['semesters']) => (
  semesters?.map((semester) => ({
    semester: semester.semester,
    subjects: {
      create: semester.subjects.map((subject) => ({
        name: subject.name,
        code: subject.code,
        credits: subject.credits,
        type: mapper.subjectTypeFromClient(subject.type),
      })),
    },
  })) ?? []
);

departmentRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = normalizeDepartmentPayload(departmentSchema.parse(req.body));
    assertDepartmentStructure(payload);

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
        semesters: {
          create: semesterCreateData(payload.semesters),
        },
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
    const payload = normalizeDepartmentUpdate(departmentUpdateSchema.parse(req.body));

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Department not found');
    }

    if (payload.code && payload.code !== existing.code) {
      const duplicate = await prisma.department.findUnique({ where: { code: payload.code } });
      if (duplicate) {
        throw new HttpError(409, 'Department with this code already exists');
      }
    }

    const nextTotalSemesters = payload.totalSemesters ?? existing.totalSemesters;
    assertDepartmentStructure({
      totalSemesters: nextTotalSemesters,
      semesters: payload.semesters,
    });

    if (payload.totalSemesters && payload.totalSemesters < existing.totalSemesters) {
      const [userBeyondLimit, scheduleBeyondLimit] = await Promise.all([
        prisma.registeredPerson.count({
          where: { department: existing.name, semester: { gt: payload.totalSemesters } },
        }),
        prisma.scheduleSlot.count({
          where: { department: existing.name, semester: { gt: payload.totalSemesters } },
        }),
      ]);
      if (userBeyondLimit + scheduleBeyondLimit > 0) {
        throw new HttpError(409, 'Cannot reduce semesters while users or schedules exist above the new limit.');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const department = await tx.department.update({
        where: { id },
        data: {
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.code ? { code: payload.code } : {}),
          ...(payload.course ? { course: payload.course } : {}),
          ...(payload.totalSemesters ? { totalSemesters: payload.totalSemesters } : {}),
          ...(payload.hod ? { hod: payload.hod } : {}),
        },
      });

      if (payload.semesters !== undefined) {
        await tx.departmentSemester.deleteMany({ where: { departmentId: id } });
        for (const semester of semesterCreateData(payload.semesters)) {
          await tx.departmentSemester.create({
            data: {
              departmentId: id,
              semester: semester.semester,
              subjects: semester.subjects,
            },
          });
        }
      }

      return department;
    });

    if (payload.name && payload.name !== existing.name) {
      await prisma.$transaction([
        prisma.registeredPerson.updateMany({
          where: { department: existing.name },
          data: { department: updated.name },
        }),
        prisma.user.updateMany({
          where: { department: existing.name },
          data: { department: updated.name },
        }),
        prisma.scheduleSlot.updateMany({
          where: { department: existing.name },
          data: { department: updated.name },
        }),
      ]);
    }

    if (payload.course && payload.course !== existing.course) {
      await prisma.$transaction([
        prisma.registeredPerson.updateMany({
          where: { department: updated.name, role: 'STUDENT' },
          data: { course: updated.course },
        }),
        prisma.user.updateMany({
          where: { department: updated.name, role: 'STUDENT' },
          data: { course: updated.course },
        }),
        prisma.scheduleSlot.updateMany({
          where: { department: updated.name },
          data: { course: updated.course },
        }),
      ]);
    }

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

    const [persons, users, scheduleSlots] = await Promise.all([
      prisma.registeredPerson.count({ where: { department: existing.name } }),
      prisma.user.count({ where: { department: existing.name } }),
      prisma.scheduleSlot.count({ where: { department: existing.name } }),
    ]);
    if (persons + users + scheduleSlots > 0) {
      throw new HttpError(409, 'Department is in use by users or schedule slots.');
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
    if (payload.semester > department.totalSemesters) {
      throw new HttpError(400, `Semester must be within ${department.totalSemesters} semesters for ${department.name}.`);
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
