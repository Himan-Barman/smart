import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type {
  Notice,
  Feedback,
  Skill,
  Room,
  Booking,
  Grievance,
  AttendanceSession,
  AttendanceStartPayload,
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
  addNotice: (notice: Omit<Notice, 'id' | 'date' | 'targetLabel'>) => void;
  deleteNotice: (id: string) => void;
  refreshNotices: () => Promise<void>;

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
  startAttendanceSession: (payload: AttendanceStartPayload) => Promise<AttendanceSession>;
  stopAttendanceSession: (id?: string) => Promise<AttendanceSession | null>;
  refreshAttendanceSession: (id: string) => Promise<AttendanceSession>;
  markAttendance: (sessionId: string, qrCode: string) => Promise<{ success: boolean; attendee?: AttendanceSession['attendees'][number]; session?: AttendanceSession; message?: string }>;
  applyManualAttendance: (sessionId: string, records: Array<{ studentId: string; studentName?: string; present: boolean }>) => Promise<AttendanceSession>;

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

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const retryRequest = async <T,>(
  operation: () => Promise<T>,
  delays: number[] = [500, 1200, 2500],
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === delays.length) break;
      await wait(delays[attempt]);
    }
  }

  throw lastError;
};

const notifyNotificationsChanged = () => {
  window.dispatchEvent(new Event('smart-campus-notifications-updated'));
};

const PAGE_STORAGE_KEY = 'smart-campus-current-page';

const validPages: PageType[] = [
  'dashboard',
  'notices',
  'feedback',
  'skills',
  'rooms',
  'grievances',
  'attendance',
  'admin_upload',
  'schedule',
  'departments',
  'department_detail',
  'course_detail',
  'profile',
  'notifications',
];

const isPageType = (value: string | null | undefined): value is PageType =>
  Boolean(value && validPages.includes(value as PageType));

const getHashPage = (): PageType | null => {
  if (typeof window === 'undefined') return null;
  const value = window.location.hash.replace(/^#\/?/, '').trim();
  return isPageType(value) ? value : null;
};

const getStoredPage = (): PageType | null => {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(PAGE_STORAGE_KEY);
    return isPageType(value) ? value : null;
  } catch {
    return null;
  }
};

const persistPage = (page: PageType) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PAGE_STORAGE_KEY, page);
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
};

const writePageRoute = (page: PageType, replace = false) => {
  if (typeof window === 'undefined') return;

  persistPage(page);
  const nextHash = `#/${page}`;
  if (window.location.hash === nextHash) return;

  if (replace) {
    window.history.replaceState(null, '', nextHash);
  } else {
    window.history.pushState(null, '', nextHash);
  }
};

