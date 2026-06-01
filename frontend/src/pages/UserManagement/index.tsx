import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import type { Department, RegisteredPerson, UserRole } from '../../types';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import { Search, Upload, Download, UserPlus, X, FileSpreadsheet, CheckCircle, AlertCircle, ClipboardList, Trash2 } from 'lucide-react';
import { ROWS_PER_PAGE, type QuickFilter, type UserStats } from './constants';
import { MetricsRow, UserTable, Pagination, ProfileDrawer, DeleteModal, AddUserModal, ResetPasswordModal } from './components';

type SpreadsheetCell = string | number | boolean | Date | null;
const cellStr = (c: SpreadsheetCell | undefined): string => { if (c instanceof Date) return c.toISOString().split('T')[0] ?? ''; if (c == null) return ''; return String(c).trim(); };
const rowsToRecords = (rows: SpreadsheetCell[][]): Record<string, string>[] => { const [h, ...b] = rows; if (!h) return []; const hd = h.map(cellStr); return b.map(r => hd.reduce<Record<string, string>>((o, k, i) => { if (k) o[k] = cellStr(r[i]); return o; }, {})); };

const normalizeLookup = (value: string): string => value.trim().toLowerCase();
const departmentDisplay = (department: Department): string => `${department.name} (${department.code})`;

