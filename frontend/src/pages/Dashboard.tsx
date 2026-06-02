import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import type { AttendanceSession, PageType, ScheduleSlot } from '../types';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  DoorOpen,
  GraduationCap,
  Megaphone,
  MessageSquare,
  QrCode,
  Radio,
  Scale,
  Shield,
  Star,
  Target,
  Upload,
  UserCheck,
  Users,
  WifiOff,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const subjectColors = ['#A0F1D3', '#9BC6FA', '#FFE599', '#AEE2B5', '#F1A0E8', '#D8C7FF'];

const todayName = (): ScheduleSlot['day'] | null => {
  const index = new Date().getDay();
  return index >= 1 && index <= 6 ? DAYS[index - 1] : null;
};

const timeToMinutes = (time?: string): number => {
  const [hours = '0', minutes = '0'] = (time ?? '').split(':');
  return Number(hours) * 60 + Number(minutes);
};

const currentMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const sortSlots = (slots: ScheduleSlot[]): ScheduleSlot[] =>
  [...slots].sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

const nextSlotFor = (slots: ScheduleSlot[]): ScheduleSlot | undefined => {
  const today = todayName();
  const now = currentMinutes();
  const sorted = sortSlots(slots);
  return sorted.find((slot) => slot.day === today && timeToMinutes(slot.endTime) >= now) ?? sorted[0];
};

const studentRecordFor = (
  session: AttendanceSession,
  userId?: string,
  enrollmentNo?: string,
) => {
  const keys = [userId, enrollmentNo].filter(Boolean).map((value) => value!.trim().toLowerCase());
  return session.attendees.find((record) => keys.includes(record.studentId.trim().toLowerCase()));
};

const studentWasPresent = (
  session: AttendanceSession,
  userId?: string,
  enrollmentNo?: string,
): boolean => studentRecordFor(session, userId, enrollmentNo)?.status === 'present';

const attendanceRate = (present: number, total: number): number =>
  total > 0 ? Math.round((present / total) * 100) : 0;

const EmptyList: React.FC<{ text: string }> = ({ text }) => (
  <p className="dash__empty">{text}</p>
);

const MetricButton: React.FC<{
  value: React.ReactNode;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  page: PageType;
}> = ({ value, label, icon, color, bg, page }) => {
  const { setCurrentPage } = useApp();
  return (
    <button className="dash__stat" onClick={() => setCurrentPage(page)} type="button">
      <div className="dash__stat-icon" style={{ background: bg, color }}>{icon}</div>
      <span className="dash__stat-val">{value}</span>
      <span className="dash__stat-lbl">{label}</span>
      <ArrowUpRight size={14} className="dash__stat-arrow" />
    </button>
  );
};