const getInitialPage = (): PageType => getHashPage() ?? getStoredPage() ?? 'dashboard';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPageInternal] = useState<PageType>(() => getInitialPage());
  const [history, setHistory] = useState<PageType[]>([]);
  
  const setCurrentPage = useCallback((page: PageType) => {
    setCurrentPageInternal((prev) => {
      writePageRoute(page, prev === page);

      if (prev !== page) {
        setHistory((h) => [...h, prev].slice(-25));
      }

      return page;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const newHistory = [...h];
      const previousPage = newHistory.pop()!;
      writePageRoute(previousPage);
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
  const activePollInFlightRef = useRef(false);
  const activePollNextAtRef = useRef(0);
  const activePollFailuresRef = useRef(0);

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

  const refreshSchedule = useCallback(async () => {
    const nextSchedule = await retryRequest(() => api.schedule.list());
    setSchedule(nextSchedule);
  }, []);

  const refreshNotices = useCallback(async () => {
    const nextNotices = await retryRequest(() => api.notices.list());
    setNotices(nextNotices);
  }, []);

  useEffect(() => {
    writePageRoute(currentPage, true);
    // The initial URL sync should only run once after the provider mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      const routePage = getHashPage();
      if (!routePage) {
        writePageRoute('dashboard', true);
        setCurrentPageInternal('dashboard');
        return;
      }

      persistPage(routePage);
      setCurrentPageInternal(routePage);
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    void refreshAppData().catch((error) => {
      console.warn('Unable to load app data', error);
    });
  }, [refreshAppData]);

  useEffect(() => {
    const refresh = () => {
      void refreshSchedule().catch(() => {});
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshSchedule]);

  useEffect(() => {
    const refresh = () => {
      void refreshNotices().catch(() => {});
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('smart-campus-notifications-updated', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('smart-campus-notifications-updated', refresh);
    };
  }, [refreshNotices]);

  useEffect(() => {
    const refresh = () => {
      if (activePollInFlightRef.current || Date.now() < activePollNextAtRef.current) return;

      activePollInFlightRef.current = true;
      void api.attendance.getActive().then((session) => {
        activePollFailuresRef.current = 0;
        activePollNextAtRef.current = 0;
        setAttendanceSession(session);
      }).catch(() => {
        activePollFailuresRef.current += 1;
        activePollNextAtRef.current = Date.now() + Math.min(30_000, activePollFailuresRef.current * 5_000);
      }).finally(() => {
        activePollInFlightRef.current = false;
      });
    };

    const interval = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const addNotice = useCallback((notice: Omit<Notice, 'id' | 'date' | 'targetLabel'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: Notice = {
      ...notice,
      id: tempId,
      date: getToday(),
    };

    setNotices((prev) => [optimistic, ...prev]);

    void api.notices.create({ ...notice, author: notice.author }).then((created) => {
      setNotices((prev) => replaceById(prev, tempId, created));
      notifyNotificationsChanged();
    }).catch((error) => {
      setNotices((prev) => prev.filter((item) => item.id !== tempId));
      window.alert(error instanceof Error ? error.message : 'Unable to publish notice');
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

  const startAttendanceSession = useCallback(async (payload: AttendanceStartPayload): Promise<AttendanceSession> => {
    const session = await api.attendance.start(payload);
    setAttendanceSession(session);
    return session;
  }, []);

  const stopAttendanceSession = useCallback(async (id?: string): Promise<AttendanceSession | null> => {
    const sessionId = id ?? attendanceSession?.id;
    if (!sessionId) return null;

    const session = await api.attendance.stop(sessionId);
    setAttendanceSession(session.isActive ? session : null);
    return session;
  }, [attendanceSession]);

  const refreshAttendanceSession = useCallback(async (id: string): Promise<AttendanceSession> => {
    const session = await api.attendance.refresh(id);
    setAttendanceSession(session);
    return session;
  }, []);

  const markAttendance = useCallback(async (
    sessionId: string,
    qrCode: string,
  ): Promise<{ success: boolean; attendee?: AttendanceSession['attendees'][number]; session?: AttendanceSession; message?: string }> => {
    const result = await api.attendance.mark(sessionId, { qrCode });
    if (result.session) {
      setAttendanceSession(result.session);
    } else if (result.attendee) {
      setAttendanceSession((prev) => {
        if (!prev || prev.id !== sessionId) return prev;
        const attendees = prev.attendees.some((attendee) => attendee.id === result.attendee?.id)
          ? prev.attendees.map((attendee) => (attendee.id === result.attendee?.id ? result.attendee! : attendee))
          : [...prev.attendees, result.attendee!];
        return { ...prev, attendees };
      });
    }
    return result;
  }, []);

  const applyManualAttendance = useCallback(async (
    sessionId: string,
    records: Array<{ studentId: string; studentName?: string; present: boolean }>,
  ): Promise<AttendanceSession> => {
    const session = await api.attendance.manual(sessionId, { records });
    setAttendanceSession((prev) => (prev?.id === session.id ? session : prev));
    return session;
  }, []);

  const addScheduleSlot = useCallback((slot: Omit<ScheduleSlot, 'id'>) => {
    const tempId = `tmp-${generateId()}`;
    const optimistic: ScheduleSlot = { ...slot, id: tempId };

    setSchedule((prev) => [...prev, optimistic]);

    void api.schedule.create(slot).then((created) => {
      setSchedule((prev) => replaceById(prev, tempId, created));
      notifyNotificationsChanged();
    }).catch((error) => {
      setSchedule((prev) => prev.filter((item) => item.id !== tempId));
      window.alert(error instanceof Error ? error.message : 'Unable to add schedule slot');
    });
  }, []);

  const updateScheduleSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) => {
    setSchedule((prev) => prev.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot)));

    void api.schedule.update(id, updates).then((updated) => {
      setSchedule((prev) => replaceById(prev, id, updated));
      notifyNotificationsChanged();
    }).catch((error) => {
      void refreshSchedule();
      window.alert(error instanceof Error ? error.message : 'Unable to update schedule slot');
    });
  }, [refreshSchedule]);

  const deleteScheduleSlot = useCallback((id: string) => {
    setSchedule((prev) => prev.filter((slot) => slot.id !== id));
    void api.schedule.remove(id).then(() => {
      notifyNotificationsChanged();
    }).catch((error) => {
      void refreshSchedule();
      window.alert(error instanceof Error ? error.message : 'Unable to delete schedule slot');
    });
  }, [refreshSchedule]);

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
        refreshNotices,
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
        refreshAttendanceSession,
        markAttendance,
        applyManualAttendance,
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
