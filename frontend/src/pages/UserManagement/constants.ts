export const ROWS_PER_PAGE = 15;

export type QuickFilter = 'all' | 'students' | 'teachers' | 'pending' | 'verified' | 'recent';

export interface UserStats {
  totalUsers: number;
  registeredAccounts: number;
  students: number;
  teachers: number;
  verified: number;
  pendingVerification: number;
  departmentCount: number;
  recentlyAdded: number;
}

export const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

export const getAvatarGradient = (role: string) =>
  role === 'student'
    ? 'linear-gradient(135deg, #6C5DD3, #9BC6FA)'
    : role === 'teacher'
      ? 'linear-gradient(135deg, #3CCB7F, #6C5DD3)'
      : 'linear-gradient(135deg, #6C5DD3, #3CCB7F)';

export const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
