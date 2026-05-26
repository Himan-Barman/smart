import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { RegisteredPerson, User, UserRole } from '../types';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import {
  Upload, FileSpreadsheet, Users, Trash2, Download,
  CheckCircle, AlertCircle, Search, UserPlus, X,
  GraduationCap, User as UserIcon, ClipboardList,
  ShieldCheck, AlertTriangle, MoreVertical, Mail, Hash,
  BookOpen, Phone, Calendar,
} from 'lucide-react';

type SpreadsheetCell = string | number | boolean | Date | null;
const cellToString = (c: SpreadsheetCell | undefined): string => {
  if (c instanceof Date) return c.toISOString().split('T')[0] ?? '';
  if (c === null || c === undefined) return '';
  return String(c).trim();
};
const rowsToRecords = (rows: SpreadsheetCell[][]): Record<string, string>[] => {
  const [h, ...b] = rows; if (!h) return [];
  const headers = h.map(cellToString);
  return b.map(r => headers.reduce<Record<string, string>>((o, hd, i) => { if (hd) o[hd] = cellToString(r[i]); return o; }, {}));
};

type Tab = 'database' | 'registered';
type FilterType = 'all' | 'verified' | 'student' | 'teacher';

/* ─── User Card ─── */
const PersonCard: React.FC<{ p: RegisteredPerson; onDelete: (p: RegisteredPerson) => void }> = ({ p, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const gradient = p.role === 'student'
    ? 'linear-gradient(135deg, #6C5DD3, #9BC6FA)'
    : 'linear-gradient(135deg, #3CCB7F, #6C5DD3)';

  return (
    <div className="um-card">
      <div className="um-card__avatar" style={{ background: gradient }}>{initials}</div>
      <div className="um-card__info">
        <div className="um-card__name-row">
          <strong>{p.name}</strong>
          {p.isVerified && (
            <span className="um-card__verified" title="Email verified"><ShieldCheck size={14} /></span>
          )}
          <span className={`role-badge role-badge--${p.role}`}>{p.role}</span>
        </div>
        <div className="um-card__meta">
          <span><Mail size={12} /> {p.email}</span>
          <span><Hash size={12} /> {p.enrollmentNo || p.employeeId || p.id}</span>
          <span><BookOpen size={12} /> {p.department}</span>
          {p.role === 'student' && p.semester && <span>Sem {p.semester} · {p.course || '—'}</span>}
          {p.role === 'teacher' && p.subjects && <span>{p.subjects.join(', ')}</span>}
          {p.phone && <span><Phone size={12} /> {p.phone}</span>}
        </div>
      </div>
      <div className="um-card__status">
        {p.isVerified ? (
          <span className="verified-badge verified-badge--yes"><CheckCircle size={12} /> Verified</span>
        ) : (
          <span className="verified-badge verified-badge--no">Pending</span>
        )}
      </div>
      <div className="um-card__actions">
        <button className="um-card__menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <>
            <div className="um-card__menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="um-card__menu">
              <button onClick={() => { setMenuOpen(false); onDelete(p); }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Registered User Card ─── */
const RegisteredUserCard: React.FC<{ u: User }> = ({ u }) => {
  const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="um-card">
      <div className="um-card__avatar" style={{ background: 'linear-gradient(135deg, #3CCB7F, #34d399)' }}>{initials}</div>
      <div className="um-card__info">
        <div className="um-card__name-row">
          <strong>{u.name}</strong>
          <span className="um-card__verified" title="Email verified"><ShieldCheck size={14} /></span>
          <span className={`role-badge role-badge--${u.role}`}>{u.role}</span>
        </div>
        <div className="um-card__meta">
          <span><Mail size={12} /> {u.email}</span>
          <span><Hash size={12} /> {u.enrollmentNo || u.employeeId || u.id}</span>
          <span><BookOpen size={12} /> {u.department}</span>
          {u.createdAt && <span><Calendar size={12} /> Joined {new Date(u.createdAt).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="um-card__status">
        <span className="verified-badge verified-badge--yes"><CheckCircle size={12} /> Active</span>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const AdminUploadPage: React.FC = () => {
  const { registeredPersons, registeredUsers, uploadPersons, removeRegisteredPerson } = useAuth();
  const [tab, setTab] = useState<Tab>('database');
  const [uploadResult, setUploadResult] = useState<{ count: number; errors: string[] } | null>(null);
  const [previewData, setPreviewData] = useState<RegisteredPerson[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showAddManual, setShowAddManual] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredPerson | null>(null);
  const [manualForm, setManualForm] = useState({
    name: '', email: '', role: 'student' as UserRole,
    department: '', identifier: '', semester: '', course: '',
    phone: '', subjects: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /* ─── File parsing ─── */
  const parseRow = (row: Record<string, string>, i: number): { person?: RegisteredPerson; error?: string } => {
    const name = row['name'] || row['Name'] || row['FULL_NAME'] || row['full_name'] || '';
    const email = row['email'] || row['Email'] || row['EMAIL'] || '';
    const role = (row['role'] || row['Role'] || row['ROLE'] || 'student').toLowerCase() as UserRole;
    const dept = row['department'] || row['Department'] || row['DEPARTMENT'] || '';
    const enrollment = row['enrollment_no'] || row['enrollmentNo'] || row['Enrollment No'] || row['ENROLLMENT_NO'] || '';
    const empId = row['employee_id'] || row['employeeId'] || row['Employee ID'] || row['EMPLOYEE_ID'] || '';
    const semester = row['semester'] || row['Semester'] || '';
    const course = row['course'] || row['Course'] || '';
    const phone = row['phone'] || row['Phone'] || '';
    const subjects = row['subjects'] || row['Subjects'] || '';
    if (!name || !email) return { error: `Row ${i + 1}: Missing name or email` };
    if (!['student', 'teacher'].includes(role)) return { error: `Row ${i + 1}: Invalid role "${role}"` };
    if (role === 'student' && !enrollment) return { error: `Row ${i + 1}: Missing enrollment number` };
    if (role === 'teacher' && !empId) return { error: `Row ${i + 1}: Missing employee ID` };
    const id = role === 'student' ? enrollment : empId;
    return { person: { id, name, email, role, department: dept,
      ...(role === 'student' ? { enrollmentNo: enrollment, semester: parseInt(semester) || undefined, course: course || undefined }
        : { employeeId: empId, subjects: subjects ? subjects.split(',').map(s => s.trim()) : undefined }),
      phone: phone || undefined,
    }};
  };

  const processFileData = (rows: Record<string, string>[]) => {
    const persons: RegisteredPerson[] = []; const errors: string[] = [];
    rows.forEach((r, i) => { const res = parseRow(r, i); if (res.person) persons.push(res.person); if (res.error) errors.push(res.error); });
    setPreviewData(persons); setUploadResult({ count: persons.length, errors }); setShowPreview(true);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true,
        complete: r => processFileData(r.data), error: () => setUploadResult({ count: 0, errors: ['Failed to parse CSV'] }) });
    } else if (ext === 'xlsx') {
      try { const rows = await readSheet(file); processFileData(rowsToRecords(rows as unknown as SpreadsheetCell[][])); }
      catch { setUploadResult({ count: 0, errors: ['Failed to parse XLSX'] }); }
    } else { setUploadResult({ count: 0, errors: ['Use .csv or .xlsx format'] }); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
  const confirmUpload = async () => { const c = await uploadPersons(previewData); setUploadResult({ count: c, errors: [] }); setPreviewData([]); setShowPreview(false); };
  const handleDelete = async () => { if (!deleteTarget) return; await removeRegisteredPerson(deleteTarget.id); setDeleteTarget(null); };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const person: RegisteredPerson = {
      id: manualForm.identifier, name: manualForm.name, email: manualForm.email,
      role: manualForm.role, department: manualForm.department, phone: manualForm.phone || undefined,
      ...(manualForm.role === 'student' ? { enrollmentNo: manualForm.identifier, semester: parseInt(manualForm.semester) || undefined, course: manualForm.course || undefined }
        : { employeeId: manualForm.identifier, subjects: manualForm.subjects ? manualForm.subjects.split(',').map(s => s.trim()) : undefined }),
    };
    await uploadPersons([person]); setShowAddManual(false);
    setManualForm({ name: '', email: '', role: 'student', department: '', identifier: '', semester: '', course: '', phone: '', subjects: '' });
  };

  const downloadTemplate = () => {
    const csv = ['name,email,role,department,enrollment_no,employee_id,semester,course,phone,subjects',
      'John Doe,john@technoindiaeducation.com,student,Computer Science,231001102001,,2,B.Tech CSE,9876543210,',
      'Dr. Jane,jane@technoindiaeducation.com,teacher,Computer Science,,310001100001,,,9876500010,OS DBMS'].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'smart_campus_template.csv'; a.click();
  };

  /* ─── Filters ─── */
  const filtered = registeredPersons.filter(p => {
    const s = searchTerm.toLowerCase();
    const match = p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
    if (filterType === 'all') return match;
    if (filterType === 'verified') return match && p.isVerified;
    if (filterType === 'student') return match && p.role === 'student';
    if (filterType === 'teacher') return match && p.role === 'teacher';
    return match;
  });

  const filteredUsers = registeredUsers.filter(u => {
    if (u.role === 'admin') return false;
    const s = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.id.toLowerCase().includes(s);
  });

  const studentCount = registeredPersons.filter(p => p.role === 'student').length;
  const teacherCount = registeredPersons.filter(p => p.role === 'teacher').length;
  const verifiedCount = registeredPersons.filter(p => p.isVerified).length;

  return (
    <div className="page">
      {/* ── Stat Cards ── */}
      <div className="um-stats">
        <div className="um-stat um-stat--total"><Users size={20} /><div><span className="um-stat__val">{registeredPersons.length}</span><span className="um-stat__lbl">Total Users</span></div></div>
        <div className="um-stat um-stat--students"><GraduationCap size={20} /><div><span className="um-stat__val">{studentCount}</span><span className="um-stat__lbl">Students</span></div></div>
        <div className="um-stat um-stat--teachers"><UserIcon size={20} /><div><span className="um-stat__val">{teacherCount}</span><span className="um-stat__lbl">Teachers</span></div></div>
        <div className="um-stat um-stat--verified"><ShieldCheck size={20} /><div><span className="um-stat__val">{verifiedCount}</span><span className="um-stat__lbl">Verified</span></div></div>
      </div>

      {/* ── Tabs ── */}
      <div className="um-tabs-bar">
        <div className="um-tabs">
          <button className={`um-tab ${tab === 'database' ? 'um-tab--active' : ''}`} onClick={() => setTab('database')}>
            <Users size={15} /> User Database <span className="um-tab__count">{registeredPersons.length}</span>
          </button>
          <button className={`um-tab ${tab === 'registered' ? 'um-tab--active' : ''}`} onClick={() => setTab('registered')}>
            <ShieldCheck size={15} /> Registered Users <span className="um-tab__count">{filteredUsers.length}</span>
          </button>
        </div>
        {tab === 'database' && (
          <div className="um-tabs__actions">
            <button className="btn btn--outline btn--sm" onClick={downloadTemplate}><Download size={14} /> Template</button>
            <button className="btn btn--outline btn--sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Import</button>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAddManual(true)}><UserPlus size={14} /> Add User</button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}
      </div>

      {/* ── Upload Dropzone (visible in database tab) ── */}
      {tab === 'database' && (
        <div className={`um-dropzone ${dragOver ? 'um-dropzone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet size={28} />
          <div><strong>Drop CSV or XLSX file</strong> to bulk import users</div>
        </div>
      )}

      {/* Upload result */}
      {uploadResult && !showPreview && (
        <div className={`upload-result ${uploadResult.errors.length > 0 && uploadResult.count === 0 ? 'upload-result--error' : 'upload-result--success'}`}>
          {uploadResult.count > 0 ? <><CheckCircle size={16} /> {uploadResult.count} records added</> : <><AlertCircle size={16} /> No records added</>}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {showPreview && previewData.length > 0 && (
        <div className="upload-preview">
          <div className="upload-preview__header">
            <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}><ClipboardList size={18}/> Preview — {previewData.length} records</h3>
            <div className="upload-preview__actions">
              <button className="btn btn--outline btn--sm" onClick={() => { setShowPreview(false); setPreviewData([]); }}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={confirmUpload}><CheckCircle size={14} /> Confirm</button>
            </div>
          </div>
          {uploadResult?.errors && uploadResult.errors.length > 0 && (
            <div className="upload-preview__errors"><AlertCircle size={14} /><div>{uploadResult.errors.map((e, i) => <p key={i}>{e}</p>)}</div></div>
          )}
          <div className="upload-table-wrapper">
            <table className="upload-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>ID</th></tr></thead>
              <tbody>{previewData.map((p, i) => (
                <tr key={i}><td>{p.name}</td><td>{p.email}</td><td><span className={`role-badge role-badge--${p.role}`}>{p.role}</span></td><td>{p.department}</td><td>{p.enrollmentNo || p.employeeId}</td></tr>
              ))}</tbody></table>
          </div>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="page__toolbar">
        <div className="page__search"><Search size={16} />
          <input placeholder="Search by name, email, or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <button className="search-clear-btn" onClick={() => setSearchTerm('')}><X size={12} /></button>}
        </div>
        {tab === 'database' && (
          <div className="page__filters">
            {([
              { key: 'all' as FilterType, label: 'All', icon: <Users size={13}/> },
              { key: 'verified' as FilterType, label: 'Verified', icon: <ShieldCheck size={13}/> },
              { key: 'student' as FilterType, label: 'Students', icon: <GraduationCap size={13}/> },
              { key: 'teacher' as FilterType, label: 'Teachers', icon: <UserIcon size={13}/> },
            ]).map(f => (
              <button key={f.key} className={`filter-chip ${filterType === f.key ? 'filter-chip--active' : ''}`} onClick={() => setFilterType(f.key)}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── User Cards ── */}
      <div className="um-list">
        {tab === 'database' ? (
          filtered.length === 0 ? (
            <div className="empty-state"><span className="empty-state__icon">👤</span><h3>No users found</h3><p>Add users manually or import from a CSV/XLSX file</p></div>
          ) : filtered.map(p => <PersonCard key={p.id} p={p} onDelete={setDeleteTarget} />)
        ) : (
          filteredUsers.length === 0 ? (
            <div className="empty-state"><span className="empty-state__icon">🔐</span><h3>No registered users yet</h3><p>Users will appear here after they sign up and verify their email</p></div>
          ) : filteredUsers.map(u => <RegisteredUserCard key={u.id} u={u} />)
        )}
      </div>

      {/* ── Manual Add Modal ── */}
      {showAddManual && (
        <div className="modal-overlay" onClick={() => setShowAddManual(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header"><h3>Add User</h3><button className="modal__close" onClick={() => setShowAddManual(false)}><X size={18} /></button></div>
            <form className="modal__form" onSubmit={handleManualAdd}>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label><input type="text" required value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label>Email</label><input type="email" required value={manualForm.email} onChange={e => setManualForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Role</label><select value={manualForm.role} onChange={e => setManualForm(f => ({ ...f, role: e.target.value as UserRole }))}><option value="student">Student</option><option value="teacher">Teacher</option></select></div>
                <div className="form-group"><label>Department</label><input type="text" required value={manualForm.department} onChange={e => setManualForm(f => ({ ...f, department: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label>{manualForm.role === 'student' ? 'Enrollment No (12-digit)' : 'Employee ID (12-digit)'}</label><input type="text" required value={manualForm.identifier} onChange={e => setManualForm(f => ({ ...f, identifier: e.target.value }))} /></div>
              {manualForm.role === 'student' && (<div className="form-row"><div className="form-group"><label>Semester</label><input type="number" min="1" max="8" value={manualForm.semester} onChange={e => setManualForm(f => ({ ...f, semester: e.target.value }))} /></div><div className="form-group"><label>Course</label><input type="text" value={manualForm.course} onChange={e => setManualForm(f => ({ ...f, course: e.target.value }))} /></div></div>)}
              {manualForm.role === 'teacher' && (<div className="form-group"><label>Subjects (comma-separated)</label><input type="text" value={manualForm.subjects} onChange={e => setManualForm(f => ({ ...f, subjects: e.target.value }))} /></div>)}
              <div className="form-group"><label>Phone</label><input type="text" value={manualForm.phone} onChange={e => setManualForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <button type="submit" className="btn btn--primary btn--full"><UserPlus size={16} /> Add User</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header modal__header--danger"><h3><AlertTriangle size={18} /> Delete User</h3><button className="modal__close" onClick={() => setDeleteTarget(null)}><X size={18} /></button></div>
            <div className="modal__body">
              <p>Are you sure you want to remove this user?</p>
              <div className="delete-preview"><strong>{deleteTarget.name}</strong><span>{deleteTarget.email}</span><span className={`role-badge role-badge--${deleteTarget.role}`}>{deleteTarget.role}</span></div>
              <p className="delete-warning">{deleteTarget.isVerified ? '⚠️ This user has already signed up. Removing will only delete the registration record.' : 'This user has not signed up. They will no longer be able to create an account.'}</p>
            </div>
            <div className="modal__actions"><button className="btn btn--outline" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn--danger" onClick={handleDelete}><Trash2 size={14} /> Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUploadPage;
