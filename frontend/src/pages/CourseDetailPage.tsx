import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { courseCategories } from '../data/coursesData';
import {
  ArrowLeft, BookOpen, Layers, Clock,
  Users, Award, TrendingUp, Briefcase, Shield, ChevronDown,
  ChevronRight, Star, FlaskConical, FolderOpen, CheckCircle2,
  DollarSign, MapPin, Sparkles, Target, Zap, FileText,
} from 'lucide-react';
import { COURSE_ICON_MAP } from '../utils/courseIconMap';

const CourseDetailPage: React.FC = () => {
  const { selectedCourseKey, setCurrentPage } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'faculty' | 'careers'>('overview');
  const [expandedSem, setExpandedSem] = useState<number | null>(1);

  // Find course by key (catId-abbreviation)
  const courseData = useMemo(() => {
    if (!selectedCourseKey) return null;
    for (const cat of courseCategories) {
      for (const course of cat.courses) {
        if (`${cat.id}-${course.abbreviation}` === selectedCourseKey) {
          return { course, category: cat };
        }
      }
    }
    return null;
  }, [selectedCourseKey]);

  const goBack = () => setCurrentPage('departments');

  if (!courseData) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Course not found</h2>
        <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={goBack}>
          <ArrowLeft size={16} /> Back to Departments
        </button>
      </div>
    );
  }

  const { course, category } = courseData;
  const TYPE_ICONS: Record<string, React.ReactNode> = {
    core: <BookOpen size={13} />, elective: <Star size={13} />,
    lab: <FlaskConical size={13} />, project: <Layers size={13} />,
  };
  const TYPE_COLORS: Record<string, string> = {
    core: '#3b6cf5', elective: '#d07a1a', lab: '#1a9d5c', project: '#6c52e8',
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <FileText size={15} /> },
    { id: 'curriculum' as const, label: 'Curriculum', icon: <BookOpen size={15} /> },
    { id: 'faculty' as const, label: 'Faculty', icon: <Users size={15} /> },
    { id: 'careers' as const, label: 'Careers', icon: <Briefcase size={15} /> },
  ];

  return (
    <div className="page cd-page">
      {/* Back */}
      <button className="cd-back" onClick={goBack}>
        <ArrowLeft size={18} />
        <span>Back to Departments</span>
      </button>

      {/* Hero */}
      <div className="cd-hero">
        <div className="cd-hero__bg">
          <div className="cd-hero__mesh" />
          <div className="cd-hero__glow cd-hero__glow--1" />
          <div className="cd-hero__glow cd-hero__glow--2" />
        </div>
        <div className="cd-hero__content">
          <div className="cd-hero__top">
            <span className="cd-hero__emoji" style={{display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
              {COURSE_ICON_MAP[course.icon] || COURSE_ICON_MAP['default']}
            </span>
            <div className="cd-hero__badges">
              <span className="cd-hero__badge" style={{ background: category.color + '22', color: category.color, border: `1px solid ${category.color}44` }}>
                {category.title.replace(' Courses', '').replace(' Programs', '')}
              </span>
              <span className="cd-hero__badge cd-hero__badge--acc">
                <Shield size={12} /> {course.accreditation}
              </span>
            </div>
          </div>
          <h1 className="cd-hero__title">{course.name}</h1>
          <p className="cd-hero__abbr">{course.abbreviation}</p>
          <p className="cd-hero__desc">{course.description}</p>
        </div>
        <div className="cd-hero__stats">
          <div className="cd-hero__stat">
            <Clock size={18} />
            <span className="cd-hero__stat-val">{course.duration}</span>
            <span className="cd-hero__stat-lbl">Duration</span>
          </div>
          <div className="cd-hero__stat">
            <Layers size={18} />
            <span className="cd-hero__stat-val">{course.semesters}</span>
            <span className="cd-hero__stat-lbl">Semesters</span>
          </div>
          <div className="cd-hero__stat">
            <Award size={18} />
            <span className="cd-hero__stat-val">{course.totalCredits}</span>
            <span className="cd-hero__stat-lbl">Total Credits</span>
          </div>
          <div className="cd-hero__stat">
            <DollarSign size={18} />
            <span className="cd-hero__stat-val">{course.annualFee}</span>
            <span className="cd-hero__stat-lbl">Annual Fee</span>
          </div>
          <div className="cd-hero__stat">
            <Users size={18} />
            <span className="cd-hero__stat-val">{course.faculty.length}</span>
            <span className="cd-hero__stat-lbl">Faculty</span>
          </div>
          <div className="cd-hero__stat">
            <TrendingUp size={18} />
            <span className="cd-hero__stat-val">{course.careerPaths.length}+</span>
            <span className="cd-hero__stat-lbl">Career Paths</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="cd-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`cd-tab ${activeTab === t.id ? 'cd-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="cd-content">
        {/* ══════ OVERVIEW ══════ */}
        {activeTab === 'overview' && (
          <div className="cd-overview">
            {/* Eligibility */}
            <div className="cd-card">
              <div className="cd-card__head">
                <CheckCircle2 size={18} className="cd-card__head-icon" />
                <h3>Eligibility Criteria</h3>
              </div>
              <div className="cd-card__body">
                <p className="cd-elig">{course.eligibility}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="cd-card">
              <div className="cd-card__head">
                <Sparkles size={18} className="cd-card__head-icon" />
                <h3>Program Highlights</h3>
              </div>
              <div className="cd-card__body">
                <div className="cd-highlights">
                  {course.highlights.map((h, i) => (
                    <div key={i} className="cd-highlight">
                      <div className="cd-highlight__icon"><Zap size={14} /></div>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="cd-card">
              <div className="cd-card__head">
                <FileText size={18} className="cd-card__head-icon" />
                <h3>Program Details</h3>
              </div>
              <div className="cd-card__body">
                <div className="cd-info-grid">
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Full Name</span>
                    <span className="cd-info-item__value">{course.name}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Abbreviation</span>
                    <span className="cd-info-item__value cd-info-item__value--gold">{course.abbreviation}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Duration</span>
                    <span className="cd-info-item__value">{course.duration}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Total Semesters</span>
                    <span className="cd-info-item__value">{course.semesters}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Total Credits</span>
                    <span className="cd-info-item__value">{course.totalCredits}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Annual Fee</span>
                    <span className="cd-info-item__value">{course.annualFee}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Accreditation</span>
                    <span className="cd-info-item__value">{course.accreditation}</span>
                  </div>
                  <div className="cd-info-item">
                    <span className="cd-info-item__label">Category</span>
                    <span className="cd-info-item__value" style={{ color: category.color }}>{category.title.replace(' Courses','').replace(' Programs','')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ CURRICULUM ══════ */}
        {activeTab === 'curriculum' && (
          <div className="cd-curriculum">
            <div className="cd-card">
              <div className="cd-card__head">
                <BookOpen size={18} className="cd-card__head-icon" />
                <h3>Semester-wise Subjects</h3>
                <span className="cd-card__head-badge">{course.semesterData.reduce((a, s) => a + s.subjects.length, 0)} Subjects</span>
              </div>
              <div className="cd-card__body cd-card__body--flush">
                <div className="cd-semesters">
                  {course.semesterData.map(sem => {
                    const isOpen = expandedSem === sem.semester;
                    const totalCredits = sem.subjects.reduce((a, s) => a + s.credits, 0);
                    return (
                      <div key={sem.semester} className={`cd-sem ${isOpen ? 'cd-sem--open' : ''}`}>
                        <button className="cd-sem__head" onClick={() => setExpandedSem(isOpen ? null : sem.semester)}>
                          <div className="cd-sem__left">
                            {isOpen ? <FolderOpen size={16} /> : <ChevronRight size={16} />}
                            <span className="cd-sem__num">Semester {sem.semester}</span>
                          </div>
                          <div className="cd-sem__right">
                            <span className="cd-sem__meta">{sem.subjects.length} subjects · {totalCredits} credits</span>
                            <ChevronDown size={14} className={`cd-sem__chev ${isOpen ? 'cd-sem__chev--open' : ''}`} />
                          </div>
                        </button>
                        {isOpen && (
                          <div className="cd-sem__body">
                            <table className="cd-sub-table">
                              <thead>
                                <tr><th>Subject</th><th>Code</th><th>Credits</th><th>Type</th></tr>
                              </thead>
                              <tbody>
                                {sem.subjects.map(sub => (
                                  <tr key={sub.code}>
                                    <td className="cd-sub-table__name">{TYPE_ICONS[sub.type]} {sub.name}</td>
                                    <td><code className="cd-sub-code">{sub.code}</code></td>
                                    <td><span className="cd-sub-credits">{sub.credits}</span></td>
                                    <td>
                                      <span className="cd-sub-type" style={{ color: TYPE_COLORS[sub.type], background: TYPE_COLORS[sub.type] + '12' }}>
                                        {sub.type.charAt(0).toUpperCase() + sub.type.slice(1)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {course.semesters > course.semesterData.length && (
                    <div className="cd-sem-note">
                      <MapPin size={14} />
                      <span>Semesters {course.semesterData.length + 1}–{course.semesters} curriculum available upon enrollment</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ FACULTY ══════ */}
        {activeTab === 'faculty' && (
          <div className="cd-faculty-section">
            <div className="cd-card">
              <div className="cd-card__head">
                <Users size={18} className="cd-card__head-icon" />
                <h3>Department Faculty</h3>
                <span className="cd-card__head-badge">{course.faculty.length} Members</span>
              </div>
              <div className="cd-card__body">
                <div className="cd-faculty-grid">
                  {course.faculty.map((f, i) => (
                    <div key={i} className="cd-faculty">
                      <div className="cd-faculty__avatar">
                        {f.name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div className="cd-faculty__info">
                        <h4 className="cd-faculty__name">{f.name}</h4>
                        <span className="cd-faculty__desig">{f.designation}</span>
                        <span className="cd-faculty__spec">
                          <Target size={11} /> {f.specialization}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ CAREERS ══════ */}
        {activeTab === 'careers' && (
          <div className="cd-careers-section">
            <div className="cd-card">
              <div className="cd-card__head">
                <Briefcase size={18} className="cd-card__head-icon" />
                <h3>Career Paths</h3>
              </div>
              <div className="cd-card__body">
                <div className="cd-careers-grid">
                  {course.careerPaths.map((cp, i) => (
                    <div key={i} className="cd-career">
                      <div className="cd-career__rank">{String(i + 1).padStart(2, '0')}</div>
                      <div className="cd-career__info">
                        <h4>{cp}</h4>
                      </div>
                      <TrendingUp size={16} className="cd-career__arrow" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cd-card">
              <div className="cd-card__head">
                <Sparkles size={18} className="cd-card__head-icon" />
                <h3>Why Choose {course.abbreviation}?</h3>
              </div>
              <div className="cd-card__body">
                <div className="cd-highlights">
                  {course.highlights.map((h, i) => (
                    <div key={i} className="cd-highlight">
                      <div className="cd-highlight__icon"><CheckCircle2 size={14} /></div>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetailPage;
