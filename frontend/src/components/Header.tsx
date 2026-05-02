import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Menu, Bell, Search, LogOut, X, Building2, BookOpen, Scale, DoorOpen, CalendarDays, Megaphone, ArrowLeft } from 'lucide-react';

type HeaderNotification = {
  id: string;
  title: string;
  desc: string;
  date: string;
  unread: boolean;
};

const Header: React.FC = () => {
  const { 
    currentPage, setSidebarOpen, setCurrentPage, goBack, canGoBack, 
    departments, notices, rooms, grievances, schedule 
  } = useApp();
  const { currentUser, logout } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const list = await api.notifications.list();
        setNotifications(list.map(({ id, title, desc, date, unread }) => ({ id, title, desc, date, unread })));
      } catch {
        setNotifications([]);
      }
    };

    void loadNotifications();
  }, []);

  const pageTitle: Record<string, string> = {
    dashboard: 'Dashboard',
    notices: 'Notice Board',
    feedback: 'Feedback System',
    skills: 'Skill Mapping & Internships',
    rooms: 'Room / Lab Booking',
    grievances: 'Grievances & Suggestions',
    attendance: 'Attendance',
    admin_upload: 'User Management',
    schedule: 'Class Schedule',
    departments: 'Departments',
    department_detail: 'Department Info',
    course_detail: 'Course Details',
    profile: 'User Profile',
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2);
  };

  /* ─── Search Algorithm ─── */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: Array<{ title: string; subtitle: string; type: string; icon: React.ReactNode; navigateTo: string }> = [];

    // 1. Search Departments
    departments.forEach(d => {
      if (d.name.toLowerCase().includes(query) || d.hod.toLowerCase().includes(query)) {
        results.push({
          title: d.name,
          subtitle: `HOD: ${d.hod}`,
          type: 'Department',
          icon: <Building2 size={16} />,
          navigateTo: 'departments'
        });
      }
      // Search Courses inside departments
      d.semesters.forEach(s => {
        s.subjects.forEach(sub => {
          if (sub.name.toLowerCase().includes(query) || sub.code.toLowerCase().includes(query)) {
            results.push({
              title: `${sub.code} - ${sub.name}`,
              subtitle: `${d.name} • Sem ${s.semester}`,
              type: 'Course',
              icon: <BookOpen size={16} />,
              navigateTo: 'departments'
            });
          }
        });
      });
    });

    // 2. Search Notices
    notices.forEach(n => {
      if (n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)) {
        results.push({
          title: n.title,
          subtitle: `Posted on ${n.date}`,
          type: 'Notice',
          icon: <Megaphone size={16} />,
          navigateTo: 'notices'
        });
      }
    });

    // 3. Search Rooms
    rooms.forEach(r => {
      if (r.name.toLowerCase().includes(query) || r.id.toLowerCase().includes(query)) {
        results.push({
          title: r.name,
          subtitle: `Capacity: ${r.capacity} • ${r.type}`,
          type: 'Room',
          icon: <DoorOpen size={16} />,
          navigateTo: 'rooms'
        });
      }
    });

    // 4. Search Grievances
    grievances.forEach(g => {
      if (g.subject.toLowerCase().includes(query)) {
        results.push({
          title: g.subject,
          subtitle: `Status: ${g.status.replace('_', ' ')} • Priority: ${g.priority}`,
          type: 'Grievance',
          icon: <Scale size={16} />,
          navigateTo: 'grievances'
        });
      }
    });

    // 5. Search Schedule
    schedule.forEach(s => {
      if (s.course.toLowerCase().includes(query) || s.department.toLowerCase().includes(query)) {
        results.push({
          title: s.course,
          subtitle: `${s.day} • ${s.startTime}-${s.endTime} • ${s.room}`,
          type: 'Schedule',
          icon: <CalendarDays size={16} />,
          navigateTo: 'schedule'
        });
      }
    });

    return results.slice(0, 8); // Limit to top 8 results
  }, [searchQuery, departments, notices, rooms, grievances, schedule]);

  const handleResultClick = (page: any) => {
    setCurrentPage(page);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const mainPages = ['dashboard', 'departments', 'attendance', 'schedule', 'rooms', 'notices', 'grievances', 'skills', 'admin_upload'];
  const isMainPage = mainPages.includes(currentPage);

  return (
    <header className="header">
      <div className="header__left">
        {(!isMainPage && canGoBack) ? (
          <button
            className="header__back-btn"
            onClick={goBack}
            aria-label="Go back"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-2)', border: '1px solid var(--glass-border)', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', transition: '0.2s' }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        ) : (
          <button
            className="header__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        )}
      </div>

      <div className="header__right">
        {/* Real-time Expandable Search */}
        <div className="header__search-wrap" ref={searchRef}>
          <div className={`header__search ${searchOpen ? 'header__search--expanded' : ''}`}>
            <Search size={16} className="search-icon-left" />
            <input 
              type="text" 
              placeholder="Search campus..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              autoComplete="off"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => { setSearchQuery(''); document.querySelector<HTMLInputElement>('.header__search input')?.focus(); }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && (
            <div className="header__search-dropdown">
              <div className="search-popup__results">
                {searchQuery.length > 0 ? (
                  <div className="search-results-list">
                    <p className="search-popup__section-title">Search Results ({searchResults.length})</p>
                    {searchResults.map((result, i) => (
                      <div key={i} className="search-result-item" onClick={() => handleResultClick(result.navigateTo)}>
                        <div className="search-result-icon">{result.icon}</div>
                        <div className="search-result-info">
                          <h4>{result.title}</h4>
                          <span>{result.type} • {result.subtitle}</span>
                        </div>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <div className="search-empty">No matches found for "{searchQuery}"</div>
                    )}
                  </div>
                ) : (
                  <div className="search-popup__recent">
                    <p className="search-popup__section-title">Search Categories</p>
                    <div className="search-recent-tags">
                      <span onClick={() => setSearchQuery('department')}>Departments</span>
                      <span onClick={() => setSearchQuery('notice')}>Notices</span>
                      <span onClick={() => setSearchQuery('lab')}>Labs</span>
                      <span onClick={() => setSearchQuery('grievance')}>Grievances</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="header__notification-wrap" ref={notifRef}>
          <button 
            className={`header__notification ${notificationsOpen ? 'active' : ''}`} 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="header__notification-dot" />
          </button>
          
          {notificationsOpen && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown__header">
                <h3>Notifications</h3>
                <button
                  className="mark-all-read"
                  onClick={async () => {
                    await api.notifications.markAllRead();
                    setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })));
                  }}
                >
                  Mark all as read
                </button>
              </div>
              <div className="notifications-dropdown__list">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`notification-item ${notif.unread ? 'unread' : ''}`}
                    onClick={async () => {
                      await api.notifications.markRead(notif.id);
                      setNotifications((prev) =>
                        prev.map((notification) =>
                          notification.id === notif.id ? { ...notification, unread: false } : notification,
                        ),
                      );
                    }}
                  >
                    <div className="notification-icon">
                      <Bell size={16} />
                    </div>
                    <div className="notification-content">
                      <h4>{notif.title}</h4>
                      <p>{notif.desc}</p>
                      <span className="notification-time">{notif.date}</span>
                    </div>
                    {notif.unread && <div className="notification-unread-dot" />}
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="notification-item">
                    <div className="notification-content">
                      <p>No notifications yet.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="notifications-dropdown__footer">
                <button onClick={() => { setCurrentPage('notifications'); setNotificationsOpen(false); }}>View All Notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar instead of User Pill */}
        {currentUser && (
          <button 
            className="header__profile-avatar" 
            onClick={() => setCurrentPage('profile')}
            title="View Profile"
          >
            {getInitials(currentUser.name).toUpperCase()}
          </button>
        )}

        {/* Logout Button */}
        <button
          className="header__logout-btn"
          onClick={() => setLogoutConfirmOpen(true)}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>

        {/* Logout Confirmation Modal */}
        {logoutConfirmOpen && createPortal(
          <div 
            className="modal-overlay logout-overlay" 
            onClick={() => setLogoutConfirmOpen(false)} 
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999, 
              backdropFilter: 'none', 
              WebkitBackdropFilter: 'none',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              margin: 0
            }}
          >
            <div className="modal logout-modal" onClick={e => e.stopPropagation()} style={{ margin: '0' }}>
              <div className="logout-modal__icon">
                <LogOut size={32} />
              </div>
              <h3>Confirm Logout</h3>
              <p>Are you sure you want to log out of your account?</p>
              <div className="logout-modal__actions">
                <button className="btn btn--outline" onClick={() => setLogoutConfirmOpen(false)}>Cancel</button>
                <button className="btn btn--danger" onClick={() => { setLogoutConfirmOpen(false); logout(); }}>Logout</button>
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </header>
  );
};

export default Header;
