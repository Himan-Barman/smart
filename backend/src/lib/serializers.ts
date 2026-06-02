import type {
  AcademicYear,
  AttendanceRecord,
  AttendanceSession,
  Booking,
  CalendarEvent,
  Department,
  DepartmentSemester,
  DepartmentSubject,
  Feedback,
  Grievance,
  Internship,
  Notice,
  Notification,
  RegisteredPerson,
  Room,
  ScheduleSlot,
  Skill,
  User,
} from '@prisma/client';
import { mapper } from './mappers.js';

type SerializableUser = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'role'
  | 'department'
  | 'enrollmentNo'
  | 'employeeId'
  | 'semester'
  | 'course'
  | 'subjects'
  | 'phone'
  | 'createdAt'
>;

type SerializableRegisteredPerson = Pick<
  RegisteredPerson,
  | 'id'
  | 'name'
  | 'email'
  | 'role'
  | 'department'
  | 'enrollmentNo'
  | 'employeeId'
  | 'semester'
  | 'course'
  | 'subjects'
  | 'phone'
>;

const toSubjectList = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

const fromSubjectList = (subjects?: string[]): string | undefined => {
  if (!subjects || subjects.length === 0) return undefined;
  return subjects.join(',');
};

export const serializer = {
  toSubjectList,
  fromSubjectList,

  user(user: SerializableUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: mapper.roleToClient(user.role),
      department: user.department,
      enrollmentNo: user.enrollmentNo ?? undefined,
      employeeId: user.employeeId ?? undefined,
      semester: user.semester ?? undefined,
      course: user.course ?? undefined,
      subjects: toSubjectList(user.subjects),
      phone: user.phone ?? undefined,
      createdAt: mapper.date(user.createdAt),
    };
  },

  registeredPerson(person: SerializableRegisteredPerson) {
    return {
      id: person.id,
      name: person.name,
      email: person.email,
      role: mapper.roleToClient(person.role),
      department: person.department,
      enrollmentNo: person.enrollmentNo ?? undefined,
      employeeId: person.employeeId ?? undefined,
      semester: person.semester ?? undefined,
      course: person.course ?? undefined,
      subjects: toSubjectList(person.subjects),
      phone: person.phone ?? undefined,
    };
  },

  notice(notice: Notice) {
    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      category: mapper.noticeCategoryToClient(notice.category),
      author: notice.authorName,
      date: mapper.date(notice.date),
      pinned: notice.pinned,
    };
  },

  feedback(feedback: Feedback) {
    return {
      id: feedback.id,
      type: mapper.feedbackTypeToClient(feedback.type),
      subject: feedback.subject,
      message: feedback.message,
      rating: feedback.rating,
      anonymous: feedback.anonymous,
      date: mapper.date(feedback.date),
      status: mapper.feedbackStatusToClient(feedback.status),
    };
  },

  skill(skill: Skill) {
    return {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      level: mapper.skillLevelToClient(skill.level),
    };
  },

  internship(internship: Internship) {
    return {
      id: internship.id,
      title: internship.title,
      company: internship.company,
      location: internship.location,
      duration: internship.duration,
      skills: toSubjectList(internship.skills) ?? [],
      stipend: internship.stipend,
      deadline: mapper.date(internship.deadline),
      description: internship.description,
      type: mapper.internshipTypeToClient(internship.type),
    };
  },

  room(room: Room) {
    return {
      id: room.id,
      name: room.name,
      type: mapper.roomTypeToClient(room.type),
      capacity: room.capacity,
      floor: room.floor,
      building: room.building,
      amenities: toSubjectList(room.amenities) ?? [],
      available: room.available,
    };
  },

  booking(booking: Booking) {
    return {
      id: booking.id,
      roomId: booking.roomId,
      roomName: booking.roomName,
      bookedBy: booking.bookedByName,
      date: mapper.date(booking.date),
      startTime: booking.startTime,
      endTime: booking.endTime,
      purpose: booking.purpose,
      status: mapper.bookingStatusToClient(booking.status),
    };
  },

  grievance(grievance: Grievance) {
    return {
      id: grievance.id,
      type: mapper.grievanceTypeToClient(grievance.type),
      subject: grievance.subject,
      description: grievance.description,
      priority: mapper.grievancePriorityToClient(grievance.priority),
      status: mapper.grievanceStatusToClient(grievance.status),
      submittedBy: grievance.submittedBy,
      submitterRole: mapper.roleToClient(grievance.submitterRole),
      assignedTo: mapper.assignedToToClient(grievance.assignedTo),
      date: mapper.date(grievance.date),
      resolution: grievance.resolution ?? undefined,
    };
  },

  attendanceSession(session: AttendanceSession, attendees: AttendanceRecord[]) {
    return {
      id: session.id,
      courseName: session.courseName,
      courseCode: session.courseCode,
      faculty: session.faculty,
      facultyId: session.facultyId ?? undefined,
      department: session.department,
      semester: session.semester ?? undefined,
      course: session.course ?? undefined,
      section: session.section ?? undefined,
      mode: session.mode.toLowerCase() as 'qr' | 'manual' | 'hybrid',
      date: mapper.date(session.date),
      startTime: session.startTime,
      duration: session.duration,
      currentQR: session.currentQR,
      qrExpiresAt: session.qrExpiresAt?.toISOString() ?? undefined,
      qrHistory: toSubjectList(session.qrHistory) ?? [],
      attendees: attendees.map((attendee) => ({
        id: attendee.id,
        sessionId: attendee.sessionId,
        studentId: attendee.studentId,
        studentName: attendee.studentName,
        timestamp: attendee.timestamp,
        qrCode: attendee.qrCode ?? undefined,
        verified: attendee.verified,
        status: attendee.status.toLowerCase() as 'present' | 'absent',
        mode: attendee.mode.toLowerCase() as 'qr' | 'manual',
        department: attendee.department ?? undefined,
        academicYear: attendee.academicYear ?? undefined,
        year: attendee.year ?? undefined,
        semester: attendee.semester ?? undefined,
        course: attendee.course ?? undefined,
        subjectName: attendee.subjectName ?? undefined,
        courseCode: attendee.courseCode ?? undefined,
        facultyId: attendee.facultyId ?? undefined,
        facultyName: attendee.facultyName ?? undefined,
        room: attendee.room ?? undefined,
        scheduleId: attendee.scheduleId ?? undefined,
        markedById: attendee.markedById ?? undefined,
        markedAt: attendee.markedAt.toISOString(),
      })),
      isActive: session.isActive,
      scheduleId: session.scheduleId ?? undefined,
      room: session.room ?? undefined,
      endedAt: session.endedAt?.toISOString() ?? undefined,
    };
  },

  schedule(slot: ScheduleSlot) {
    return {
      id: slot.id,
      day: mapper.dayToClient(slot.day),
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject,
      courseCode: slot.courseCode,
      faculty: slot.faculty,
      facultyId: slot.facultyId,
      room: slot.room,
      type: mapper.scheduleTypeToClient(slot.type),
      department: slot.department,
      semester: slot.semester,
      course: slot.course,
      section: slot.section ?? undefined,
    };
  },

  departmentSubject(subject: DepartmentSubject) {
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      type: mapper.subjectTypeToClient(subject.type),
    };
  },

  departmentSemester(semester: DepartmentSemester & { subjects: DepartmentSubject[] }) {
    return {
      semester: semester.semester,
      subjects: semester.subjects.map((subject) => serializer.departmentSubject(subject)),
    };
  },

  department(department: Department & { semesters: (DepartmentSemester & { subjects: DepartmentSubject[] })[] }) {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      course: department.course,
      totalSemesters: department.totalSemesters,
      hod: department.hod,
      semesters: department.semesters
        .sort((a, b) => a.semester - b.semester)
        .map((semester) => serializer.departmentSemester(semester)),
    };
  },

  notification(notification: Notification) {
    return {
      id: notification.id,
      title: notification.title,
      desc: notification.desc,
      date: mapper.date(notification.date),
      unread: !notification.isRead,
      type: mapper.notificationTypeToClient(notification.type),
    };
  },

  calendar(years: (AcademicYear & {
    semesters: ({ events: CalendarEvent[] } & {
      id: string;
      semNum: number;
      startDate: Date;
      endDate: Date;
    })[];
  })[]) {
    return years.map((year) => ({
      id: year.id,
      label: year.label,
      startDate: mapper.date(year.startDate),
      endDate: mapper.date(year.endDate),
      isCurrent: year.isCurrent,
      semesters: year.semesters
        .sort((a, b) => a.semNum - b.semNum)
        .map((semester) => ({
          id: semester.id,
          semNum: semester.semNum,
          startDate: mapper.date(semester.startDate),
          endDate: mapper.date(semester.endDate),
          events: semester.events.map((event) => ({
            id: event.id,
            title: event.title,
            description: event.description ?? undefined,
            startDate: mapper.date(event.startDate),
            endDate: event.endDate ? mapper.date(event.endDate) : undefined,
            type: event.type,
          })),
        })),
    }));
  },
};
