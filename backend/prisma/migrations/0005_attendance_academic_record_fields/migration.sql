ALTER TABLE "AttendanceRecord"
  ADD COLUMN IF NOT EXISTS "academicYear" TEXT,
  ADD COLUMN IF NOT EXISTS "year" INTEGER,
  ADD COLUMN IF NOT EXISTS "subjectName" TEXT,
  ADD COLUMN IF NOT EXISTS "facultyId" TEXT,
  ADD COLUMN IF NOT EXISTS "facultyName" TEXT,
  ADD COLUMN IF NOT EXISTS "room" TEXT;

CREATE INDEX IF NOT EXISTS "AttendanceRecord_academicYear_department_semester_idx"
  ON "AttendanceRecord"("academicYear", "department", "semester");
