import React, { useState } from 'react';
import type { RegisteredPerson, UserRole } from '../../types';
import { getInitials, getAvatarGradient, formatDate } from './constants';
import {
  Users, GraduationCap, User as UserIcon, ShieldCheck, Clock,
  Building2, UserPlus, AlertTriangle, MoreVertical, Eye, Pencil,
  KeyRound, Trash2, Mail, CheckCircle, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { UserStats } from './constants';

const roleLabel = (role: UserRole): string => (role === 'teacher' ? 'Faculty' : 'Student');

/* ── Metrics Row ── */
export const MetricsRow: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const items = [
    { label: 'Added Users', val: stats.totalUsers, icon: <Users size={18}/>, cls: 'blue' },
    { label: 'Students', val: stats.students, icon: <GraduationCap size={18}/>, cls: 'green' },
    { label: 'Faculty', val: stats.teachers, icon: <UserIcon size={18}/>, cls: 'purple' },
    { label: 'Pending Signup', val: stats.pendingVerification, icon: <Clock size={18}/>, cls: 'orange' },
    { label: 'Verified Accounts', val: stats.verified, icon: <ShieldCheck size={18}/>, cls: 'green' },
    { label: 'Signed Up', val: stats.registeredAccounts, icon: <UserPlus size={18}/>, cls: 'blue' },
    { label: 'Recent (7d)', val: stats.recentlyAdded, icon: <Clock size={18}/>, cls: 'purple' },
    { label: 'Departments', val: stats.departmentCount, icon: <Building2 size={18}/>, cls: 'blue' },
  ];
  return (
    <div className="um-metrics">
      {items.map(m => (
        <div key={m.label} className="um-metric">
          <div className={`um-metric__icon um-metric__icon--${m.cls}`}>{m.icon}</div>
          <div><span className="um-metric__val">{m.val}</span><span className="um-metric__lbl">{m.label}</span></div>
        </div>
      ))}
    </div>
  );
};

/* ── User Table ── */
interface TableProps {
  data: RegisteredPerson[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  onAction: (action: string, person: RegisteredPerson) => void;
}

const ActionMenu: React.FC<{ person: RegisteredPerson; onAction: (a: string, p: RegisteredPerson) => void }> = ({ person, onAction }) => {
  const [open, setOpen] = useState(false);
  const act = (a: string) => { setOpen(false); onAction(a, person); };
  return (
    <div className="um-actions-cell">
      <button className="um-actions-btn" onClick={() => setOpen(!open)}><MoreVertical size={16}/></button>
      {open && <>
        <div className="um-actions-backdrop" onClick={() => setOpen(false)}/>
        <div className="um-actions-menu">
          <button onClick={() => act('view')}><Eye size={14}/> View Profile</button>
          <button onClick={() => act('edit')}><Pencil size={14}/> Edit User</button>
          <button onClick={() => act('reset')}><KeyRound size={14}/> Reset Password</button>
          <button onClick={() => act('email')}><Mail size={14}/> Send Email</button>
          <button className="um-actions-menu__danger" onClick={() => act('delete')}><Trash2 size={14}/> Delete</button>
        </div>
      </>}
    </div>
  );
};

export const UserTable: React.FC<TableProps> = ({ data, selected, onToggle, onToggleAll, allSelected, onAction }) => (
  <div className="um-table-scroll">
    <table className="um-table">
      <thead><tr>
        <th><input type="checkbox" className="um-checkbox" checked={allSelected} onChange={onToggleAll}/></th>
        <th>User</th><th>Role</th><th>Department</th><th>Account</th><th>Added On</th><th>Actions</th>
      </tr></thead>
      <tbody>
        {data.map(p => (
          <tr key={p.id} className={selected.has(p.id) ? 'um-row--selected' : ''}>
            <td><input type="checkbox" className="um-checkbox" checked={selected.has(p.id)} onChange={() => onToggle(p.id)}/></td>
            <td>
              <div className="um-user-cell">
                <div className="um-user-cell__avatar" style={{background: getAvatarGradient(p.role)}}>{getInitials(p.name)}</div>
                <div><span className="um-user-cell__name">{p.name}</span><span className="um-user-cell__email">{p.email}</span></div>
              </div>
            </td>
            <td><span className={`um-badge um-badge--${p.role}`}>{roleLabel(p.role)}</span></td>
            <td style={{fontSize:'13px'}}>{p.department || '—'}</td>
            <td>{p.isVerified ? <span className="um-badge um-badge--verified"><CheckCircle size={11}/> Verified</span> : <span className="um-badge um-badge--pending"><Clock size={11}/> Pending Signup</span>}</td>
            <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{formatDate(p.createdAt)}</td>
            <td><ActionMenu person={p} onAction={onAction}/></td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No users found</td></tr>}
      </tbody>
    </table>
  </div>
);

/* ── Pagination ── */
interface PaginationProps { page: number; totalPages: number; total: number; perPage: number; onChange: (p: number) => void; }
export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, perPage, onChange }) => {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return (
    <div className="um-pagination">
      <span className="um-pagination__info">Showing {start}–{end} of {total}</span>
      <div className="um-pagination__controls">
        <button className="um-pagination__btn" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={14}/></button>
        {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
          const p = i + 1;
          return <button key={p} className={`um-pagination__btn ${p === page ? 'um-pagination__btn--active' : ''}`} onClick={() => onChange(p)}>{p}</button>;
        })}
        {totalPages > 5 && <span style={{padding:'0 4px',color:'var(--text-muted)'}}>…</span>}
        <button className="um-pagination__btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={14}/></button>
      </div>
    </div>
  );
};

