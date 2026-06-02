import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type CalendarResponse } from '../api';
import {
  CalendarDays, Plus, Edit3, Trash2, X, Check,
  BookOpen, FlaskConical, Award, Coffee, Megaphone, ChevronLeft, ChevronRight, History, Clock,
  Archive, CalendarPlus, ArrowLeft, Info
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type EventType = 'academic' | 'exam' | 'holiday' | 'event' | 'registration';

interface CalEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  type: EventType;
  description?: string;
}

interface SemesterData {
  id?: string;
  num: number;
  label: string;
  startDate: string;
  endDate: string;
  events: CalEvent[];
}

interface AcademicYear {
  id: string;
  year: string;
  currentYear: boolean;
  semesters: SemesterData[];
}

const mapCalendarResponse = (response: CalendarResponse): AcademicYear[] =>
  response.map((year) => ({
    id: year.id,
    year: year.year,
    currentYear: year.currentYear,
    semesters: year.semesters.map((semester) => ({
      id: semester.id,
      num: semester.num,
      label: semester.label,
      startDate: semester.startDate,
      endDate: semester.endDate,
      events: semester.events.map((event) => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.type,
        description: event.description,
      })),
    })),
  }));

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; Icon: React.FC<any> }> = {
  academic:     { label: 'Academic',     color: '#3b6cf5', bg: 'rgba(59,108,245,0.08)',  Icon: BookOpen },
  exam:         { label: 'Examination',  color: '#e5533d', bg: 'rgba(229,83,61,0.08)',   Icon: FlaskConical },
  holiday:      { label: 'Holiday',      color: '#1a9d5c', bg: 'rgba(26,157,92,0.08)',   Icon: Coffee },
  event:        { label: 'Event',        color: '#d07a1a', bg: 'rgba(208,122,26,0.08)',  Icon: Megaphone },
  registration: { label: 'Registration', color: '#6c52e8', bg: 'rgba(108,82,232,0.08)', Icon: Award },
};

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_DATA: AcademicYear[] = [
  {
    id: 'ay-2026',
    year: '2026-2027',
    currentYear: true,
    semesters: [
      {
        num: 1, label: 'Odd Semester (Jul – Nov 2026)',
        startDate: '2026-07-21', endDate: '2026-11-30',
        events: [
          { id: 'e1', title: 'Semester Begins',          startDate: '2026-07-21', type: 'academic',     description: 'All departments commence classes' },
          { id: 'e2', title: 'Last Date for Admission',  startDate: '2026-08-05', type: 'registration', description: 'Final date for new student enrollment' },
          { id: 'e3', title: 'Mid-Sem Exams',            startDate: '2026-09-15', endDate: '2026-09-25', type: 'exam', description: 'Internal assessment for all semesters' },
          { id: 'e4', title: 'Independence Day',         startDate: '2026-08-15', type: 'holiday',      description: 'National Holiday' },
          { id: 'e5', title: 'Tech Symposium',           startDate: '2026-10-10', endDate: '2026-10-12', type: 'event', description: 'Annual inter-college technical event' },
          { id: 'e6', title: 'End-Sem Exams',            startDate: '2026-11-10', endDate: '2026-11-30', type: 'exam', description: 'Final exams for Odd Semester' },
        ],
      },
      {
        num: 2, label: 'Even Semester (Jan – May 2027)',
        startDate: '2027-01-03', endDate: '2027-05-31',
        events: [
          { id: 'e7', title: 'Semester Begins',          startDate: '2027-01-03', type: 'academic',     description: 'Even semester commences' },
          { id: 'e8', title: 'Republic Day',             startDate: '2027-01-26', type: 'holiday',      description: 'National Holiday' },
          { id: 'e9', title: 'Mid-Sem Exams',            startDate: '2027-03-03', endDate: '2027-03-12', type: 'exam', description: 'Internal assessment' },
          { id: 'e10', title: 'Cultural Fest',           startDate: '2027-02-20', endDate: '2027-02-22', type: 'event', description: 'Annual cultural event' },
          { id: 'e11', title: 'End-Sem Exams',            startDate: '2027-04-28', endDate: '2027-05-20', type: 'exam', description: 'Final exams for Even Semester' },
          { id: 'e12', title: 'Summer Break',            startDate: '2027-05-21', endDate: '2027-07-20', type: 'holiday', description: 'Annual summer vacation' },
        ],
      },
    ],
  },
  {
    id: 'ay-2025',
    year: '2025-2026',
    currentYear: false,
    semesters: [
      {
        num: 1, label: 'Odd Semester (Jul – Nov 2025)',
        startDate: '2025-07-22', endDate: '2025-11-28',
        events: [
          { id: 'p1', title: 'Semester Began',           startDate: '2025-07-22', type: 'academic' },
          { id: 'p2', title: 'Mid-Sem Exams',            startDate: '2025-09-16', endDate: '2025-09-26', type: 'exam' },
          { id: 'p3', title: 'Independence Day',         startDate: '2025-08-15', type: 'holiday' },
          { id: 'p4', title: 'Tech Symposium',           startDate: '2025-10-08', endDate: '2025-10-10', type: 'event' },
          { id: 'p5', title: 'End-Sem Exams',            startDate: '2025-11-08', endDate: '2025-11-28', type: 'exam' },
        ],
      },
      {
        num: 2, label: 'Even Semester (Jan – May 2026)',
        startDate: '2026-01-05', endDate: '2026-05-30',
        events: [
          { id: 'p6', title: 'Semester Began',           startDate: '2026-01-05', type: 'academic' },
          { id: 'p7', title: 'Mid-Sem Exams',            startDate: '2026-03-02', endDate: '2026-03-11', type: 'exam' },
          { id: 'p8', title: 'End-Sem Exams',            startDate: '2026-04-27', endDate: '2026-05-18', type: 'exam' },
        ],
      },
    ],
  },
];

