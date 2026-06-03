import { prisma } from './prisma.js';

let bookingSchemaReady = false;
let ensureBookingSchemaPromise: Promise<void> | null = null;

const ensureBookingColumns = async (): Promise<void> => {
  await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetRole" TEXT NOT NULL DEFAULT \'ALL\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetDepartment" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetSemester" INTEGER;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetCourse" TEXT;');
  await prisma.$executeRawUnsafe('UPDATE "Booking" SET "targetRole" = \'ALL\' WHERE "targetRole" IS NULL OR "targetRole" = \'\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ALTER COLUMN "targetRole" SET DEFAULT \'ALL\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ALTER COLUMN "targetRole" SET NOT NULL;');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Booking_targetRole_idx" ON "Booking"("targetRole");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Booking_targetDepartment_targetSemester_idx" ON "Booking"("targetDepartment", "targetSemester");');
};

export const ensureBookingSchema = async (): Promise<void> => {
  if (bookingSchemaReady) return;

  ensureBookingSchemaPromise ??= ensureBookingColumns()
    .then(() => {
      bookingSchemaReady = true;
    })
    .finally(() => {
      if (!bookingSchemaReady) {
        ensureBookingSchemaPromise = null;
      }
    });

  await ensureBookingSchemaPromise;
};
