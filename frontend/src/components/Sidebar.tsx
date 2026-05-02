import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { PageType } from '../types';
import {
  LayoutDashboard, Megaphone, MessageSquare, Target,
  DoorOpen, Scale, QrCode, X, GraduationCap,
  Upload, CalendarDays, Building2,
} from 'lucide-react';

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ReactNode;
  roles: ('admin' | 'teacher' | 'student')[];
}

const allNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'schedule', label: 'Schedule', icon: <CalendarDays size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'departments', label: 'Departments', icon: <Building2 size={20} />, roles: ['admin'] },
  { id: 'notices', label: 'Notice Board', icon: <Megaphone size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'skills', label: 'Skills & Internships', icon: <Target size={20} />, roles: ['admin', 'student'] },
  { id: 'rooms', label: 'Room Booking', icon: <DoorOpen size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'grievances', label: 'Grievances', icon: <Scale size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'attendance', label: 'Attendance', icon: <QrCode size={20} />, roles: ['admin', 'teacher', 'student'] },
  { id: 'admin_upload', label: 'User Management', icon: <Upload size={20} />, roles: ['admin'] },
];

const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useApp();
  const { currentUser } = useAuth();

  const role = currentUser?.role || 'student';
  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <>
      {sidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <GraduationCap size={28} />
            </div>
            <div className="sidebar__logo-text">
              <h1>Smart Campus</h1>
              <span>University Management</span>
            </div>
          </div>
          <button
            className="sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>



        <nav className="sidebar__nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${currentPage === item.id ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => {
                setCurrentPage(item.id as PageType);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
              {currentPage === item.id && <div className="sidebar__nav-indicator" />}
            </button>
          ))}
        </nav>


      </aside>
    </>
  );
};

export default Sidebar;
