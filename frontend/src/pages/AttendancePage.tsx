import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock,
  Download,
  History,
  ListChecks,
  Play,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Square,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { AttendanceRosterStudent, AttendanceSession, DayOfWeek, ScheduleSlot } from '../types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const normalize = (value?: string | null): string => (value ?? '').trim().toLowerCase();

const todayName = (): DayOfWeek | null => {
  const index = new Date().getDay();
  return index >= 1 && index <= 6 ? DAYS[index - 1] : null;
};

const timeToMinutes = (time: string): number => {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
};

const sortSlots = (slots: ScheduleSlot[]): ScheduleSlot[] =>
  [...slots].sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

const sessionDate = (session: AttendanceSession): string => {
  const parsed = new Date(session.date);
  if (Number.isNaN(parsed.getTime())) return session.date;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const classLabel = (slot: ScheduleSlot): string =>
  `${slot.day} ${slot.startTime}-${slot.endTime} | ${slot.course} Sem ${slot.semester}`;

const academicYearFor = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Academic year';
  const year = date.getFullYear();
  const start = date.getMonth() >= 6 ? year : year - 1;
  return `${start}-${start + 1}`;
};

const presentCount = (session: AttendanceSession): number =>
  session.attendees.filter((record) => record.status === 'present').length;

const attendancePercent = (present: number, total: number): number =>
  total > 0 ? Math.round((present / total) * 100) : 0;

const subjectFor = (session: AttendanceSession, record?: AttendanceSession['attendees'][number]): string =>
  record?.subjectName ?? session.courseName;

const scopeFor = (session: AttendanceSession, record?: AttendanceSession['attendees'][number]): string => {
  const academicYear = record?.academicYear ?? academicYearFor(session.date);
  const year = record?.year ?? (session.semester ? Math.ceil(session.semester / 2) : undefined);
  const department = record?.department ?? session.department;
  const course = record?.course ?? session.course;
  const semester = record?.semester ?? session.semester;
  return `${academicYear} | Year ${year ?? '-'} | ${department} | ${course ?? 'Course'} Sem ${semester ?? '-'}`;
};

const recordTime = (record?: AttendanceSession['attendees'][number]): string => {
  if (!record?.markedAt) return record?.timestamp ?? '-';
  const date = new Date(record.markedAt);
  if (Number.isNaN(date.getTime())) return record.timestamp;
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const recordMatchesUser = (
  record: AttendanceSession['attendees'][number],
  userId?: string,
  enrollmentNo?: string,
): boolean => {
  const keys = [userId, enrollmentNo].map(normalize).filter(Boolean);
  return keys.includes(normalize(record.studentId));
};

const qrSecondsLeft = (session: AttendanceSession | null): number => {
  if (!session?.qrExpiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(session.qrExpiresAt).getTime() - Date.now()) / 1000));
};

const StatusBadge: React.FC<{ status: 'present' | 'absent' | 'pending' }> = ({ status }) => (
  <span className={`attendance-status attendance-status--${status}`}>
    {status === 'present' ? <CheckCircle size={13} /> : status === 'absent' ? <UserX size={13} /> : <Clock size={13} />}
    {status}
  </span>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="attendance-empty">
    <div className="attendance-empty__icon">{icon}</div>
    <h3>{title}</h3>
    <p>{body}</p>
  </div>
);

const MetricCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; tone?: string }> = ({
  icon,
  value,
  label,
  tone = 'blue',
}) => (
  <div className="attendance-metric">
    <div className={`attendance-metric__icon attendance-metric__icon--${tone}`}>{icon}</div>
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  </div>
);

const AttendanceShell: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, children, actions }) => (
  <div className="page attendance-page">
    <div className="attendance-hero">
      <div>
        <span className="attendance-kicker">
          <ShieldCheck size={14} />
          University attendance
        </span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="attendance-hero__actions">{actions}</div> : null}
    </div>
    {children}
  </div>
);