/* ── View Profile Drawer ── */
export const ProfileDrawer: React.FC<{ person: RegisteredPerson; onClose: () => void }> = ({ person, onClose }) => (
  <>
    <div className="um-actions-backdrop" style={{background:'rgba(0,0,0,0.2)',zIndex:199}} onClick={onClose}/>
    <div className="um-profile-drawer">
      <div className="um-profile-drawer__header"><h3>User Profile</h3><button className="modal__close" onClick={onClose}><X size={18}/></button></div>
      <div className="um-profile-drawer__body">
        <div className="um-profile-drawer__avatar" style={{background: getAvatarGradient(person.role)}}>{getInitials(person.name)}</div>
        <div className="um-profile-drawer__name">{person.name}</div>
        <div className="um-profile-drawer__email">{person.email}</div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:20}}>
          <span className={`um-badge um-badge--${person.role}`}>{roleLabel(person.role)}</span>
          {person.isVerified ? <span className="um-badge um-badge--verified"><CheckCircle size={11}/> Verified</span> : <span className="um-badge um-badge--pending">Pending Signup</span>}
        </div>
        <div className="um-profile-drawer__section">
          <h4>Details</h4>
          <div className="um-profile-detail"><span className="um-profile-detail__label">ID</span><span className="um-profile-detail__value">{person.enrollmentNo || person.employeeId || person.id}</span></div>
          <div className="um-profile-detail"><span className="um-profile-detail__label">Department</span><span className="um-profile-detail__value">{person.department}</span></div>
          {person.semester && <div className="um-profile-detail"><span className="um-profile-detail__label">Semester</span><span className="um-profile-detail__value">{person.semester}</span></div>}
          {person.course && <div className="um-profile-detail"><span className="um-profile-detail__label">Course</span><span className="um-profile-detail__value">{person.course}</span></div>}
          {person.phone && <div className="um-profile-detail"><span className="um-profile-detail__label">Phone</span><span className="um-profile-detail__value">{person.phone}</span></div>}
          <div className="um-profile-detail"><span className="um-profile-detail__label">Added On</span><span className="um-profile-detail__value">{formatDate(person.createdAt)}</span></div>
        </div>
      </div>
    </div>
  </>
);

