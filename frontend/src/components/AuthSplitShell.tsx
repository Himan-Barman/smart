import React from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  GraduationCap,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

interface AuthSplitShellProps {
  mode: 'login' | 'signup';
  children: React.ReactNode;
  onHome: () => void;
  onSwitch: () => void;
}

const highlights = [
  { icon: <CalendarDays size={16} />, label: 'Live schedules' },
  { icon: <QrCode size={16} />, label: 'QR attendance' },
  { icon: <Bell size={16} />, label: 'Targeted notices' },
];

const AuthSplitShell: React.FC<AuthSplitShellProps> = ({
  mode,
  children,
  onHome,
  onSwitch,
}) => {
  const switchLabel = mode === 'login' ? 'Sign Up' : 'Sign In';

  return (
    <div className={`auth-page auth-page--split auth-page--${mode}`}>
      <div className="auth-shell">
        <aside className="auth-shell__visual" aria-label="Smart Campus overview">
          <div className="auth-shell__visual-copy">
            <span>Smart campus operations made simple.</span>
          </div>

          <div className="auth-shell__rings" aria-hidden="true" />

          <div className="auth-shell__visual-content">
            <h1>Manage your campus</h1>
            <p>
              Schedules, attendance, notices, departments, and records connected
              in one secure university portal.
            </p>
          </div>

          <div className="auth-shell__visual-card" aria-hidden="true">
            <div className="auth-shell__mini-bar">
              <span />
              <span />
              <span />
            </div>
            <strong>Today</strong>
            <div className="auth-shell__mini-chart">
              <span style={{ height: '42%' }} />
              <span style={{ height: '68%' }} />
              <span style={{ height: '54%' }} />
              <span style={{ height: '86%' }} />
              <span style={{ height: '74%' }} />
            </div>
          </div>

          <div className="auth-shell__visual-footer">
            {highlights.map((item) => (
              <span key={item.label}>
                {item.icon}
                {item.label}
              </span>
            ))}
          </div>
        </aside>

        <section className="auth-shell__panel" aria-label={`${switchLabel} panel`}>
          <div className="auth-shell__topbar">
            <button className="auth-shell__brand" type="button" onClick={onHome}>
              <span><GraduationCap size={20} /></span>
              Smart Campus
            </button>
            <button className="auth-shell__switch" type="button" onClick={onSwitch}>
              <ShieldCheck size={15} />
              {switchLabel}
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="auth-shell__form-wrap">
            {children}
          </div>

          <div className="auth-shell__panel-footer">
            <span>&copy; 2026 Smart Campus</span>
            <button type="button" onClick={onHome}>Website</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthSplitShell;
