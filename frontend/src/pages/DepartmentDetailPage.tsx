import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { courseCategories, type CourseCategory, type CourseInfo } from '../data/coursesData';
import {
  ArrowLeft, Building2, BookOpen, Layers, Users,
  Clock, GraduationCap, ChevronDown, ChevronRight,
  Search, Filter, Sparkles, Award, TrendingUp,
} from 'lucide-react';
import { COURSE_ICON_MAP, CAT_ICON_MAP } from '../utils/courseIconMap';

const DepartmentDetailPage: React.FC = () => {
  const { departments, selectedDepartmentId, setCurrentPage } = useApp();
  const dept = departments.find(d => d.id === selectedDepartmentId);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const totalCourses = courseCategories.reduce((a, c) => a + c.courses.length, 0);

  const goBack = () => setCurrentPage('departments');

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

  const totalSubjects = dept.semesters.reduce((a, s) => a + s.subjects.length, 0);

  const categoryFilters = [
    { id: 'all',        label: 'All Courses' },
    { id: 'ug',        label: 'Undergraduate' },
    { id: 'pg',        label: 'Postgraduate' },
    { id: 'diploma',   label: 'Diploma' },
    { id: 'integrated',label: 'Integrated' },
    { id: 'lateral',   label: 'Lateral Entry' },
  ];

  return (
    <div className="page dd-page">
      {/* Back Navigation */}
      <button className="dd-back" onClick={goBack}>
        <ArrowLeft size={18} />
        <span>Back to Departments</span>
      </button>

      {/* Hero Section */}
      <div className="dd-hero">
        <div className="dd-hero__bg">
          <div className="dd-hero__mesh" />
          <div className="dd-hero__glow dd-hero__glow--1" />
          <div className="dd-hero__glow dd-hero__glow--2" />
        </div>
        <div className="dd-hero__content">
          <div className="dd-hero__badge">
            <Building2 size={16} />
            <span>{dept.code}</span>
          </div>
          <h1 className="dd-hero__title">{dept.name}</h1>
          <p className="dd-hero__course">{dept.course}</p>
          <div className="dd-hero__meta">
            <div className="dd-hero__meta-item">
              <Users size={14} />
              <span>HOD: {dept.hod}</span>
            </div>
            <div className="dd-hero__meta-item">
              <Layers size={14} />
              <span>{dept.totalSemesters} Semesters</span>
            </div>
            <div className="dd-hero__meta-item">
              <BookOpen size={14} />
              <span>{totalSubjects} Subjects</span>
            </div>
          </div>
        </div>
        <div className="dd-hero__stats">
          <div className="dd-hero__stat-card">
            <GraduationCap size={20} />
            <span className="dd-hero__stat-val">{totalCourses}</span>
            <span className="dd-hero__stat-lbl">Available Courses</span>
          </div>
          <div className="dd-hero__stat-card">
            <Sparkles size={20} />
            <span className="dd-hero__stat-val">{courseCategories.length}</span>
            <span className="dd-hero__stat-lbl">Course Categories</span>
          </div>
          <div className="dd-hero__stat-card">
            <Award size={20} />
            <span className="dd-hero__stat-val">{dept.totalSemesters}</span>
            <span className="dd-hero__stat-lbl">Semesters</span>
          </div>
          <div className="dd-hero__stat-card">
            <TrendingUp size={20} />
            <span className="dd-hero__stat-val">{totalSubjects}</span>
            <span className="dd-hero__stat-lbl">Subjects</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="dd-toolbar">
        <div className="dd-toolbar__search">
          <Search size={16} />
          <input
            placeholder="Search courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="dd-toolbar__filters">
          <Filter size={14} />
          {categoryFilters.map(f => (
            <button
              key={f.id}
              className={`dd-filter ${activeCategory === f.id ? 'dd-filter--active' : ''}`}
              onClick={() => setActiveCategory(f.id)}
            >
              <span style={{display:'inline-flex',alignItems:'center',marginRight:4}}>{CAT_ICON_MAP[f.id]}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course Categories */}
      <div className="dd-categories">
        {filteredCategories.map((cat: CourseCategory) => (
          <div key={cat.id} className="dd-cat">
            <div className="dd-cat__header">
              <div className="dd-cat__header-left">
                <div className="dd-cat__icon" style={{ background: cat.color + '12', color: cat.color }}>
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="dd-cat__title" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{display:'inline-flex'}}>{CAT_ICON_MAP[cat.id]}</span>
                    {cat.title}
                  </h3>
                  <p className="dd-cat__tagline">{cat.tagline}</p>
                </div>
              </div>
              <span className="dd-cat__count">{cat.courses.length} courses</span>
            </div>

            <div className="dd-cat__grid">
              {cat.courses.map((course: CourseInfo) => {
                const isExpanded = expandedCourse === `${cat.id}-${course.abbreviation}`;
                return (
                  <div
                    key={course.abbreviation}
                    className={`dd-course ${isExpanded ? 'dd-course--expanded' : ''}`}
                    onClick={() => setExpandedCourse(
                      isExpanded ? null : `${cat.id}-${course.abbreviation}`
                    )}
                  >
                    <div
                      className="dd-course__accent"
                      style={{ background: `linear-gradient(135deg, ${cat.color}, rgba(12,12,12,0.85))` }}
                    />
                    <div className="dd-course__body">
                      <div className="dd-course__top">
                        <span className="dd-course__icon" style={{display:'inline-flex',alignItems:'center'}}>
                          {COURSE_ICON_MAP[course.icon] || COURSE_ICON_MAP['default']}
                        </span>
                        <span className="dd-course__abbr" style={{ color: cat.color }}>
                          {course.abbreviation}
                        </span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <h4 className="dd-course__name">{course.name}</h4>
                      <div className="dd-course__pills">
                        <span className="dd-course__pill">
                          <Clock size={11} /> {course.duration}
                        </span>
                        <span className="dd-course__pill">
                          <Layers size={11} /> {course.semesters} Sem
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="dd-course__detail">
                          <div className="dd-course__detail-row">
                            <span className="dd-course__detail-label">Full Name</span>
                            <span className="dd-course__detail-value">{course.name}</span>
                          </div>
                          <div className="dd-course__detail-row">
                            <span className="dd-course__detail-label">Abbreviation</span>
                            <span className="dd-course__detail-value" style={{ color: cat.color, fontWeight: 800 }}>{course.abbreviation}</span>
                          </div>
                          <div className="dd-course__detail-row">
                            <span className="dd-course__detail-label">Duration</span>
                            <span className="dd-course__detail-value">{course.duration}</span>
                          </div>
                          <div className="dd-course__detail-row">
                            <span className="dd-course__detail-label">Semesters</span>
                            <span className="dd-course__detail-value">{course.semesters}</span>
                          </div>
                          <div className="dd-course__detail-row">
                            <span className="dd-course__detail-label">Category</span>
                            <span className="dd-course__detail-value dd-course__detail-cat" style={{ background: cat.color + '12', color: cat.color }}>
                              {cat.title.replace(' Courses', '').replace(' Programs', '')}
                            </span>
                          </div>
                        </div>
                      )}
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
            <h3>No courses found</h3>
            <p>Try a different search term or filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDetailPage;
