import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  GraduationCap,
  Megaphone,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Notice } from '../types';

type NoticeTargetRole = NonNullable<Notice['targetRole']>;

type NoticeFormState = {
  title: string;
  content: string;
  category: Notice['category'];
  author: string;
  pinned: boolean;
  targetRole: NoticeTargetRole;
  targetDepartment: string;
  targetSemester: string;
  targetCourse: string;
};

const categoryConfig: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
  academic: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', label: 'Academic', icon: <BookOpen size={12} /> },
  event: { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)', label: 'Event', icon: <Sparkles size={12} /> },
  urgent: { bg: 'var(--accent-red-bg)', color: 'var(--accent-red)', label: 'Urgent', icon: <AlertTriangle size={12} /> },
  general: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)', label: 'General', icon: <Pin size={12} /> },
};
const categoryColors = categoryConfig;

const emptyForm = (name = '', department = '', role: NoticeTargetRole = 'all'): NoticeFormState => ({
  title: '',
  content: '',
  category: 'general',
  author: name,
  pinned: false,
  targetRole: role,
  targetDepartment: department,
  targetSemester: '',
  targetCourse: '',
});

const NoticeBoard: React.FC = () => {
  const { notices, addNotice, deleteNotice, departments } = useApp();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [form, setForm] = useState<NoticeFormState>(() => emptyForm());

  const canPost = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
  const isTeacher = currentUser?.role === 'teacher';

  const selectedDepartment = useMemo(
    () => departments.find((department) =>
      department.name === form.targetDepartment ||
      department.code === form.targetDepartment ||
      department.course === form.targetDepartment,
    ),
    [departments, form.targetDepartment],
  );

  const courseOptions = useMemo(
    () => [...new Set(departments.map((department) => department.course).filter(Boolean))],
    [departments],
  );

  const semesterOptions = useMemo(() => {
    const total = selectedDepartment?.totalSemesters ?? 8;
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [selectedDepartment]);

  const filteredNotices = notices.filter((notice) => {
    const query = search.toLowerCase();
    const matchSearch =
      notice.title.toLowerCase().includes(query) ||
      notice.content.toLowerCase().includes(query) ||
      notice.author.toLowerCase().includes(query) ||
      (notice.targetLabel ?? '').toLowerCase().includes(query);
    const matchCategory = filterCategory === 'all' || notice.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const pinnedNotices = filteredNotices.filter((notice) => notice.pinned);
  const regularNotices = filteredNotices.filter((notice) => !notice.pinned);

  const openForm = () => {
    const teacherDepartment = isTeacher ? currentUser?.department ?? '' : '';
    setForm(emptyForm(currentUser?.name ?? '', teacherDepartment, isTeacher ? 'student' : 'all'));
    setShowForm(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !currentUser) return;

    addNotice({
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      author: currentUser.name,
      pinned: form.pinned,
      targetRole: isTeacher ? 'student' : form.targetRole,
      targetDepartment: form.targetDepartment.trim() || undefined,
      targetSemester: form.targetSemester ? Number(form.targetSemester) : undefined,
      targetCourse: form.targetCourse.trim() || undefined,
    });

    setForm(emptyForm(currentUser.name, isTeacher ? currentUser.department : '', isTeacher ? 'student' : 'all'));
    setShowForm(false);
  };

  return (
    <div className="page">
      <div className="page__toolbar">
        <div className="page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="page__filters">
          {['all', 'academic', 'event', 'urgent', 'general'].map((cat) => (
            <button
              key={cat}
              className={`filter-chip ${filterCategory === cat ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterCategory(cat)}
              type="button"
            >
              {cat === 'all'
                ? <><Search size={13} /> All</>
                : <>{categoryConfig[cat]?.icon} {categoryConfig[cat]?.label}</>}
            </button>
          ))}
        </div>
        {canPost ? (
          <button className="btn btn--primary" onClick={openForm} type="button">
            <Plus size={16} /> Post Notice
          </button>
        ) : null}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal notice-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Megaphone size={18} /> Post New Notice</h3>
              <button className="modal__close" onClick={() => setShowForm(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Notice title..."
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  placeholder="Write notice details..."
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="notice-target-box">
                <div className="notice-target-box__head">
                  <Users size={16} />
                  <div>
                    <strong>Audience</strong>
                    <span>Notifications will be created for every matching signed-up user.</span>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Send To</label>
                    <select
                      value={form.targetRole}
                      onChange={(event) => {
                        const targetRole = event.target.value as NoticeTargetRole;
                        setForm({
                          ...form,
                          targetRole,
                          targetSemester: targetRole === 'student' ? form.targetSemester : '',
                          targetCourse: targetRole === 'student' ? form.targetCourse : '',
                        });
                      }}
                      disabled={isTeacher}
                    >
                      <option value="all">All users</option>
                      <option value="student">Students</option>
                      <option value="teacher">Teachers</option>
                      <option value="admin">Admins</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    {isTeacher ? (
                      <input type="text" value={currentUser?.department ?? ''} disabled />
                    ) : (
                      <select
                        value={form.targetDepartment}
                        onChange={(event) => setForm({ ...form, targetDepartment: event.target.value, targetSemester: '' })}
                      >
                        <option value="">All departments</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.name}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Semester</label>
                    <select
                      value={form.targetSemester}
                      onChange={(event) => setForm({ ...form, targetSemester: event.target.value })}
                      disabled={form.targetRole !== 'student'}
                    >
                      <option value="">All semesters</option>
                      {semesterOptions.map((semester) => (
                        <option key={semester} value={semester}>Semester {semester}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Course</label>
                    <select
                      value={form.targetCourse}
                      onChange={(event) => setForm({ ...form, targetCourse: event.target.value })}
                      disabled={form.targetRole !== 'student'}
                    >
                      <option value="">All courses</option>
                      {courseOptions.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as Notice['category'] })}
                  >
                    <option value="academic">Academic</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Author</label>
                  <input type="text" value={currentUser?.name ?? ''} disabled />
                </div>
              </div>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Pin size={13} /> Pin this notice</span>
              </label>
              <button type="submit" className="btn btn--primary btn--full">
                Publish Notice
              </button>
            </form>
          </div>
        </div>
      )}

      {pinnedNotices.length > 0 && (
        <div className="notice-section">
          <h3 className="notice-section__title">
            <Pin size={16} /> Pinned Notices
          </h3>
          <div className="notice-grid">
            {pinnedNotices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} onDelete={deleteNotice} currentUserId={currentUser?.id} currentUserRole={currentUser?.role} />
            ))}
          </div>
        </div>
      )}

      <div className="notice-section">
        <h3 className="notice-section__title">All Notices</h3>
        <div className="notice-grid">
          {regularNotices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} onDelete={deleteNotice} currentUserId={currentUser?.id} currentUserRole={currentUser?.role} />
          ))}
        </div>
      </div>

      {filteredNotices.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon"><Bell size={48} strokeWidth={1} /></span>
          <h3>No notices found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

const NoticeCard: React.FC<{
  notice: Notice;
  onDelete: (id: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
}> = ({
  notice,
  onDelete,
  currentUserId,
  currentUserRole,
}) => {
  const cat = categoryColors[notice.category];
  const canDelete = currentUserRole === 'admin' || notice.authorId === currentUserId;

  return (
    <div className={`notice-card ${notice.pinned ? 'notice-card--pinned' : ''}`}>
      <div className="notice-card__header">
        <span className="notice-card__badge" style={{ background: cat.bg, color: cat.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          {cat.icon} {cat.label}
        </span>
        <span className="notice-card__audience">
          {notice.targetRole === 'student' ? <GraduationCap size={13} /> : notice.targetRole === 'teacher' ? <Building2 size={13} /> : <Users size={13} />}
          {notice.targetLabel ?? 'All users'}
        </span>
        {notice.pinned && (
          <span className="notice-card__pin">
            <Pin size={14} />
          </span>
        )}
        {canDelete ? (
          <button className="notice-card__delete" onClick={() => onDelete(notice.id)} aria-label="Delete notice" type="button">
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
      <h4 className="notice-card__title">{notice.title}</h4>
      <p className="notice-card__content">{notice.content}</p>
      <div className="notice-card__footer">
        <span>
          <User size={12} /> {notice.author}
        </span>
        <span>
          <Calendar size={12} /> {notice.date}
        </span>
      </div>
    </div>
  );
};

export default NoticeBoard;
