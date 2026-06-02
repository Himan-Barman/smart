import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { DayOfWeek, Department, ScheduleSlot } from '../types';
import AdvancedTimePicker from '../components/AdvancedTimePicker';
import SuggestInput from '../components/SuggestInput';
import type { SuggestOption } from '../components/SuggestInput';
import AcademicCalendarView from './AcademicCalendarView';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Clock,
  MapPin,
  BookOpen,
  Filter,
  Monitor,
  FlaskConical,
  PenTool,
  Presentation,
  User,
  Hash,
  Building,
  GraduationCap,
  CalendarDays,
  Layers,
  Sparkles,
  Users,
  DoorOpen,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

const TYPE_COLORS: Record<ScheduleSlot['type'], string> = {
  lecture: '#3b6cf5',
  lab: '#1a9d5c',
  tutorial: '#d07a1a',
  seminar: '#6c52e8',
};

const TYPE_META = [
  { value: 'lecture', label: 'Lecture', icon: Monitor, color: '#3b6cf5' },
  { value: 'lab', label: 'Lab', icon: FlaskConical, color: '#1a9d5c' },
  { value: 'tutorial', label: 'Tutorial', icon: PenTool, color: '#d07a1a' },
  { value: 'seminar', label: 'Seminar', icon: Presentation, color: '#6c52e8' },
] as const;

const timeToMinutes = (value: string): number | null => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const slotDuration = (slot: Pick<ScheduleSlot, 'startTime' | 'endTime'>): number => {
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  if (start === null || end === null || end <= start) return 0;
  return end - start;
};