/* ── Delete Confirm Modal ── */
export const DeleteModal: React.FC<{ person: RegisteredPerson; onConfirm: () => void; onCancel: () => void }> = ({ person, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
      <div className="modal__header modal__header--danger"><h3><AlertTriangle size={18}/> Delete User</h3><button className="modal__close" onClick={onCancel}><X size={18}/></button></div>
      <div className="modal__body">
        <p>Remove <strong>{person.name}</strong> ({person.email})?</p>
        <p className="delete-warning">{person.isVerified ? 'This verified account and its admin-added user record will be removed.' : 'This pending user will no longer be able to create an account.'}</p>
      </div>
      <div className="modal__actions"><button className="btn btn--outline" onClick={onCancel}>Cancel</button><button className="btn btn--danger" onClick={onConfirm}><Trash2 size={14}/> Delete</button></div>
    </div>
  </div>
);

/* ── Add User Modal ── */
export const AddUserModal: React.FC<{
  departments: string[];
  onSubmit: (p: RegisteredPerson) => void;
  onClose: () => void;
  initialPerson?: RegisteredPerson | null;
  error?: string;
  saving?: boolean;
}> = ({ departments, onSubmit, onClose, initialPerson, error, saving }) => {
  const isEdit = Boolean(initialPerson);
  const [f, setF] = useState({
    name: initialPerson?.name ?? '',
    email: initialPerson?.email ?? '',
    role: initialPerson?.role ?? 'student' as UserRole,
    department: initialPerson?.department ?? '',
    identifier: initialPerson?.enrollmentNo ?? initialPerson?.employeeId ?? initialPerson?.id ?? '',
    semester: initialPerson?.semester ? String(initialPerson.semester) : '',
    course: initialPerson?.course ?? '',
    phone: initialPerson?.phone ?? '',
    subjects: initialPerson?.subjects?.join(', ') ?? '',
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = f.identifier.trim();
    const person: RegisteredPerson = {
      id: initialPerson?.id ?? identifier,
      name: f.name.trim(),
      email: f.email.trim().toLowerCase(),
      role: f.role,
      department: f.department.trim(),
      phone: f.phone.trim() || undefined,
      ...(f.role === 'student' ? {
        enrollmentNo: initialPerson?.enrollmentNo ?? identifier,
        semester: parseInt(f.semester) || undefined,
        course: f.course.trim() || undefined,
      } : {
        employeeId: initialPerson?.employeeId ?? identifier,
        subjects: f.subjects ? f.subjects.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      }),
    };
    onSubmit(person);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header"><h3>{isEdit ? 'Edit User' : 'Add User'}</h3><button className="modal__close" onClick={onClose}><X size={18}/></button></div>
        <form className="modal__form" onSubmit={submit}>
          {error && <div className="auth-err">{error}</div>}
          <div className="form-row">
            <div className="form-group"><label>Full Name</label><input required value={f.name} onChange={e => setF(v=>({...v,name:e.target.value}))}/></div>
            <div className="form-group"><label>Email</label><input type="email" required value={f.email} onChange={e => setF(v=>({...v,email:e.target.value}))}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Role</label><select value={f.role} disabled={isEdit} onChange={e => setF(v=>({...v,role:e.target.value as UserRole}))}><option value="student">Student</option><option value="teacher">Faculty</option></select></div>
            <div className="form-group"><label>Department</label>
              <input required list="um-departments" value={f.department} onChange={e => setF(v=>({...v,department:e.target.value}))}/>
              <datalist id="um-departments">{departments.map(d=><option key={d} value={d}/>)}</datalist>
            </div>
          </div>
          <div className="form-group"><label>{f.role==='student'?'Enrollment No':'Employee ID'}</label><input required disabled={isEdit} pattern="\d{12}" title="Use the 12-digit university ID used during signup" value={f.identifier} onChange={e => setF(v=>({...v,identifier:e.target.value.replace(/\D/g, '').slice(0, 12)}))}/></div>
          {f.role==='student' && <div className="form-row"><div className="form-group"><label>Semester</label><input type="number" min="1" max="8" value={f.semester} onChange={e => setF(v=>({...v,semester:e.target.value}))}/></div><div className="form-group"><label>Course</label><input value={f.course} onChange={e => setF(v=>({...v,course:e.target.value}))}/></div></div>}
          {f.role==='teacher' && <div className="form-group"><label>Subjects (comma-separated)</label><input value={f.subjects} onChange={e => setF(v=>({...v,subjects:e.target.value}))}/></div>}
          <div className="form-group"><label>Phone</label><input value={f.phone} onChange={e => setF(v=>({...v,phone:e.target.value}))}/></div>
          <button type="submit" className="btn btn--primary btn--full" disabled={saving}><UserPlus size={16}/> {saving ? 'Saving...' : isEdit ? 'Save User' : 'Add User'}</button>
        </form>
      </div>
    </div>
  );
};

/* ── Reset Password Modal ── */
export const ResetPasswordModal: React.FC<{ person: RegisteredPerson; tempPassword: string|null; loading: boolean; onConfirm: () => void; onClose: () => void }> = ({ person, tempPassword, loading, onConfirm, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3><KeyRound size={18}/> Reset Password</h3><button className="modal__close" onClick={onClose}><X size={18}/></button></div>
      <div className="modal__body">
        {tempPassword ? <>
          <p>Password reset for <strong>{person.name}</strong>:</p>
          <div style={{padding:'12px 16px',background:'var(--surface-2)',borderRadius:10,margin:'12px 0',fontFamily:'monospace',fontSize:16,fontWeight:700,textAlign:'center',letterSpacing:1}}>{tempPassword}</div>
          <p style={{fontSize:11,color:'var(--text-muted)'}}>Share this temporary password securely. The user should change it after login.</p>
        </> : <p>Generate a temporary password for <strong>{person.name}</strong>?</p>}
      </div>
      <div className="modal__actions">
        <button className="btn btn--outline" onClick={onClose}>{tempPassword ? 'Done' : 'Cancel'}</button>
        {!tempPassword && <button className="btn btn--primary" onClick={onConfirm} disabled={loading}><KeyRound size={14}/> Reset</button>}
      </div>
    </div>
  </div>
);
