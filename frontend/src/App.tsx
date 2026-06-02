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
import AdminUploadPage from './pages/UserManagement';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OTPVerification from './pages/OTPVerification';
import SetPasswordPage from './pages/SetPasswordPage';
import type { PageType, UserRole } from './types';

import './styles/global.css';
import './styles/pages.css';
import './styles/attendance.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/departments.css';
import './styles/courseDetail.css';
import './styles/usermanagement.css';
import './styles/responsive.css';

const pageAccess: Record<PageType, UserRole[]> = {
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

const pages: Record<PageType, React.ReactNode> = {
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

const PageRenderer: React.FC = () => {
  const { currentPage, setCurrentPage } = useApp();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';
  const isAllowed = pageAccess[currentPage].includes(role);

  React.useEffect(() => {
    if (!isAllowed) {
      setCurrentPage('dashboard');
    }
  }, [isAllowed, setCurrentPage]);

  if (!isAllowed) {
    return (
      <div className="page app-route-guard">
        <h2>Access Restricted</h2>
        <p>Redirecting to your dashboard.</p>
      </div>
    );
  }

  return <>{pages[currentPage]}</>;
};

const AppLayout: React.FC = () => (
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

const AuthRouter: React.FC = () => {
  const { authStep } = useAuth();

  switch (authStep) {
    case 'loading':
      return <div className="auth-page" />;
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

const App: React.FC = () => (
  <AuthProvider>
    <AuthRouter />
  </AuthProvider>
);

export default App;
