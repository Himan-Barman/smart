// ==================== TYPES ====================

export type UserRole = 'admin' | 'teacher' | 'student';

export interface RegisteredPerson {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  enrollmentNo?: string; // students
  employeeId?: string;   // teachers
  semester?: number;     // students
  course?: string;       // students
  subjects?: string[];   // teachers
  phone?: string;
  isVerified?: boolean;  // true when user has signed up
  createdAt?: string;    // registration timestamp
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  enrollmentNo?: string;
  employeeId?: string;
  semester?: number;
  course?: string;
  subjects?: string[];
  phone?: string;
  createdAt: string;
}

export type AuthStep = 'login' | 'signup' | 'otp' | 'password' | 'authenticated';

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: 'academic' | 'event' | 'urgent' | 'general';
  author: string;
  date: string;
  pinned: boolean;
}

export interface Feedback {
  id: string;
  type: 'course' | 'faculty' | 'infrastructure' | 'general';
  subject: string;
  message: string;
  rating: number;
  anonymous: boolean;
  date: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  location: string;
  duration: string;
  skills: string[];
  stipend: string;
  deadline: string;
  description: string;
  type: 'remote' | 'onsite' | 'hybrid';
}

export interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'seminar_hall' | 'auditorium';
  capacity: number;
  floor: number;
  building: string;
  amenities: string[];
  available: boolean;
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  bookedBy: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface Grievance {
  id: string;
  type: 'academic' | 'infrastructure' | 'administrative' | 'harassment' | 'other';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'in_progress' | 'resolved' | 'rejected';
  submittedBy: string;
  submitterRole: 'student' | 'teacher' | 'admin';
  assignedTo: 'teacher' | 'admin';
  date: string;
  resolution?: string;
}

export interface AttendanceSession {
  id: string;
  courseName: string;
  courseCode: string;
  faculty: string;
  date: string;
  startTime: string;
  duration: number;
  currentQR: string;
  qrHistory: string[];
  attendees: AttendanceRecord[];
  isActive: boolean;
  scheduleId?: string;
  room?: string;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  timestamp: string;
  qrCode: string;
  verified: boolean;
}

// ===== SCHEDULE / ROUTINE =====
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ScheduleSlot {
  id: string;
  day: DayOfWeek;
  startTime: string;     // e.g. "09:00"
  endTime: string;       // e.g. "10:00"
  subject: string;
  courseCode: string;
  faculty: string;
  facultyId: string;
  room: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar';
  department: string;
  semester: number;
  course: string;        // e.g. "B.Tech CSE"
  section?: string;
}

// ===== DEPARTMENTS =====
export interface DepartmentSubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  type: 'core' | 'elective' | 'lab' | 'project';
}

export interface DepartmentSemester {
  semester: number;
  subjects: DepartmentSubject[];
}

export interface Department {
  id: string;
  name: string;
  code: string;           // e.g. "CSE", "ECE"
  course: string;         // e.g. "B.Tech CSE"
  totalSemesters: number;
  hod: string;
  semesters: DepartmentSemester[];
}

export type DepartmentPayload = Omit<Department, 'id' | 'semesters'> & {
  semesters?: Array<{
    semester: number;
    subjects: Array<Omit<DepartmentSubject, 'id'> & { id?: string }>;
  }>;
};

export type PageType =
  | 'dashboard'
  | 'notices'
  | 'feedback'
  | 'skills'
  | 'rooms'
  | 'grievances'
  | 'attendance'
  | 'admin_upload'
  | 'schedule'
  | 'departments'
  | 'department_detail'
  | 'course_detail'
  | 'profile'
  | 'notifications';
