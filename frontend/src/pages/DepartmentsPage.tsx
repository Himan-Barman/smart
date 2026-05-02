import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { DepartmentSubject } from '../types';
import { courseCategories, type CourseCategory, type CourseInfo } from '../data/coursesData';
import {
  Plus, Trash2, X, Check, Building2, BookOpen, Hash,
  Users, GraduationCap, Layers, Search, Clock,
  ChevronRight, Award, Star, FlaskConical, FolderOpen, Filter,
} from 'lucide-react';
import { COURSE_ICON_MAP, CAT_ICON_MAP } from '../utils/courseIconMap';

const DepartmentsPage: React.FC = () => {
  const {
    departments, addDepartment, deleteDepartment,
    addSubjectToDept, removeSubjectFromDept,
    setCurrentPage, setSelectedCourseKey,
  } = useApp();

  const [showAddDept, setShowAddDept] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showManage, setShowManage] = useState<string | null>(null);
  const [expandedSem, setExpandedSem] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState<{ deptId: string; sem: number } | null>(null);

  /* ── Add dept form ── */
  const [deptForm, setDeptForm] = useState({ name: '', code: '', course: '', totalSemesters: 8, hod: '' });
  const handleAddDept = () => {
    if (!deptForm.name || !deptForm.code) return;
    addDepartment(deptForm);
    setDeptForm({ name: '', code: '', course: '', totalSemesters: 8, hod: '' });
    setShowAddDept(false);
  };

  /* ── Add subject form ── */
  const [subForm, setSubForm] = useState({ name: '', code: '', credits: 3, type: 'core' as DepartmentSubject['type'] });
  const handleAddSubject = () => {
    if (!showAddSubject || !subForm.name || !subForm.code) return;
    addSubjectToDept(showAddSubject.deptId, showAddSubject.sem, subForm);
    setSubForm({ name: '', code: '', credits: 3, type: 'core' });
    setShowAddSubject(null);
  };

  const TYPE_BADGE: Record<string, { label: string; color: string }> = {
    core: { label: 'Core', color: '#3b6cf5' },
    elective: { label: 'Elective', color: '#d07a1a' },
    lab: { label: 'Lab', color: '#1a9d5c' },
    project: { label: 'Project', color: '#6c52e8' },
  };

  const totalSubjects = (d: typeof departments[0]) => d.semesters.reduce((a, s) => a + s.subjects.length, 0);

  const totalCourses = courseCategories.reduce((a, c) => a + c.courses.length, 0);

  const filteredCategories = useMemo(() => {
    let cats = courseCategories;
    if (activeCategory !== 'all') {
      cats = cats.filter(c => c.id === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      cats = cats
        .map(cat => ({
          ...cat,
          courses: cat.courses.filter(
            c =>
              c.name.toLowerCase().includes(q) ||
              c.abbreviation.toLowerCase().includes(q)
          ),
        }))
        .filter(cat => cat.courses.length > 0);
    }
    return cats;
  }, [activeCategory, search]);

  const categoryFilters = [
    { id: 'all',        label: 'All Courses' },
    { id: 'ug',        label: 'Undergraduate' },
    { id: 'pg',        label: 'Postgraduate' },
    { id: 'diploma',   label: 'Diploma' },
    { id: 'integrated',label: 'Integrated' },
    { id: 'lateral',   label: 'Lateral Entry' },
  ];

  const managingDept = showManage ? departments.find(d => d.id === showManage) : null;

  return (
    <div className="page dept-page">
      {/* Hero Section */}
      <div className="dp-hero">
        <div className="dp-hero__bg">
          <div className="dp-hero__orb dp-hero__orb--1" />
          <div className="dp-hero__orb dp-hero__orb--2" />
          <div className="dp-hero__orb dp-hero__orb--3" />
        </div>
        <div className="dp-hero__content">
          <div className="dp-hero__text">
            <h2><GraduationCap size={28} /> Departments & Courses</h2>
            <p>Explore all academic programs, courses & specializations offered</p>
          </div>
          <div className="dp-hero__actions">
            <div className="dp-hero__search">
              <Search size={16} />
              <input
                placeholder="Search courses…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn--primary" onClick={() => setShowAddDept(true)}>
              <Plus size={16} /> Add Department
            </button>
          </div>
        </div>
        <div className="dp-hero__stats">
          <div className="dp-hero__stat">
            <span className="dp-hero__stat-val">{totalCourses}</span>
            <span className="dp-hero__stat-lbl">Total Courses</span>
          </div>
          <div className="dp-hero__stat">
            <span className="dp-hero__stat-val">{courseCategories.length}</span>
            <span className="dp-hero__stat-lbl">Categories</span>
          </div>
          <div className="dp-hero__stat">
            <span className="dp-hero__stat-val">{departments.length}</span>
            <span className="dp-hero__stat-lbl">Departments</span>
          </div>
          <div className="dp-hero__stat">
            <span className="dp-hero__stat-val">{departments.reduce((a, d) => a + totalSubjects(d), 0)}</span>
            <span className="dp-hero__stat-lbl">Subjects</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="dp-filter-bar">
        <div className="dp-filter-bar__filters">
          <Filter size={14} />
          {categoryFilters.map(f => (
            <button
              key={f.id}
              className={`dd-filter ${activeCategory === f.id ? 'dd-filter--active' : ''}`}
              onClick={() => setActiveCategory(f.id)}
            >
              <span className="dd-filter__icon" style={{display:'inline-flex',alignItems:'center',marginRight:4}}>{CAT_ICON_MAP[f.id]}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Course Categories with Card Grid ─── */}
      {filteredCategories.map((cat: CourseCategory) => (
        <div key={cat.id} className="dp-section">
          <div className="dp-section__header">
            <div className="dp-section__header-left">
              <div className="dp-section__icon" style={{ background: cat.color + '12', color: cat.color }}>
                <GraduationCap size={20} />
              </div>
              <div>
                  <h3 className="dp-section__title" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{display:'inline-flex'}}>{CAT_ICON_MAP[cat.id]}</span> {cat.title}
                  </h3>
                <p className="dp-section__tagline">{cat.tagline}</p>
              </div>
            </div>
            <span className="dp-section__count">{cat.courses.length} courses</span>
          </div>

          <div className="dp-grid">
            {cat.courses.map((course: CourseInfo, idx: number) => {
              return (
                <div
                  key={course.abbreviation}
                  className="dp-card"
                  onClick={() => {
                    setSelectedCourseKey(`${cat.id}-${course.abbreviation}`);
                    setCurrentPage('course_detail');
                  }}
                >
                  <div className={`dp-card__gradient dp-card__gradient--${(idx % 8) + 1}`}>
                    <div className="dp-card__pattern" />
                    <div className="dp-card__icon-wrap" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {COURSE_ICON_MAP[course.icon] || COURSE_ICON_MAP['default']}
                    </div>
                    <div className="dp-card__code">{course.abbreviation}</div>
                  </div>
                  <div className="dp-card__body">
                    <h3 className="dp-card__title">{course.name}</h3>
                    <div className="dp-card__info">
                      <span><Clock size={13} /> {course.duration}</span>
                      <span><Layers size={13} /> {course.semesters} Semesters</span>
                    </div>
                    <div className="dp-card__footer">
                      <span
                        className="dp-card__cat-badge"
                        style={{ background: cat.color + '10', color: cat.color }}
                      >
                        {cat.title.replace(' Courses', '').replace(' Programs', '')}
                      </span>
                      <span className="dp-card__expand-hint">
                        View Details <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredCategories.length === 0 && (
        <div className="dept-empty">
          <Search size={40} />
          <h3>No matching courses</h3>
          <p>Try a different search term or filter</p>
        </div>
      )}

      {/* ═══ Manage Department Modal ═══ */}
      {showManage && managingDept && (
        <div className="sm-overlay" onClick={() => { setShowManage(null); setExpandedSem(null); }}>
          <div className="sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="sm__head">
              <div className="sm__head-left">
                <div className="sm__head-icon"><Building2 size={18} /></div>
                <div>
                  <h3>{managingDept.name}</h3>
                  <span>{managingDept.code} · {managingDept.course}</span>
                </div>
              </div>
              <button className="sm__close" onClick={() => { setShowManage(null); setExpandedSem(null); }}><X size={18} /></button>
            </div>
            <div className="sm__body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              <div className="dept-sems">
                {Array.from({ length: managingDept.totalSemesters }, (_, i) => i + 1).map(semNum => {
                  const semData = managingDept.semesters.find(s => s.semester === semNum);
                  const subjects = semData?.subjects || [];
                  const semKey = `${managingDept.id}-${semNum}`;
                  const semOpen = expandedSem === semKey;

                  return (
                    <div key={semNum} className={`dept-sem ${semOpen ? 'dept-sem--open' : ''}`}>
                      <div className="dept-sem__head" role="button" tabIndex={0} onClick={() => setExpandedSem(semOpen ? null : semKey)}>
                        <div className="dept-sem__left">
                          {semOpen ? <FolderOpen size={14} /> : <ChevronRight size={14} />}
                          <span>Semester {semNum}</span>
                        </div>
                        <div className="dept-sem__right">
                          {subjects.length > 0 && (
                            <span className="dept-sem__count">{subjects.length} subjects</span>
                          )}
                          <button className="dept-sem__add" onClick={e => { e.stopPropagation(); setShowAddSubject({ deptId: managingDept.id, sem: semNum }); setExpandedSem(semKey); }}
                            title="Add subject"
                          ><Plus size={12} /></button>
                        </div>
                      </div>

                      {semOpen && (
                        <div className="dept-sem__body">
                          {subjects.length === 0 ? (
                            <div className="dept-sem__empty">
                              <BookOpen size={16} />
                              <span>No subjects added</span>
                              <button className="btn btn--sm btn--ghost" onClick={() => setShowAddSubject({ deptId: managingDept.id, sem: semNum })}>
                                <Plus size={12} /> Add Subject
                              </button>
                            </div>
                          ) : (
                            <table className="dept-table">
                              <thead>
                                <tr>
                                  <th>Subject</th>
                                  <th>Code</th>
                                  <th>Credits</th>
                                  <th>Type</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {subjects.map(sub => (
                                  <tr key={sub.id}>
                                    <td className="dept-table__name"><BookOpen size={12} /> {sub.name}</td>
                                    <td><code>{sub.code}</code></td>
                                    <td><Star size={10} /> {sub.credits}</td>
                                    <td>
                                      <span className="dept-type-badge" style={{ color: TYPE_BADGE[sub.type].color, background: TYPE_BADGE[sub.type].color + '12' }}>
                                        {TYPE_BADGE[sub.type].label}
                                      </span>
                                    </td>
                                    <td>
                                      <button className="dept-table__del" onClick={() => removeSubjectFromDept(managingDept.id, semNum, sub.id)}>
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="sm__foot">
              <button className="btn btn--sm btn--danger" onClick={() => { if (confirm('Delete this department?')) { deleteDepartment(managingDept.id); setShowManage(null); } }}>
                <Trash2 size={12} /> Delete
              </button>
              <button className="btn btn--ghost" onClick={() => { setShowManage(null); setExpandedSem(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Add Department Modal ═══ */}
      {showAddDept && (
        <div className="sm-overlay" onClick={() => setShowAddDept(false)}>
          <div className="sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="sm__head">
              <div className="sm__head-left">
                <div className="sm__head-icon"><Building2 size={18} /></div>
                <div><h3>New Department</h3><span>Add department details</span></div>
              </div>
              <button className="sm__close" onClick={() => setShowAddDept(false)}><X size={18} /></button>
            </div>
            <div className="sm__body">
              <div className="sm__section">
                <label className="sm__section-label">Department</label>
                <div className="sm__row">
                  <div className="sm__input-wrap">
                    <Building2 size={14} className="sm__input-icon" />
                    <input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Computer Science" />
                  </div>
                  <div className="sm__input-wrap sm__input-wrap--sm">
                    <Hash size={14} className="sm__input-icon" />
                    <input value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="CSE" />
                  </div>
                </div>
              </div>
              <div className="sm__section">
                <label className="sm__section-label">Course & HOD</label>
                <div className="sm__row">
                  <div className="sm__input-wrap">
                    <GraduationCap size={14} className="sm__input-icon" />
                    <input value={deptForm.course} onChange={e => setDeptForm({ ...deptForm, course: e.target.value })} placeholder="B.Tech CSE" />
                  </div>
                  <div className="sm__input-wrap">
                    <Users size={14} className="sm__input-icon" />
                    <input value={deptForm.hod} onChange={e => setDeptForm({ ...deptForm, hod: e.target.value })} placeholder="Head of Department" />
                  </div>
                </div>
              </div>
              <div className="sm__section">
                <label className="sm__section-label">Total Semesters</label>
                <div className="sm__input-wrap sm__input-wrap--sm">
                  <Layers size={14} className="sm__input-icon" />
                  <input type="number" min={1} max={12} value={deptForm.totalSemesters} onChange={e => setDeptForm({ ...deptForm, totalSemesters: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="sm__foot">
              <button className="btn btn--ghost" onClick={() => setShowAddDept(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleAddDept} disabled={!deptForm.name || !deptForm.code}>
                <Check size={16} /> Add Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Add Subject Modal ═══ */}
      {showAddSubject && (
        <div className="sm-overlay" onClick={() => setShowAddSubject(null)}>
          <div className="sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="sm__head">
              <div className="sm__head-left">
                <div className="sm__head-icon" style={{ background: 'rgba(26,157,92,0.07)', color: '#1a9d5c' }}><BookOpen size={18} /></div>
                <div>
                  <h3>Add Subject</h3>
                  <span>Semester {showAddSubject.sem} · {departments.find(d => d.id === showAddSubject.deptId)?.name}</span>
                </div>
              </div>
              <button className="sm__close" onClick={() => setShowAddSubject(null)}><X size={18} /></button>
            </div>
            <div className="sm__body">
              <div className="sm__section">
                <label className="sm__section-label">Subject Info</label>
                <div className="sm__row">
                  <div className="sm__input-wrap">
                    <BookOpen size={14} className="sm__input-icon" />
                    <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="e.g. Data Structures" />
                  </div>
                  <div className="sm__input-wrap sm__input-wrap--sm">
                    <Hash size={14} className="sm__input-icon" />
                    <input value={subForm.code} onChange={e => setSubForm({ ...subForm, code: e.target.value })} placeholder="CS301" />
                  </div>
                </div>
              </div>
              <div className="sm__section">
                <label className="sm__section-label">Credits & Type</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div className="sm__input-wrap sm__input-wrap--sm">
                    <Award size={14} className="sm__input-icon" />
                    <input type="number" min={1} max={6} value={subForm.credits} onChange={e => setSubForm({ ...subForm, credits: Number(e.target.value) })} />
                  </div>
                  <div className="sm__types" style={{ gridTemplateColumns: 'repeat(4,1fr)', flex: 1 }}>
                    {(['core', 'elective', 'lab', 'project'] as const).map(t => {
                      const active = subForm.type === t;
                      const meta = TYPE_BADGE[t];
                      return (
                        <button key={t} type="button"
                          className={`sm__type ${active ? 'sm__type--active' : ''}`}
                          style={active ? { borderColor: meta.color, background: meta.color + '0a', color: meta.color } : {}}
                          onClick={() => setSubForm({ ...subForm, type: t })}
                        >
                          {t === 'core' && <BookOpen size={14} />}
                          {t === 'elective' && <Star size={14} />}
                          {t === 'lab' && <FlaskConical size={14} />}
                          {t === 'project' && <Layers size={14} />}
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="sm__foot">
              <button className="btn btn--ghost" onClick={() => setShowAddSubject(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleAddSubject} disabled={!subForm.name || !subForm.code}>
                <Check size={16} /> Add Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
