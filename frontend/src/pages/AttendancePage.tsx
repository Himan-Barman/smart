import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import type { ScheduleSlot, DayOfWeek } from '../types';
import {
  Play, Square, Users, Clock, CheckCircle,
  QrCode, BookOpen, CalendarDays, Search, Building2, ChevronRight, X, List, ToggleRight
} from 'lucide-react';

const QR_REFRESH_INTERVAL = 5000;
const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Mock Data ---
const mockStudents = [
  { id: 'CS2024001', name: 'Rahul Sharma', sem: 4, dept: 'Computer Science', totalAttended: 45, totalClasses: 50 },
  { id: 'CS2024002', name: 'Priya Patel', sem: 4, dept: 'Computer Science', totalAttended: 48, totalClasses: 50 },
  { id: 'EE2024010', name: 'Amit Kumar', sem: 2, dept: 'Electrical Engineering', totalAttended: 30, totalClasses: 40 },
  { id: 'ME2024015', name: 'Sneha Gupta', sem: 6, dept: 'Mechanical Engineering', totalAttended: 55, totalClasses: 60 },
];

const mockPastRecords = [
  { date: '2024-04-25', course: 'Data Structures', status: 'Present', type: 'QR' },
  { date: '2024-04-24', course: 'Algorithms', status: 'Present', type: 'Manual' },
  { date: '2024-04-23', course: 'Operating Systems', status: 'Absent', type: '-' },
  { date: '2024-04-22', course: 'Data Structures', status: 'Present', type: 'QR' },
];

