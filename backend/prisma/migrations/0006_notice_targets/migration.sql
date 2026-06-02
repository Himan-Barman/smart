ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetRole" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetDepartment" TEXT;
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetSemester" INTEGER;
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "targetCourse" TEXT;

UPDATE "Notice"
SET "targetRole" = 'ALL'
WHERE "targetRole" IS NULL OR "targetRole" = '';

ALTER TABLE "Notice" ALTER COLUMN "targetRole" SET DEFAULT 'ALL';
ALTER TABLE "Notice" ALTER COLUMN "targetRole" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Notice_targetRole_idx" ON "Notice"("targetRole");
CREATE INDEX IF NOT EXISTS "Notice_targetDepartment_targetSemester_idx" ON "Notice"("targetDepartment", "targetSemester");
