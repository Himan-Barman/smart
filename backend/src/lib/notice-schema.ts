import { prisma } from './prisma.js';

let ensureNoticeSchemaPromise: Promise<void> | null = null;
let noticeSchemaReady = false;

const ensureNoticeColumns = async (): Promise<void> => {
  await prisma.$executeRawUnsafe('ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetRole" TEXT NOT NULL DEFAULT \'ALL\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetDepartment" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetSemester" INTEGER;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetCourse" TEXT;');
  await prisma.$executeRawUnsafe('UPDATE "Notice" SET "targetRole" = \'ALL\' WHERE "targetRole" IS NULL OR "targetRole" = \'\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "Notice" ALTER COLUMN "targetRole" SET DEFAULT \'ALL\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "Notice" ALTER COLUMN "targetRole" SET NOT NULL;');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Notice_targetRole_idx" ON "Notice"("targetRole");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Notice_targetDepartment_targetSemester_idx" ON "Notice"("targetDepartment", "targetSemester");');
};

export const ensureNoticeSchema = async (): Promise<void> => {
  if (noticeSchemaReady) return;

  ensureNoticeSchemaPromise ??= ensureNoticeColumns()
    .then(() => {
      noticeSchemaReady = true;
    })
    .finally(() => {
      if (!noticeSchemaReady) {
        ensureNoticeSchemaPromise = null;
      }
    });

  await ensureNoticeSchemaPromise;
};
