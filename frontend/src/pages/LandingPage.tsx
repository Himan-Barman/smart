import React from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle,
  DoorOpen,
  GraduationCap,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImage from '../assets/landing-campus-hero.jpg';

const featureItems = [
  {
    icon: <CalendarDays size={21} />,
    title: 'Live Academic Operations',
    copy: 'Schedules, departments, semesters, rooms, and calendar data stay connected across every role.',
  },
  {
    icon: <QrCode size={21} />,
    title: 'Structured Attendance',
    copy: 'QR and manual attendance records map back to department, semester, subject, faculty, and schedule.',
  },
  {
    icon: <Bell size={21} />,
    title: 'Targeted Communication',
    copy: 'Admins and faculty publish notices to the exact students, teachers, departments, or semesters.',
  },
];

const roleItems = [
  { label: 'Students', text: 'Schedule, attendance, notices, skills, rooms, and grievances.' },
  { label: 'Faculty', text: 'Class routines, QR sessions, manual attendance, rooms, and notices.' },
  { label: 'Admins', text: 'Users, departments, schedules, academic calendar, notices, and audit data.' },
];

const LandingPage: React.FC = () => {
  const { setAuthStep } = useAuth();

  return (
    <div className="landing-page">
      <header className="landing-nav" aria-label="Public navigation">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} type="button">
          <span className="landing-brand__mark"><GraduationCap size={24} /></span>
          <span>
            <strong>Smart Campus</strong>
            <small>University Management</small>
          </span>
        </button>
        <nav className="landing-nav__links" aria-label="Landing sections">
          <a href="#platform">Platform</a>
          <a href="#roles">Roles</a>
          <a href="#security">Security</a>
        </nav>
        <button className="landing-nav__login" onClick={() => setAuthStep('login')} type="button">
          Login
          <ArrowRight size={16} />
        </button>
      </header>

      <main>
        <section className="landing-hero" style={{ backgroundImage: `url(${heroImage})` }}>
          <div className="landing-hero__shade" />
          <div className="landing-hero__content">
            <span className="landing-eyebrow"><ShieldCheck size={15} /> Production campus portal</span>
            <h1>Smart Campus</h1>
            <p>
              A secure university management platform for authenticated students,
              faculty, and administrators, built around live academic data.
            </p>
            <div className="landing-hero__actions">
              <button className="landing-btn landing-btn--primary" onClick={() => setAuthStep('login')} type="button">
                Login to Portal
                <ArrowRight size={18} />
              </button>
              <button className="landing-btn landing-btn--secondary" onClick={() => setAuthStep('signup')} type="button">
                Sign Up
              </button>
            </div>
            <div className="landing-hero__facts" aria-label="Platform highlights">
              <span><CheckCircle size={15} /> JWT-secured access</span>
              <span><CheckCircle size={15} /> Department-scoped data</span>
              <span><CheckCircle size={15} /> Real-time notifications</span>
            </div>
          </div>
        </section>

        <section className="landing-band" id="platform">
          <div className="landing-band__head">
            <span>Campus System</span>
            <h2>One operating layer for daily university workflows.</h2>
          </div>
          <div className="landing-feature-grid">
            {featureItems.map((item) => (
              <article className="landing-feature" key={item.title}>
                <div className="landing-feature__icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-split" id="roles">
          <div>
            <span className="landing-section-kicker">Role Based</span>
            <h2>Every dashboard opens with the right data for the signed-in user.</h2>
            <p>
              The website does not expose internal pages publicly. Visitors enter
              through this landing page, then move into the authenticated portal.
            </p>
          </div>
          <div className="landing-role-list">
            {roleItems.map((role) => (
              <article className="landing-role" key={role.label}>
                <span>{role.label.slice(0, 1)}</span>
                <div>
                  <h3>{role.label}</h3>
                  <p>{role.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-security" id="security">
          <div className="landing-security__item">
            <LockKeyhole size={22} />
            <div>
              <h3>Persistent secure sessions</h3>
              <p>Access tokens stay in memory while refresh tokens remain protected in HttpOnly cookies.</p>
            </div>
          </div>
          <div className="landing-security__item">
            <Users size={22} />
            <div>
              <h3>Admin-approved accounts</h3>
              <p>Only users added by administration can complete signup and access campus services.</p>
            </div>
          </div>
          <div className="landing-security__item">
            <DoorOpen size={22} />
            <div>
              <h3>Operational modules</h3>
              <p>Attendance, notices, schedules, rooms, departments, and records stay synced with the database.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
