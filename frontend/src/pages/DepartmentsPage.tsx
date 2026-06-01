import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Department, DepartmentPayload, DepartmentSubject } from '../types';
import {
  Plus, Trash2, X, Check, Building2, BookOpen, Hash,
  Users, GraduationCap, Layers, Search,
  ChevronRight, Award, Star, FlaskConical, FolderOpen,
  Pencil, AlertCircle, Eye,
} from 'lucide-react';

type SubjectDraft = Omit<DepartmentSubject, 'id'> & { draftId: string; id?: string };
type SemesterDraft = { semester: number; subjects: SubjectDraft[] };
type DepartmentForm = Omit<DepartmentPayload, 'semesters'> & { semesters: SemesterDraft[] };

const TYPE_BADGE: Record<DepartmentSubject['type'], { label: string; color: string; icon: React.ReactNode }> = {
  core: { label: 'Core', color: '#3b6cf5', icon: <BookOpen size={14} /> },
  elective: { label: 'Elective', color: '#d07a1a', icon: <Star size={14} /> },
  lab: { label: 'Lab', color: '#1a9d5c', icon: <FlaskConical size={14} /> },
  project: { label: 'Project', color: '#6c52e8', icon: <Layers size={14} /> },
};

const newDraftId = (): string => `draft-${Math.random().toString(36).slice(2, 10)}`;

const makeSemesters = (count: number, existing: SemesterDraft[] = []): SemesterDraft[] => {
  const bySemester = new Map(existing.map((semester) => [semester.semester, semester]));
  return Array.from({ length: count }, (_, index) => {
    const semester = index + 1;
    return bySemester.get(semester) ?? { semester, subjects: [] };
  });
};

const emptyForm = (): DepartmentForm => ({
  name: '',
  code: '',
  course: '',
  totalSemesters: 8,
  hod: '',
  semesters: makeSemesters(8),
});

const formFromDepartment = (department: Department): DepartmentForm => ({
  name: department.name,
  code: department.code,
  course: department.course,
  totalSemesters: department.totalSemesters,
  hod: department.hod,
  semesters: makeSemesters(
    department.totalSemesters,
    department.semesters.map((semester) => ({
      semester: semester.semester,
      subjects: semester.subjects.map((subject) => ({
        ...subject,
        draftId: subject.id,
      })),
    })),
  ),
});

const formToPayload = (form: DepartmentForm): DepartmentPayload => ({
  name: form.name.trim(),
  code: form.code.trim().toUpperCase(),
  course: form.course.trim(),
  totalSemesters: form.totalSemesters,
  hod: form.hod.trim(),
  semesters: form.semesters.map((semester) => ({
    semester: semester.semester,
    subjects: semester.subjects.map(({ draftId: _draftId, ...subject }) => ({
      ...subject,
      name: subject.name.trim(),
      code: subject.code.trim().toUpperCase(),
    })),
  })),
});

const totalSubjects = (department: Department): number =>
  department.semesters.reduce((sum, semester) => sum + semester.subjects.length, 0);

const totalCredits = (department: Department): number =>
  department.semesters.reduce(
    (sum, semester) => sum + semester.subjects.reduce((subjectSum, subject) => subjectSum + subject.credits, 0),
    0,
  );

