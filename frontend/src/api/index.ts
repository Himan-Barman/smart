import type {
  AttendanceSession,
  Booking,
  Department,
  Feedback,
  Grievance,
  Notice,
  RegisteredPerson,
  Room,
  ScheduleSlot,
  Skill,
  User,
} from '../types';

const API_BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? (import.meta.env.DEV ? '/api/v1' : 'https://smart-5vin.onrender.com/api/v1')).replace(/\/$/, '');

const TOKEN_KEY = 'smart-campus-token';

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = tokenStore.get();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) message = errorBody.message;
    } catch {
      // ignore json parsing failures for non-json error responses
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export type BootstrapResponse = {
  notices: Notice[];
  feedbacks: Feedback[];
  userSkills: Skill[];
  internships: Array<{
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
  }>;
  rooms: Room[];
  bookings: Booking[];
  grievances: Grievance[];
  attendanceSession: AttendanceSession | null;
  schedule: ScheduleSlot[];
  departments: Department[];
  notifications: Array<{ id: string; title: string; desc: string; date: string; unread: boolean; type: 'info' | 'success' | 'warning' | 'error' }>;
  registeredPersons: RegisteredPerson[];
  registeredUsers: User[];
};

export const api = {
  auth: {
    login(payload: { email: string; password: string }) {
      return request<{ success: boolean; message: string; token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: payload,
        auth: false,
      });
    },
    startSignup(payload: { email: string; identifier: string }) {
      return request<{
        success: boolean;
        message: string;
        otpEmail: string;
        otpCode: string;
        person: RegisteredPerson;
      }>('/auth/signup/start', {
        method: 'POST',
        body: payload,
        auth: false,
      });
    },
    verifySignup(payload: { email: string; code: string; password: string }) {
      return request<{ success: boolean; message: string; token: string; user: User }>('/auth/signup/verify', {
        method: 'POST',
        body: payload,
        auth: false,
      });
    },
    resendSignupOtp(payload: { email: string }) {
      return request<{ success: boolean; message: string; otpCode: string; otpEmail: string }>('/auth/signup/resend', {
        method: 'POST',
        body: payload,
        auth: false,
      });
    },
    me() {
      return request<{ user: User }>('/auth/me');
    },
  },

  app: {
    bootstrap() {
      return request<BootstrapResponse>('/app/bootstrap');
    },
  },

  users: {
    listRegisteredPersons() {
      return request<RegisteredPerson[]>('/users/registered-persons');
    },
    listRegisteredUsers() {
      return request<User[]>('/users/accounts');
    },
    uploadRegisteredPersons(persons: RegisteredPerson[]) {
      return request<{ count: number }>('/users/registered-persons/bulk', {
        method: 'POST',
        body: persons,
      });
    },
    removeRegisteredPerson(id: string) {
      return request<void>(`/users/registered-persons/${id}`, {
        method: 'DELETE',
      });
    },
  },

  profile: {
    update(payload: { name?: string; email?: string; phone?: string }) {
      return request<User>('/profile/me', { method: 'PATCH', body: payload });
    },
  },

  notices: {
    create(payload: Omit<Notice, 'id' | 'date'> & { author: string }) {
      return request<Notice>('/notices', { method: 'POST', body: payload });
    },
    remove(id: string) {
      return request<void>(`/notices/${id}`, { method: 'DELETE' });
    },
  },

  feedback: {
    create(payload: Omit<Feedback, 'id' | 'date' | 'status'>) {
      return request<Feedback>('/feedback', { method: 'POST', body: payload });
    },
  },

  skills: {
    create(payload: Omit<Skill, 'id'>) {
      return request<Skill>('/skills', { method: 'POST', body: payload });
    },
    remove(id: string) {
      return request<void>(`/skills/${id}`, { method: 'DELETE' });
    },
  },

  bookings: {
    create(payload: Omit<Booking, 'id' | 'status'>) {
      return request<Booking>('/bookings', { method: 'POST', body: payload });
    },
    cancel(id: string) {
      return request<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' });
    },
  },

  grievances: {
    create(payload: Omit<Grievance, 'id' | 'date' | 'status'>) {
      return request<Grievance>('/grievances', { method: 'POST', body: payload });
    },
    update(id: string, payload: Partial<Grievance>) {
      return request<Grievance>(`/grievances/${id}`, { method: 'PATCH', body: payload });
    },
  },

  attendance: {
    getActive() {
      return request<AttendanceSession | null>('/attendance/session/active');
    },
    start(payload: { courseName: string; courseCode: string; faculty?: string; room?: string; scheduleId?: string }) {
      return request<AttendanceSession>('/attendance/session/start', { method: 'POST', body: payload });
    },
    stop(id: string) {
      return request<AttendanceSession>(`/attendance/session/${id}/stop`, { method: 'POST' });
    },
    refresh(id: string) {
      return request<AttendanceSession>(`/attendance/session/${id}/refresh`, { method: 'POST' });
    },
    mark(id: string, payload: { studentId: string; studentName: string; qrCode: string }) {
      return request<{ success: boolean; attendee?: AttendanceSession['attendees'][number]; message?: string }>(`/attendance/session/${id}/mark`, {
        method: 'POST',
        body: payload,
      });
    },
  },

  schedule: {
    create(payload: Omit<ScheduleSlot, 'id'>) {
      return request<ScheduleSlot>('/schedule', { method: 'POST', body: payload });
    },
    update(id: string, payload: Partial<ScheduleSlot>) {
      return request<ScheduleSlot>(`/schedule/${id}`, { method: 'PATCH', body: payload });
    },
    remove(id: string) {
      return request<void>(`/schedule/${id}`, { method: 'DELETE' });
    },
  },

  departments: {
    create(payload: Omit<Department, 'id' | 'semesters'>) {
      return request<Department[]>('/departments', { method: 'POST', body: payload });
    },
    update(id: string, payload: Partial<Department>) {
      return request<Department[]>(`/departments/${id}`, { method: 'PATCH', body: payload });
    },
    remove(id: string) {
      return request<void>(`/departments/${id}`, { method: 'DELETE' });
    },
    addSubject(deptId: string, semester: number, subject: { name: string; code: string; credits: number; type: 'core' | 'elective' | 'lab' | 'project' }) {
      return request<Department[]>(`/departments/${deptId}/subjects`, {
        method: 'POST',
        body: { semester, subject },
      });
    },
    removeSubject(deptId: string, subjectId: string) {
      return request<void>(`/departments/${deptId}/subjects/${subjectId}`, {
        method: 'DELETE',
      });
    },
  },

  notifications: {
    list() {
      return request<BootstrapResponse['notifications']>('/notifications');
    },
    markAllRead() {
      return request<void>('/notifications/mark-all-read', { method: 'POST' });
    },
    markRead(id: string) {
      return request<void>(`/notifications/${id}/read`, { method: 'POST' });
    },
  },

  calendar: {
    list() {
      return request<Array<{
        id: string;
        year: string;
        currentYear: boolean;
        semesters: Array<{
          id: string;
          num: number;
          label: string;
          startDate: string;
          endDate: string;
          events: Array<{
            id: string;
            title: string;
            startDate: string;
            endDate?: string;
            type: 'academic' | 'exam' | 'holiday' | 'event' | 'registration';
            description?: string;
          }>;
        }>;
      }>>('/calendar');
    },
    createEvent(payload: { semesterId: string; title: string; startDate: string; endDate?: string; type: 'academic' | 'exam' | 'holiday' | 'event' | 'registration'; description?: string }) {
      return request<Array<{
        id: string;
        year: string;
        currentYear: boolean;
        semesters: Array<{
          id: string;
          num: number;
          label: string;
          startDate: string;
          endDate: string;
          events: Array<{
            id: string;
            title: string;
            startDate: string;
            endDate?: string;
            type: 'academic' | 'exam' | 'holiday' | 'event' | 'registration';
            description?: string;
          }>;
        }>;
      }>>('/calendar/events', { method: 'POST', body: payload });
    },
    updateEvent(eventId: string, payload: Partial<{ semesterId: string; title: string; startDate: string; endDate?: string; type: 'academic' | 'exam' | 'holiday' | 'event' | 'registration'; description?: string }>) {
      return request<Array<{
        id: string;
        year: string;
        currentYear: boolean;
        semesters: Array<{
          id: string;
          num: number;
          label: string;
          startDate: string;
          endDate: string;
          events: Array<{
            id: string;
            title: string;
            startDate: string;
            endDate?: string;
            type: 'academic' | 'exam' | 'holiday' | 'event' | 'registration';
            description?: string;
          }>;
        }>;
      }>>(`/calendar/events/${eventId}`, { method: 'PATCH', body: payload });
    },
    deleteEvent(eventId: string) {
      return request<void>(`/calendar/events/${eventId}`, { method: 'DELETE' });
    },
  },
};
