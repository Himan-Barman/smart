import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import NoticeBoard from './pages/NoticeBoard';
import FeedbackPage from './pages/FeedbackPage';
import SkillsPage from './pages/SkillsPage';
import RoomBooking from './pages/RoomBooking';
import GrievancePage from './pages/GrievancePage';
import AttendancePage from './pages/AttendancePage';
import SchedulePage from './pages/SchedulePage';
import DepartmentsPage from './pages/DepartmentsPage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import CourseDetailPage from './pages/CourseDetailPage';
import AdminUploadPage from './pages/AdminUploadPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OTPVerification from './pages/OTPVerification';
import SetPasswordPage from './pages/SetPasswordPage';

/* ── Styles ── */
import './styles/global.css';
import './styles/pages.css';
import './styles/attendance.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/departments.css';
import './styles/courseDetail.css';

const PageRenderer: React.FC = () => {
  const { currentPage } = useApp();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';

  // Role-based access control
  const canAccess = (page: string): boolean => {
    const access: Record<string, string[]> = {
      dashboard: ['admin', 'teacher', 'student'],
      schedule: ['admin', 'teacher', 'student'],
      notices: ['admin', 'teacher', 'student'],
      feedback: ['admin', 'teacher', 'student'],
      skills: ['admin', 'student'],
      rooms: ['admin', 'teacher', 'student'],
      grievances: ['admin', 'teacher', 'student'],
      attendance: ['admin', 'teacher', 'student'],
      admin_upload: ['admin'],
      departments: ['admin'],
      department_detail: ['admin', 'teacher', 'student'],
      course_detail: ['admin', 'teacher', 'student'],
      profile: ['admin', 'teacher', 'student'],
      notifications: ['admin', 'teacher', 'student'],
    };
    return access[page]?.includes(role) ?? false;
  };

  if (!canAccess(currentPage)) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2 style={{ marginBottom: 8, display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <span style={{color:'var(--accent-red)'}}>🔒</span> Access Restricted
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>You don't have permission to access this page.</p>
      </div>
    );
  }

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    schedule: <SchedulePage />,
    departments: <DepartmentsPage />,
    department_detail: <DepartmentDetailPage />,
    course_detail: <CourseDetailPage />,
    notices: <NoticeBoard />,
    feedback: <FeedbackPage />,
    skills: <SkillsPage />,
    rooms: <RoomBooking />,
    grievances: <GrievancePage />,
    attendance: <AttendancePage />,
    admin_upload: <AdminUploadPage />,
    profile: <ProfilePage />,
    notifications: <NotificationsPage />,
  };

  return <>{pages[currentPage] || <Dashboard />}</>;
};

const AppLayout: React.FC = () => {
  const { goBack, canGoBack } = useApp();

  React.useEffect(() => {
    let startX = 0;
    let isDragging = false;
    let lastSwipeTime = 0;

    // Trackpad swipe detection
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastSwipeTime < 500) return; // Debounce
      
      // Horizontal swipe right (deltaX is negative when scrolling right/swiping right)
      if (e.deltaX < -50 && Math.abs(e.deltaY) < 20 && canGoBack) {
        lastSwipeTime = now;
        goBack();
      }
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const distance = e.changedTouches[0].screenX - startX;
      const now = Date.now();
      if (now - lastSwipeTime < 500) return;

      if (distance > 80 && canGoBack) {
        lastSwipeTime = now;
        goBack();
      }
    };

    // Mouse drag events for desktop testing
    const handleMouseDown = (e: MouseEvent) => {
      startX = e.screenX;
      isDragging = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const distance = e.screenX - startX;
      const now = Date.now();
      if (now - lastSwipeTime < 500) return;

      if (distance > 150 && canGoBack) {
        lastSwipeTime = now;
        goBack();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [goBack, canGoBack]);

  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">
        <Header />
        <main className="app__content">
          <PageRenderer />
        </main>
      </div>
    </div>
  );
};

const AuthRouter: React.FC = () => {
  const { authStep } = useAuth();

  switch (authStep) {
    case 'login':
      return <LoginPage />;
    case 'signup':
      return <SignupPage />;
    case 'otp':
      return <OTPVerification />;
    case 'password':
      return <SetPasswordPage />;
    case 'authenticated':
      return (
        <AppProvider>
          <AppLayout />
        </AppProvider>
      );
    default:
      return <LoginPage />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthRouter />
    </AuthProvider>
  );
};

export default App;