const DepartmentEditorModal: React.FC<{
  mode: 'add' | 'edit';
  initialDepartment?: Department;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: DepartmentPayload) => Promise<void>;
}> = ({ mode, initialDepartment, saving, error, onClose, onSave }) => {
  const [form, setForm] = useState<DepartmentForm>(() =>
    initialDepartment ? formFromDepartment(initialDepartment) : emptyForm(),
  );
  const [expandedSem, setExpandedSem] = useState(1);
  const [drafts, setDrafts] = useState<Record<number, Omit<SubjectDraft, 'draftId'>>>({});
  const [localError, setLocalError] = useState('');

  const activeError = localError || error;
  const subjectCount = form.semesters.reduce((sum, semester) => sum + semester.subjects.length, 0);

  const updateTotalSemesters = (count: number) => {
    const safeCount = Math.max(1, Math.min(16, count || 1));
    setForm((current) => ({
      ...current,
      totalSemesters: safeCount,
      semesters: makeSemesters(safeCount, current.semesters),
    }));
    setExpandedSem((current) => Math.min(current, safeCount));
  };

  const updateSubjectDraft = (semester: number, updates: Partial<Omit<SubjectDraft, 'draftId'>>) => {
    setDrafts((current) => ({
      ...current,
      [semester]: { ...(current[semester] ?? { name: '', code: '', credits: 3, type: 'core' }), ...updates },
    }));
  };

  const addSubject = (semester: number) => {
    const draft = drafts[semester] ?? { name: '', code: '', credits: 3, type: 'core' as const };
    const name = draft.name.trim();
    const code = draft.code.trim().toUpperCase();
    if (!name || !code) {
      setLocalError('Subject name and code are required.');
      return;
    }

    setForm((current) => ({
      ...current,
      semesters: current.semesters.map((item) =>
        item.semester === semester
          ? {
              ...item,
              subjects: [
                ...item.subjects,
                {
                  name,
                  code,
                  credits: Number(draft.credits) || 3,
                  type: draft.type,
                  draftId: newDraftId(),
                },
              ],
            }
          : item,
      ),
    }));
    setDrafts((current) => ({ ...current, [semester]: { name: '', code: '', credits: 3, type: 'core' } }));
    setLocalError('');
  };

  const removeSubject = (semester: number, draftId: string) => {
    setForm((current) => ({
      ...current,
      semesters: current.semesters.map((item) =>
        item.semester === semester
          ? { ...item, subjects: item.subjects.filter((subject) => subject.draftId !== draftId) }
          : item,
      ),
    }));
  };

  const submit = async () => {
    const payload = formToPayload(form);
    if (!payload.name || !payload.code || !payload.course || !payload.hod) {
      setLocalError('Department name, code, course, and HOD are required.');
      return;
    }

    const duplicateSubject = payload.semesters?.some((semester) => {
      const codes = semester.subjects.map((subject) => subject.code);
      return new Set(codes).size !== codes.length;
    });
    if (duplicateSubject) {
      setLocalError('Subject codes must be unique inside each semester.');
      return;
    }

    setLocalError('');
    await onSave(payload);
  };

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm dp-editor-modal" onClick={(event) => event.stopPropagation()}>
        <div className="sm__head">
          <div className="sm__head-left">
            <div className="sm__head-icon"><Building2 size={18} /></div>
            <div>
              <h3>{mode === 'edit' ? 'Edit Department' : 'Add Department'}</h3>
              <span>{subjectCount} subjects across {form.totalSemesters} semesters</span>
            </div>
          </div>
          <button className="sm__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sm__body dp-editor-body">
          {activeError && (
            <div className="dp-form-error"><AlertCircle size={15} /> {activeError}</div>
          )}

          <div className="sm__section">
            <label className="sm__section-label">Department Details</label>
            <div className="sm__row">
              <div className="sm__input-wrap">
                <Building2 size={14} className="sm__input-icon" />
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Department name" />
              </div>
              <div className="sm__input-wrap sm__input-wrap--sm">
                <Hash size={14} className="sm__input-icon" />
                <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Code" />
              </div>
            </div>
            <div className="sm__row">
              <div className="sm__input-wrap">
                <GraduationCap size={14} className="sm__input-icon" />
                <input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} placeholder="Program / course" />
              </div>
              <div className="sm__input-wrap">
                <Users size={14} className="sm__input-icon" />
                <input value={form.hod} onChange={(event) => setForm({ ...form, hod: event.target.value })} placeholder="Head of Department" />
              </div>
            </div>
            <div className="sm__input-wrap sm__input-wrap--sm">
              <Layers size={14} className="sm__input-icon" />
              <input type="number" min={1} max={16} value={form.totalSemesters} onChange={(event) => updateTotalSemesters(Number(event.target.value))} />
            </div>
          </div>

          <div className="sm__section">
            <div className="dp-section-inline-head">
              <label className="sm__section-label">Semester Curriculum</label>
              <span>{subjectCount} subjects</span>
            </div>
            <div className="dept-sems dp-editor-sems">
              {form.semesters.map((semester) => {
                const isOpen = expandedSem === semester.semester;
                const draft = drafts[semester.semester] ?? { name: '', code: '', credits: 3, type: 'core' as const };

                return (
                  <div key={semester.semester} className={`dept-sem ${isOpen ? 'dept-sem--open' : ''}`}>
                    <div className="dept-sem__head" role="button" tabIndex={0} onClick={() => setExpandedSem(isOpen ? 0 : semester.semester)}>
                      <div className="dept-sem__left">
                        {isOpen ? <FolderOpen size={14} /> : <ChevronRight size={14} />}
                        <span>Semester {semester.semester}</span>
                      </div>
                      <div className="dept-sem__right">
                        <span className="dept-sem__count">{semester.subjects.length} subjects</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="dept-sem__body">
                        {semester.subjects.length > 0 && (
                          <table className="dept-table">
                            <thead>
                              <tr><th>Subject</th><th>Code</th><th>Credits</th><th>Type</th><th></th></tr>
                            </thead>
                            <tbody>
                              {semester.subjects.map((subject) => (
                                <tr key={subject.draftId}>
                                  <td className="dept-table__name"><BookOpen size={12} /> {subject.name}</td>
                                  <td><code>{subject.code}</code></td>
                                  <td><Star size={10} /> {subject.credits}</td>
                                  <td>
                                    <span className="dept-type-badge" style={{ color: TYPE_BADGE[subject.type].color, background: TYPE_BADGE[subject.type].color + '12' }}>
                                      {TYPE_BADGE[subject.type].label}
                                    </span>
                                  </td>
                                  <td>
                                    <button className="dept-table__del" onClick={() => removeSubject(semester.semester, subject.draftId)}>
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        <div className="dp-subject-form">
                          <div className="sm__input-wrap">
                            <BookOpen size={14} className="sm__input-icon" />
                            <input value={draft.name} onChange={(event) => updateSubjectDraft(semester.semester, { name: event.target.value })} placeholder="Subject name" />
                          </div>
                          <div className="sm__input-wrap sm__input-wrap--sm">
                            <Hash size={14} className="sm__input-icon" />
                            <input value={draft.code} onChange={(event) => updateSubjectDraft(semester.semester, { code: event.target.value.toUpperCase() })} placeholder="Code" />
                          </div>
                          <div className="sm__input-wrap sm__input-wrap--sm">
                            <Award size={14} className="sm__input-icon" />
                            <input type="number" min={1} max={10} value={draft.credits} onChange={(event) => updateSubjectDraft(semester.semester, { credits: Number(event.target.value) })} />
                          </div>
                          <div className="sm__types dp-subject-types">
                            {(['core', 'elective', 'lab', 'project'] as const).map((type) => {
                              const active = draft.type === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  className={`sm__type ${active ? 'sm__type--active' : ''}`}
                                  style={active ? { borderColor: TYPE_BADGE[type].color, background: TYPE_BADGE[type].color + '0a', color: TYPE_BADGE[type].color } : {}}
                                  onClick={() => updateSubjectDraft(semester.semester, { type })}
                                >
                                  {TYPE_BADGE[type].icon}
                                  <span>{TYPE_BADGE[type].label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => addSubject(semester.semester)}>
                            <Plus size={13} /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sm__foot">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={saving}>
            <Check size={16} /> {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Department'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DepartmentsPage: React.FC = () => {
  const {
    departments, addDepartment, updateDepartment, deleteDepartment,
    setCurrentPage, setSelectedDepartmentId,
  } = useApp();

  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState<{ mode: 'add' | 'edit'; department?: Department } | null>(null);
  const [viewDepartment, setViewDepartment] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((department) =>
      department.name.toLowerCase().includes(query) ||
      department.code.toLowerCase().includes(query) ||
      department.course.toLowerCase().includes(query) ||
      department.hod.toLowerCase().includes(query),
    );
  }, [departments, search]);

  const stats = useMemo(() => ({
    departments: departments.length,
    programs: new Set(departments.map((department) => department.course)).size,
    semesters: departments.reduce((sum, department) => sum + department.totalSemesters, 0),
    subjects: departments.reduce((sum, department) => sum + totalSubjects(department), 0),
  }), [departments]);

  const openDetail = (department: Department) => {
    setSelectedDepartmentId(department.id);
    setCurrentPage('department_detail');
  };

  const saveDepartment = async (payload: DepartmentPayload) => {
    if (!showEditor) return;
    setSaving(true);
    setError('');
    try {
      if (showEditor.mode === 'edit' && showEditor.department) {
        await updateDepartment(showEditor.department.id, payload);
      } else {
        await addDepartment(payload);
      }
      setShowEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save department');
    } finally {
      setSaving(false);
    }
  };

  const removeDepartment = async (department: Department) => {
    if (!confirm(`Delete ${department.name}?`)) return;
    setSaving(true);
    setError('');
    try {
      await deleteDepartment(department.id);
      if (viewDepartment?.id === department.id) setViewDepartment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page dept-page">
      <div className="dp-hero">
        <div className="dp-hero__content">
          <div className="dp-hero__text">
            <h2><GraduationCap size={28} /> Departments</h2>
            <p>Manage real departments, programs, semesters, and subject curriculum.</p>
          </div>
          <div className="dp-hero__actions">
            <div className="dp-hero__search">
              <Search size={16} />
              <input placeholder="Search departments..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <button className="btn btn--primary" onClick={() => { setError(''); setShowEditor({ mode: 'add' }); }}>
              <Plus size={16} /> Add Department
            </button>
          </div>
        </div>
        <div className="dp-hero__stats">
          <div className="dp-hero__stat"><span className="dp-hero__stat-val">{stats.departments}</span><span className="dp-hero__stat-lbl">Departments</span></div>
          <div className="dp-hero__stat"><span className="dp-hero__stat-val">{stats.programs}</span><span className="dp-hero__stat-lbl">Programs</span></div>
          <div className="dp-hero__stat"><span className="dp-hero__stat-val">{stats.semesters}</span><span className="dp-hero__stat-lbl">Semesters</span></div>
          <div className="dp-hero__stat"><span className="dp-hero__stat-val">{stats.subjects}</span><span className="dp-hero__stat-lbl">Subjects</span></div>
        </div>
      </div>

      {error && (
        <div className="dp-page-alert"><AlertCircle size={15} /> {error}</div>
      )}

      {filteredDepartments.length === 0 ? (
        <div className="dept-empty dp-empty-state">
          <Building2 size={42} />
          <h3>{departments.length === 0 ? 'No departments added' : 'No matching departments'}</h3>
          <p>{departments.length === 0 ? 'Add your first department to make it available across the website.' : 'Try a different search term.'}</p>
          {departments.length === 0 && (
            <button className="btn btn--primary" onClick={() => { setError(''); setShowEditor({ mode: 'add' }); }}>
              <Plus size={16} /> Add Department
            </button>
          )}
        </div>
      ) : (
        <div className="dp-managed-grid">
          {filteredDepartments.map((department, index) => (
            <article key={department.id} className="dp-managed-card">
              <div className={`dp-card__gradient dp-card__gradient--${(index % 8) + 1}`}>
                <div className="dp-card__pattern" />
                <div className="dp-card__icon-wrap"><Building2 size={26} /></div>
                <div className="dp-card__code">{department.code}</div>
              </div>
              <div className="dp-managed-card__body">
                <div>
                  <h3 className="dp-card__title">{department.name}</h3>
                  <p className="dp-managed-card__course">{department.course}</p>
                </div>
                <div className="dp-managed-card__meta">
                  <span><Users size={13} /> HOD: {department.hod}</span>
                  <span><Layers size={13} /> {department.totalSemesters} semesters</span>
                  <span><BookOpen size={13} /> {totalSubjects(department)} subjects</span>
                  <span><Award size={13} /> {totalCredits(department)} credits</span>
                </div>
                <div className="dp-managed-card__actions">
                  <button className="btn btn--outline btn--sm" onClick={() => setViewDepartment(department)}>
                    <Eye size={13} /> View
                  </button>
                  <button className="btn btn--outline btn--sm" onClick={() => openDetail(department)}>
                    <ChevronRight size={13} /> Detail
                  </button>
                  <button className="btn btn--outline btn--sm" onClick={() => { setError(''); setShowEditor({ mode: 'edit', department }); }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className="btn btn--danger btn--sm" disabled={saving} onClick={() => void removeDepartment(department)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewDepartment && (
        <div className="sm-overlay" onClick={() => setViewDepartment(null)}>
          <div className="sm" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="sm__head">
              <div className="sm__head-left">
                <div className="sm__head-icon"><Building2 size={18} /></div>
                <div>
                  <h3>{viewDepartment.name}</h3>
                  <span>{viewDepartment.code} · {viewDepartment.course}</span>
                </div>
              </div>
              <button className="sm__close" onClick={() => setViewDepartment(null)}><X size={18} /></button>
            </div>
            <div className="sm__body" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
              <div className="dept-sems">
                {makeSemesters(viewDepartment.totalSemesters, viewDepartment.semesters.map((semester) => ({
                  semester: semester.semester,
                  subjects: semester.subjects.map((subject) => ({ ...subject, draftId: subject.id })),
                }))).map((semester) => (
                  <div key={semester.semester} className="dept-sem dept-sem--open">
                    <div className="dept-sem__head">
                      <div className="dept-sem__left"><FolderOpen size={14} /><span>Semester {semester.semester}</span></div>
                      <div className="dept-sem__right"><span className="dept-sem__count">{semester.subjects.length} subjects</span></div>
                    </div>
                    <div className="dept-sem__body">
                      {semester.subjects.length === 0 ? (
                        <div className="dept-sem__empty"><BookOpen size={16} /><span>No subjects added</span></div>
                      ) : (
                        <table className="dept-table">
                          <thead><tr><th>Subject</th><th>Code</th><th>Credits</th><th>Type</th></tr></thead>
                          <tbody>
                            {semester.subjects.map((subject) => (
                              <tr key={subject.draftId}>
                                <td className="dept-table__name"><BookOpen size={12} /> {subject.name}</td>
                                <td><code>{subject.code}</code></td>
                                <td><Star size={10} /> {subject.credits}</td>
                                <td><span className="dept-type-badge" style={{ color: TYPE_BADGE[subject.type].color, background: TYPE_BADGE[subject.type].color + '12' }}>{TYPE_BADGE[subject.type].label}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm__foot">
              <button className="btn btn--ghost" onClick={() => setViewDepartment(null)}>Close</button>
              <button className="btn btn--primary" onClick={() => { setViewDepartment(null); setShowEditor({ mode: 'edit', department: viewDepartment }); }}>
                <Pencil size={14} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <DepartmentEditorModal
          mode={showEditor.mode}
          initialDepartment={showEditor.department}
          saving={saving}
          error={error}
          onClose={() => setShowEditor(null)}
          onSave={saveDepartment}
        />
      )}
    </div>
  );
};

export default DepartmentsPage;