const formatHours = (minutes: number): string => {
  if (minutes <= 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const subjectTypeColor = (type: string) => {
  switch (type) {
    case 'core':
      return { bg: 'rgba(59,108,245,0.08)', c: '#3b6cf5' };
    case 'elective':
      return { bg: 'rgba(108,82,232,0.08)', c: '#6c52e8' };
    case 'lab':
      return { bg: 'rgba(26,157,92,0.08)', c: '#1a9d5c' };
    case 'project':
      return { bg: 'rgba(208,122,26,0.08)', c: '#d07a1a' };
    default:
      return { bg: 'rgba(138,138,138,0.08)', c: '#8A8A8A' };
  }
};

const normalizeScopeKey = (value?: string | null): string =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const uniqueScopeValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeScopeKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const rawDepartmentAliases = (value?: string | null): string[] => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return [];

  const aliases = [trimmed];
  const displayMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (displayMatch) {
    aliases.push(displayMatch[1].trim(), displayMatch[2].trim());
  }

  return uniqueScopeValues(aliases);
};

const departmentAliasesFor = (departments: Department[], value?: string | null): string[] => {
  const rawAliases = rawDepartmentAliases(value);
  const rawKeys = new Set(rawAliases.map(normalizeScopeKey));
  const matchedDepartment = departments.find((department) =>
    [department.name, department.code, department.course].some((candidate) =>
      rawKeys.has(normalizeScopeKey(candidate)),
    ),
  );

  if (!matchedDepartment) return rawAliases;
  return uniqueScopeValues([...rawAliases, matchedDepartment.name, matchedDepartment.code, matchedDepartment.course]);
};

const departmentsMatch = (departments: Department[], left?: string | null, right?: string | null): boolean => {
  const leftKeys = new Set(departmentAliasesFor(departments, left).map(normalizeScopeKey));
  if (leftKeys.size === 0) return false;
  return departmentAliasesFor(departments, right).some((alias) => leftKeys.has(normalizeScopeKey(alias)));
};

const emptyForm: Omit<ScheduleSlot, 'id'> = {
  day: 'Monday',
  startTime: '09:00',
  endTime: '10:00',
  subject: '',
  courseCode: '',
  faculty: '',
  facultyId: '',
  room: '',
  type: 'lecture',
  department: '',
  semester: 0,
  course: '',
};

const SchedulePage: React.FC = () => {
  const { schedule, addScheduleSlot, updateScheduleSlot, deleteScheduleSlot, departments, rooms } = useApp();
  const { currentUser, registeredUsers } = useAuth();
  const role = currentUser?.role || 'student';

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const current = new Date().getDay();
    return current >= 1 && current <= 6 ? DAYS[current - 1] : 'Monday';
  });
  const [viewMode, setViewMode] = useState<'schedule' | 'calendar'>('schedule');
  const [filterDept, setFilterDept] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ScheduleSlot, 'id'>>(emptyForm);

  const canEdit = role === 'admin';

  const scopedSchedule = useMemo(() => {
    let slots = schedule;
    if (role === 'student') {
      slots = slots.filter((slot) =>
        departmentsMatch(departments, slot.department, currentUser?.department) &&
        slot.semester === currentUser?.semester,
      );
    } else if (role === 'teacher') {
      if (filterDept === 'mine') {
        const teacherIds = [currentUser?.id, currentUser?.employeeId].map(normalizeScopeKey).filter(Boolean);
        slots = slots.filter((slot) => teacherIds.includes(normalizeScopeKey(slot.facultyId)));
      } else if (filterDept !== 'all') {
        slots = slots.filter((slot) => departmentsMatch(departments, slot.department, filterDept));
      }
    } else if (filterDept !== 'all') {
      slots = slots.filter((slot) => departmentsMatch(departments, slot.department, filterDept));
    }
    return slots;
  }, [schedule, role, currentUser, filterDept, departments]);

  const filteredSchedule = useMemo(() =>
    scopedSchedule
      .filter((slot) => slot.day === activeDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [scopedSchedule, activeDay],
  );

  const scheduleDepartments = departments.map((department) => department.name);
  const selectedDept = useMemo(() => departments.find((department) => department.name === form.department), [departments, form.department]);

  const deptOptions: SuggestOption[] = useMemo(() =>
    departments.map((department) => ({
      id: department.id,
      label: department.name,
      sub: department.code,
      meta: department.course,
      badge: `${department.totalSemesters} sem`,
      badgeBg: 'rgba(59,108,245,0.08)',
      badgeColor: '#3b6cf5',
    })),
    [departments],
  );

  const semOptions: SuggestOption[] = useMemo(() => {
    if (!selectedDept) return [];
    return selectedDept.semesters
      .map((semester) => semester.semester)
      .sort((a, b) => a - b)
      .map((semester) => ({
        id: `sem-${semester}`,
        label: `Semester ${semester}`,
        sub: `Sem ${semester}`,
        meta: `${selectedDept.semesters.find((item) => item.semester === semester)?.subjects.length || 0} subjects`,
        badge: `${semester}`,
        badgeBg: 'rgba(108,82,232,0.08)',
        badgeColor: '#6c52e8',
      }));
  }, [selectedDept]);

  const availableSubjects = useMemo(() => {
    if (!selectedDept || !form.semester) return [];
    return selectedDept.semesters.find((semester) => semester.semester === form.semester)?.subjects ?? [];
  }, [selectedDept, form.semester]);

  const subjectOptions: SuggestOption[] = useMemo(() =>
    availableSubjects.map((subject) => {
      const color = subjectTypeColor(subject.type);
      return {
        id: subject.id,
        label: subject.name,
        sub: subject.code,
        meta: `${subject.credits} credits`,
        badge: subject.type,
        badgeBg: color.bg,
        badgeColor: color.c,
      };
    }),
    [availableSubjects],
  );

  const roomOptions: SuggestOption[] = useMemo(() => {
    const fromRooms = rooms.map((room) => ({
      id: room.id,
      label: room.name,
      sub: `${room.building} / Floor ${room.floor}`,
      meta: `${room.capacity} seats`,
      badge: room.available ? 'Available' : 'Occupied',
      badgeBg: room.available ? 'rgba(60,203,127,0.08)' : 'rgba(229,83,61,0.08)',
      badgeColor: room.available ? '#3CCB7F' : '#E5533D',
    }));
    const scheduleRooms = [...new Set(schedule.map((slot) => slot.room))]
      .filter((room) => room && !fromRooms.some((item) => item.label === room));
    const extra = scheduleRooms.map((room) => ({
      id: `sr-${room}`,
      label: room,
      sub: 'From schedule',
      badge: 'Recent',
      badgeBg: 'rgba(138,138,138,0.08)',
      badgeColor: '#8A8A8A',
    }));
    return [...fromRooms, ...extra];
  }, [rooms, schedule]);

  const facultyOptions: SuggestOption[] = useMemo(() => {
    const map = new Map<string, { name: string; id: string; dept: string; sub: string }>();
    registeredUsers
      .filter((user) => user.role === 'teacher')
      .forEach((user) => {
        map.set(user.id, {
          name: user.name,
          id: user.id,
          dept: user.department,
          sub: user.employeeId || user.email,
        });
      });

    schedule.forEach((slot) => {
      if (slot.faculty && !map.has(slot.facultyId)) {
        map.set(slot.facultyId, { name: slot.faculty, id: slot.facultyId, dept: slot.department, sub: slot.facultyId });
      }
    });

    return Array.from(map.values()).map((faculty) => ({
      id: faculty.id,
      label: faculty.name,
      sub: faculty.sub,
      meta: faculty.dept,
      badge: 'Faculty',
      badgeBg: 'rgba(108,82,232,0.08)',
      badgeColor: '#6c52e8',
    }));
  }, [registeredUsers, schedule]);

  const handleDeptSelect = (option: SuggestOption) => {
    const department = departments.find((item) => item.name === option.label);
    setForm((current) => ({
      ...current,
      department: option.label,
      course: department?.course || '',
      semester: 0,
      subject: '',
      courseCode: '',
    }));
  };

  const handleSemSelect = (option: SuggestOption) => {
    const semester = Number(option.badge);
    setForm((current) => ({ ...current, semester, subject: '', courseCode: '' }));
  };

  const handleSubjectSelect = (option: SuggestOption) => {
    const subject = availableSubjects.find((item) => item.name === option.label);
    setForm((current) => ({ ...current, subject: option.label, courseCode: subject?.code || option.sub || '' }));
  };

  const handleRoomSelect = (option: SuggestOption) => {
    setForm((current) => ({ ...current, room: option.label }));
  };

  const handleFacultySelect = (option: SuggestOption) => {
    setForm((current) => ({ ...current, faculty: option.label, facultyId: option.id }));
  };

  const openAdd = () => {
    const department = departments[0] ?? null;
    setForm({
      ...emptyForm,
      day: activeDay,
      department: department?.name || '',
      course: department?.course || '',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (slot: ScheduleSlot) => {
    setForm({ ...slot });
    setEditingId(slot.id);
    setShowForm(true);
  };

  const formError = useMemo(() => {
    if (!selectedDept) return 'Select a department from the Departments page.';
    if (!form.semester) return 'Select a semester.';
    if (!availableSubjects.some((subject) => subject.name === form.subject && subject.code === form.courseCode)) {
      return 'Select a subject configured for this department and semester.';
    }
    if (!form.faculty || !form.facultyId) return 'Select a faculty account.';
    if (!form.room) return 'Select a room.';

    const start = timeToMinutes(form.startTime);
    const end = timeToMinutes(form.endTime);
    if (start === null || end === null) return 'Use valid 24-hour class times.';
    if (start >= end) return 'End time must be after start time.';
    if (start < 8 * 60 || end > 18 * 60) return 'Schedule must stay inside 08:00 to 18:00.';

    return '';
  }, [availableSubjects, form, selectedDept]);

  const handleSave = () => {
    if (formError) {
      window.alert(formError);
      return;
    }
    if (!selectedDept) return;

    const slot = { ...form, department: selectedDept.name, course: selectedDept.course };
    if (editingId) updateScheduleSlot(editingId, slot);
    else addScheduleSlot(slot);
    setShowForm(false);
    setEditingId(null);
  };

  const todayName = DAYS[new Date().getDay() - 1] || 'Monday';
  const durationMin = slotDuration(form);
  const isCodeAutoFilled = !!form.courseCode && availableSubjects.some((subject) => subject.code === form.courseCode);

  const weeklyMinutes = scopedSchedule.reduce((sum, slot) => sum + slotDuration(slot), 0);
  const activeDayMinutes = filteredSchedule.reduce((sum, slot) => sum + slotDuration(slot), 0);
  const activeDepartments = new Set(scopedSchedule.map((slot) => slot.department)).size;
  const activeRooms = new Set(scopedSchedule.map((slot) => slot.room).filter(Boolean)).size;
  const dayCounts = DAYS.reduce<Record<DayOfWeek, number>>((acc, day) => {
    acc[day] = scopedSchedule.filter((slot) => slot.day === day).length;
    return acc;
  }, { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 });

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextSlot = activeDay === todayName
    ? filteredSchedule.find((slot) => (timeToMinutes(slot.startTime) ?? 0) >= currentMinutes) ?? filteredSchedule[0]
    : filteredSchedule[0];

  const scopeLabel =
    role === 'student'
      ? `${currentUser?.course ?? 'Student'} / Sem ${currentUser?.semester ?? '-'}`
      : role === 'teacher'
        ? (filterDept === 'mine' ? 'My Classes' : filterDept === 'all' ? 'All Departments' : filterDept)
        : filterDept === 'all' ? 'All Departments' : filterDept;

  const scheduleSubtitle =
    role === 'student'
      ? `${currentUser?.department ?? 'Department'} / ${currentUser?.course ?? 'Course'} / Semester ${currentUser?.semester ?? '-'}`
      : role === 'teacher'
        ? 'Faculty routine with department-wide visibility'
        : 'University-wide timetable control center';

  return (
    <div className="page schedule-page">
      <section className="schedule-hero">
        <div className="schedule-hero__content">
          <span className="schedule-kicker"><Sparkles size={14} /> Smart timetable</span>
          <h2>{viewMode === 'schedule' ? 'Class Schedule' : 'Academic Calendar'}</h2>
          <p>{viewMode === 'schedule' ? scheduleSubtitle : 'Academic sessions, examinations, holidays, and institutional events'}</p>
          {viewMode === 'schedule' && (
            <div className="schedule-hero__meta">
              <span><Building size={13} /> {scopeLabel}</span>
              <span><Clock size={13} /> {formatHours(weeklyMinutes)} weekly</span>
              <span><CalendarDays size={13} /> Monday-Saturday</span>
            </div>
          )}
        </div>

        <div className="schedule-hero__controls">
          <div className="schedule-switch" role="tablist" aria-label="Schedule view">
            <span className={`schedule-switch__thumb ${viewMode === 'calendar' ? 'schedule-switch__thumb--right' : ''}`} />
            <button className={viewMode === 'schedule' ? 'is-active' : ''} onClick={() => setViewMode('schedule')} type="button">
              <Clock size={16} /> Schedule
            </button>
            <button className={viewMode === 'calendar' ? 'is-active' : ''} onClick={() => setViewMode('calendar')} type="button">
              <CalendarDays size={16} /> Academic
            </button>
          </div>
          {viewMode === 'schedule' && role === 'admin' && (
            <button className="btn btn--primary schedule-add-btn" onClick={openAdd}><Plus size={16} /> Add Slot</button>
          )}
        </div>
      </section>

      {viewMode === 'schedule' && (
        <>
          <section className="schedule-insights">
            <div className="schedule-insight">
              <div className="schedule-insight__icon"><CalendarDays size={18} /></div>
              <div><strong>{filteredSchedule.length}</strong><span>{activeDay} classes</span></div>
            </div>
            <div className="schedule-insight">
              <div className="schedule-insight__icon schedule-insight__icon--green"><Clock size={18} /></div>
              <div><strong>{formatHours(activeDayMinutes)}</strong><span>Today load</span></div>
            </div>
            <div className="schedule-insight">
              <div className="schedule-insight__icon schedule-insight__icon--gold"><DoorOpen size={18} /></div>
              <div><strong>{activeRooms}</strong><span>Rooms in use</span></div>
            </div>
            <div className="schedule-insight">
              <div className="schedule-insight__icon schedule-insight__icon--purple"><Users size={18} /></div>
              <div><strong>{activeDepartments}</strong><span>Departments</span></div>
            </div>
          </section>

          <section className="schedule-command">
            <div className="schedule-command__left">
              <div>
                <h3>Weekly Routine</h3>
                <span>{scopeLabel}</span>
              </div>
              {role !== 'student' && (
                <div className="sched-filter schedule-filter">
                  <Filter size={14} />
                  <select value={filterDept} onChange={(event) => setFilterDept(event.target.value)}>
                    <option value="all">All Departments</option>
                    {role === 'teacher' && <option value="mine">My Classes</option>}
                    {scheduleDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="sched-days schedule-days">
              {DAYS.map((day) => (
                <button key={day} className={`sched-day schedule-day ${activeDay === day ? 'sched-day--active schedule-day--active' : ''} ${day === todayName ? 'sched-day--today schedule-day--today' : ''}`} onClick={() => setActiveDay(day)} type="button">
                  <span className="sched-day__short">{DAY_SHORT[day]}</span>
                  <span className="sched-day__full">{day}</span>
                  <strong>{dayCounts[day]}</strong>
                  {day === todayName && <span className="sched-day__dot" />}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="schedule-content">
        {viewMode === 'schedule' ? (
          <section className="schedule-board">
            <div className="schedule-board__head">
              <div>
                <h3>{activeDay}</h3>
                <span>{filteredSchedule.length} classes / {formatHours(activeDayMinutes)}</span>
              </div>
              {nextSlot && (
                <div className="schedule-next">
                  <span>Next</span>
                  <strong>{nextSlot.startTime} / {nextSlot.subject}</strong>
                </div>
              )}
            </div>

            <div className="sched-timeline schedule-timeline">
              {filteredSchedule.length === 0 ? (
                <div className="sched-empty schedule-empty">
                  <BookOpen size={42} />
                  <h3>No Classes</h3>
                  <p>No classes on {activeDay} for the selected scope.</p>
                  {role === 'admin' && <button className="btn btn--primary btn--sm" onClick={openAdd}><Plus size={14} /> Add Slot</button>}
                </div>
              ) : filteredSchedule.map((slot) => {
                const type = TYPE_META.find((item) => item.value === slot.type);
                const TypeIcon = type?.icon ?? BookOpen;
                return (
                  <div key={slot.id} className="sched-card schedule-card" style={{ borderLeftColor: TYPE_COLORS[slot.type] }}>
                    <div className="sched-card__time schedule-card__time">
                      <span>{slot.startTime}</span>
                      <small>{slot.endTime}</small>
                      <em>{formatHours(slotDuration(slot))}</em>
                    </div>
                    <div className="sched-card__body schedule-card__body">
                      <div className="sched-card__main schedule-card__main">
                        <div className="schedule-card__title-row">
                          <div className="schedule-card__type" style={{ background: TYPE_COLORS[slot.type] + '12', color: TYPE_COLORS[slot.type] }}>
                            <TypeIcon size={14} />
                          </div>
                          <div>
                            <h4>{slot.subject}</h4>
                            <div className="sched-card__meta schedule-card__meta">
                              <span className="sched-tag" style={{ background: TYPE_COLORS[slot.type] + '12', color: TYPE_COLORS[slot.type] }}>{slot.type}</span>
                              <code>{slot.courseCode}</code>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="sched-card__details schedule-card__details">
                        <span><MapPin size={13} /> {slot.room}</span>
                        <span><User size={13} /> {slot.faculty}</span>
                        <span><GraduationCap size={13} /> Sem {slot.semester}</span>
                        {role === 'admin' && <span className="sched-card__dept">{slot.department}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="sched-card__actions schedule-card__actions">
                        <button className="sched-icon-btn" onClick={() => openEdit(slot)} title="Edit"><Edit3 size={14} /></button>
                        {role === 'admin' && <button className="sched-icon-btn sched-icon-btn--danger" onClick={() => deleteScheduleSlot(slot.id)} title="Delete"><Trash2 size={14} /></button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <AcademicCalendarView />
        )}
      </div>

      {showForm && (
        <div className="sm-overlay" onClick={() => setShowForm(false)}>
          <div className="sm schedule-modal" onClick={(event) => event.stopPropagation()}>
            <div className="sm__head">
              <div className="sm__head-left">
                <div className="sm__head-icon"><CalendarDays size={18} /></div>
                <div className="schedule-modal__head-text">
                  <span className="schedule-modal__eyebrow">{role === 'admin' ? 'Admin scheduler' : 'Class scheduler'}</span>
                  <h3>{editingId ? 'Edit Class' : 'New Class Slot'}</h3>
                  <div className="schedule-modal__head-meta">
                    <span>{form.day}</span>
                    <span>{form.startTime}-{form.endTime}</span>
                    {durationMin > 0 && <span>{formatHours(durationMin)}</span>}
                  </div>
                </div>
              </div>
              <button className="sm__close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            <div className="schedule-modal__scroll">
              <div className="sm__preview schedule-modal__preview" style={{ borderLeftColor: TYPE_COLORS[form.type] }}>
                <div className="sm__preview-time"><Clock size={12} /> {form.startTime} - {form.endTime}
                  {durationMin > 0 && <span className="sm__preview-dur">{formatHours(durationMin)}</span>}
                </div>
                <strong>{form.subject || 'Subject Name'}</strong>
                <span>{form.courseCode || 'CODE'} / {form.room || 'Room'} / {form.day}</span>
              </div>

              <div className="sm__body">
              <div className="sm__section schedule-modal__section-card">
                <label className="sm__section-label">Class Type</label>
                <div className="sm__types">
                  {TYPE_META.map((item) => {
                    const Icon = item.icon;
                    const active = form.type === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`sm__type ${active ? 'sm__type--active' : ''}`}
                        style={active ? { borderColor: item.color, background: item.color + '0a', color: item.color } : {}}
                        onClick={() => setForm({ ...form, type: item.value })}
                      >
                        <Icon size={18} /><span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {role === 'admin' && (
                <div className="sm__section schedule-modal__section-card">
                  <label className="sm__section-label">Department Info</label>
                  <div className="sm__row sm__row--3">
                    <SuggestInput
                      options={deptOptions}
                      value={form.department}
                      onSelect={handleDeptSelect}
                      onChange={(value) => setForm({ ...form, department: value, course: '', semester: 0, subject: '', courseCode: '' })}
                      icon={<Building size={14} />}
                      placeholder="Department"
                      hintLabel="departments"
                      emptyText="No departments found"
                    />
                    <SuggestInput
                      options={semOptions}
                      value={form.semester ? `Semester ${form.semester}` : ''}
                      onSelect={handleSemSelect}
                      onChange={() => {}}
                      icon={<Layers size={14} />}
                      placeholder={form.department ? 'Semester' : 'Pick dept'}
                      disabled={!form.department}
                      hintLabel="semesters"
                      emptyText="No semesters"
                    />
                    <div className={`sm__input-wrap ${form.course ? 'sm__input-wrap--autofilled' : ''}`}>
                      <GraduationCap size={14} className="sm__input-icon" />
                      <input value={form.course} readOnly placeholder="Auto-filled" />
                      {form.course && <span className="sm__autofill-badge"><Check size={10} /></span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="sm__section schedule-modal__section-card">
                <label className="sm__section-label">
                  Subject Details
                  {subjectOptions.length > 0 && <span className="sm__section-badge">{subjectOptions.length} available</span>}
                </label>
                <div className="sm__row">
                  <SuggestInput
                    options={subjectOptions}
                    value={form.subject}
                    onSelect={handleSubjectSelect}
                    onChange={(value) => setForm({ ...form, subject: value, courseCode: '' })}
                    icon={<BookOpen size={14} />}
                    placeholder={role === 'admin' && (!form.department || !form.semester) ? 'Select dept and sem first' : 'Search subject'}
                    disabled={role === 'admin' && (!form.department || !form.semester)}
                    hintLabel="subjects"
                    emptyText="No subjects for this dept and sem"
                  />
                  <div className={`sm__input-wrap ${isCodeAutoFilled ? 'sm__input-wrap--autofilled' : ''}`}>
                    <Hash size={14} className="sm__input-icon" />
                    <input
                      value={form.courseCode}
                      onChange={(event) => setForm({ ...form, courseCode: event.target.value })}
                      placeholder="CS301"
                      readOnly={isCodeAutoFilled}
                    />
                    {isCodeAutoFilled && <span className="sm__autofill-badge"><Check size={10} /></span>}
                  </div>
                </div>
              </div>

              <div className="sm__section schedule-modal__section-card">
                <label className="sm__section-label">Day & Time <span className="sm__section-badge">08:00-18:00</span></label>
                <div className="sm__day-row">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`sm__day-chip ${form.day === day ? 'sm__day-chip--active' : ''}`}
                      onClick={() => setForm({ ...form, day })}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  ))}
                </div>
                <div className="sm__time-row">
                  <AdvancedTimePicker value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} label="Starts" />
                  <AdvancedTimePicker value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} label="Ends" />
                </div>
              </div>

              <div className="sm__section schedule-modal__section-card">
                <label className="sm__section-label">Venue & Faculty</label>
                <div className="sm__row">
                  <SuggestInput
                    options={roomOptions}
                    value={form.room}
                    onSelect={handleRoomSelect}
                    onChange={(value) => setForm({ ...form, room: value })}
                    icon={<MapPin size={14} />}
                    placeholder="Search room"
                    hintLabel="rooms"
                    emptyText="No rooms found"
                  />
                  <SuggestInput
                    options={facultyOptions}
                    value={form.faculty}
                    onSelect={handleFacultySelect}
                    onChange={(value) => setForm({ ...form, faculty: value })}
                    icon={<User size={14} />}
                    placeholder="Search faculty"
                    hintLabel="faculty"
                    emptyText="No faculty found"
                  />
                </div>
              </div>
              </div>
            </div>

            <div className="sm__foot">
              {formError && <span className="schedule-modal__error">{formError}</span>}
              <button className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={!!formError}>
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
