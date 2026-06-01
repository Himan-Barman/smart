import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, Building2, BookOpen, Layers, Users,
  GraduationCap, ChevronRight, Search, Award, Star,
  FolderOpen, Clock,
} from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  core: '#3b6cf5',
  elective: '#d07a1a',
  lab: '#1a9d5c',
  project: '#6c52e8',
};

const DepartmentDetailPage: React.FC = () => {
  const { departments, selectedDepartmentId, setCurrentPage } = useApp();
  const dept = departments.find((department) => department.id === selectedDepartmentId);
  const [expandedSem, setExpandedSem] = useState<number | null>(1);
  const [search, setSearch] = useState('');

  const goBack = () => setCurrentPage('departments');

  const semesters = useMemo(() => {
    if (!dept) return [];
    const q = search.trim().toLowerCase();
    return Array.from({ length: dept.totalSemesters }, (_, index) => {
      const semester = index + 1;
      const data = dept.semesters.find((item) => item.semester === semester);
      const subjects = data?.subjects ?? [];
      return {
        semester,
        subjects: q
          ? subjects.filter((subject) =>
              subject.name.toLowerCase().includes(q) ||
              subject.code.toLowerCase().includes(q) ||
              subject.type.toLowerCase().includes(q),
            )
          : subjects,
      };
    }).filter((semester) => !q || semester.subjects.length > 0);
  }, [dept, search]);

  if (!dept) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Department not found</h2>
        <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={goBack}>
          <ArrowLeft size={16} /> Back to Departments
        </button>
      </div>
    );
  }

  const totalSubjects = dept.semesters.reduce((sum, semester) => sum + semester.subjects.length, 0);
  const totalCredits = dept.semesters.reduce(
    (sum, semester) => sum + semester.subjects.reduce((subjectSum, subject) => subjectSum + subject.credits, 0),
    0,
  );

  return (
    <div className="page dd-page">
      <button className="dd-back" onClick={goBack}>
        <ArrowLeft size={18} />
        <span>Back to Departments</span>
      </button>

      <div className="dd-hero">
        <div className="dd-hero__content">
          <div className="dd-hero__badge">
            <Building2 size={16} />
            <span>{dept.code}</span>
          </div>
          <h1 className="dd-hero__title">{dept.name}</h1>
          <p className="dd-hero__course">{dept.course}</p>
          <div className="dd-hero__meta">
            <div className="dd-hero__meta-item"><Users size={14} /><span>HOD: {dept.hod}</span></div>
            <div className="dd-hero__meta-item"><Layers size={14} /><span>{dept.totalSemesters} Semesters</span></div>
            <div className="dd-hero__meta-item"><BookOpen size={14} /><span>{totalSubjects} Subjects</span></div>
          </div>
        </div>
        <div className="dd-hero__stats">
          <div className="dd-hero__stat-card">
            <GraduationCap size={20} />
            <span className="dd-hero__stat-val">1</span>
            <span className="dd-hero__stat-lbl">Program</span>
          </div>
          <div className="dd-hero__stat-card">
            <Clock size={20} />
            <span className="dd-hero__stat-val">{dept.totalSemesters}</span>
            <span className="dd-hero__stat-lbl">Semesters</span>
          </div>
          <div className="dd-hero__stat-card">
            <BookOpen size={20} />
            <span className="dd-hero__stat-val">{totalSubjects}</span>
            <span className="dd-hero__stat-lbl">Subjects</span>
          </div>
          <div className="dd-hero__stat-card">
            <Award size={20} />
            <span className="dd-hero__stat-val">{totalCredits}</span>
            <span className="dd-hero__stat-lbl">Credits</span>
          </div>
        </div>
      </div>

      <div className="dd-toolbar">
        <div className="dd-toolbar__search">
          <Search size={16} />
          <input placeholder="Search subjects..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="cd-card">
        <div className="cd-card__head">
          <BookOpen size={18} className="cd-card__head-icon" />
          <h3>Semester-wise Curriculum</h3>
          <span className="cd-card__head-badge">{totalSubjects} Subjects</span>
        </div>
        <div className="cd-card__body cd-card__body--flush">
          <div className="cd-semesters">
            {semesters.map((semester) => {
              const isOpen = expandedSem === semester.semester;
              const credits = semester.subjects.reduce((sum, subject) => sum + subject.credits, 0);
              return (
                <div key={semester.semester} className={`cd-sem ${isOpen ? 'cd-sem--open' : ''}`}>
                  <button className="cd-sem__head" onClick={() => setExpandedSem(isOpen ? null : semester.semester)}>
                    <div className="cd-sem__left">
                      {isOpen ? <FolderOpen size={16} /> : <ChevronRight size={16} />}
                      <span className="cd-sem__num">Semester {semester.semester}</span>
                    </div>
                    <div className="cd-sem__right">
                      <span className="cd-sem__meta">{semester.subjects.length} subjects · {credits} credits</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="cd-sem__body">
                      {semester.subjects.length === 0 ? (
                        <div className="dept-sem__empty"><BookOpen size={16} /><span>No subjects added</span></div>
                      ) : (
                        <table className="cd-sub-table">
                          <thead>
                            <tr><th>Subject</th><th>Code</th><th>Credits</th><th>Type</th></tr>
                          </thead>
                          <tbody>
                            {semester.subjects.map((subject) => (
                              <tr key={subject.id}>
                                <td className="cd-sub-table__name"><BookOpen size={13} /> {subject.name}</td>
                                <td><code className="cd-sub-code">{subject.code}</code></td>
                                <td><span className="cd-sub-credits"><Star size={10} /> {subject.credits}</span></td>
                                <td>
                                  <span className="cd-sub-type" style={{ color: TYPE_COLORS[subject.type], background: TYPE_COLORS[subject.type] + '12' }}>
                                    {subject.type.charAt(0).toUpperCase() + subject.type.slice(1)}
                                  </span>
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
            {semesters.length === 0 && (
              <div className="dept-empty">
                <Search size={40} />
                <h3>No subjects found</h3>
                <p>Try a different search term.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetailPage;