const RecentNoticeList: React.FC<{ limit?: number }> = ({ limit = 4 }) => {
  const { notices, setCurrentPage } = useApp();
  const visible = notices.slice(0, limit);

  return (
    <div className="dash__list">
      {visible.map((notice) => (
        <div key={notice.id} className="dash__list-item" onClick={() => setCurrentPage('notices')}>
          <div className={`dash__dot dash__dot--${notice.category}`} />
          <div className="dash__list-content">
            <span className="dash__list-title">{notice.title}</span>
            <span className="dash__list-meta"><Calendar size={11} /> {notice.date}</span>
          </div>
        </div>
      ))}
      {visible.length === 0 ? <EmptyList text="No notices available" /> : null}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { setCurrentPage, notices, bookings, grievances, attendanceSession } = useApp();
  const { registeredPersons } = useAuth();

  const studentCount = registeredPersons.filter((person) => person.role === 'student').length;
  const teacherCount = registeredPersons.filter((person) => person.role === 'teacher').length;
  const verifiedCount = registeredPersons.filter((person) => person.isVerified).length;
  const resolvedGrievances = grievances.filter((grievance) => grievance.status === 'resolved').length;
  const issueRate = Math.round((resolvedGrievances / (grievances.length || 1)) * 100);

  const quickActions = [
    { icon: <Upload size={20} />, label: 'Import Users', page: 'admin_upload' as PageType, color: '#3b6cf5' },
    { icon: <Megaphone size={20} />, label: 'Post Notice', page: 'notices' as PageType, color: '#d07a1a' },
    { icon: <QrCode size={20} />, label: 'Attendance', page: 'attendance' as PageType, color: '#1a9d5c' },
    { icon: <DoorOpen size={20} />, label: 'Rooms', page: 'rooms' as PageType, color: '#6c52e8' },
    { icon: <MessageSquare size={20} />, label: 'Feedback', page: 'feedback' as PageType, color: '#1596c4' },
    { icon: <Scale size={20} />, label: 'Grievances', page: 'grievances' as PageType, color: '#d94444' },
  ];

  return (
    <div className="dash">
      <div className="dash__welcome dash__welcome--admin">
        <div className="dash__welcome-left">
          <span className="dash__welcome-badge"><Shield size={13} style={{ marginRight: 4 }} />Admin Panel</span>
          <h2>System Overview</h2>
          <p>Manage users, monitor campus activity, and maintain operations.</p>
        </div>
        <div className="dash__welcome-metrics">
          <div className="dash__metric"><span className="dash__metric-val">{verifiedCount}</span><span className="dash__metric-lbl">Verified Users</span></div>
          <div className="dash__metric-divider" />
          <div className="dash__metric"><span className="dash__metric-val">{issueRate}%</span><span className="dash__metric-lbl">Issues Resolved</span></div>
          <div className="dash__metric-divider" />
          <div className="dash__metric"><span className="dash__metric-val">{attendanceSession?.isActive ? <Radio size={14} color="#1a9d5c" /> : <WifiOff size={14} color="#aaa" />}</span><span className="dash__metric-lbl">Attendance</span></div>
        </div>
      </div>

      <div className="dash__stats">
        <MetricButton value={registeredPersons.length} label="Added Users" icon={<Users size={22} />} color="#3b6cf5" bg="rgba(59,108,245,0.08)" page="admin_upload" />
        <MetricButton value={studentCount} label="Students" icon={<UserCheck size={22} />} color="#1a9d5c" bg="rgba(26,157,92,0.07)" page="admin_upload" />
        <MetricButton value={teacherCount} label="Faculty" icon={<BookOpen size={22} />} color="#6c52e8" bg="rgba(108,82,232,0.07)" page="admin_upload" />
        <MetricButton value={verifiedCount} label="Verified Users" icon={<Activity size={22} />} color="#1596c4" bg="rgba(21,150,196,0.07)" page="admin_upload" />
        <MetricButton value={notices.length} label="Notices" icon={<Megaphone size={22} />} color="#d07a1a" bg="rgba(208,122,26,0.07)" page="notices" />
        <MetricButton value={grievances.length} label="Grievances" icon={<Scale size={22} />} color="#d94444" bg="rgba(217,68,68,0.06)" page="grievances" />
      </div>

      <div className="dash__section">
        <h3 className="dash__section-title">Quick Actions</h3>
        <div className="dash__actions">
          {quickActions.map((action) => (
            <button key={action.label} className="dash__action" onClick={() => setCurrentPage(action.page)} type="button">
              <div className="dash__action-icon" style={{ color: action.color }}>{action.icon}</div>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dash__grid">
        <div className="dash__card">
          <h3 className="dash__card-title"><Megaphone size={16} /> Recent Notices</h3>
          <RecentNoticeList />
        </div>
        <div className="dash__card">
          <h3 className="dash__card-title"><Scale size={16} /> Grievance Status</h3>
          <div className="dash__progress-group">
            {[
              { label: 'Resolved', count: resolvedGrievances, color: '#1a9d5c' },
              { label: 'In Progress', count: grievances.filter((g) => g.status === 'in_progress').length, color: '#3b6cf5' },
              { label: 'Pending', count: grievances.filter((g) => g.status === 'submitted').length, color: '#d07a1a' },
            ].map((item) => (
              <div key={item.label} className="dash__progress-row">
                <div className="dash__progress-header">
                  <span style={{ color: item.color, fontWeight: 700 }}>{item.count}</span>
                  <span>{item.label}</span>
                </div>
                <div className="dash__progress-bar">
                  <div className="dash__progress-fill" style={{ width: `${(item.count / (grievances.length || 1)) * 100}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dash__card">
          <h3 className="dash__card-title"><Clock size={16} /> Recent Bookings</h3>
          <div className="dash__list">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="dash__list-item">
                <span className="dash__time">{booking.startTime}</span>
                <div className="dash__list-content">
                  <span className="dash__list-title">{booking.purpose}</span>
                  <span className="dash__list-meta">{booking.roomName}</span>
                </div>
                {booking.status === 'confirmed' ? <CheckCircle size={14} style={{ color: '#1a9d5c' }} /> : <AlertCircle size={14} style={{ color: '#d07a1a' }} />}
              </div>
            ))}
            {bookings.length === 0 ? <EmptyList text="No bookings yet" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard: React.FC = () => {
  const { setCurrentPage, notices, feedbacks, bookings, attendanceSession, schedule } = useApp();
  const { currentUser } = useAuth();

  const myFeedback = feedbacks.filter((feedback) => feedback.type === 'faculty' || feedback.type === 'course');
  const avgRating = myFeedback.length > 0
    ? (myFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) / myFeedback.length).toFixed(1)
    : '-';
  const nextClass = nextSlotFor(schedule);

  const quickActions = [
    { icon: <QrCode size={20} />, label: 'Start Session', page: 'attendance' as PageType, color: '#1a9d5c' },
    { icon: <Megaphone size={20} />, label: 'Post Notice', page: 'notices' as PageType, color: '#d07a1a' },
    { icon: <DoorOpen size={20} />, label: 'Book Room', page: 'rooms' as PageType, color: '#6c52e8' },
    { icon: <Scale size={20} />, label: 'Grievances', page: 'grievances' as PageType, color: '#d94444' },
  ];

  return (
    <div className="dash">
      <div className="dash__welcome dash__welcome--teacher">
        <div className="dash__welcome-left">
          <span className="dash__welcome-badge"><BookOpen size={13} style={{ marginRight: 4 }} />Faculty Panel</span>
          <h2>Welcome, {currentUser?.name?.split(' ')[0] || 'Faculty'}</h2>
          <p>{currentUser?.department || 'Department'} Department</p>
        </div>
        <div className="dash__welcome-metrics">
          <div className="dash__metric"><span className="dash__metric-val" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} color="#f59e0b" fill="#f59e0b" /> {avgRating}</span><span className="dash__metric-lbl">Avg Rating</span></div>
          <div className="dash__metric-divider" />
          <div className="dash__metric"><span className="dash__metric-val">{attendanceSession?.attendees?.length || 0}</span><span className="dash__metric-lbl">Present Now</span></div>
        </div>
      </div>

      <div className="dash__stats">
        <MetricButton value={schedule.length} label="Assigned Classes" icon={<Calendar size={22} />} color="#3b6cf5" bg="rgba(59,108,245,0.08)" page="schedule" />
        <MetricButton value={attendanceSession?.isActive ? 'Live' : 'Off'} label="Attendance" icon={<QrCode size={22} />} color="#1a9d5c" bg="rgba(26,157,92,0.07)" page="attendance" />
        <MetricButton value={myFeedback.length} label="Feedback" icon={<MessageSquare size={22} />} color="#d07a1a" bg="rgba(208,122,26,0.07)" page="feedback" />
        <MetricButton value={notices.length} label="Visible Notices" icon={<Megaphone size={22} />} color="#6c52e8" bg="rgba(108,82,232,0.07)" page="notices" />
      </div>

      <div className="dash__section">
        <h3 className="dash__section-title">Quick Actions</h3>
        <div className="dash__actions">
          {quickActions.map((action) => (
            <button key={action.label} className="dash__action" onClick={() => setCurrentPage(action.page)} type="button">
              <div className="dash__action-icon" style={{ color: action.color }}>{action.icon}</div>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dash__grid">
        <div className="dash__card">
          <h3 className="dash__card-title"><Clock size={16} /> Next Class</h3>
          {nextClass ? (
            <div className="dash__list-item" onClick={() => setCurrentPage('schedule')}>
              <span className="dash__time">{nextClass.startTime}</span>
              <div className="dash__list-content">
                <span className="dash__list-title">{nextClass.subject}</span>
                <span className="dash__list-meta">{nextClass.day} | {nextClass.department} Sem {nextClass.semester} | {nextClass.room}</span>
              </div>
            </div>
          ) : <EmptyList text="No scheduled classes" />}
        </div>
        <div className="dash__card">
          <h3 className="dash__card-title"><Megaphone size={16} /> Notices</h3>
          <RecentNoticeList />
        </div>
        <div className="dash__card">
          <h3 className="dash__card-title"><DoorOpen size={16} /> My Bookings</h3>
          <div className="dash__list">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="dash__list-item">
                <span className="dash__time">{booking.startTime}</span>
                <div className="dash__list-content">
                  <span className="dash__list-title">{booking.purpose}</span>
                  <span className="dash__list-meta">{booking.roomName}</span>
                </div>
              </div>
            ))}
            {bookings.length === 0 ? <EmptyList text="No bookings yet" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const { setCurrentPage, notices, schedule, userSkills, attendanceSession } = useApp();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const next = await api.attendance.listSessions();
        if (mounted) setSessions(next);
      } catch {
        if (mounted) setSessions([]);
      }
    };

    void load();
    const interval = window.setInterval(load, 15000);
    window.addEventListener('focus', load);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', load);
    };
  }, []);

  const today = todayName();
  const todaySlots = useMemo(() => schedule.filter((slot) => slot.day === today), [schedule, today]);
  const nextClass = useMemo(() => nextSlotFor(schedule), [schedule]);
  const subjects = useMemo(() => {
    const byCode = new Map<string, ScheduleSlot[]>();
    schedule.forEach((slot) => {
      const key = slot.courseCode || slot.subject;
      byCode.set(key, [...(byCode.get(key) ?? []), slot]);
    });
    return Array.from(byCode.entries()).slice(0, 6).map(([code, slots], index) => ({
      code,
      title: slots[0]?.subject ?? code,
      room: slots[0]?.room ?? 'Room not set',
      faculty: slots[0]?.faculty ?? 'Faculty not set',
      count: slots.length,
      color: subjectColors[index % subjectColors.length],
    }));
  }, [schedule]);

  const presentCount = sessions.filter((session) => studentWasPresent(session, currentUser?.id, currentUser?.enrollmentNo)).length;
  const totalAttendanceRecords = sessions.length;
  const rate = attendanceRate(presentCount, totalAttendanceRecords);
  const liveClassForStudent = attendanceSession?.isActive ? attendanceSession : null;
  const attendanceTrend = sessions.slice(0, 6).reverse().map((session) => ({
    label: session.courseCode || session.courseName,
    value: studentWasPresent(session, currentUser?.id, currentUser?.enrollmentNo) ? 100 : 0,
  }));

  return (
    <div className="dash-fox">
      <div className="dash-fox__header">
        <h2>Hello {currentUser?.name?.split(' ')[0] || 'Student'},</h2>
      </div>

      <div className="dash-fox__section">
        <h3 className="dash-fox__subtitle">My Subjects</h3>
        <div className="dash-fox__top-cards">
          {subjects.map((subject) => (
            <button key={subject.code} className="fox-minicard" style={{ background: subject.color }} onClick={() => setCurrentPage('schedule')} type="button">
              <div className="fox-minicard__top">
                <div className="fox-minicard__icon"><BookOpen size={14} color="var(--text-primary)" /></div>
                <span className="fox-minicard__code">{subject.code}</span>
              </div>
              <div className="fox-minicard__mid">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="fox-minicard__lbl">Weekly Classes</span>
                  <span className="fox-minicard__val">{subject.count}</span>
                </div>
              </div>
              <div className="fox-minicard__bot">
                <span>{subject.title}</span>
                <span>{subject.room}</span>
              </div>
            </button>
          ))}
          {subjects.length === 0 ? <div className="fox-panel"><EmptyList text="No subjects assigned yet" /></div> : null}
        </div>
      </div>

      <div className="dash-fox__row">
        <div className="dash-fox__col dash-fox__col--sm">
          <div className="fox-balance-card fox-balance-card--purple">
            <div>
              <span className="fox-bal-lbl">Attendance</span>
              <span className="fox-bal-val">{totalAttendanceRecords > 0 ? `${presentCount}/${totalAttendanceRecords}` : '-'}</span>
            </div>
            <div className="fox-bal-badge">{rate}%</div>
          </div>
          <div className="fox-balance-card fox-balance-card--black" style={{ marginTop: 16 }}>
            <div>
              <span className="fox-bal-lbl">Semester</span>
              <span className="fox-bal-val" style={{ color: '#fff' }}>{currentUser?.course ?? 'Course'} / Sem {currentUser?.semester ?? '-'}</span>
            </div>
            <button className="fox-bal-btn" onClick={() => setCurrentPage('profile')} type="button"><ArrowUpRight size={16} /></button>
          </div>
          <div className="dash-fox__quick-info">
            <div className="fox-qi-row">
              <span className="fox-qi-lbl">Next Class</span>
              <span className="fox-qi-val" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{nextClass ? `${nextClass.startTime} ${nextClass.subject}` : 'Not scheduled'}</span>
            </div>
            <div className="fox-qi-row" style={{ marginTop: 8 }}>
              <span className="fox-qi-lbl">Room</span>
              <span className="fox-qi-val" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{nextClass?.room ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="dash-fox__col dash-fox__col--lg">
          <div className="fox-panel">
            <div className="fox-panel__head">
              <h3>Attendance Analytics</h3>
              <div className="fox-tabs">
                <span className="fox-tab active">Recent</span>
              </div>
            </div>
            <div className="fox-panel__chart" style={{ height: 220, marginTop: 16 }}>
              {attendanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E5F2" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8D9B' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8D9B' }} />
                    <Tooltip cursor={{ stroke: '#6C5DD3', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="value" stroke="#6C5DD3" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#6C5DD3', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyList text="Attendance records will appear after class sessions are marked" />
              )}
            </div>
          </div>
        </div>

        <div className="dash-fox__col dash-fox__col--md">
          <div className="fox-panel" style={{ height: '100%' }}>
            <h3 style={{ marginBottom: 16 }}>Today</h3>
            <div className="fox-list">
              {todaySlots.slice(0, 3).map((slot) => (
                <div key={slot.id} className="fox-list-item" onClick={() => setCurrentPage('schedule')} style={{ cursor: 'pointer', marginTop: 12 }}>
                  <div className="fox-list-icon" style={{ background: 'rgba(108, 93, 211, 0.1)' }}><BookOpen size={16} color="#6C5DD3" /></div>
                  <div className="fox-list-info">
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{slot.subject}</h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{slot.startTime}-{slot.endTime} | {slot.room}</span>
                  </div>
                  <div className="fox-list-val" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{slot.type}</div>
                </div>
              ))}
              {todaySlots.length === 0 ? <EmptyList text="No classes scheduled today" /> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-fox__row" style={{ marginTop: 24 }}>
        <div className="dash-fox__col" style={{ flex: 2 }}>
          <div className="fox-panel">
            <h3>Latest Notices</h3>
            <div className="fox-list" style={{ marginTop: 16 }}>
              {notices.slice(0, 4).map((notice) => (
                <div key={notice.id} className="fox-list-item" onClick={() => setCurrentPage('notices')} style={{ cursor: 'pointer', marginTop: 12 }}>
                  <div className="fox-list-icon" style={{ background: 'rgba(244, 196, 48, 0.1)' }}><Megaphone size={16} color="#F4C430" /></div>
                  <div className="fox-list-info">
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{notice.title}</h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notice.targetLabel ?? 'Notice'} | {notice.date}</span>
                  </div>
                </div>
              ))}
              {notices.length === 0 ? <EmptyList text="No notices for your account" /> : null}
            </div>
          </div>
        </div>
        <div className="dash-fox__col" style={{ flex: 1 }}>
          <div className="fox-panel" style={{ height: '100%' }}>
            <div className="fox-panel__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Quick Access</h3>
              <button className="fox-icon-btn" style={{ background: 'var(--surface-2)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)' }} type="button"><QrCode size={16} /></button>
            </div>
            <div className="fox-list">
              <div className="fox-list-item" onClick={() => setCurrentPage('attendance')} style={{ cursor: 'pointer' }}>
                <div className="fox-list-icon" style={{ background: 'rgba(60, 203, 127, 0.1)' }}><QrCode size={16} color="#3CCB7F" /></div>
                <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{liveClassForStudent ? 'Mark Attendance' : 'Attendance Records'}</h4><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{liveClassForStudent ? 'Live QR session available' : `${rate}% current rate`}</span></div>
              </div>
              <div className="fox-list-item" onClick={() => setCurrentPage('schedule')} style={{ cursor: 'pointer', marginTop: 12 }}>
                <div className="fox-list-icon" style={{ background: 'rgba(108, 93, 211, 0.1)' }}><Calendar size={16} color="#6C5DD3" /></div>
                <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Schedule</h4><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{schedule.length} class slots</span></div>
              </div>
              <div className="fox-list-item" onClick={() => setCurrentPage('skills')} style={{ cursor: 'pointer', marginTop: 12 }}>
                <div className="fox-list-icon" style={{ background: 'rgba(59,108,245,0.1)' }}><Target size={16} color="#3b6cf5" /></div>
                <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Skills</h4><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userSkills.length} saved skills</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash__stats" style={{ marginTop: 24 }}>
        <MetricButton value={todaySlots.length} label="Today Classes" icon={<Clock size={22} />} color="#3b6cf5" bg="rgba(59,108,245,0.08)" page="schedule" />
        <MetricButton value={`${rate}%`} label="Attendance" icon={<UserCheck size={22} />} color="#1a9d5c" bg="rgba(26,157,92,0.07)" page="attendance" />
        <MetricButton value={notices.length} label="Notices" icon={<Megaphone size={22} />} color="#d07a1a" bg="rgba(208,122,26,0.07)" page="notices" />
        <MetricButton value={userSkills.length} label="Skills" icon={<GraduationCap size={22} />} color="#6c52e8" bg="rgba(108,82,232,0.07)" page="skills" />
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  switch (currentUser?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <StudentDashboard />;
  }
};

export default Dashboard;