// ==========================================
// ADMIN ATTENDANCE VIEW
// ==========================================
const AdminAttendanceView: React.FC = () => {
  const { departments } = useApp();
  const [viewState, setViewState] = useState<'departments' | 'semesters' | 'records'>('departments');
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [selectedSem, setSelectedSem] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return [];
    return mockStudents.filter(s => 
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleDeptClick = (dept: any) => {
    setSelectedDept(dept);
    setViewState('semesters');
  };

  const handleSemClick = (sem: number) => {
    setSelectedSem(sem);
    setViewState('records');
  };

  const getStudentsForSem = () => {
    return mockStudents.filter(s => s.dept === selectedDept?.name && s.sem === selectedSem);
  };

  return (
    <div className="page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page__header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="page__title">Institutional Attendance</h2>
          <p className="page__subtitle">Monitor attendance records across all departments.</p>
        </div>
      </div>

      {/* Global Search */}
      <div className="admin-search" style={{ marginBottom: '24px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px', boxShadow: 'var(--shadow-card)' }}>
          <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
          <input 
            type="text" 
            placeholder="Search any student by ID or Name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '15px', color: 'var(--text-primary)' }}
          />
          {searchQuery && <X size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />}
        </div>
        
        {searchQuery && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 10, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            {filteredStudents.length > 0 ? filteredStudents.map((s, i) => (
              <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-primary)' }}>{s.name}</h4>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.id} • {s.dept} • Sem {s.sem}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: (s.totalAttended/s.totalClasses) > 0.75 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {Math.round((s.totalAttended/s.totalClasses) * 100)}%
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attendance</span>
                </div>
              </div>
            )) : <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No student found.</div>}
          </div>
        )}
      </div>

      {viewState === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {departments.map(dept => (
            <div key={dept.id} onClick={() => handleDeptClick(dept)} style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: '0.2s', boxShadow: 'var(--shadow-card)' }} className="hover-lift">
              <Building2 size={32} color="var(--accent-blue)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', margin: '0 0 8px', color: 'var(--text-primary)' }}>{dept.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>HOD: {dept.hod}</p>
            </div>
          ))}
        </div>
      )}

      {viewState === 'semesters' && (
        <div>
          <button className="btn btn--ghost" onClick={() => setViewState('departments')} style={{ marginBottom: '20px' }}>← Back to Departments</button>
          <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>{selectedDept?.name} - Semesters</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[ { year: '1st Year', sems: [1,2] }, { year: '2nd Year', sems: [3,4] }, { year: '3rd Year', sems: [5,6] }, { year: '4th Year', sems: [7,8] } ].map(yr => (
              <div key={yr.year} style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>{yr.year}</h4>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {yr.sems.map(sem => (
                    <div key={sem} onClick={() => handleSemClick(sem)} style={{ flex: 1, padding: '20px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hover-lift">
                      <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Semester {sem}</span>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewState === 'records' && (
        <div>
          <button className="btn btn--ghost" onClick={() => setViewState('semesters')} style={{ marginBottom: '20px' }}>← Back to Semesters</button>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Attendance Records - Sem {selectedSem}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Student ID</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>Classes Attended</th>
                  <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {getStudentsForSem().map(s => {
                  const perc = Math.round((s.totalAttended/s.totalClasses)*100);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.id}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{s.name}</td>
                      <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{s.totalAttended} / {s.totalClasses}</td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '700', color: perc > 75 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{perc}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {getStudentsForSem().length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No students found for this semester.</p>}
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// TEACHER ATTENDANCE VIEW
// ==========================================
const TeacherAttendanceView: React.FC = () => {
  const { attendanceSession, startAttendanceSession, stopAttendanceSession, schedule } = useApp();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<'live' | 'manual' | 'records'>('live');
  const [manualClass, setManualClass] = useState<any>(null);
  
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const todayClasses = useMemo(() => {
    const dayIdx = new Date().getDay();
    const today = dayIdx >= 1 && dayIdx <= 6 ? DAYS[dayIdx - 1] : null;
    if (!today) return [];
    return schedule.filter(s => s.day === today && s.facultyId === currentUser?.id);
  }, [schedule, currentUser]);

  const generateNewQR = useCallback(() => {
    const newQR = `SMARTCAMPUS-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    setQrValue(newQR);
    setTimeLeft(5);
    if (attendanceSession?.isActive) attendanceSession.currentQR = newQR;
  }, [attendanceSession]);

  useEffect(() => {
    if (attendanceSession?.isActive && mode === 'live') {
      generateNewQR();
      timerRef.current = setInterval(() => {
        generateNewQR();
      }, QR_REFRESH_INTERVAL);
      const countdown = setInterval(() => setTimeLeft(p => (p <= 1 ? 5 : p - 1)), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        clearInterval(countdown);
      };
    }
  }, [attendanceSession?.isActive, mode, generateNewQR]);

  const handleStartQR = (slot: ScheduleSlot) => {
    startAttendanceSession(slot.subject, slot.courseCode, slot.faculty, slot.room, slot.id);
  };

  const handleManualToggle = (studentId: string, present: boolean) => {
    // Mock toggle
    alert(`Marked ${studentId} as ${present ? 'Present' : 'Absent'} manually.`);
  };

  return (
    <div className="page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="page__title">Class Attendance</h2>
          <p className="page__subtitle">Take live QR attendance, mark manually, or view records.</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <button className={`btn ${mode === 'live' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('live')} style={{ padding: '8px 16px' }}><QrCode size={16}/> Live QR</button>
          <button className={`btn ${mode === 'manual' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('manual')} style={{ padding: '8px 16px' }}><ToggleRight size={16}/> Manual</button>
          <button className={`btn ${mode === 'records' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('records')} style={{ padding: '8px 16px' }}><List size={16}/> Records</button>
        </div>
      </div>

      {mode === 'live' && (
        <div>
          {!attendanceSession?.isActive ? (
            <div className="att-classes" style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}><CalendarDays size={20} className="text-accent-blue" /> Today's Classes</h3>
              {todayClasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><BookOpen size={48} style={{ opacity: 0.3, marginBottom: '16px' }} /><p>No classes scheduled today.</p></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {todayClasses.map(slot => (
                    <div key={slot.id} style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {slot.startTime} - {slot.endTime}</div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--text-primary)' }}>{slot.subject}</h4>
                      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{slot.courseCode} • {slot.room}</p>
                      <button className="btn btn--primary btn--full" onClick={() => handleStartQR(slot)}><Play size={16}/> Start Session</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(229,83,61,0.1)', color: 'var(--accent-red)', borderRadius: '20px', fontSize: '12px', fontWeight: '700', marginBottom: '24px', animation: 'pulse 2s infinite' }}>● LIVE SESSION</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '24px' }}>{attendanceSession.courseName}</h3>
                <p style={{ margin: '0 0 32px', color: 'var(--text-secondary)' }}>{attendanceSession.room}</p>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                  <QRCodeSVG value={qrValue} size={240} level="H" fgColor="#0C0C0C" />
                </div>
                <p style={{ marginTop: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--accent-blue)' }}>Refreshes in {timeLeft}s</p>
                <button className="btn btn--danger btn--lg" onClick={stopAttendanceSession} style={{ marginTop: '32px' }}><Square size={18}/> End Session</button>
              </div>
              <div style={{ width: '350px', background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)', maxHeight: '600px', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18}/> Present</span>
                  <span style={{ background: 'var(--surface-3)', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>{attendanceSession.attendees.length}</span>
                </h3>
                {attendanceSession.attendees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No scans yet...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {attendanceSession.attendees.map((att, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}>{att.studentName.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '14px' }}>{att.studentName}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{att.studentId}</span>
                        </div>
                        <CheckCircle size={16} color="var(--accent-green)" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ margin: '0 0 20px' }}>Manual Attendance</h3>
          {!manualClass ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {todayClasses.map(slot => (
                <div key={slot.id} onClick={() => setManualClass(slot)} style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px', border: '1px solid var(--glass-border)', cursor: 'pointer' }} className="hover-lift">
                  <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--text-primary)' }}>{slot.subject}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{slot.courseCode} • {slot.startTime}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <button className="btn btn--ghost" onClick={() => setManualClass(null)} style={{ marginBottom: '20px' }}>← Back to Classes</button>
              <h4 style={{ marginBottom: '20px', fontSize: '18px' }}>{manualClass.subject} - Student List</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Student</th>
                    <th style={{ padding: '12px 16px' }}>ID</th>
                    <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mockStudents.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '16px', fontWeight: '600' }}>{s.name}</td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{s.id}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button className="btn btn--outline" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)', padding: '6px 12px' }} onClick={() => handleManualToggle(s.id, true)}>Present</button>
                          <button className="btn btn--outline" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', padding: '6px 12px' }} onClick={() => handleManualToggle(s.id, false)}>Absent</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mode === 'records' && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ margin: '0 0 20px' }}>Department Student Records</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Student ID</th>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Sem</th>
                <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>Overall %</th>
              </tr>
            </thead>
            <tbody>
              {mockStudents.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px' }}>{s.id}</td>
                  <td style={{ padding: '16px', fontWeight: '600' }}>{s.name}</td>
                  <td style={{ padding: '16px' }}>{s.sem}</td>
                  <td style={{ padding: '16px', fontWeight: '700', color: (s.totalAttended/s.totalClasses) > 0.75 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{Math.round((s.totalAttended/s.totalClasses)*100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// ==========================================
// STUDENT ATTENDANCE VIEW
// ==========================================
const StudentAttendanceView: React.FC = () => {
  const { attendanceSession, markAttendance } = useApp();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<'live' | 'records'>('live');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (qrValue: string) => {
    setIsScanning(false);
    if (!attendanceSession?.isActive) {
      setScanResult('error'); setTimeout(() => setScanResult(null), 3000);
      return;
    }
    const success = markAttendance(currentUser!.enrollmentNo || currentUser!.id, currentUser!.name, qrValue);
    setScanResult(success ? 'success' : 'error');
    setTimeout(() => setScanResult(null), 3000);
  };

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="page__title">My Attendance</h2>
          <p className="page__subtitle">Mark your attendance or view your past records.</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <button className={`btn ${mode === 'live' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('live')} style={{ padding: '8px 16px' }}><QrCode size={16}/> Scan QR</button>
          <button className={`btn ${mode === 'records' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('records')} style={{ padding: '8px 16px' }}><List size={16}/> Records</button>
        </div>
      </div>

      {mode === 'live' && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
          {attendanceSession?.isActive ? (
            <div>
              <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(59,108,245,0.1)', color: 'var(--accent-blue)', borderRadius: '20px', fontSize: '12px', fontWeight: '700', marginBottom: '24px' }}>● LIVE CLASS</div>
              <h3 style={{ fontSize: '24px', margin: '0 0 8px' }}>{attendanceSession.courseName}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{attendanceSession.faculty} • {attendanceSession.room}</p>
              
              {isScanning ? (
                <div style={{ maxWidth: '400px', margin: '0 auto 32px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}>
                  <Scanner 
                    onScan={(result) => { if (result && result.length) handleScan(result[0].rawValue); }} 
                    formats={['qr_code']}
                  />
                  <div style={{ padding: '16px', background: 'var(--surface-2)' }}>
                    <button className="btn btn--danger btn--full" onClick={() => setIsScanning(false)}>Cancel Scan</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ width: '200px', height: '200px', border: '3px dashed var(--accent-blue)', borderRadius: '24px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
                    <QrCode size={64} color="var(--accent-blue)" style={{ opacity: 0.5 }} />
                  </div>
                  
                  <button className="btn btn--primary btn--lg" onClick={() => setIsScanning(true)} style={{ padding: '16px 48px', fontSize: '18px' }}><QrCode size={20}/> Scan Board QR</button>
                </>
              )}

              {scanResult && (
                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: scanResult === 'success' ? 'rgba(60, 203, 127, 0.1)' : 'rgba(229, 83, 61, 0.1)', color: scanResult === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: '600' }}>
                  {scanResult === 'success' ? '✅ Attendance marked successfully!' : '❌ Failed to scan or QR expired.'}
                </div>
              )}
            </div>
          ) : (
            <div>
              <QrCode size={64} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '20px' }} />
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No Active Session</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Please wait for your professor to start the attendance session on the board.</p>
            </div>
          )}
        </div>
      )}

      {mode === 'records' && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>Past Records</h3>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overall Attendance</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-green)' }}>85%</div>
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Course</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockPastRecords.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{r.date}</td>
                  <td style={{ padding: '16px', fontWeight: '600' }}>{r.course}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>{r.type}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: r.status === 'Present' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// ==========================================
// MAIN WRAPPER
// ==========================================
const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  
  if (!currentUser) return null;
  if (currentUser.role === 'admin') return <AdminAttendanceView />;
  if (currentUser.role === 'teacher') return <TeacherAttendanceView />;
  return <StudentAttendanceView />;
};

export default AttendancePage;