const AdminUploadPage: React.FC = () => {
  const { registeredPersons, registeredUsers, uploadPersons, removeRegisteredPerson, refreshAdminData } = useAuth();
  const { departments } = useApp();
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, registeredAccounts: 0, students: 0, teachers: 0, verified: 0, pendingVerification: 0, departmentCount: 0, recentlyAdded: 0 });
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredPerson | null>(null);
  const [editTarget, setEditTarget] = useState<RegisteredPerson | null>(null);
  const [viewTarget, setViewTarget] = useState<RegisteredPerson | null>(null);
  const [resetTarget, setResetTarget] = useState<RegisteredPerson | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RegisteredPerson[]>([]);
  const [importResult, setImportResult] = useState<{ count: number; errors: string[]; duplicates: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void refreshAdminData(); }, [refreshAdminData, departments]);

  // Load stats
  useEffect(() => { api.users.getStats().then(setStats).catch(() => {}); }, [registeredPersons, registeredUsers, departments]);

  // Departments are managed from the admin Departments page and reused here.
  const departmentByLookup = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((department) => {
      [department.name, department.code].forEach((value) => {
        if (value) map.set(normalizeLookup(value), department);
      });
    });
    return map;
  }, [departments]);

  // Filter logic
  const filtered = useMemo(() => {
    let list = registeredPersons;
    const s = search.toLowerCase();
    if (s) list = list.filter(p => p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || (p.enrollmentNo || '').toLowerCase().includes(s) || (p.employeeId || '').toLowerCase().includes(s));
    if (deptFilter) list = list.filter(p => p.department === deptFilter);
    if (quickFilter === 'students') list = list.filter(p => p.role === 'student');
    else if (quickFilter === 'teachers') list = list.filter(p => p.role === 'teacher');
    else if (quickFilter === 'pending') list = list.filter(p => !p.isVerified);
    else if (quickFilter === 'verified') list = list.filter(p => p.isVerified);
    else if (quickFilter === 'recent') list = list.filter(p => p.createdAt && new Date(p.createdAt) > new Date(Date.now() - 7 * 86400000));
    return list;
  }, [registeredPersons, search, quickFilter, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, quickFilter, deptFilter]);

  // Selection
  const toggleSelect = useCallback((id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleAll = useCallback(() => { const ids = paginated.map(p => p.id); setSelected(prev => ids.every(id => prev.has(id)) ? new Set() : new Set(ids)); }, [paginated]);
  const allSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id));

  // File parsing
  const parseRow = (row: Record<string, string>, i: number): { person?: RegisteredPerson; error?: string } => {
    const name = row['name'] || row['Name'] || row['FULL_NAME'] || row['full_name'] || '';
    const email = row['email'] || row['Email'] || row['EMAIL'] || '';
    const role = (row['role'] || row['Role'] || 'student').toLowerCase() as UserRole;
    const dept = row['department'] || row['Department'] || '';
    const enr = row['enrollment_no'] || row['enrollmentNo'] || row['Enrollment No'] || '';
    const emp = row['employee_id'] || row['employeeId'] || row['Employee ID'] || '';
    const sem = row['semester'] || row['Semester'] || '';
    const course = row['course'] || row['Course'] || '';
    const phone = row['phone'] || row['Phone'] || '';
    const subjects = row['subjects'] || row['Subjects'] || '';
    if (!name || !email) return { error: `Row ${i+1}: Missing name/email` };
    if (!['student','teacher'].includes(role)) return { error: `Row ${i+1}: Invalid role` };
    const department = departmentByLookup.get(normalizeLookup(dept));
    if (!department) return { error: `Row ${i+1}: Department must match the Departments page list` };
    if (role === 'student' && !enr) return { error: `Row ${i+1}: Missing enrollment no` };
    if (role === 'teacher' && !emp) return { error: `Row ${i+1}: Missing employee ID` };
    const id = role === 'student' ? enr : emp;
    if (!/^\d{12}$/.test(id)) return { error: `Row ${i+1}: University ID must be exactly 12 digits` };
    return { person: { id, name, email, role, department: department.name, ...(role === 'student' ? { enrollmentNo: enr, semester: parseInt(sem) || undefined, course: course || department.course } : { employeeId: emp, subjects: subjects ? subjects.split(',').map(s => s.trim()) : undefined }), phone: phone || undefined } };
  };

  const processFile = (rows: Record<string, string>[]) => {
    const persons: RegisteredPerson[] = []; const errors: string[] = [];
    rows.forEach((r, i) => { const res = parseRow(r, i); if (res.person) persons.push(res.person); if (res.error) errors.push(res.error); });
    setPreviewData(persons); setImportResult({ count: persons.length, errors, duplicates: [] }); setShowImport(true);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: r => processFile(r.data), error: () => setImportResult({ count: 0, errors: ['Failed to parse CSV'], duplicates: [] }) });
    else if (ext === 'xlsx') { try { const rows = await readSheet(file); processFile(rowsToRecords(rows as unknown as SpreadsheetCell[][])); } catch { setImportResult({ count: 0, errors: ['Failed to parse XLSX'], duplicates: [] }); } }
    else setImportResult({ count: 0, errors: ['Use .csv or .xlsx'], duplicates: [] });
  };

  const confirmImport = async () => {
    const result = await uploadPersons(previewData);
    setImportResult({ count: result.count, errors: result.errors, duplicates: result.duplicates }); setPreviewData([]); setShowImport(false);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const downloadTemplate = () => {
    const primaryDepartment = departments[0];
    const secondaryDepartment = departments[1] ?? primaryDepartment;
    const studentDepartment = primaryDepartment?.name ?? 'Department Name';
    const studentCourse = primaryDepartment?.course ?? 'Course Name';
    const facultyDepartment = secondaryDepartment?.name ?? studentDepartment;
    const csv = [
      'name,email,role,department,enrollment_no,employee_id,semester,course,phone,subjects',
      `John Doe,john@uni.edu,student,${studentDepartment},231001102001,,2,${studentCourse},9876543210,`,
      `Dr. Jane,jane@uni.edu,teacher,${facultyDepartment},,310001100001,,,9876500010,OS DBMS`,
    ].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'smart_campus_template.csv'; a.click();
  };

  const exportCSV = () => {
    const header = 'Name,Email,Role,Department,ID,Semester,Course,Phone,Verified\n';
    const rows = filtered.map(p => `${p.name},${p.email},${p.role},${p.department},${p.enrollmentNo||p.employeeId||p.id},${p.semester||''},${p.course||''},${p.phone||''},${p.isVerified?'Yes':'No'}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' })); a.download = 'users_export.csv'; a.click();
  };

  // Actions
  const handleAction = async (action: string, person: RegisteredPerson) => {
    if (action === 'view') setViewTarget(person);
    else if (action === 'edit') { setEditTarget(person); setModalError(''); }
    else if (action === 'delete') setDeleteTarget(person);
    else if (action === 'reset') { setResetTarget(person); setTempPassword(null); }
    else if (action === 'email') window.open(`mailto:${person.email}`);
  };

  const deleteManagedUser = async (person: RegisteredPerson) => {
    const account = registeredUsers.find((user) => user.email.toLowerCase() === person.email.toLowerCase());
    if (account) {
      await api.users.deleteAccount(account.id);
    }
    await removeRegisteredPerson(person.id);
    await refreshAdminData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteManagedUser(deleteTarget);
    setDeleteTarget(null);
  };
  const handleReset = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      // Find if user has an account
      const user = registeredUsers.find(u => u.email === resetTarget.email);
      if (user) { const r = await api.users.resetPassword(user.id); setTempPassword(r.temporaryPassword); }
      else setTempPassword('(User has not created an account yet)');
    } catch { setTempPassword('(Error resetting password)'); }
    setResetLoading(false);
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      const person = registeredPersons.find((candidate) => candidate.id === id);
      if (person) await deleteManagedUser(person);
    }
    setSelected(new Set());
  };

  const handleAddUser = async (person: RegisteredPerson) => {
    setModalSaving(true);
    setModalError('');
    try {
      await api.users.createRegisteredPerson(person);
      await refreshAdminData();
      setShowAdd(false);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Unable to add user');
    } finally {
      setModalSaving(false);
    }
  };

  const handleUpdateUser = async (person: RegisteredPerson) => {
    if (!editTarget) return;
    setModalSaving(true);
    setModalError('');
    try {
      await api.users.updateRegisteredPerson(editTarget.id, {
        name: person.name,
        email: person.email,
        department: person.department,
        semester: person.semester,
        course: person.course,
        subjects: person.subjects,
        phone: person.phone,
      });
      await refreshAdminData();
      setEditTarget(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Unable to update user');
    } finally {
      setModalSaving(false);
    }
  };

  const quickFilters: { key: QuickFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: registeredPersons.length },
    { key: 'students', label: 'Students', count: stats.students },
    { key: 'teachers', label: 'Faculty', count: stats.teachers },
    { key: 'pending', label: 'Pending Signup', count: stats.pendingVerification },
    { key: 'verified', label: 'Verified', count: stats.verified },
    { key: 'recent', label: 'Recent', count: stats.recentlyAdded },
  ];

  return (
    <div className="um-page">
      {/* Header */}
      <div className="um-page__header">
        <div className="um-page__header-left">
          <h1>User Management</h1>
          <p>{registeredPersons.length} users · {stats.verified} verified · {stats.pendingVerification} pending signup</p>
        </div>
        <div className="um-page__header-actions">
          <button className="btn btn--outline btn--sm" onClick={downloadTemplate}><Download size={14}/> Template</button>
          <button className="btn btn--outline btn--sm" onClick={exportCSV}><Download size={14}/> Export</button>
          <button className="btn btn--outline btn--sm" onClick={() => { fileRef.current?.click(); }}><Upload size={14}/> Import</button>
          <button className="btn btn--primary btn--sm" onClick={() => { setModalError(''); setShowAdd(true); }}><UserPlus size={14}/> Add User</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{display:'none'}} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}/>
        </div>
      </div>

      {/* Metrics */}
      <MetricsRow stats={stats}/>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="um-bulk-bar">
          <span className="um-bulk-bar__count">{selected.size}</span> selected
          <button onClick={handleBulkDelete}><Trash2 size={13}/> Delete</button>
          <button onClick={() => setSelected(new Set())} className="um-bulk-bar__close"><X size={16}/></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-toolbar__search">
          <Search size={15}/>
          <input placeholder="Search by name, email, or ID..." value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <button className="search-clear-btn" onClick={() => setSearch('')}><X size={11}/></button>}
        </div>
        <div className="um-toolbar__filters">
          {quickFilters.map(f => (
            <button key={f.key} className={`um-chip ${quickFilter === f.key ? 'um-chip--active' : ''}`} onClick={() => setQuickFilter(f.key)}>
              {f.label} {f.count !== undefined && <span className="um-chip__count">{f.count}</span>}
            </button>
          ))}
        </div>
        <div className="um-toolbar__actions">
          {departments.length > 0 && (
            <select className="um-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Depts</option>
              {departments.map((department) => (
                <option key={department.id} value={department.name}>{departmentDisplay(department)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Dropzone */}
      <div className={`um-import-zone ${dragOver ? 'um-import-zone--active' : ''}`} style={{padding:'16px 24px',flexDirection:'row'}}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop} onClick={() => fileRef.current?.click()}>
        <FileSpreadsheet size={22}/>
        <div><strong>Drop CSV or XLSX</strong> to bulk import users</div>
      </div>

      {/* Import Result Banner */}
      {importResult && !showImport && (importResult.count > 0 || importResult.errors.length > 0 || importResult.duplicates.length > 0) && (
        <div className={`upload-result ${importResult.count > 0 ? 'upload-result--success' : 'upload-result--error'}`}>
          {importResult.count > 0 ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          {importResult.count} records imported
          {(importResult.errors.length > 0 || importResult.duplicates.length > 0) && (
            <span> · {importResult.errors.length + importResult.duplicates.length} skipped</span>
          )}
        </div>
      )}

      {/* Import Preview Modal */}
      {showImport && previewData.length > 0 && (
        <div className="upload-preview">
          <div className="upload-preview__header">
            <h3 style={{display:'flex',alignItems:'center',gap:8}}><ClipboardList size={17}/> Preview — {previewData.length} records</h3>
            <div className="upload-preview__actions">
              <button className="btn btn--outline btn--sm" onClick={() => { setShowImport(false); setPreviewData([]); }}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={confirmImport}><CheckCircle size={14}/> Confirm Import</button>
            </div>
          </div>
          {importResult?.errors && importResult.errors.length > 0 && (
            <div className="upload-preview__errors"><AlertCircle size={14}/><div>{importResult.errors.map((e, i) => <p key={i}>{e}</p>)}</div></div>
          )}
          <div className="upload-table-wrapper">
            <table className="upload-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>ID</th></tr></thead>
              <tbody>{previewData.map((p, i) => (
                <tr key={i}><td>{p.name}</td><td>{p.email}</td><td><span className={`role-badge role-badge--${p.role}`}>{p.role}</span></td><td>{p.department}</td><td>{p.enrollmentNo || p.employeeId}</td></tr>
              ))}</tbody></table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="um-table-wrap">
        <UserTable data={paginated} selected={selected} onToggle={toggleSelect} onToggleAll={toggleAll} allSelected={allSelected} onAction={handleAction}/>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={ROWS_PER_PAGE} onChange={setPage}/>
      </div>

      {/* Modals */}
      {showAdd && <AddUserModal departments={departments} onSubmit={handleAddUser} onClose={() => setShowAdd(false)} error={modalError} saving={modalSaving}/>}
      {editTarget && <AddUserModal departments={departments} initialPerson={editTarget} onSubmit={handleUpdateUser} onClose={() => setEditTarget(null)} error={modalError} saving={modalSaving}/>}
      {deleteTarget && <DeleteModal person={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}/>}
      {viewTarget && <ProfileDrawer person={viewTarget} onClose={() => setViewTarget(null)}/>}
      {resetTarget && <ResetPasswordModal person={resetTarget} tempPassword={tempPassword} loading={resetLoading} onConfirm={handleReset} onClose={() => setResetTarget(null)}/>}
    </div>
  );
};

export default AdminUploadPage;
