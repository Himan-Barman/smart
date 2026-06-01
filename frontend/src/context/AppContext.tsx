import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  Notice,
  Feedback,
  Skill,
  Room,
  Booking,
  Grievance,
  AttendanceSession,
  ScheduleSlot,
  Department,
  DepartmentPayload,
  DepartmentSubject,
  PageType,
} from '../types';
import { api } from '../api';

interface AppState {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  goBack: () => void;
  canGoBack: boolean;
  selectedDepartmentId: string | null;
  setSelectedDepartmentId: (id: string | null) => void;
  selectedCourseKey: string | null;
  setSelectedCourseKey: (key: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  notices: Notice[];
  addNotice: (notice: Omit<Notice, 'id' | 'date'>) => void;
  deleteNotice: (id: string) => void;

  feedbacks: Feedback[];
  addFeedback: (feedback: Omit<Feedback, 'id' | 'date' | 'status'>) => void;

  userSkills: Skill[];
  addSkill: (skill: Omit<Skill, 'id'>) => void;
  removeSkill: (id: string) => void;

  rooms: Room[];
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => void;
  cancelBooking: (id: string) => void;

  grievances: Grievance[];
  addGrievance: (grievance: Omit<Grievance, 'id' | 'date' | 'status'>) => void;
  updateGrievance: (id: string, updates: Partial<Grievance>) => void;

  attendanceSession: AttendanceSession | null;
  startAttendanceSession: (courseName: string, courseCode: string, faculty?: string, room?: string, scheduleId?: string) => void;
  stopAttendanceSession: () => void;
  markAttendance: (studentId: string, studentName: string, qrCode: string) => boolean;

  schedule: ScheduleSlot[];
  addScheduleSlot: (slot: Omit<ScheduleSlot, 'id'>) => void;
  updateScheduleSlot: (id: string, slot: Partial<ScheduleSlot>) => void;
  deleteScheduleSlot: (id: string) => void;

  departments: Department[];
  addDepartment: (dept: DepartmentPayload) => Promise<void>;
  updateDepartment: (id: string, updates: Partial<DepartmentPayload>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addSubjectToDept: (deptId: string, semester: number, subject: Omit<DepartmentSubject, 'id'>) => void;
  removeSubjectFromDept: (deptId: string, semester: number, subjectId: string) => void;

  refreshAppData: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 10);
const getToday = () => new Date().toISOString().split('T')[0] ?? '';

const replaceById = <T extends { id: string }>(items: T[], id: string, next: T): T[] =>
  items.map((item) => (item.id === id ? next : item));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPageInternal] = useState<PageType>('dashboard');
  const [history, setHistory] = useState<PageType[]>([]);
  
