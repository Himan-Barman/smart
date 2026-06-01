const toIsoDate = (value: Date | string | null | undefined): string => {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0] ?? '';
};

const mapValue = (value: string, map: Record<string, string>, fallback: string): string =>
  map[value] ?? map[value.toUpperCase()] ?? fallback;

const reverseMapValue = (value: string, map: Record<string, string>, fallback: string): string => {
  const match = Object.entries(map).find(([, v]) => v === value);
  return match?.[0] ?? fallback;
};

const roleMap: Record<string, string> = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  FACULTY: 'teacher',
  STUDENT: 'student',
};

const noticeCategoryMap: Record<string, string> = {
  ACADEMIC: 'academic',
  EVENT: 'event',
  URGENT: 'urgent',
  GENERAL: 'general',
};

const feedbackTypeMap: Record<string, string> = {
  COURSE: 'course',
  FACULTY: 'faculty',
  INFRASTRUCTURE: 'infrastructure',
  GENERAL: 'general',
};

const feedbackStatusMap: Record<string, string> = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
};

const skillLevelMap: Record<string, string> = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

const internshipTypeMap: Record<string, string> = {
  REMOTE: 'remote',
  ONSITE: 'onsite',
  HYBRID: 'hybrid',
};

const roomTypeMap: Record<string, string> = {
  CLASSROOM: 'classroom',
  LAB: 'lab',
  SEMINAR_HALL: 'seminar_hall',
  AUDITORIUM: 'auditorium',
};

const bookingStatusMap: Record<string, string> = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
};

const grievanceTypeMap: Record<string, string> = {
  ACADEMIC: 'academic',
  INFRASTRUCTURE: 'infrastructure',
  ADMINISTRATIVE: 'administrative',
  HARASSMENT: 'harassment',
  OTHER: 'other',
};

const grievancePriorityMap: Record<string, string> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const grievanceStatusMap: Record<string, string> = {
  SUBMITTED: 'submitted',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
};

const assignedToMap: Record<string, string> = {
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

const dayMap: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
};

const scheduleTypeMap: Record<string, string> = {
  LECTURE: 'lecture',
  LAB: 'lab',
  TUTORIAL: 'tutorial',
  SEMINAR: 'seminar',
};

const subjectTypeMap: Record<string, string> = {
  CORE: 'core',
  ELECTIVE: 'elective',
  LAB: 'lab',
  PROJECT: 'project',
};

const notificationTypeMap: Record<string, string> = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

export const mapper = {
  date: toIsoDate,

  roleToClient: (value: string): 'admin' | 'teacher' | 'student' => mapValue(value, roleMap, 'student') as 'admin' | 'teacher' | 'student',
  roleFromClient: (value: string): string => reverseMapValue(value, roleMap, 'STUDENT'),

  noticeCategoryToClient: (value: string): 'academic' | 'event' | 'urgent' | 'general' => mapValue(value, noticeCategoryMap, 'general') as 'academic' | 'event' | 'urgent' | 'general',
  noticeCategoryFromClient: (value: string): string => reverseMapValue(value, noticeCategoryMap, 'GENERAL'),

  feedbackTypeToClient: (value: string): 'course' | 'faculty' | 'infrastructure' | 'general' => mapValue(value, feedbackTypeMap, 'general') as 'course' | 'faculty' | 'infrastructure' | 'general',
  feedbackTypeFromClient: (value: string): string => reverseMapValue(value, feedbackTypeMap, 'GENERAL'),
  feedbackStatusToClient: (value: string): 'pending' | 'reviewed' | 'resolved' => mapValue(value, feedbackStatusMap, 'pending') as 'pending' | 'reviewed' | 'resolved',

  skillLevelToClient: (value: string): 'beginner' | 'intermediate' | 'advanced' => mapValue(value, skillLevelMap, 'beginner') as 'beginner' | 'intermediate' | 'advanced',
  skillLevelFromClient: (value: string): string => reverseMapValue(value, skillLevelMap, 'BEGINNER'),

  internshipTypeToClient: (value: string): 'remote' | 'onsite' | 'hybrid' => mapValue(value, internshipTypeMap, 'remote') as 'remote' | 'onsite' | 'hybrid',

  roomTypeToClient: (value: string): 'classroom' | 'lab' | 'seminar_hall' | 'auditorium' => mapValue(value, roomTypeMap, 'classroom') as 'classroom' | 'lab' | 'seminar_hall' | 'auditorium',
  bookingStatusToClient: (value: string): 'confirmed' | 'pending' | 'cancelled' => mapValue(value, bookingStatusMap, 'pending') as 'confirmed' | 'pending' | 'cancelled',

  grievanceTypeToClient: (value: string): 'academic' | 'infrastructure' | 'administrative' | 'harassment' | 'other' => mapValue(value, grievanceTypeMap, 'other') as 'academic' | 'infrastructure' | 'administrative' | 'harassment' | 'other',
  grievanceTypeFromClient: (value: string): string => reverseMapValue(value, grievanceTypeMap, 'OTHER'),
  grievancePriorityToClient: (value: string): 'low' | 'medium' | 'high' | 'critical' => mapValue(value, grievancePriorityMap, 'medium') as 'low' | 'medium' | 'high' | 'critical',
  grievancePriorityFromClient: (value: string): string => reverseMapValue(value, grievancePriorityMap, 'MEDIUM'),
  grievanceStatusToClient: (value: string): 'submitted' | 'in_progress' | 'resolved' | 'rejected' => mapValue(value, grievanceStatusMap, 'submitted') as 'submitted' | 'in_progress' | 'resolved' | 'rejected',
  assignedToToClient: (value: string): 'teacher' | 'admin' => mapValue(value, assignedToMap, 'teacher') as 'teacher' | 'admin',
  assignedToFromClient: (value: string): string => reverseMapValue(value, assignedToMap, 'TEACHER'),

  dayToClient: (value: string): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' => mapValue(value, dayMap, 'Monday') as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday',
  dayFromClient: (value: string): string => reverseMapValue(value, dayMap, 'MONDAY'),
  scheduleTypeToClient: (value: string): 'lecture' | 'lab' | 'tutorial' | 'seminar' => mapValue(value, scheduleTypeMap, 'lecture') as 'lecture' | 'lab' | 'tutorial' | 'seminar',
  scheduleTypeFromClient: (value: string): string => reverseMapValue(value, scheduleTypeMap, 'LECTURE'),

  subjectTypeToClient: (value: string): 'core' | 'elective' | 'lab' | 'project' => mapValue(value, subjectTypeMap, 'core') as 'core' | 'elective' | 'lab' | 'project',
  subjectTypeFromClient: (value: string): string => reverseMapValue(value, subjectTypeMap, 'CORE'),

  notificationTypeToClient: (value: string): 'info' | 'success' | 'warning' | 'error' => mapValue(value, notificationTypeMap, 'info') as 'info' | 'success' | 'warning' | 'error',
};
