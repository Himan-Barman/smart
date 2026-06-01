import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { DayOfWeek, ScheduleSlot } from '../types';
import AdvancedTimePicker from '../components/AdvancedTimePicker';
import SuggestInput from '../components/SuggestInput';
import type { SuggestOption } from '../components/SuggestInput';
import AcademicCalendarView from './AcademicCalendarView';
import {
  Plus, Trash2, Edit3, X, Check, Clock, MapPin, BookOpen,
  Filter, Monitor, FlaskConical, PenTool, Presentation,
  User, Hash, Building, GraduationCap, CalendarDays, Layers,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT: Record<DayOfWeek, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const TYPE_COLORS: Record<string, string> = { lecture: '#3b6cf5', lab: '#1a9d5c', tutorial: '#d07a1a', seminar: '#6c52e8' };
const TYPE_META = [
  { value: 'lecture', label: 'Lecture', icon: Monitor, color: '#3b6cf5' },
  { value: 'lab', label: 'Lab', icon: FlaskConical, color: '#1a9d5c' },
  { value: 'tutorial', label: 'Tutorial', icon: PenTool, color: '#d07a1a' },
  { value: 'seminar', label: 'Seminar', icon: Presentation, color: '#6c52e8' },
];

const typeColor = (t: string) => {
  switch (t) {
    case 'core': return { bg: 'rgba(59,108,245,0.08)', c: '#3b6cf5' };
    case 'elective': return { bg: 'rgba(108,82,232,0.08)', c: '#6c52e8' };
    case 'lab': return { bg: 'rgba(26,157,92,0.08)', c: '#1a9d5c' };
    case 'project': return { bg: 'rgba(208,122,26,0.08)', c: '#d07a1a' };
    default: return { bg: 'rgba(138,138,138,0.08)', c: '#8A8A8A' };
  }
};

const SchedulePage: React.FC = () => {
  const { schedule, addScheduleSlot, updateScheduleSlot, deleteScheduleSlot, departments, rooms } = useApp();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 6 ? DAYS[d - 1] : 'Monday';
  });
  const [viewMode, setViewMode] = useState<'schedule' | 'calendar'>('schedule');
  const [filterDept, setFilterDept] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ScheduleSlot, 'id'>>({
    day: 'Monday', startTime: '09:00', endTime: '10:00', subject: '', courseCode: '',
    faculty: '', facultyId: '', room: '', type: 'lecture',
    department: '', semester: 0, course: '',
  });

  const canEdit = role === 'admin';

  /* ─── Filtered schedule view ─── */
  const filteredSchedule = useMemo(() => {
    let slots = schedule;
    if (role === 'student') {
      slots = slots.filter(s => s.department === currentUser?.department && s.semester === currentUser?.semester && s.course === currentUser?.course);
    } else if (role === 'teacher') {
      if (filterDept === 'mine') slots = slots.filter(s => s.facultyId === currentUser?.id);
      else if (filterDept !== 'all') slots = slots.filter(s => s.department === filterDept);
    } else {
      if (filterDept !== 'all') slots = slots.filter(s => s.department === filterDept);
    }
    return slots.filter(s => s.day === activeDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedule, activeDay, role, currentUser, filterDept]);

  const scheduleDepartments = departments.map((department) => department.name);

  /* ═══ SUGGEST OPTIONS ═══ */

  // Department options
  const deptOptions: SuggestOption[] = useMemo(() =>
    departments.map(d => ({
      id: d.id, label: d.name, sub: d.code,
      meta: d.course, badge: `${d.totalSemesters} sem`,
      badgeBg: 'rgba(59,108,245,0.08)', badgeColor: '#3b6cf5',
    })), [departments]);

  // Semester options (based on selected dept)
  const selectedDept = useMemo(() => departments.find(d => d.name === form.department), [departments, form.department]);
  const semOptions: SuggestOption[] = useMemo(() => {
    if (!selectedDept) return [];
    return selectedDept.semesters
      .map(s => s.semester)
      .sort((a, b) => a - b)
      .map(s => ({
        id: `sem-${s}`, label: `Semester ${s}`, sub: `Sem ${s}`,
        meta: `${selectedDept.semesters.find(ss => ss.semester === s)?.subjects.length || 0} subjects`,
        badge: `${s}`, badgeBg: 'rgba(108,82,232,0.08)', badgeColor: '#6c52e8',
      }));
  }, [selectedDept]);

  // Subject options (based on dept + semester)
  const availableSubjects = useMemo(() => {
    if (!selectedDept || !form.semester) return [];
    const semData = selectedDept.semesters.find(s => s.semester === form.semester);
    return semData ? semData.subjects : [];
  }, [selectedDept, form.semester]);

  const subjectOptions: SuggestOption[] = useMemo(() =>
    availableSubjects.map(s => {
      const tc = typeColor(s.type);
      return {
        id: s.id, label: s.name, sub: s.code,
        meta: `${s.credits} credits`, badge: s.type,
        badgeBg: tc.bg, badgeColor: tc.c,
      };
    }), [availableSubjects]);

  // Room options — from rooms context + unique rooms from schedule
  const roomOptions: SuggestOption[] = useMemo(() => {
    const fromRooms = rooms.map(r => ({
      id: r.id, label: r.name, sub: `${r.building} · Floor ${r.floor}`,
      meta: `${r.capacity} seats`, badge: r.available ? 'Available' : 'Occupied',
      badgeBg: r.available ? 'rgba(60,203,127,0.08)' : 'rgba(229,83,61,0.08)',
      badgeColor: r.available ? '#3CCB7F' : '#E5533D',
    }));
    // Also include short room names from schedule that aren't in rooms
    const schedRooms = [...new Set(schedule.map(s => s.room))].filter(r => !fromRooms.some(fr => fr.label === r));
    const extra = schedRooms.map(r => ({
      id: `sr-${r}`, label: r, sub: 'From schedule',
      badge: 'Recent', badgeBg: 'rgba(138,138,138,0.08)', badgeColor: '#8A8A8A',
    }));
    return [...fromRooms, ...extra];
  }, [rooms, schedule]);

  // Faculty options — from unique faculty in schedule
  const facultyOptions: SuggestOption[] = useMemo(() => {
    const map = new Map<string, { name: string; id: string; dept: string }>();
    schedule.forEach(s => {
      if (s.faculty && !map.has(s.faculty)) {
        map.set(s.faculty, { name: s.faculty, id: s.facultyId, dept: s.department });
      }
    });
    return Array.from(map.values()).map(f => ({
      id: f.id, label: f.name, sub: f.id,
      meta: f.dept, badge: 'Faculty',
      badgeBg: 'rgba(108,82,232,0.08)', badgeColor: '#6c52e8',
    }));
  }, [schedule]);

  /* ═══ HANDLERS ═══ */
  const handleDeptSelect = (opt: SuggestOption) => {
    const dept = departments.find(d => d.name === opt.label);
    setForm(prev => ({ ...prev, department: opt.label, course: dept?.course || '', semester: 0, subject: '', courseCode: '' }));
  };
  const handleSemSelect = (opt: SuggestOption) => {
    const sem = Number(opt.badge);
    setForm(prev => ({ ...prev, semester: sem, subject: '', courseCode: '' }));
  };
  const handleSubjectSelect = (opt: SuggestOption) => {
    const subj = availableSubjects.find(s => s.name === opt.label);
    setForm(prev => ({ ...prev, subject: opt.label, courseCode: subj?.code || opt.sub || '' }));
  };
  const handleRoomSelect = (opt: SuggestOption) => {
    setForm(prev => ({ ...prev, room: opt.label }));
  };
  const handleFacultySelect = (opt: SuggestOption) => {
    setForm(prev => ({ ...prev, faculty: opt.label, facultyId: opt.id }));
  };

  const openAdd = () => {
    const dd = departments.length > 0 ? departments[0] : null;
    setForm({
      day: activeDay, startTime: '09:00', endTime: '10:00',
      subject: '', courseCode: '', faculty: currentUser?.name || '', facultyId: currentUser?.id || '',
      room: '', type: 'lecture', department: dd?.name || '', course: dd?.course || '', semester: 0,
    });
    setEditingId(null); setShowForm(true);
  };
  const openEdit = (slot: ScheduleSlot) => { setForm({ ...slot }); setEditingId(slot.id); setShowForm(true); };
  const handleSave = () => {
    if (!form.subject || !form.courseCode || !form.startTime || !form.endTime) return;
    if (!selectedDept || !form.semester) return;
    const slot = { ...form, department: selectedDept.name, course: selectedDept.course };
    if (editingId) updateScheduleSlot(editingId, slot); else addScheduleSlot(slot);
    setShowForm(false); setEditingId(null);
  };

  const todayName = DAYS[new Date().getDay() - 1] || 'Monday';
  const durationMin = (() => {
    const [sh, sm] = form.startTime.split(':').map(Number);
    const [eh, em] = form.endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  })();

  const isCodeAutoFilled = !!form.courseCode && availableSubjects.some(s => s.code === form.courseCode);

  return (
    <div className="page">
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 className="page__title" style={{display:'flex',alignItems:'center',gap:'10px'}}>{viewMode === 'schedule' ? <Clock size={22}/> : <CalendarDays size={22}/>} {viewMode === 'schedule' ? 'Class Schedule' : 'Academic Calendar'}</h2>
          <p className="page__subtitle" style={{ transition: '0.3s' }}>
            {viewMode === 'schedule' 
              ? (role === 'student' ? `${currentUser?.course} · Sem ${currentUser?.semester}` : role === 'teacher' ? 'Your classes & university timetable' : 'University-wide timetable management')
              : 'Key dates, exams, and institutional events'}
          </p>
        </div>
        
        {/* Animated iOS-style segmented control aligned perfectly with heading */}
        <div style={{ position: 'relative', display: 'flex', background: 'var(--surface-2)', padding: '5px', borderRadius: '12px', border: '1px solid var(--glass-border)', width: '260px', flexShrink: 0, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{
            position: 'absolute', top: '5px', bottom: '5px', width: 'calc(50% - 5px)',
            background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.05)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: viewMode === 'schedule' ? 'translateX(0)' : 'translateX(100%)'
          }} />
          <button onClick={() => setViewMode('schedule')} style={{ position: 'relative', zIndex: 1, flex: 1, padding: '8px', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: viewMode === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
            <Clock size={16} style={{ color: viewMode === 'schedule' ? 'var(--accent-blue)' : 'inherit', transition: '0.3s' }} /> Schedule
          </button>
          <button onClick={() => setViewMode('calendar')} style={{ position: 'relative', zIndex: 1, flex: 1, padding: '8px', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: viewMode === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
            <CalendarDays size={16} style={{ color: viewMode === 'calendar' ? 'var(--accent-blue)' : 'inherit', transition: '0.3s' }} /> Academic
          </button>
        </div>
      </div>

      {/* Secondary Actions Row */}
      {viewMode === 'schedule' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px', minHeight: '36px' }}>
          {role !== 'student' && (
            <div className="sched-filter">
              <Filter size={14} />
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="all">All Departments</option>
                {role === 'teacher' && <option value="mine">My Classes</option>}
                {scheduleDepartments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {role === 'admin' && (
            <button className="btn btn--primary" onClick={openAdd}><Plus size={16} /> Add Slot</button>
          )}
        </div>
      )}

      {/* Animated Content Wrapper */}
      <div style={{ display: 'grid' }}>
        
        {/* SCHEDULE VIEW */}
        <div style={{
          gridArea: '1 / 1',
          opacity: viewMode === 'schedule' ? 1 : 0,
          transform: viewMode === 'schedule' ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: viewMode === 'schedule' ? 'auto' : 'none',
          visibility: viewMode === 'schedule' ? 'visible' : 'hidden',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Day tabs */}
          <div className="sched-days">
            {DAYS.map(day => (
              <button key={day} className={`sched-day ${activeDay === day ? 'sched-day--active' : ''} ${day === todayName ? 'sched-day--today' : ''}`} onClick={() => setActiveDay(day)}>
                <span className="sched-day__short">{DAY_SHORT[day]}</span>
                <span className="sched-day__full">{day}</span>
                {day === todayName && <span className="sched-day__dot" />}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="sched-timeline">
            {filteredSchedule.length === 0 ? (
              <div className="sched-empty"><BookOpen size={40} /><p>No classes on {activeDay}</p></div>
            ) : filteredSchedule.map(slot => (
              <div key={slot.id} className="sched-card" style={{ borderLeftColor: TYPE_COLORS[slot.type] }}>
                <div className="sched-card__time"><Clock size={13} /><span>{slot.startTime} – {slot.endTime}</span></div>
                <div className="sched-card__body">
                  <div className="sched-card__main">
                    <h4>{slot.subject}</h4>
                    <div className="sched-card__meta">
                      <span className="sched-tag" style={{ background: TYPE_COLORS[slot.type] + '12', color: TYPE_COLORS[slot.type] }}>{slot.type}</span>
                      <span><code>{slot.courseCode}</code></span>
                    </div>
                  </div>
                  <div className="sched-card__details">
                    <span><MapPin size={12} /> {slot.room}</span>
                    <span><BookOpen size={12} /> {slot.faculty}</span>
                    {role === 'admin' && <span className="sched-card__dept">{slot.department} · Sem {slot.semester}</span>}
                  </div>
                </div>
                {canEdit && (
                  <div className="sched-card__actions">
                    <button className="sched-icon-btn" onClick={() => openEdit(slot)} title="Edit"><Edit3 size={14} /></button>
                    {role === 'admin' && <button className="sched-icon-btn sched-icon-btn--danger" onClick={() => deleteScheduleSlot(slot.id)} title="Delete"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CALENDAR VIEW */}
        <div style={{
          gridArea: '1 / 1',
          opacity: viewMode === 'calendar' ? 1 : 0,
          transform: viewMode === 'calendar' ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: viewMode === 'calendar' ? 'auto' : 'none',
          visibility: viewMode === 'calendar' ? 'visible' : 'hidden',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <AcademicCalendarView />
        </div>
      </div>

      {/* ═══ PREMIUM ADD/EDIT MODAL ═══ */}
      {showForm && (
        <div className="sm-overlay" onClick={() => setShowForm(false)}>
          <div className="sm" onClick={e => e.stopPropagation()}>
            <div className="sm__head">
              <div className="sm__head-left">
                <div className="sm__head-icon"><CalendarDays size={18} /></div>
                <div><h3>{editingId ? 'Edit Class' : 'New Class Slot'}</h3><span>Fill in details below</span></div>
              </div>
              <button className="sm__close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            {/* Live preview */}
            <div className="sm__preview" style={{ borderLeftColor: TYPE_COLORS[form.type] }}>
              <div className="sm__preview-time"><Clock size={12} /> {form.startTime} – {form.endTime}
                {durationMin > 0 && <span className="sm__preview-dur">{durationMin} min</span>}
              </div>
              <strong>{form.subject || 'Subject Name'}</strong>
              <span>{form.courseCode || 'CODE'} · {form.room || 'Room'} · {form.day}</span>
            </div>

            <div className="sm__body">
              {/* Type selector */}
              <div className="sm__section">
                <label className="sm__section-label">Class Type</label>
                <div className="sm__types">
                  {TYPE_META.map(t => {
                    const Icon = t.icon; const active = form.type === t.value;
                    return (
                      <button key={t.value} type="button"
                        className={`sm__type ${active ? 'sm__type--active' : ''}`}
                        style={active ? { borderColor: t.color, background: t.color + '0a', color: t.color } : {}}
                        onClick={() => setForm({ ...form, type: t.value as ScheduleSlot['type'] })}>
                        <Icon size={18} /><span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department Info — Premium Suggest Popups */}
              {role === 'admin' && (
                <div className="sm__section">
                  <label className="sm__section-label">Department Info</label>
                  <div className="sm__row sm__row--3">
                    <SuggestInput
                      options={deptOptions} value={form.department}
                      onSelect={handleDeptSelect}
                      onChange={v => setForm({ ...form, department: v, course: '', semester: 0, subject: '', courseCode: '' })}
                      icon={<Building size={14} />} placeholder="Department"
                      hintLabel="departments" emptyText="No departments found"
                    />
                    <SuggestInput
                      options={semOptions} value={form.semester ? `Semester ${form.semester}` : ''}
                      onSelect={handleSemSelect}
                      onChange={() => {}}
                      icon={<Layers size={14} />} placeholder={form.department ? 'Semester' : 'Pick dept'}
                      disabled={!form.department} hintLabel="semesters" emptyText="No semesters"
                    />
                    <div className={`sm__input-wrap ${form.course ? 'sm__input-wrap--autofilled' : ''}`}>
                      <GraduationCap size={14} className="sm__input-icon" />
                      <input value={form.course} readOnly placeholder="Auto-filled" />
                      {form.course && <span className="sm__autofill-badge"><Check size={10} /></span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Subject Details */}
              <div className="sm__section">
                <label className="sm__section-label">
                  Subject Details
                  {subjectOptions.length > 0 && <span className="sm__section-badge">{subjectOptions.length} available</span>}
                </label>
                <div className="sm__row">
                  <SuggestInput
                    options={subjectOptions} value={form.subject}
                    onSelect={handleSubjectSelect}
                    onChange={v => setForm({ ...form, subject: v, courseCode: '' })}
                    icon={<BookOpen size={14} />}
                    placeholder={role === 'admin' && (!form.department || !form.semester) ? 'Select dept & sem first' : 'Search subject…'}
                    disabled={role === 'admin' && (!form.department || !form.semester)}
                    hintLabel="subjects" emptyText="No subjects for this dept & sem"
                  />
                  <div className={`sm__input-wrap ${isCodeAutoFilled ? 'sm__input-wrap--autofilled' : ''}`}>
                    <Hash size={14} className="sm__input-icon" />
                    <input value={form.courseCode}
                      onChange={e => setForm({ ...form, courseCode: e.target.value })}
                      placeholder="CS301" readOnly={isCodeAutoFilled} />
                    {isCodeAutoFilled && <span className="sm__autofill-badge"><Check size={10} /></span>}
                  </div>
                </div>
              </div>

              {/* Day & Time */}
              <div className="sm__section">
                <label className="sm__section-label">Day & Time</label>
                <div className="sm__day-row">
                  {DAYS.map(d => (
                    <button key={d} type="button"
                      className={`sm__day-chip ${form.day === d ? 'sm__day-chip--active' : ''}`}
                      onClick={() => setForm({ ...form, day: d })}>{DAY_SHORT[d]}</button>
                  ))}
                </div>
                <div className="sm__time-row">
                  <AdvancedTimePicker value={form.startTime} onChange={v => setForm({ ...form, startTime: v })} label="Starts" />
                  <AdvancedTimePicker value={form.endTime} onChange={v => setForm({ ...form, endTime: v })} label="Ends" />
                </div>
              </div>

              {/* Venue & Faculty — Premium Suggest Popups */}
              <div className="sm__section">
                <label className="sm__section-label">Venue & Faculty</label>
                <div className="sm__row">
                  <SuggestInput
                    options={roomOptions} value={form.room}
                    onSelect={handleRoomSelect}
                    onChange={v => setForm({ ...form, room: v })}
                    icon={<MapPin size={14} />} placeholder="Search room…"
                    hintLabel="rooms" emptyText="No rooms found"
                  />
                  <SuggestInput
                    options={facultyOptions} value={form.faculty}
                    onSelect={handleFacultySelect}
                    onChange={v => setForm({ ...form, faculty: v })}
                    icon={<User size={14} />} placeholder="Search faculty…"
                    hintLabel="faculty" emptyText="No faculty found"
                  />
                </div>
              </div>
            </div>

            <div className="sm__foot">
              <button className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={!form.subject || !form.courseCode}>
                <Check size={16} /> {editingId ? 'Save Changes' : 'Add to Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
