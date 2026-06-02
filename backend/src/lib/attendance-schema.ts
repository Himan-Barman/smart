import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

let ensureAttendanceSchemaPromise: Promise<void> | null = null;
let attendanceSchemaReady = false;

const updateNullSessionDepartments = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    UPDATE "AttendanceSession"
    SET "department" = ''
    WHERE "department" IS NULL;
  `);
};

const ensureAttendanceColumns = async (): Promise<void> => {
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "facultyId" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "department" TEXT DEFAULT \'\';');
  await updateNullSessionDepartments();
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ALTER COLUMN "department" SET NOT NULL;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "semester" INTEGER;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "course" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "section" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT \'QR\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "qrExpiresAt" TIMESTAMP(3);');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);');

  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ALTER COLUMN "qrCode" DROP NOT NULL;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'PRESENT\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT \'QR\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "department" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "semester" INTEGER;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "course" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "courseCode" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "scheduleId" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "markedById" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;');

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceSession_scheduleId_idx" ON "AttendanceSession"("scheduleId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceSession_facultyId_idx" ON "AttendanceSession"("facultyId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceSession_startedById_idx" ON "AttendanceSession"("startedById");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceSession_department_semester_idx" ON "AttendanceSession"("department", "semester");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceRecord_userId_idx" ON "AttendanceRecord"("userId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceRecord_scheduleId_idx" ON "AttendanceRecord"("scheduleId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AttendanceRecord_department_semester_idx" ON "AttendanceRecord"("department", "semester");');
};

export const ensureAttendanceSchema = async (): Promise<void> => {
  if (attendanceSchemaReady) return;

  ensureAttendanceSchemaPromise ??= ensureAttendanceColumns()
    .then(() => {
      attendanceSchemaReady = true;
    })
    .finally(() => {
      if (!attendanceSchemaReady) {
        ensureAttendanceSchemaPromise = null;
      }
    });

  await ensureAttendanceSchemaPromise;
};

export const isMissingAttendanceColumnError = (error: unknown): boolean => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2022') return false;

  const details = JSON.stringify(error.meta ?? {}) + error.message;
  return details.includes('AttendanceSession') || details.includes('AttendanceRecord');
};