  const setCurrentPage = useCallback((page: PageType) => {
    setCurrentPageInternal((prev) => {
      if (prev !== page) {
        setHistory((h) => [...h, prev]);
      }
      return page;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const newHistory = [...h];
      const previousPage = newHistory.pop()!;
      setCurrentPageInternal(previousPage);
      return newHistory;
    });
  }, []);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedCourseKey, setSelectedCourseKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [userSkills, setUserSkills] = useState<Skill[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const refreshAppData = useCallback(async () => {
    const data = await api.app.bootstrap();
    setNotices(data.notices);
    setFeedbacks(data.feedbacks);
    setUserSkills(data.userSkills);
    setRooms(data.rooms);
    setBookings(data.bookings);
    setGrievances(data.grievances);
    setAttendanceSession(data.attendanceSession);
    setSchedule(data.schedule);
    setDepartments(data.departments);
  }, []);

  useEffect(() => {
    void refreshAppData().catch((error) => {
      console.warn('Unable to load app data', error);
    });
  }, [refreshAppData]);

  const addNotice = useCallback((notice: Omit<Notice, 'id' | 'date'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: Notice = {
      ...notice,
      id: tempId,
      date: getToday(),
    };

    setNotices((prev) => [optimistic, ...prev]);

    void api.notices.create({ ...notice, author: notice.author }).then((created) => {
      setNotices((prev) => replaceById(prev, tempId, created));
    });
  }, []);

  const deleteNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
    void api.notices.remove(id);
  }, []);

  const addFeedback = useCallback((feedback: Omit<Feedback, 'id' | 'date' | 'status'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: Feedback = {
      ...feedback,
      id: tempId,
      date: getToday(),
      status: 'pending',
    };

    setFeedbacks((prev) => [optimistic, ...prev]);

    void api.feedback.create(feedback).then((created) => {
      setFeedbacks((prev) => replaceById(prev, tempId, created));
    });
  }, []);

  const addSkill = useCallback((skill: Omit<Skill, 'id'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: Skill = { ...skill, id: tempId };

    setUserSkills((prev) => [...prev, optimistic]);

    void api.skills.create(skill).then((created) => {
      setUserSkills((prev) => replaceById(prev, tempId, created));
    });
  }, []);

  const removeSkill = useCallback((id: string) => {
    setUserSkills((prev) => prev.filter((skill) => skill.id !== id));
    void api.skills.remove(id);
  }, []);

  const addBooking = useCallback((booking: Omit<Booking, 'id' | 'status'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: Booking = {
      ...booking,
      id: tempId,
      status: 'pending',
    };

    setBookings((prev) => [optimistic, ...prev]);

    void api.bookings.create(booking).then((created) => {
      setBookings((prev) => replaceById(prev, tempId, created));
    });
  }, []);

  const cancelBooking = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' as const } : booking)),
    );

    void api.bookings.cancel(id).then((updated) => {
      setBookings((prev) => replaceById(prev, id, updated));
    });
  }, []);

  const addGrievance = useCallback((grievance: Omit<Grievance, 'id' | 'date' | 'status'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: Grievance = {
      ...grievance,
      id: tempId,
      date: getToday(),
      status: 'submitted',
    };

    setGrievances((prev) => [optimistic, ...prev]);

    void api.grievances.create(grievance).then((created) => {
      setGrievances((prev) => replaceById(prev, tempId, created));
    });
  }, []);

  const updateGrievance = useCallback((id: string, updates: Partial<Grievance>) => {
    setGrievances((prev) => prev.map((grievance) => (grievance.id === id ? { ...grievance, ...updates } : grievance)));
    void api.grievances.update(id, updates).then((updated) => {
      setGrievances((prev) => replaceById(prev, id, updated));
    });
  }, []);

  const startAttendanceSession = useCallback((courseName: string, courseCode: string, faculty?: string, room?: string, scheduleId?: string) => {
    void api.attendance
      .start({ courseName, courseCode, faculty, room, scheduleId })
      .then((session) => setAttendanceSession(session));
  }, []);

  const stopAttendanceSession = useCallback(() => {
    if (!attendanceSession) return;

    void api.attendance.stop(attendanceSession.id).then((session) => {
      setAttendanceSession(session);
    });
  }, [attendanceSession]);

  const markAttendance = useCallback((studentId: string, studentName: string, qrCode: string): boolean => {
    if (!attendanceSession || !attendanceSession.isActive) return false;
    if (qrCode !== attendanceSession.currentQR) return false;
    if (attendanceSession.attendees.some((attendee) => attendee.studentId === studentId)) return false;

    const optimisticRecord = {
      studentId,
      studentName,
      timestamp: new Date().toLocaleTimeString(),
      qrCode,
      verified: true,
    };

    setAttendanceSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        attendees: [...prev.attendees, optimisticRecord],
      };
    });

    void api.attendance.mark(attendanceSession.id, { studentId, studentName, qrCode });

    return true;
  }, [attendanceSession]);

  const addScheduleSlot = useCallback((slot: Omit<ScheduleSlot, 'id'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: ScheduleSlot = { ...slot, id: tempId };

    setSchedule((prev) => [...prev, optimistic]);

    void api.schedule.create(slot).then((created) => {
      setSchedule((prev) => replaceById(prev, tempId, created));
    });
  }, []);

  const updateScheduleSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) => {
    setSchedule((prev) => prev.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot)));

    void api.schedule.update(id, updates).then((updated) => {
      setSchedule((prev) => replaceById(prev, id, updated));
    });
  }, []);

  const deleteScheduleSlot = useCallback((id: string) => {
    setSchedule((prev) => prev.filter((slot) => slot.id !== id));
    void api.schedule.remove(id);
  }, []);

  const addDepartment = useCallback(async (dept: DepartmentPayload) => {
    const nextDepartments = await api.departments.create(dept);
    setDepartments(nextDepartments);
  }, []);

  const updateDepartment = useCallback(async (id: string, updates: Partial<DepartmentPayload>) => {
    const nextDepartments = await api.departments.update(id, updates);
    setDepartments(nextDepartments);
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    await api.departments.remove(id);
    setDepartments((prev) => prev.filter((department) => department.id !== id));
  }, []);

  const addSubjectToDept = useCallback((deptId: string, semester: number, subject: Omit<DepartmentSubject, 'id'>) => {
    void api.departments.addSubject(deptId, semester, subject).then((nextDepartments) => {
      setDepartments(nextDepartments);
    });
  }, []);

  const removeSubjectFromDept = useCallback((deptId: string, _semester: number, subjectId: string) => {
    setDepartments((prev) =>
      prev.map((department) => {
        if (department.id !== deptId) return department;

        return {
          ...department,
          semesters: department.semesters
            .map((semester) => ({
              ...semester,
              subjects: semester.subjects.filter((subject) => subject.id !== subjectId),
            }))
            .filter((semester) => semester.subjects.length > 0),
        };
      }),
    );

    void api.departments.removeSubject(deptId, subjectId);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        goBack,
        canGoBack: history.length > 0,
        selectedDepartmentId,
        setSelectedDepartmentId,
        selectedCourseKey,
        setSelectedCourseKey,
        sidebarOpen,
        setSidebarOpen,
        notices,
        addNotice,
        deleteNotice,
        feedbacks,
        addFeedback,
        userSkills,
        addSkill,
        removeSkill,
        rooms,
        bookings,
        addBooking,
        cancelBooking,
        grievances,
        addGrievance,
        updateGrievance,
        attendanceSession,
        startAttendanceSession,
        stopAttendanceSession,
        markAttendance,
        schedule,
        addScheduleSlot,
        updateScheduleSlot,
        deleteScheduleSlot,
        departments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addSubjectToDept,
        removeSubjectFromDept,
        refreshAppData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
