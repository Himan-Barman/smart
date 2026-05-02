import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { RegisteredPerson, UserRole } from '../types';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import {
  Upload, FileSpreadsheet, Users, Trash2, Download,
  CheckCircle, AlertCircle, Search, UserPlus, X,
  GraduationCap, User, Globe, ClipboardList,
} from 'lucide-react';

type SpreadsheetCell = string | number | boolean | Date | null;

const cellToString = (cell: SpreadsheetCell | undefined): string => {
  if (cell instanceof Date) return cell.toISOString().split('T')[0] ?? '';
  if (cell === null || cell === undefined) return '';
  return String(cell).trim();
};

const rowsToRecords = (rows: SpreadsheetCell[][]): Record<string, string>[] => {
  const [headerRow, ...bodyRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map(cellToString);
  return bodyRows.map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      if (header) record[header] = cellToString(row[index]);
      return record;
    }, {}),
  );
};

const AdminUploadPage: React.FC = () => {
  const { registeredPersons, uploadPersons, removeRegisteredPerson } = useAuth();
  const [uploadResult, setUploadResult] = useState<{ count: number; errors: string[] } | null>(null);
  const [previewData, setPreviewData] = useState<RegisteredPerson[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '', email: '', role: 'student' as UserRole,
    department: '', identifier: '', semester: '', course: '',
    phone: '', subjects: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseRow = (row: Record<string, string>, index: number): { person?: RegisteredPerson; error?: string } => {
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

    if (!name || !email) return { error: `Row ${index + 1}: Missing name or email` };
    if (!['student', 'teacher'].includes(role)) return { error: `Row ${index + 1}: Invalid role "${role}"` };
    if (role === 'student' && !enrollment) return { error: `Row ${index + 1}: Missing enrollment number for student` };
    if (role === 'teacher' && !empId) return { error: `Row ${index + 1}: Missing employee ID for teacher` };

    const id = role === 'student' ? enrollment : empId;

    const person: RegisteredPerson = {
      id,
      name,
      email,
      role,
      department: dept,
      ...(role === 'student' ? {
        enrollmentNo: enrollment,
        semester: parseInt(semester) || undefined,
        course: course || undefined,
      } : {
        employeeId: empId,
        subjects: subjects ? subjects.split(',').map(s => s.trim()) : undefined,
      }),
      phone: phone || undefined,
    };

    return { person };
  };

  const processFileData = (rows: Record<string, string>[]) => {
    const persons: RegisteredPerson[] = [];
    const errors: string[] = [];

    rows.forEach((row, i) => {
      const result = parseRow(row, i);
      if (result.person) persons.push(result.person);
      if (result.error) errors.push(result.error);
    });

    setPreviewData(persons);
    setUploadResult({ count: persons.length, errors });
    setShowPreview(true);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processFileData(results.data),
        error: () => setUploadResult({ count: 0, errors: ['Failed to parse CSV file'] }),
      });
    } else if (ext === 'xlsx') {
      try {
        const rows = await readSheet(file);
        processFileData(rowsToRecords(rows as unknown as SpreadsheetCell[][]));
      } catch {
        setUploadResult({ count: 0, errors: ['Failed to parse XLSX file'] });
      }
    } else {
      setUploadResult({ count: 0, errors: ['Unsupported file format. Use .csv or .xlsx'] });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const confirmUpload = async () => {
    const count = await uploadPersons(previewData);
    setUploadResult({ count, errors: [] });
    setPreviewData([]);
    setShowPreview(false);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualForm.role === 'student' ? manualForm.identifier : manualForm.identifier;
    const person: RegisteredPerson = {
      id,
      name: manualForm.name,
      email: manualForm.email,
      role: manualForm.role,
      department: manualForm.department,
      phone: manualForm.phone || undefined,
      ...(manualForm.role === 'student' ? {
        enrollmentNo: manualForm.identifier,
        semester: parseInt(manualForm.semester) || undefined,
        course: manualForm.course || undefined,
      } : {
        employeeId: manualForm.identifier,
        subjects: manualForm.subjects ? manualForm.subjects.split(',').map(s => s.trim()) : undefined,
      }),
    };
    await uploadPersons([person]);
    setShowAddManual(false);
    setManualForm({ name: '', email: '', role: 'student', department: '', identifier: '', semester: '', course: '', phone: '', subjects: '' });
  };

  const downloadTemplate = () => {
    const headers = ['name', 'email', 'role', 'department', 'enrollment_no', 'employee_id', 'semester', 'course', 'phone', 'subjects'];
    const sampleRows = [
      ['John Doe', 'john@university.edu', 'student', 'Computer Science', 'CS2025001', '', '2', 'B.Tech CSE', '9876543210', ''],
      ['Dr. Jane Smith', 'jane@university.edu', 'teacher', 'Computer Science', '', 'EMP010', '', '', '9876500010', 'Operating Systems,DBMS'],
    ];
    const csv = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart_campus_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = registeredPersons.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || p.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const studentCount = registeredPersons.filter(p => p.role === 'student').length;
  const teacherCount = registeredPersons.filter(p => p.role === 'teacher').length;

  return (
    <div className="page">
      {/* Stats */}
      <div className="upload-stats">
        <div className="upload-stat">
          <Users size={22} />
          <div>
            <span className="upload-stat__value">{registeredPersons.length}</span>
            <span className="upload-stat__label">Total Registered</span>
          </div>
        </div>
        <div className="upload-stat">
          <GraduationCap size={22} />
          <div>
            <span className="upload-stat__value">{studentCount}</span>
            <span className="upload-stat__label">Students</span>
          </div>
        </div>
        <div className="upload-stat">
          <User size={22} />
          <div>
            <span className="upload-stat__value">{teacherCount}</span>
            <span className="upload-stat__label">Teachers</span>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="upload-section">
        <div className="upload-section__header">
          <h3><FileSpreadsheet size={20} /> Import Student/Teacher Data</h3>
          <div className="upload-section__actions">
            <button className="btn btn--outline btn--sm" onClick={downloadTemplate}>
              <Download size={14} /> Download Template
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAddManual(true)}>
              <UserPlus size={14} /> Add Manually
            </button>
          </div>
        </div>

        <div
          className={`upload-dropzone ${dragOver ? 'upload-dropzone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={36} />
          <p><strong>Drag & drop</strong> your file here, or <span>browse</span></p>
          <p className="upload-dropzone__hint">Supports CSV and XLSX files</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Upload result message */}
        {uploadResult && !showPreview && (
          <div className={`upload-result ${uploadResult.errors.length > 0 && uploadResult.count === 0 ? 'upload-result--error' : 'upload-result--success'}`}>
            {uploadResult.count > 0 ? (
              <><CheckCircle size={16} /> {uploadResult.count} records processed successfully</>
            ) : (
              <><AlertCircle size={16} /> No records added</>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewData.length > 0 && (
        <div className="upload-preview">
          <div className="upload-preview__header">
            <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}><ClipboardList size={18}/> Preview — {previewData.length} records found</h3>
            <div className="upload-preview__actions">
              <button className="btn btn--outline btn--sm" onClick={() => { setShowPreview(false); setPreviewData([]); }}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={confirmUpload}>
                <CheckCircle size={14} /> Confirm Upload
              </button>
            </div>
          </div>
          {uploadResult?.errors && uploadResult.errors.length > 0 && (
            <div className="upload-preview__errors">
              <AlertCircle size={14} />
              <div>
                {uploadResult.errors.map((err, i) => <p key={i}>{err}</p>)}
              </div>
            </div>
          )}
          <div className="upload-table-wrapper">
            <table className="upload-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>
                      <span className={`role-badge role-badge--${p.role}`}>
                        {p.role}
                      </span>
                    </td>
                    <td>{p.department}</td>
                    <td>{p.enrollmentNo || p.employeeId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddManual && (
        <div className="modal-overlay" onClick={() => setShowAddManual(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Add Person Manually</h3>
              <button className="modal__close" onClick={() => setShowAddManual(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="modal__form" onSubmit={handleManualAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" required value={manualForm.email} onChange={e => setManualForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select value={manualForm.role} onChange={e => setManualForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" required value={manualForm.department} onChange={e => setManualForm(f => ({ ...f, department: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>{manualForm.role === 'student' ? 'Enrollment Number' : 'Employee ID'}</label>
                <input type="text" required value={manualForm.identifier} onChange={e => setManualForm(f => ({ ...f, identifier: e.target.value }))} />
              </div>
              {manualForm.role === 'student' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Semester</label>
                    <input type="number" min="1" max="8" value={manualForm.semester} onChange={e => setManualForm(f => ({ ...f, semester: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Course</label>
                    <input type="text" value={manualForm.course} onChange={e => setManualForm(f => ({ ...f, course: e.target.value }))} />
                  </div>
                </div>
              )}
              {manualForm.role === 'teacher' && (
                <div className="form-group">
                  <label>Subjects (comma-separated)</label>
                  <input type="text" value={manualForm.subjects} onChange={e => setManualForm(f => ({ ...f, subjects: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={manualForm.phone} onChange={e => setManualForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn--primary btn--full">
                <UserPlus size={16} /> Add Person
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Registered Persons Table */}
      <div className="upload-section">
        <div className="upload-section__header">
          <h3><Users size={20} /> Registered Persons ({registeredPersons.length})</h3>
        </div>

        <div className="page__toolbar" style={{ marginBottom: 16 }}>
          <div className="page__search">
            <Search size={16} />
            <input placeholder="Search by name, email, or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="page__filters">
            {(['all', 'student', 'teacher'] as const).map(r => (
              <button key={r} className={`filter-chip ${filterRole === r ? 'filter-chip--active' : ''}`} onClick={() => setFilterRole(r)}>
                {r === 'all'
                  ? <><Globe size={13}/> All</>
                  : r === 'student'
                    ? <><GraduationCap size={13}/> Students</>
                    : <><User size={13}/> Teachers</>}
              </button>
            ))}
          </div>
        </div>

        <div className="upload-table-wrapper">
          <table className="upload-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>ID</th>
                <th>Details</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No records found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.email}</td>
                  <td>
                    <span className={`role-badge role-badge--${p.role}`}>
                      {p.role}
                    </span>
                  </td>
                  <td>{p.department}</td>
                  <td><code>{p.enrollmentNo || p.employeeId}</code></td>
                  <td>
                    {p.role === 'student'
                      ? `Sem ${p.semester || '-'} · ${p.course || '-'}`
                      : p.subjects?.join(', ') || '-'
                    }
                  </td>
                  <td>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => removeRegisteredPerson(p.id)}
                      style={{ color: 'var(--accent-red)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadPage;
