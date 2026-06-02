CREATE INDEX IF NOT EXISTS "AttendanceSession_scheduleId_idx" ON "AttendanceSession"("scheduleId");
CREATE INDEX IF NOT EXISTS "AttendanceSession_facultyId_idx" ON "AttendanceSession"("facultyId");
CREATE INDEX IF NOT EXISTS "AttendanceSession_startedById_idx" ON "AttendanceSession"("startedById");
CREATE INDEX IF NOT EXISTS "AttendanceSession_department_semester_idx" ON "AttendanceSession"("department", "semester");