// ─── Format date helpers ──────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysArray = (year: number, month: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

// ─── Day Summary Modal ────────────────────────────────────────────────────────
const DaySummaryModal: React.FC<{
  dateStr: string;
  events: CalEvent[];
  onClose: () => void;
  isAdmin: boolean;
  onAddEvent: (dateStr: string) => void;
  onEditEvent: (ev: CalEvent) => void;
}> = ({ dateStr, events, onClose, isAdmin, onAddEvent, onEditEvent }) => {
  const d = new Date(dateStr);
  const formattedDate = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isSunday = d.getDay() === 0;
  const hasHoliday = events.some(e => e.type === 'holiday');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '420px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: isSunday || hasHoliday ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {d.getDate()} {d.toLocaleString('default', { month: 'long' })}
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{formattedDate}</span>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '12px' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Info size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No events scheduled for this day.</p>
            </div>
          ) : (
            events.map(ev => {
              const cfg = TYPE_CONFIG[ev.type];
              return (
                <div key={ev.id} onClick={() => { onClose(); onEditEvent(ev); }} style={{ padding: '16px', borderRadius: '16px', background: cfg.bg, borderLeft: `4px solid ${cfg.color}`, cursor: 'pointer', transition: '0.2s' }} className="hover-lift-subtle">
                  <div style={{ fontSize: '15px', fontWeight: 700, color: cfg.color, marginBottom: '6px' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '2px 8px', borderRadius: '12px', opacity: 0.8 }}>
                    {cfg.label}
                  </div>
                  {ev.description && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>{ev.description}</div>}
                </div>
              )
            })
          )}
        </div>

        {isAdmin && (
          <button className="btn btn--primary" style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px' }} onClick={() => { onClose(); onAddEvent(dateStr); }}>
            <Plus size={18} /> Add Event to this Date
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
const EventModal: React.FC<{
  event?: Partial<CalEvent>;
  initialDate?: string;
  onSave: (ev: Omit<CalEvent, 'id'>) => void;
  onClose: () => void;
  onDelete?: () => void;
  isAdmin: boolean;
}> = ({ event, initialDate, onSave, onClose, onDelete, isAdmin }) => {
  const [form, setForm] = useState<Omit<CalEvent, 'id'>>({
    title: event?.title || '',
    startDate: event?.startDate || initialDate || '',
    endDate: event?.endDate || '',
    type: event?.type || 'academic',
    description: event?.description || '',
  });
  const upd = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '520px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59,108,245,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={24} color="#3b6cf5" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{event?.title ? 'Edit Event' : 'New Event'}</h3>
              {isAdmin && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fill in the details below</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '12px' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label>Event Title</label>
            <input value={form.title} readOnly={!isAdmin} onChange={e => upd('title', e.target.value)} placeholder="e.g. Mid-Semester Examinations" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.startDate} readOnly={!isAdmin} onChange={e => upd('startDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="date" value={form.endDate || ''} readOnly={!isAdmin} onChange={e => upd('endDate', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(Object.keys(TYPE_CONFIG) as EventType[]).map(t => {
                const cfg = TYPE_CONFIG[t];
                const active = form.type === t;
                return (
                  <button key={t} type="button" onClick={() => isAdmin && upd('type', t)}
                    style={{ padding: '8px 16px', borderRadius: '24px', border: `1.5px solid ${active ? cfg.color : 'var(--glass-border)'}`, background: active ? cfg.bg : 'transparent', color: active ? cfg.color : 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: isAdmin ? 'pointer' : 'default', transition: '0.2s', opacity: (!isAdmin && !active) ? 0.5 : 1 }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={form.description || ''} readOnly={!isAdmin} onChange={e => upd('description', e.target.value)} placeholder="Short description of this event..." rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', borderRadius: '12px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
          {isAdmin && onDelete && (
            <button className="btn btn--danger" style={{ marginRight: 'auto', borderRadius: '12px', padding: '10px 16px' }} onClick={onDelete}>
              <Trash2 size={18} style={{ marginRight: '6px' }} /> Delete
            </button>
          )}
          <button className="btn btn--ghost" style={{ borderRadius: '12px', padding: '10px 20px' }} onClick={onClose}>{isAdmin ? 'Cancel' : 'Close'}</button>
          {isAdmin && (
            <button className="btn btn--primary" style={{ borderRadius: '12px', padding: '10px 24px' }} onClick={() => form.title && form.startDate && onSave(form)} disabled={!form.title || !form.startDate}>
              <Check size={18} style={{ marginRight: '6px' }} /> {event?.title ? 'Save Changes' : 'Add Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Semester Calendar Detail View ────────────────────────────────────────────

const getMonthsInRange = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return [new Date()];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const months = [];
  let curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (curr <= last) {
    months.push(new Date(curr));
    curr.setMonth(curr.getMonth() + 1);
  }
  return months.length > 0 ? months : [new Date()];
};

const SemesterCalendarDetail: React.FC<{
  year: AcademicYear;
  sem: SemesterData;
  onBack: () => void;
  isAdmin: boolean;
  onAddEvent: (dateStr?: string) => void;
  onEditEvent: (ev: CalEvent) => void;
}> = ({ year, sem, onBack, isAdmin, onAddEvent, onEditEvent }) => {
  const months = getMonthsInRange(sem.startDate, sem.endDate);
  const [monthIndex, setMonthIndex] = useState(() => {
    const now = new Date();
    const idx = months.findIndex(m => m.getMonth() === now.getMonth() && m.getFullYear() === now.getFullYear());
    return idx >= 0 ? idx : 0;
  });

  const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);

  const prevMonth = () => setMonthIndex(prev => Math.max(0, prev - 1));
  const nextMonth = () => setMonthIndex(prev => Math.min(months.length - 1, prev + 1));

  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthDate = months[monthIndex];
  const yearNum = monthDate.getFullYear();
  const monthNum = monthDate.getMonth();
  const days = getDaysArray(yearNum, monthNum);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{ animation: 'fade-in 0.3s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} className="btn btn--ghost btn--sm" style={{ padding: '8px', color: 'var(--text-secondary)', background: 'var(--surface-2)', borderRadius: '12px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{sem.label}</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
              {year.year} • {fmtDate(sem.startDate)} to {fmtDate(sem.endDate)}
            </div>
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn--primary" style={{ padding: '8px 16px', borderRadius: '10px' }} onClick={() => onAddEvent()}>
            <Plus size={14} /> Add Event
          </button>
        )}
      </div>

      {/* Single Month Compact Container */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
        
        {/* Month Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', background: 'var(--surface-1)' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{monthName}</h3>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--outline btn--sm" style={{ padding: '6px', borderRadius: '8px' }} onClick={prevMonth} disabled={monthIndex === 0}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn--outline btn--sm" style={{ padding: '6px', borderRadius: '8px' }} onClick={nextMonth} disabled={monthIndex === months.length - 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        {/* Grid */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ minWidth: '600px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--glass-border)' }}>
            
            {/* Day Headers */}
            {dayNames.map(d => (
              <div key={d} style={{ background: '#fff', padding: '10px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: d === 'Sun' ? 'var(--accent-red)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {d}
              </div>
            ))}

            {/* Days Cells */}
            {days.map((d, i) => {
              if (!d) return <div key={i} style={{ background: 'var(--surface-1)' }} />;
              
              const cellDateStr = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = cellDateStr === today.toISOString().split('T')[0];
              const isSunday = i % 7 === 0;
              
              const dayEvents = sem.events.filter(ev => {
                if (!ev.endDate || ev.endDate === ev.startDate) {
                  return ev.startDate === cellDateStr;
                } else {
                  return cellDateStr >= ev.startDate && cellDateStr <= ev.endDate;
                }
              });

              const hasHoliday = dayEvents.some(ev => ev.type === 'holiday');
              const isSpecialDay = isSunday || hasHoliday;

              return (
                <div key={i} 
                     onClick={() => setDayDetailsDate(cellDateStr)}
                     style={{ 
                       background: isSpecialDay ? 'rgba(229,83,61,0.03)' : '#fff', 
                       minHeight: '70px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer', transition: 'background 0.2s' 
                     }}
                     className="hover-lift-subtle"
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <span style={{ 
                      width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', 
                      fontSize: '12px', fontWeight: isToday ? 700 : 600, 
                      color: isToday ? '#fff' : (isSpecialDay ? 'var(--accent-red)' : 'var(--text-primary)'), 
                      background: isToday ? '#3b6cf5' : 'transparent',
                      boxShadow: isToday ? '0 4px 12px rgba(59,108,245,0.4)' : 'none'
                    }}>
                      {d}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    {dayEvents.map(ev => {
                      const cfg = TYPE_CONFIG[ev.type];
                      const isStart = ev.startDate === cellDateStr;
                      const isEnd = !ev.endDate || ev.endDate === cellDateStr;
                      const spans = ev.endDate && ev.endDate !== ev.startDate;

                      return (
                        <div key={ev.id} 
                             style={{ 
                               fontSize: '10.5px', fontWeight: 600, padding: '3px 6px', margin: '0.5px 0',
                               background: spans && !isStart && !isEnd ? cfg.color + '1a' : cfg.bg, 
                               color: cfg.color, 
                               borderLeft: isStart ? `3px solid ${cfg.color}` : 'none',
                               borderRadius: spans ? (isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0') : '4px',
                               whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                             }}
                             title={ev.title}
                        >
                          {(!spans || isStart || d === 1) && ev.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {dayDetailsDate && (
        <DaySummaryModal 
          dateStr={dayDetailsDate} 
          events={sem.events.filter(ev => {
            if (!ev.endDate || ev.endDate === ev.startDate) return ev.startDate === dayDetailsDate;
            return dayDetailsDate >= ev.startDate && dayDetailsDate <= ev.endDate;
          })} 
          onClose={() => setDayDetailsDate(null)}
          isAdmin={isAdmin}
          onAddEvent={onAddEvent}
          onEditEvent={onEditEvent}
        />
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AcademicCalendarView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [data, setData] = useState<AcademicYear[]>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'current' | 'records'>('current');
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  
  // Modal State
  const [modal, setModal] = useState<{ yearId: string, semNum: number; event?: CalEvent; initialDate?: string } | null>(null);
  
  // Navigation State
  const [selectedSemester, setSelectedSemester] = useState<{ yearId: string, semNum: number } | null>(null);

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        const response = await api.calendar.list();
        setData(mapCalendarResponse(response));
      } catch {
        setData(INITIAL_DATA);
      }
    };

    void loadCalendar();
  }, []);

  // Auto-archive past sessions on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    const newData = data.map(y => {
      if (y.currentYear) {
        let latestDate = '';
        y.semesters.forEach(s => {
          if (s.endDate && s.endDate > latestDate) latestDate = s.endDate;
          s.events.forEach(e => {
            const d = e.endDate || e.startDate;
            if (d && d > latestDate) latestDate = d;
          });
        });
        
        if (latestDate && latestDate < today) {
          changed = true;
          return { ...y, currentYear: false };
        }
      }
      return y;
    });

    if (changed) setData(newData);
  }, []);

  const currentSession = data.find(y => y.currentYear);
  const pastSessions = data.filter(y => !y.currentYear).sort((a, b) => b.year.localeCompare(a.year));

  const handleAddNewSession = () => {
    const yearStr = prompt('Enter new academic year (e.g., 2027-2028):');
    if (!yearStr) return;

    const oddStart = prompt('Odd semester start date (YYYY-MM-DD):');
    const oddEnd = prompt('Odd semester end date (YYYY-MM-DD):');
    const evenStart = prompt('Even semester start date (YYYY-MM-DD):');
    const evenEnd = prompt('Even semester end date (YYYY-MM-DD):');
    if (!oddStart || !oddEnd || !evenStart || !evenEnd) return;

    void api.calendar.createYear({
      label: yearStr,
      isCurrent: true,
      semesters: [
        { semNum: 1, startDate: oddStart, endDate: oddEnd },
        { semNum: 2, startDate: evenStart, endDate: evenEnd },
      ],
    }).then((response) => {
      setData(mapCalendarResponse(response));
      setActiveTab('current');
      window.dispatchEvent(new Event('smart-campus-notifications-updated'));
    }).catch((error) => {
      window.alert(error instanceof Error ? error.message : 'Unable to add academic session');
    });
  };

  const handleEditSession = (yearId: string) => {
    const year = data.find(y => y.id === yearId);
    if (!year) return;
    const newYearStr = prompt('Edit academic year name:', year.year);
    if (newYearStr) {
      void api.calendar.updateYear(yearId, { label: newYearStr }).then((response) => {
        setData(mapCalendarResponse(response));
        window.dispatchEvent(new Event('smart-campus-notifications-updated'));
      }).catch((error) => {
        window.alert(error instanceof Error ? error.message : 'Unable to update academic session');
      });
    }
  };

  const handleDeleteSession = (yearId: string) => {
    if (confirm('Are you sure you want to delete this entire session?')) {
      void api.calendar.deleteYear(yearId).then(async () => {
        const response = await api.calendar.list();
        setData(mapCalendarResponse(response));
        window.dispatchEvent(new Event('smart-campus-notifications-updated'));
      }).catch((error) => {
        window.alert(error instanceof Error ? error.message : 'Unable to delete academic session');
      });
    }
  };

  const handleSyncGovernmentHolidays = () => {
    setSyncingHolidays(true);
    void api.calendar.syncGovernmentHolidays().then((response) => {
      setData(mapCalendarResponse(response.calendar));
      window.dispatchEvent(new Event('smart-campus-notifications-updated'));
      window.alert(`Government holidays synced. Added ${response.created}, already present ${response.existing}, outside sessions ${response.skipped}.`);
    }).catch((error) => {
      window.alert(error instanceof Error ? error.message : 'Unable to sync government holidays');
    }).finally(() => {
      setSyncingHolidays(false);
    });
  };

  const saveEvent = (yearId: string, semNum: number, eventId: string | undefined, evData: Omit<CalEvent, 'id'>) => {
    // Check max 5 events limit on the start date before applying changes
    if (!eventId) {
      const targetYear = data.find(y => y.id === yearId);
      const targetSem = targetYear?.semesters.find(s => s.num === semNum);
      if (targetSem) {
        const eventsOnDate = targetSem.events.filter(e => e.startDate === evData.startDate).length;
        if (eventsOnDate >= 5) {
          alert('Maximum of 5 events are allowed per date. Cannot add event.');
          return; // Prevent adding the event and keep modal open
        }
      }
    }

    const targetYear = data.find((year) => year.id === yearId);
    const targetSem = targetYear?.semesters.find((semester) => semester.num === semNum);
    const semesterId = targetSem?.id;

    if (semesterId && isAdmin) {
      const syncCalendar = async () => {
        if (eventId) {
          const response = await api.calendar.updateEvent(eventId, {
            semesterId,
            title: evData.title,
            startDate: evData.startDate,
            endDate: evData.endDate,
            type: evData.type,
            description: evData.description,
          });
          setData(mapCalendarResponse(response));
        } else {
          const response = await api.calendar.createEvent({
            semesterId,
            title: evData.title,
            startDate: evData.startDate,
            endDate: evData.endDate,
            type: evData.type,
            description: evData.description,
          });
          setData(mapCalendarResponse(response));
        }
      };
      void syncCalendar().then(() => {
        window.dispatchEvent(new Event('smart-campus-notifications-updated'));
      }).catch((error) => {
        window.alert(error instanceof Error ? error.message : 'Unable to save calendar event');
      });
      setModal(null);
      return;
    }

    setData(prev => prev.map(y => {
      if (y.id !== yearId) return y;
      return {
        ...y,
        semesters: y.semesters.map(s => {
          if (s.num !== semNum) return s;
          
          if (eventId) {
            return { ...s, events: s.events.map(e => e.id === eventId ? { ...e, ...evData } : e) };
          }
          return { ...s, events: [...s.events, { id: `ev-${Date.now()}`, ...evData }] };
        }),
      };
    }));

    setModal(null);
  };

  const deleteEvent = (yearId: string, semNum: number, eventId: string) => {
    const targetYear = data.find((year) => year.id === yearId);
    const targetSem = targetYear?.semesters.find((semester) => semester.num === semNum);

    if (targetSem?.id && isAdmin) {
      void api.calendar.deleteEvent(eventId).then(async () => {
        const response = await api.calendar.list();
        setData(mapCalendarResponse(response));
        window.dispatchEvent(new Event('smart-campus-notifications-updated'));
      }).catch((error) => {
        window.alert(error instanceof Error ? error.message : 'Unable to delete calendar event');
      });
      setModal(null);
      return;
    }

    setData(prev => prev.map(y => {
      if (y.id !== yearId) return y;
      return { ...y, semesters: y.semesters.map(s => s.num !== semNum ? s : { ...s, events: s.events.filter(e => e.id !== eventId) }) };
    }));
    setModal(null);
  };

  const renderSemesterHeading = (sem: SemesterData, yearId: string, isPast: boolean) => {
    return (
      <div key={sem.num} 
           onClick={() => setSelectedSemester({ yearId, semNum: sem.num })}
           style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)', marginBottom: '16px', overflow: 'hidden', opacity: isPast ? 0.9 : 1, transition: '0.2s', cursor: 'pointer' }}
           className="hover-lift">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '14px', background: isPast ? 'var(--surface-3)' : 'linear-gradient(135deg, #3b6cf5, #6c52e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} color={isPast ? 'var(--text-secondary)' : '#fff'} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{sem.label}</h3>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {sem.startDate && sem.endDate && (
                  <>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {fmtDate(sem.startDate)} → {fmtDate(sem.endDate)}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
                  </>
                )}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{sem.events.length} events logged</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, marginRight: '8px' }}>View Calendar</span>
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    );
  };

  // Removed early return for selectedSemester

  // Otherwise, render the Main View
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '0', paddingBottom: '40px' }}>
      
      {selectedSemester && data.find(y => y.id === selectedSemester.yearId) && data.find(y => y.id === selectedSemester.yearId)?.semesters.find(s => s.num === selectedSemester.semNum) ? (() => {
        const activeYear = data.find(y => y.id === selectedSemester.yearId)!;
        const activeSem = activeYear.semesters.find(s => s.num === selectedSemester.semNum)!;
        return (
          <SemesterCalendarDetail 
            year={activeYear} 
            sem={activeSem} 
            onBack={() => setSelectedSemester(null)} 
            isAdmin={isAdmin}
            onAddEvent={(dateStr) => setModal({ yearId: activeYear.id, semNum: activeSem.num, initialDate: dateStr })}
            onEditEvent={(ev) => setModal({ yearId: activeYear.id, semNum: activeSem.num, event: ev })}
          />
        );
      })() : (
        <>
          {/* ── Top Header Navigation ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* Toggle / Tabs */}
            <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '6px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
              <button
                onClick={() => setActiveTab('current')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'current' ? '#fff' : 'transparent',
                  color: activeTab === 'current' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'current' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <CalendarDays size={18} />
                Current Session
                {currentSession && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', marginLeft: '2px' }} />}
              </button>
              <button
                onClick={() => setActiveTab('records')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'records' ? '#fff' : 'transparent',
                  color: activeTab === 'records' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'records' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <History size={18} />
                Records
              </button>
            </div>

            {/* Add Session Action */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn--outline"
                  onClick={handleSyncGovernmentHolidays}
                  disabled={syncingHolidays}
                  style={{ padding: '10px 16px', fontSize: '15px', fontWeight: 600 }}
                >
                  <CalendarDays size={18} /> {syncingHolidays ? 'Syncing...' : 'Sync Govt Holidays'}
                </button>
                <button
                  className="btn btn--primary"
                  onClick={handleAddNewSession}
                  style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 600 }}
                >
                  <CalendarPlus size={18} /> Add Session
                </button>
              </div>
            )}
          </div>

          {/* ── Tab Content ── */}
          <div style={{ position: 'relative' }}>
            
            {/* ── CURRENT SESSION TAB ── */}
            {activeTab === 'current' && (
              <div style={{ animation: 'fade-in 0.3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                      {currentSession ? `Academic Year ${currentSession.year}` : 'No Active Session'}
                    </h2>
                  </div>
                  {currentSession && isAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn--outline btn--sm" onClick={() => handleEditSession(currentSession.id)}>
                        <Edit3 size={14} /> Edit Title
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDeleteSession(currentSession.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {currentSession ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentSession.semesters.map(sem => renderSemesterHeading(sem, currentSession.id, false))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-2)', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
                    <CalendarDays size={36} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '18px' }}>No Current Session</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>There is no active academic session. Add a new session to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── RECORDS TAB ── */}
            {activeTab === 'records' && (
              <div style={{ animation: 'fade-in 0.3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <Archive size={20} color="var(--text-secondary)" />
                  <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-secondary)' }}>Archived Records</h2>
                </div>

                {pastSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-2)', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
                    <History size={36} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '18px' }}>No Records Found</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Past academic sessions will automatically appear here once they conclude.</p>
                  </div>
                ) : (
                  pastSessions.map(session => (
                    <div key={session.id} style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <History size={16} color="var(--text-muted)" /> {session.year}
                        </h3>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn--ghost btn--sm" onClick={() => handleEditSession(session.id)}>
                              <Edit3 size={14} /> Edit
                            </button>
                            <button className="btn btn--ghost btn--sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDeleteSession(session.id)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {session.semesters.map(sem => renderSemesterHeading(sem, session.id, true))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modal ── */}
      {modal && (
        <EventModal
          event={modal.event}
          initialDate={modal.initialDate}
          onSave={ev => saveEvent(modal.yearId, modal.semNum, modal.event?.id, ev)}
          onClose={() => setModal(null)}
          onDelete={modal.event?.id ? () => deleteEvent(modal.yearId, modal.semNum, modal.event!.id) : undefined}
          isAdmin={isAdmin}
        />
      )}

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AcademicCalendarView;