const AdminAttendanceView: React.FC = () => {
  const { departments } = useApp();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await api.attendance.listSessions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const filteredSessions = useMemo(() => {
    const key = normalize(query);
    if (!key) return sessions;
    return sessions.filter((session) =>
      [session.courseName, session.courseCode, session.department, session.course, session.faculty, session.room]
        .some((value) => normalize(value).includes(key)) ||
      session.attendees.some((record) => [record.studentId, record.studentName].some((value) => normalize(value).includes(key))),
    );
  }, [query, sessions]);

  const totalRecords = sessions.reduce((sum, session) => sum + session.attendees.length, 0);
  const totalPresent = sessions.reduce((sum, session) => sum + presentCount(session), 0);

  return (
    <AttendanceShell
      title="Institutional Attendance"
      subtitle="Audit live sessions, manual records, and department attendance from one database-backed view."
      actions={
        <button className="btn btn--outline" onClick={loadSessions} type="button">
          <RefreshCw size={16} />
          Refresh
        </button>
      }
    >
      <div className="attendance-metrics">
        <MetricCard icon={<CalendarDays size={20} />} value={sessions.length} label="Sessions" />
        <MetricCard icon={<Users size={20} />} value={totalRecords} label="Student records" tone="purple" />
        <MetricCard icon={<UserCheck size={20} />} value={totalPresent} label="Present marks" tone="green" />
        <MetricCard icon={<BookOpen size={20} />} value={departments.length} label="Departments" tone="gold" />
      </div>

      <div className="attendance-panel">
        <div className="attendance-panel__head">
          <div>
            <h3>Attendance Ledger</h3>
            <span>{filteredSessions.length} sessions visible</span>
          </div>
          <label className="attendance-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, class, department..." />
          </label>
        </div>

        {loading ? (
          <EmptyState icon={<RefreshCw size={32} />} title="Loading attendance" body="Reading attendance sessions from the database." />
        ) : filteredSessions.length === 0 ? (
          <EmptyState icon={<History size={32} />} title="No records found" body="Attendance sessions will appear after teachers start QR or manual attendance." />
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Scope</th>
                  <th>Faculty</th>
                  <th>Mode</th>
                  <th>Present</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>{session.courseName}</strong>
                      <span>{session.courseCode} | {session.room || 'Room not set'}</span>
                    </td>
                    <td>
                      <strong>{session.department}</strong>
                      <span>{session.course || 'Course'} Sem {session.semester || '-'}</span>
                    </td>
                    <td>{session.faculty}</td>
                    <td><span className="attendance-pill">{session.mode.toUpperCase()}</span></td>
                    <td>{presentCount(session)} / {Math.max(session.attendees.length, presentCount(session))}</td>
                    <td>{sessionDate(session)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AttendanceShell>
  );
};

const TeacherAttendanceView: React.FC = () => {
  const {
    attendanceSession,
    startAttendanceSession,
    stopAttendanceSession,
    refreshAttendanceSession,
    applyManualAttendance,
    schedule,
  } = useApp();
  const [tab, setTab] = useState<'qr' | 'manual' | 'records'>('qr');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [roster, setRoster] = useState<AttendanceRosterStudent[]>([]);
  const [manualMarks, setManualMarks] = useState<Record<string, boolean>>({});
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(qrSecondsLeft(attendanceSession));

  const teacherSlots = useMemo(() => sortSlots(schedule), [schedule]);
  const today = todayName();
  const todaySlots = useMemo(
    () => teacherSlots.filter((slot) => !today || slot.day === today),
    [teacherSlots, today],
  );
  const selectedSlot = teacherSlots.find((slot) => slot.id === selectedSlotId) ?? todaySlots[0] ?? teacherSlots[0] ?? null;
  const activeSession = attendanceSession?.isActive ? attendanceSession : null;

  const loadSessions = useCallback(async () => {
    setSessions(await api.attendance.listSessions());
  }, []);

  const loadRoster = useCallback(async (slotId: string) => {
    if (!slotId) {
      setRoster([]);
      setManualMarks({});
      return;
    }

    const nextRoster = await api.attendance.getRoster({ scheduleId: slotId });
    setRoster(nextRoster);
    setManualMarks((prev) => {
      const next: Record<string, boolean> = {};
      nextRoster.forEach((student) => {
        next[student.id] = prev[student.id] ?? false;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedSlotId && (todaySlots[0] || teacherSlots[0])) {
      setSelectedSlotId((todaySlots[0] ?? teacherSlots[0]).id);
    }
  }, [selectedSlotId, teacherSlots, todaySlots]);

  useEffect(() => {
    void loadSessions().catch(() => {});
  }, [loadSessions]);

  useEffect(() => {
    if (selectedSlotId) {
      void loadRoster(selectedSlotId).catch((loadError) => {
        setRoster([]);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load roster');
      });
    }
  }, [selectedSlotId, loadRoster]);

  useEffect(() => {
    setSecondsLeft(qrSecondsLeft(activeSession));
    const countdown = window.setInterval(() => {
      setSecondsLeft(qrSecondsLeft(activeSession));
    }, 500);
    return () => window.clearInterval(countdown);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession?.isActive || activeSession.mode === 'manual') return undefined;

    const interval = window.setInterval(() => {
      void refreshAttendanceSession(activeSession.id).catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh QR code');
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeSession?.id, activeSession?.isActive, activeSession?.mode, refreshAttendanceSession]);

  const startQrSession = async (slot: ScheduleSlot) => {
    setBusy(true);
    setError('');
    try {
      await startAttendanceSession({ scheduleId: slot.id, mode: 'qr' });
      await loadSessions();
      setTab('qr');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start attendance session');
    } finally {
      setBusy(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError('');
    try {
      await stopAttendanceSession(activeSession.id);
      await loadSessions();
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Unable to stop attendance session');
    } finally {
      setBusy(false);
    }
  };

  const submitManualAttendance = async () => {
    if (!selectedSlot || roster.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const session = await startAttendanceSession({ scheduleId: selectedSlot.id, mode: 'manual' });
      await applyManualAttendance(
        session.id,
        roster.map((student) => ({
          studentId: student.id,
          studentName: student.name,
          present: manualMarks[student.id] ?? false,
        })),
      );
      await stopAttendanceSession(session.id);
      await loadSessions();
      setTab('records');
    } catch (manualError) {
      setError(manualError instanceof Error ? manualError.message : 'Unable to submit manual attendance');
    } finally {
      setBusy(false);
    }
  };

  const setAllManual = (present: boolean) => {
    const next: Record<string, boolean> = {};
    roster.forEach((student) => {
      next[student.id] = present;
    });
    setManualMarks(next);
  };

  const activeRosterSize = roster.length || activeSession?.attendees.length || 0;
  const teacherPresent = activeSession ? presentCount(activeSession) : 0;
  const sessionPercent = attendancePercent(teacherPresent, activeRosterSize);

  return (
    <AttendanceShell
      title="Class Attendance"
      subtitle="Start rotating QR sessions, submit manual attendance, and review records by scheduled class."
      actions={
        <div className="attendance-tabs" role="tablist">
          <button className={tab === 'qr' ? 'is-active' : ''} onClick={() => setTab('qr')} type="button"><QrCode size={15} /> QR</button>
          <button className={tab === 'manual' ? 'is-active' : ''} onClick={() => setTab('manual')} type="button"><ListChecks size={15} /> Manual</button>
          <button className={tab === 'records' ? 'is-active' : ''} onClick={() => setTab('records')} type="button"><History size={15} /> Records</button>
        </div>
      }
    >
      {error ? <div className="attendance-alert"><AlertCircle size={16} /> {error}</div> : null}

      <div className="attendance-metrics">
        <MetricCard icon={<CalendarDays size={20} />} value={teacherSlots.length} label="Assigned classes" />
        <MetricCard icon={<Users size={20} />} value={activeRosterSize} label="Class roster" tone="purple" />
        <MetricCard icon={<UserCheck size={20} />} value={teacherPresent} label="Present now" tone="green" />
        <MetricCard icon={<Download size={20} />} value={`${sessionPercent}%`} label="Current rate" tone="gold" />
      </div>

      {tab === 'qr' ? (
        activeSession ? (
          <div className="attendance-live-grid">
            <div className="attendance-panel attendance-qr-panel">
              <div className="attendance-live-head">
                <span className="attendance-live-dot" />
                <div>
                  <h3>{activeSession.courseName}</h3>
                  <p>{activeSession.courseCode} | {activeSession.department} Sem {activeSession.semester || '-'} | {activeSession.room || 'Room not set'}</p>
                </div>
              </div>

              <div className="attendance-qr-frame">
                <QRCodeSVG value={activeSession.currentQR} size={236} level="H" />
              </div>
              <div className="attendance-qr-meta">
                <span>Refreshes every 5 seconds</span>
                <strong>{secondsLeft}s</strong>
              </div>
              <button className="btn btn--danger btn--lg" onClick={endSession} disabled={busy} type="button">
                <Square size={18} />
                End Session
              </button>
            </div>

            <div className="attendance-panel">
              <div className="attendance-panel__head">
                <div>
                  <h3>Live Present List</h3>
                  <span>{presentCount(activeSession)} students marked</span>
                </div>
                <span className="attendance-pill">{activeSession.mode.toUpperCase()}</span>
              </div>
              {activeSession.attendees.filter((record) => record.status === 'present').length === 0 ? (
                <EmptyState icon={<Users size={30} />} title="No scans yet" body="Students will appear here immediately after scanning the current QR." />
              ) : (
                <div className="attendance-roster">
                  {activeSession.attendees.filter((record) => record.status === 'present').map((record) => (
                    <div className="attendance-roster__row" key={record.id}>
                      <div className="attendance-avatar">{record.studentName.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <strong>{record.studentName}</strong>
                        <span>{record.studentId} | {record.timestamp}</span>
                      </div>
                      <CheckCircle size={18} className="attendance-icon-green" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="attendance-panel">
            <div className="attendance-panel__head">
              <div>
                <h3>Start QR Attendance</h3>
                <span>Select a schedule slot. The server will rotate the QR token every 5 seconds.</span>
              </div>
            </div>
            {teacherSlots.length === 0 ? (
              <EmptyState icon={<CalendarDays size={32} />} title="No scheduled classes" body="Admin must add schedule slots before attendance can be started." />
            ) : (
              <div className="attendance-class-grid">
                {(todaySlots.length > 0 ? todaySlots : teacherSlots).map((slot) => (
                  <button className="attendance-class-card" key={slot.id} onClick={() => startQrSession(slot)} disabled={busy} type="button">
                    <span><Clock size={14} /> {slot.day} {slot.startTime}-{slot.endTime}</span>
                    <strong>{slot.subject}</strong>
                    <small>{slot.courseCode} | {slot.course} Sem {slot.semester} | {slot.room}</small>
                    <em><Play size={14} /> Start QR</em>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      ) : null}

      {tab === 'manual' ? (
        <div className="attendance-panel">
          <div className="attendance-panel__head attendance-panel__head--stack">
            <div>
              <h3>Manual Attendance</h3>
              <span>Roster is loaded by selected department and semester from the registered users database.</span>
            </div>
            <select value={selectedSlot?.id ?? ''} onChange={(event) => setSelectedSlotId(event.target.value)} className="attendance-select">
              {teacherSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.subject} - {classLabel(slot)}</option>
              ))}
            </select>
          </div>

          {!selectedSlot ? (
            <EmptyState icon={<CalendarDays size={32} />} title="No class selected" body="Select a scheduled class to load the department roster." />
          ) : roster.length === 0 ? (
            <EmptyState icon={<Users size={32} />} title="No students in roster" body="Add students to this department and semester from admin user management." />
          ) : (
            <>
              <div className="attendance-manual-toolbar">
                <div>
                  <strong>{selectedSlot.subject}</strong>
                  <span>{selectedSlot.department} | {selectedSlot.course} Sem {selectedSlot.semester}</span>
                </div>
                <div>
                  <button className="btn btn--outline" onClick={() => setAllManual(true)} type="button">All Present</button>
                  <button className="btn btn--outline" onClick={() => setAllManual(false)} type="button">All Absent</button>
                </div>
              </div>
              <div className="attendance-roster attendance-roster--manual">
                {roster.map((student) => {
                  const present = manualMarks[student.id] ?? false;
                  return (
                    <div className="attendance-roster__row" key={student.id}>
                      <div className="attendance-avatar">{student.name.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <strong>{student.name}</strong>
                        <span>{student.id} | {student.email}</span>
                      </div>
                      <button
                        className={`attendance-toggle ${present ? 'attendance-toggle--present' : 'attendance-toggle--absent'}`}
                        onClick={() => setManualMarks((prev) => ({ ...prev, [student.id]: !present }))}
                        type="button"
                      >
                        {present ? <UserCheck size={16} /> : <UserX size={16} />}
                        {present ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="attendance-panel__foot">
                <span>{Object.values(manualMarks).filter(Boolean).length} present, {roster.length - Object.values(manualMarks).filter(Boolean).length} absent</span>
                <button className="btn btn--primary" onClick={submitManualAttendance} disabled={busy} type="button">
                  <ListChecks size={17} />
                  Submit Manual Attendance
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === 'records' ? (
        <div className="attendance-panel">
          <div className="attendance-panel__head">
            <div>
              <h3>My Attendance Sessions</h3>
              <span>{sessions.length} database-backed academic records</span>
            </div>
            <button className="btn btn--outline" onClick={loadSessions} type="button"><RefreshCw size={16} /> Refresh</button>
          </div>
          {sessions.length === 0 ? (
            <EmptyState icon={<History size={32} />} title="No session records" body="QR and manual attendance sessions will appear after they are submitted." />
          ) : (
            <>
              <div className="attendance-record-grid">
                {sessions.slice(0, 6).map((session) => {
                  const sample = session.attendees[0];
                  const total = Math.max(session.attendees.length, roster.length || session.attendees.length);
                  return (
                    <article className="attendance-record-card" key={session.id}>
                      <div className="attendance-record-card__top">
                        <span className="attendance-pill">{session.mode.toUpperCase()}</span>
                        <StatusBadge status={session.isActive ? 'pending' : 'present'} />
                      </div>
                      <h4>{subjectFor(session, sample)}</h4>
                      <p>{scopeFor(session, sample)}</p>
                      <div className="attendance-record-card__meta">
                        <span><CalendarDays size={14} /> {sessionDate(session)}</span>
                        <span><Users size={14} /> {presentCount(session)} / {total || 0} present</span>
                        <span><BookOpen size={14} /> {session.courseCode}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Academic Scope</th>
                      <th>Faculty / Room</th>
                      <th>Mode</th>
                      <th>Present</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const sample = session.attendees[0];
                      return (
                        <tr key={session.id}>
                          <td>
                            <strong>{subjectFor(session, sample)}</strong>
                            <span>{session.courseCode}</span>
                          </td>
                          <td>
                            <strong>{sample?.department ?? session.department}</strong>
                            <span>{scopeFor(session, sample)}</span>
                          </td>
                          <td>
                            <strong>{sample?.facultyName ?? session.faculty}</strong>
                            <span>{sample?.room ?? session.room ?? 'Room not set'}</span>
                          </td>
                          <td><span className="attendance-pill">{session.mode.toUpperCase()}</span></td>
                          <td>{presentCount(session)} / {Math.max(session.attendees.length, presentCount(session))}</td>
                          <td>{sessionDate(session)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}
    </AttendanceShell>
  );
};

const StudentAttendanceView: React.FC = () => {
  const { attendanceSession, markAttendance } = useApp();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<'scan' | 'records'>('scan');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [justMarked, setJustMarked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(qrSecondsLeft(attendanceSession));
  const scanInFlightRef = useRef(false);

  const activeSession = attendanceSession?.isActive && attendanceSession.mode !== 'manual' ? attendanceSession : null;

  const loadSessions = useCallback(async () => {
    setSessions(await api.attendance.listSessions());
  }, []);

  useEffect(() => {
    void loadSessions().catch(() => {});
    const interval = window.setInterval(() => {
      void loadSessions().catch(() => {});
    }, 10000);
    return () => window.clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    setSecondsLeft(qrSecondsLeft(activeSession));
    const countdown = window.setInterval(() => {
      setSecondsLeft(qrSecondsLeft(activeSession));
    }, 500);
    return () => window.clearInterval(countdown);
  }, [activeSession]);

  const userRecord = useCallback((session: AttendanceSession) =>
    session.attendees.find((record) => recordMatchesUser(record, currentUser?.id, currentUser?.enrollmentNo)),
  [currentUser]);

  const activeRecord = activeSession ? userRecord(activeSession) : undefined;
  const markedInActiveSession = activeRecord?.status === 'present';

  const handleScan = async (qrValue: string) => {
    if (!activeSession || scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    setScanning(false);
    setScanMessage(null);

    try {
      const result = await markAttendance(activeSession.id, qrValue);
      setJustMarked(true);
      setScanMessage({ type: 'success', text: result.message ?? 'Attendance marked successfully.' });
      await loadSessions();
      window.setTimeout(() => setJustMarked(false), 2400);
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : 'QR scan failed.';
      setScanMessage({
        type: message.toLowerCase().includes('already') ? 'success' : 'error',
        text: message.toLowerCase().includes('already') ? 'Attendance already marked for this class.' : message,
      });
    } finally {
      window.setTimeout(() => {
        scanInFlightRef.current = false;
      }, 900);
    }
  };

  const countedSessions = sessions.filter((session) => !session.isActive || userRecord(session));
  const presentRecords = countedSessions.filter((session) => userRecord(session)?.status === 'present').length;
  const absentRecords = countedSessions.filter((session) => {
    const record = userRecord(session);
    return !session.isActive && (record?.status === 'absent' || !record);
  }).length;
  const percent = attendancePercent(presentRecords, countedSessions.filter((session) => !session.isActive || userRecord(session)).length);

  return (
    <AttendanceShell
      title="My Attendance"
      subtitle="Scan the active class QR or review your department and semester attendance history."
      actions={
        <div className="attendance-tabs" role="tablist">
          <button className={tab === 'scan' ? 'is-active' : ''} onClick={() => setTab('scan')} type="button"><ScanLine size={15} /> Scan</button>
          <button className={tab === 'records' ? 'is-active' : ''} onClick={() => setTab('records')} type="button"><History size={15} /> Records</button>
        </div>
      }
    >
      <div className="attendance-metrics">
        <MetricCard icon={<CalendarDays size={20} />} value={countedSessions.length} label="Classes counted" />
        <MetricCard icon={<UserCheck size={20} />} value={presentRecords} label="Present" tone="green" />
        <MetricCard icon={<UserX size={20} />} value={absentRecords} label="Absent" tone="red" />
        <MetricCard icon={<Download size={20} />} value={`${percent}%`} label="Attendance" tone="gold" />
      </div>

      {tab === 'scan' ? (
        <div className="attendance-panel attendance-student-scan">
          {activeSession ? (
            <>
              <div className="attendance-live-head">
                <span className="attendance-live-dot" />
                <div>
                  <h3>{activeSession.courseName}</h3>
                  <p>{activeSession.faculty} | {activeSession.room || 'Room not set'} | {activeSession.courseCode}</p>
                </div>
              </div>

              {markedInActiveSession || justMarked ? (
                <div className={`attendance-confirmed ${justMarked ? 'attendance-confirmed--pop' : ''}`}>
                  <div className="attendance-confirmed__mark"><CheckCircle size={46} /></div>
                  <h3>Attendance marked</h3>
                  <p>You are recorded present for this session.</p>
                  <div className="attendance-confirmed__scope">
                    <strong>{subjectFor(activeSession, activeRecord)}</strong>
                    <span>{scopeFor(activeSession, activeRecord)}</span>
                    <small>{recordTime(activeRecord)} | {activeRecord?.room ?? activeSession.room ?? 'Room not set'}</small>
                  </div>
                </div>
              ) : scanning ? (
                <div className="attendance-scanner">
                  <Scanner
                    onScan={(result) => {
                      const rawValue = result?.[0]?.rawValue;
                      if (rawValue) void handleScan(rawValue);
                    }}
                    onError={(error) => {
                      setScanMessage({ type: 'error', text: error instanceof Error ? error.message : 'Camera scan failed.' });
                    }}
                    paused={scanInFlightRef.current}
                    scanDelay={350}
                    sound
                    formats={['qr_code']}
                  />
                  <button className="btn btn--danger btn--full" onClick={() => setScanning(false)} type="button">Cancel Scan</button>
                </div>
              ) : (
                <div className="attendance-scan-box">
                  <div className="attendance-scan-box__target"><QrCode size={62} /></div>
                  <button className="btn btn--primary btn--lg" onClick={() => setScanning(true)} type="button">
                    <ScanLine size={20} />
                    Scan Board QR
                  </button>
                  <span>Current QR expires in {secondsLeft}s</span>
                </div>
              )}

              {scanMessage ? (
                <div className={`attendance-alert attendance-alert--${scanMessage.type}`}>
                  {scanMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {scanMessage.text}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState icon={<QrCode size={34} />} title="No active QR session" body="When your teacher starts attendance for your department and semester, it will appear here automatically." />
          )}
        </div>
      ) : null}

      {tab === 'records' ? (
        <div className="attendance-panel">
          <div className="attendance-panel__head">
            <div>
              <h3>Attendance Records</h3>
              <span>{currentUser?.department} | Sem {currentUser?.semester || '-'}</span>
            </div>
            <button className="btn btn--outline" onClick={loadSessions} type="button"><RefreshCw size={16} /> Refresh</button>
          </div>
          {sessions.length === 0 ? (
            <EmptyState icon={<History size={32} />} title="No attendance history" body="Records will appear after classes are marked by QR or manual attendance." />
          ) : (
            <>
              <div className="attendance-record-grid attendance-record-grid--student">
                {sessions.map((session) => {
                  const record = userRecord(session);
                  const status = session.isActive && !record ? 'pending' : record?.status ?? 'absent';
                  return (
                    <article className={`attendance-record-card attendance-record-card--${status}`} key={session.id}>
                      <div className="attendance-record-card__top">
                        <span className="attendance-pill">{(record?.mode ?? session.mode).toUpperCase()}</span>
                        <StatusBadge status={status} />
                      </div>
                      <h4>{subjectFor(session, record)}</h4>
                      <p>{scopeFor(session, record)}</p>
                      <div className="attendance-record-card__meta">
                        <span><CalendarDays size={14} /> {sessionDate(session)}</span>
                        <span><Clock size={14} /> {recordTime(record) || session.startTime}</span>
                        <span><BookOpen size={14} /> {record?.courseCode ?? session.courseCode}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Academic Scope</th>
                      <th>Faculty / Room</th>
                      <th>Mode</th>
                      <th>Marked At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const record = userRecord(session);
                      const status = session.isActive && !record ? 'pending' : record?.status ?? 'absent';
                      return (
                        <tr key={session.id}>
                          <td>
                            <strong>{subjectFor(session, record)}</strong>
                            <span>{record?.courseCode ?? session.courseCode}</span>
                          </td>
                          <td>
                            <strong>{record?.department ?? session.department}</strong>
                            <span>{scopeFor(session, record)}</span>
                          </td>
                          <td>
                            <strong>{record?.facultyName ?? session.faculty}</strong>
                            <span>{record?.room ?? session.room ?? 'Room not set'}</span>
                          </td>
                          <td><span className="attendance-pill">{(record?.mode ?? session.mode).toUpperCase()}</span></td>
                          <td>{recordTime(record) || session.startTime}</td>
                          <td><StatusBadge status={status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}
    </AttendanceShell>
  );
};

const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;
  if (currentUser.role === 'admin') return <AdminAttendanceView />;
  if (currentUser.role === 'teacher') return <TeacherAttendanceView />;
  return <StudentAttendanceView />;
};

export default AttendancePage;
