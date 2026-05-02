import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { PageType } from '../types';
import {
  Megaphone, MessageSquare, Target, DoorOpen, Scale, QrCode,
  Users, BookOpen, TrendingUp, Calendar, Clock, CheckCircle,
  AlertCircle, ArrowUpRight, Upload, Shield,
  UserCheck, Activity,
  GraduationCap, Star, Radio, WifiOff,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD — System-wide overview & management
   ═══════════════════════════════════════════════════════════ */
const AdminDashboard: React.FC = () => {
  const { setCurrentPage, notices, bookings, grievances, attendanceSession } = useApp();
  const { registeredPersons, registeredUsers } = useAuth();

  const studentCount = registeredPersons.filter(p => p.role === 'student').length;
  const teacherCount = registeredPersons.filter(p => p.role === 'teacher').length;
  const resolvedGrievances = grievances.filter(g => g.status === 'resolved').length;

  const statCards = [
    { value: registeredPersons.length, label: 'Registered', icon: <Users size={22} />, color: '#3b6cf5', bg: 'rgba(59,108,245,0.08)', page: 'admin_upload' as PageType },
    { value: studentCount, label: 'Students', icon: <UserCheck size={22} />, color: '#1a9d5c', bg: 'rgba(26,157,92,0.07)', page: 'admin_upload' as PageType },
    { value: teacherCount, label: 'Faculty', icon: <BookOpen size={22} />, color: '#6c52e8', bg: 'rgba(108,82,232,0.07)', page: 'admin_upload' as PageType },
    { value: registeredUsers.length, label: 'Active Users', icon: <Activity size={22} />, color: '#1596c4', bg: 'rgba(21,150,196,0.07)', page: 'admin_upload' as PageType },
    { value: notices.length, label: 'Notices', icon: <Megaphone size={22} />, color: '#d07a1a', bg: 'rgba(208,122,26,0.07)', page: 'notices' as PageType },
    { value: grievances.length, label: 'Grievances', icon: <Scale size={22} />, color: '#d94444', bg: 'rgba(217,68,68,0.06)', page: 'grievances' as PageType },
  ];

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
      {/* Welcome */}
      <div className="dash__welcome dash__welcome--admin">
        <div className="dash__welcome-left">
          <span className="dash__welcome-badge"><Shield size={13} style={{marginRight:4}}/>Admin Panel</span>
          <h2>System Overview</h2>
          <p>Manage users, monitor campus activity, and maintain operations.</p>
        </div>
        <div className="dash__welcome-metrics">
          <div className="dash__metric"><span className="dash__metric-val">{registeredUsers.length}</span><span className="dash__metric-lbl">Users Online</span></div>
          <div className="dash__metric-divider" />
          <div className="dash__metric"><span className="dash__metric-val">{Math.round((resolvedGrievances / (grievances.length || 1)) * 100)}%</span><span className="dash__metric-lbl">Issues Resolved</span></div>
          <div className="dash__metric-divider" />
          <div className="dash__metric"><span className="dash__metric-val">{attendanceSession?.isActive ? <Radio size={14} color="#1a9d5c" /> : <WifiOff size={14} color="#aaa" />}</span><span className="dash__metric-lbl">Attendance</span></div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash__stats">
        {statCards.map((s, i) => (
          <button key={i} className="dash__stat" onClick={() => setCurrentPage(s.page)}>
            <div className="dash__stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <span className="dash__stat-val">{s.value}</span>
            <span className="dash__stat-lbl">{s.label}</span>
            <ArrowUpRight size={14} className="dash__stat-arrow" />
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="dash__section">
        <h3 className="dash__section-title">Quick Actions</h3>
        <div className="dash__actions">
          {quickActions.map((a, i) => (
            <button key={i} className="dash__action" onClick={() => setCurrentPage(a.page)}>
              <div className="dash__action-icon" style={{ color: a.color }}>{a.icon}</div>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Recent + Status */}
      <div className="dash__grid">
        <div className="dash__card">
          <h3 className="dash__card-title"><Megaphone size={16} /> Recent Notices</h3>
          <div className="dash__list">
            {notices.slice(0, 4).map(n => (
              <div key={n.id} className="dash__list-item" onClick={() => setCurrentPage('notices')}>
                <div className={`dash__dot dash__dot--${n.category}`} />
                <div className="dash__list-content">
                  <span className="dash__list-title">{n.title}</span>
                  <span className="dash__list-meta"><Calendar size={11} /> {n.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash__card">
          <h3 className="dash__card-title"><Scale size={16} /> Grievance Status</h3>
          <div className="dash__progress-group">
            {[
              { label: 'Resolved', count: resolvedGrievances, color: '#1a9d5c', pct: (resolvedGrievances / (grievances.length || 1)) * 100 },
              { label: 'In Progress', count: grievances.filter(g => g.status === 'in_progress').length, color: '#3b6cf5', pct: (grievances.filter(g => g.status === 'in_progress').length / (grievances.length || 1)) * 100 },
              { label: 'Pending', count: grievances.filter(g => g.status === 'submitted').length, color: '#d07a1a', pct: (grievances.filter(g => g.status === 'submitted').length / (grievances.length || 1)) * 100 },
            ].map((item, i) => (
              <div key={i} className="dash__progress-row">
                <div className="dash__progress-header">
                  <span style={{ color: item.color, fontWeight: 700 }}>{item.count}</span>
                  <span>{item.label}</span>
                </div>
                <div className="dash__progress-bar">
                  <div className="dash__progress-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash__card">
          <h3 className="dash__card-title"><Clock size={16} /> Today's Bookings</h3>
          <div className="dash__list">
            {bookings.slice(0, 3).map(b => (
              <div key={b.id} className="dash__list-item">
                <span className="dash__time">{b.startTime}</span>
                <div className="dash__list-content">
                  <span className="dash__list-title">{b.purpose}</span>
                  <span className="dash__list-meta">{b.roomName}</span>
                </div>
                {b.status === 'confirmed' ? <CheckCircle size={14} style={{ color: '#1a9d5c' }} /> : <AlertCircle size={14} style={{ color: '#d07a1a' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TEACHER DASHBOARD — My classes, attendance, feedback
   ═══════════════════════════════════════════════════════════ */
const TeacherDashboard: React.FC = () => {
  const { setCurrentPage, notices, feedbacks, bookings, attendanceSession } = useApp();
  const { currentUser } = useAuth();

  const myFeedback = feedbacks.filter(f => f.type === 'faculty' || f.type === 'course');
  const avgRating = myFeedback.length > 0
    ? (myFeedback.reduce((sum, f) => sum + f.rating, 0) / myFeedback.length).toFixed(1)
    : '—';

  const statCards = [
    { value: attendanceSession?.isActive ? 'Live' : 'Off', label: 'Attendance', icon: <QrCode size={22} />, color: '#1a9d5c', bg: 'rgba(26,157,92,0.07)', page: 'attendance' as PageType },
    { value: myFeedback.length, label: 'Feedback', icon: <MessageSquare size={22} />, color: '#3b6cf5', bg: 'rgba(59,108,245,0.08)', page: 'feedback' as PageType },
    { value: avgRating, label: 'Avg Rating', icon: <TrendingUp size={22} />, color: '#d07a1a', bg: 'rgba(208,122,26,0.07)', page: 'feedback' as PageType },
    { value: bookings.filter(b => b.status !== 'cancelled').length, label: 'Bookings', icon: <DoorOpen size={22} />, color: '#6c52e8', bg: 'rgba(108,82,232,0.07)', page: 'rooms' as PageType },
  ];

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
          <span className="dash__welcome-badge"><BookOpen size={13} style={{marginRight:4}}/>Faculty Panel</span>
          <h2>Welcome, {currentUser?.name?.split(' ').pop() || 'Professor'}!</h2>
          <p>{currentUser?.department} Department</p>
        </div>
        <div className="dash__welcome-metrics">
          <div className="dash__metric"><span className="dash__metric-val" style={{display:'flex',alignItems:'center',gap:'4px'}}><Star size={14} color="#f59e0b" fill="#f59e0b"/> {avgRating}</span><span className="dash__metric-lbl">Avg Rating</span></div>
          <div className="dash__metric-divider" />
          <div className="dash__metric"><span className="dash__metric-val">{attendanceSession?.attendees?.length || 0}</span><span className="dash__metric-lbl">Present Today</span></div>
        </div>
      </div>

      <div className="dash__stats">
        {statCards.map((s, i) => (
          <button key={i} className="dash__stat" onClick={() => setCurrentPage(s.page)}>
            <div className="dash__stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <span className="dash__stat-val">{s.value}</span>
            <span className="dash__stat-lbl">{s.label}</span>
            <ArrowUpRight size={14} className="dash__stat-arrow" />
          </button>
        ))}
      </div>

      <div className="dash__section">
        <h3 className="dash__section-title">Quick Actions</h3>
        <div className="dash__actions">
          {quickActions.map((a, i) => (
            <button key={i} className="dash__action" onClick={() => setCurrentPage(a.page)}>
              <div className="dash__action-icon" style={{ color: a.color }}>{a.icon}</div>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dash__grid">
        <div className="dash__card">
          <h3 className="dash__card-title"><MessageSquare size={16} /> Recent Feedback</h3>
          <div className="dash__list">
            {myFeedback.slice(0, 4).map(f => (
              <div key={f.id} className="dash__list-item" onClick={() => setCurrentPage('feedback')}>
                <div className="dash__rating">{[1,2,3,4,5].map(i=><Star key={i} size={13} fill={i<=f.rating?'#f59e0b':'none'} color="#f59e0b" />)}</div>
                <div className="dash__list-content">
                  <span className="dash__list-title">{f.subject}</span>
                  <span className="dash__list-meta">{f.date} · {f.status}</span>
                </div>
              </div>
            ))}
            {myFeedback.length === 0 && <p className="dash__empty">No feedback yet</p>}
          </div>
        </div>

        <div className="dash__card">
          <h3 className="dash__card-title"><Megaphone size={16} /> Notices</h3>
          <div className="dash__list">
            {notices.slice(0, 4).map(n => (
              <div key={n.id} className="dash__list-item" onClick={() => setCurrentPage('notices')}>
                <div className={`dash__dot dash__dot--${n.category}`} />
                <div className="dash__list-content">
                  <span className="dash__list-title">{n.title}</span>
                  <span className="dash__list-meta"><Calendar size={11} /> {n.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash__card">
          <h3 className="dash__card-title"><Clock size={16} /> My Bookings</h3>
          <div className="dash__list">
            {bookings.slice(0, 3).map(b => (
              <div key={b.id} className="dash__list-item">
                <span className="dash__time">{b.startTime}</span>
                <div className="dash__list-content">
                  <span className="dash__list-title">{b.purpose}</span>
                  <span className="dash__list-meta">{b.roomName}</span>
                </div>
                {b.status === 'confirmed' ? <CheckCircle size={14} style={{ color: '#1a9d5c' }} /> : <AlertCircle size={14} style={{ color: '#d07a1a' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   STUDENT DASHBOARD — My progress, skills, attendance
   ═══════════════════════════════════════════════════════════ */
const perfData = [
  { time: '10 am', val: 12000 }, { time: '11 am', val: 13500 }, { time: '12 pm', val: 13000 },
  { time: '1 pm', val: 14600 }, { time: '2 pm', val: 14000 }, { time: '3 pm', val: 15200 },
];
const miniData1 = [{v:10},{v:12},{v:11},{v:15},{v:14},{v:18}];
const miniData2 = [{v:15},{v:13},{v:16},{v:12},{v:18},{v:17}];

const StudentDashboard: React.FC = () => {
  const { setCurrentPage, notices, attendanceSession } = useApp();
  const { currentUser } = useAuth();
  
  const topCards = [
    { title: 'Computer Networks', val: 'A+', code: 'CS301', pct: '+2.4%', color: '#A0F1D3', data: miniData1 },
    { title: 'Data Structures', val: 'A', code: 'CS201', pct: '+1.2%', color: '#9BC6FA', data: miniData2 },
    { title: 'OS Concepts', val: 'B+', code: 'CS302', pct: '-0.5%', color: '#FFE599', data: miniData1 },
    { title: 'Database Sys', val: 'A', code: 'CS304', pct: '+3.1%', color: '#AEE2B5', data: miniData2 },
    { title: 'Software Eng', val: 'A-', code: 'CS401', pct: '+0.8%', color: '#F1A0E8', data: miniData1 },
  ];

  return (
    <div className="dash-fox">
      <div className="dash-fox__header">
        <h2>Hello {currentUser?.name?.split(' ')[0] || 'Student'},</h2>
      </div>

      <div className="dash-fox__section">
        <h3 className="dash-fox__subtitle">My Subjects</h3>
        <div className="dash-fox__top-cards">
          {topCards.map((c, i) => (
            <div key={i} className="fox-minicard" style={{ background: c.color }}>
              <div className="fox-minicard__top">
                <div className="fox-minicard__icon"><BookOpen size={14} color="var(--text-primary)" /></div>
                <span className="fox-minicard__code">{c.code}</span>
              </div>
              <div className="fox-minicard__mid">
                <div style={{display:'flex', flexDirection:'column'}}>
                  <span className="fox-minicard__lbl">Current Grade</span>
                  <span className="fox-minicard__val">{c.val}</span>
                </div>
                <div className="fox-minicard__chart">
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={c.data}>
                      <Line type="monotone" dataKey="v" stroke="rgba(0,0,0,0.4)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="fox-minicard__bot">
                <span>{c.title}</span>
                <span style={{ color: c.pct.startsWith('+') ? '#1a9d5c' : '#d94444', fontWeight: 600 }}>{c.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-fox__row">
        {/* Left Col */}
        <div className="dash-fox__col dash-fox__col--sm">
          <div className="fox-balance-card fox-balance-card--purple">
            <div>
              <span className="fox-bal-lbl">Overall CGPA</span>
              <span className="fox-bal-val">8.45</span>
            </div>
            <div className="fox-bal-badge">+0.15</div>
          </div>
          <div className="fox-balance-card fox-balance-card--black" style={{ marginTop: 16 }}>
            <div>
              <span className="fox-bal-lbl">Credits Earned</span>
              <span className="fox-bal-val" style={{ color: '#fff' }}>104 / 120</span>
            </div>
            <button className="fox-bal-btn" onClick={()=>setCurrentPage('skills')}><ArrowUpRight size={16}/></button>
          </div>
          
          <div className="dash-fox__quick-info">
             <div className="fox-qi-row">
               <span className="fox-qi-lbl">Next Class</span>
               <span className="fox-qi-val" style={{color: 'var(--text-primary)', fontWeight: 600}}>10:30 AM</span>
             </div>
             <div className="fox-qi-row" style={{ marginTop: 8 }}>
               <span className="fox-qi-lbl">Room</span>
               <span className="fox-qi-val" style={{color: 'var(--text-primary)', fontWeight: 600}}>Lab 3</span>
             </div>
          </div>
        </div>

        {/* Mid Col */}
        <div className="dash-fox__col dash-fox__col--lg">
          <div className="fox-panel">
            <div className="fox-panel__head">
              <h3>Performance Analytics</h3>
              <div className="fox-tabs">
                <span className="fox-tab active">1W</span>
                <span className="fox-tab">1M</span>
                <span className="fox-tab">6M</span>
                <span className="fox-tab">1Y</span>
              </div>
            </div>
            <div className="fox-panel__chart" style={{ height: 200, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C5DD3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6C5DD3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8D9B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8D9B' }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="val" stroke="#6C5DD3" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="dash-fox__col dash-fox__col--md">
           <div className="fox-panel" style={{ height: '100%' }}>
             <h3 style={{ marginBottom: 16 }}>Upcoming Tasks</h3>
             <div className="fox-list">
               <div className="fox-list-item">
                 <div className="fox-list-icon" style={{ background: 'rgba(108, 93, 211, 0.1)' }}><BookOpen size={16} color="#6C5DD3"/></div>
                 <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color:'var(--text-primary)' }}>Data Struct Assignment</h4><span style={{ fontSize: 11, color:'var(--text-muted)' }}>Due Tomorrow</span></div>
                 <div className="fox-list-val" style={{ fontSize: 12, fontWeight: 600, color:'var(--text-muted)' }}>Pending</div>
               </div>
               <div className="fox-list-item" style={{ marginTop: 12 }}>
                 <div className="fox-list-icon" style={{ background: 'rgba(60, 203, 127, 0.1)' }}><Target size={16} color="#3CCB7F"/></div>
                 <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color:'var(--text-primary)' }}>Web Dev Quiz</h4><span style={{ fontSize: 11, color:'var(--text-muted)' }}>Wed, 10 AM</span></div>
                 <div className="fox-list-val" style={{ fontSize: 12, fontWeight: 600, color:'#3CCB7F' }}>Ready</div>
               </div>
               <div className="fox-list-item" style={{ marginTop: 12 }}>
                 <div className="fox-list-icon" style={{ background: 'rgba(244, 196, 48, 0.1)' }}><Megaphone size={16} color="#F4C430"/></div>
                 <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color:'var(--text-primary)' }}>Project Submission</h4><span style={{ fontSize: 11, color:'var(--text-muted)' }}>Fri, 5 PM</span></div>
                 <div className="fox-list-val" style={{ fontSize: 12, fontWeight: 600, color:'var(--text-muted)' }}>Pending</div>
               </div>
             </div>
           </div>
        </div>
      </div>
      
      {/* Bottom Wide Section */}
      <div className="dash-fox__row" style={{ marginTop: 24 }}>
        <div className="dash-fox__col" style={{flex: 2}}>
           <div className="fox-panel">
             <h3>Attendance Analytics</h3>
             <div className="fox-panel__chart" style={{ height: 250, marginTop: 16 }}>
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={perfData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E5F2" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8D9B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8D9B' }} />
                    <Tooltip cursor={{ stroke: '#6C5DD3', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="val" stroke="#6C5DD3" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#6C5DD3', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </LineChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>
        <div className="dash-fox__col" style={{flex: 1}}>
           <div className="fox-panel" style={{ height: '100%' }}>
             <div className="fox-panel__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <h3>Quick Access</h3>
               <button className="fox-icon-btn" style={{ background: 'var(--surface-2)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)' }}><QrCode size={16}/></button>
             </div>
             <div className="fox-list">
               <div className="fox-list-item" onClick={()=>setCurrentPage('attendance')} style={{ cursor: 'pointer' }}>
                 <div className="fox-list-icon" style={{ background: 'rgba(60, 203, 127, 0.1)' }}><QrCode size={16} color="#3CCB7F"/></div>
                 <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color:'var(--text-primary)' }}>Mark Attendance</h4><span style={{ fontSize: 11, color:'var(--text-muted)' }}>Scan QR Code</span></div>
               </div>
               <div className="fox-list-item" onClick={()=>setCurrentPage('rooms')} style={{ cursor: 'pointer', marginTop: 12 }}>
                 <div className="fox-list-icon" style={{ background: 'rgba(108, 93, 211, 0.1)' }}><DoorOpen size={16} color="#6C5DD3"/></div>
                 <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color:'var(--text-primary)' }}>Book Room</h4><span style={{ fontSize: 11, color:'var(--text-muted)' }}>Library or Labs</span></div>
               </div>
               <div className="fox-list-item" onClick={()=>setCurrentPage('notices')} style={{ cursor: 'pointer', marginTop: 12 }}>
                 <div className="fox-list-icon" style={{ background: 'rgba(244, 196, 48, 0.1)' }}><Megaphone size={16} color="#F4C430"/></div>
                 <div className="fox-list-info"><h4 style={{ fontSize: 13, fontWeight: 600, color:'var(--text-primary)' }}>View Notices</h4><span style={{ fontSize: 11, color:'var(--text-muted)' }}>{notices.length} New Updates</span></div>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT — Routes to the correct dashboard
   ═══════════════════════════════════════════════════════════ */
const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  switch (currentUser?.role) {
    case 'admin': return <AdminDashboard />;
    case 'teacher': return <TeacherDashboard />;
    case 'student': return <StudentDashboard />;
    default: return <StudentDashboard />;
  }
};

export default Dashboard;
