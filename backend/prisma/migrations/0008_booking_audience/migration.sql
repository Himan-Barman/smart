ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetRole" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetDepartment" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetSemester" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "targetCourse" TEXT;

UPDATE "Booking"
SET "targetRole" = 'ALL'
WHERE "targetRole" IS NULL OR "targetRole" = '';

ALTER TABLE "Booking" ALTER COLUMN "targetRole" SET DEFAULT 'ALL';
ALTER TABLE "Booking" ALTER COLUMN "targetRole" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Booking_targetRole_idx" ON "Booking"("targetRole");
CREATE INDEX IF NOT EXISTS "Booking_targetDepartment_targetSemester_idx" ON "Booking"("targetDepartment", "targetSemester");
