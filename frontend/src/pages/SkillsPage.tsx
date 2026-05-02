import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  X,
  MapPin,
  Clock,
  Briefcase,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Building2,
} from 'lucide-react';
import { sampleInternships, allSkillOptions, skillCategories } from '../data/sampleData';

const levelColors = {
  beginner: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' },
  intermediate: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' },
  advanced: { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' },
};

const typeColors = {
  remote: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)', label: '🌐 Remote' },
  onsite: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', label: '🏢 On-site' },
  hybrid: { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)', label: '🔄 Hybrid' },
};

const SkillsPage: React.FC = () => {
  const { userSkills, addSkill, removeSkill } = useApp();
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSkillName, setSelectedSkillName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [showInternshipDetail, setShowInternshipDetail] = useState<string | null>(null);

  // Calculate skill match score for internships
  const matchedInternships = useMemo(() => {
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    return sampleInternships
      .map(intern => {
        const matchCount = intern.skills.filter(s =>
          userSkillNames.includes(s.toLowerCase())
        ).length;
        const matchPercent = Math.round((matchCount / intern.skills.length) * 100);
        return { ...intern, matchCount, matchPercent };
      })
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }, [userSkills]);

  const handleAddSkill = () => {
    if (!selectedSkillName || !selectedCategory) return;
    if (userSkills.some(s => s.name.toLowerCase() === selectedSkillName.toLowerCase())) return;
    addSkill({ name: selectedSkillName, category: selectedCategory, level: selectedLevel });
    setSelectedSkillName('');
    setShowAddSkill(false);
  };

  // Group skills by category
  const groupedSkills = useMemo(() => {
    const groups: Record<string, typeof userSkills> = {};
    userSkills.forEach(skill => {
      if (!groups[skill.category]) groups[skill.category] = [];
      groups[skill.category].push(skill);
    });
    return groups;
  }, [userSkills]);

  return (
    <div className="page">
      <div className="skills-layout">
        {/* Left: Skills Panel */}
        <div className="skills-panel">
          <div className="skills-panel__header">
            <h3>🎯 My Skills ({userSkills.length})</h3>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAddSkill(true)}>
              <Plus size={14} /> Add Skill
            </button>
          </div>

          {/* Add Skill Form */}
          {showAddSkill && (
            <div className="skills-add-form">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="">Select category...</option>
                  {skillCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Skill</label>
                <select
                  value={selectedSkillName}
                  onChange={e => setSelectedSkillName(e.target.value)}
                >
                  <option value="">Select skill...</option>
                  {allSkillOptions
                    .filter(s => !userSkills.some(us => us.name === s))
                    .map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>Level</label>
                <select
                  value={selectedLevel}
                  onChange={e => setSelectedLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                >
                  <option value="beginner">🌱 Beginner</option>
                  <option value="intermediate">🌿 Intermediate</option>
                  <option value="advanced">🌳 Advanced</option>
                </select>
              </div>
              <div className="form-row">
                <button className="btn btn--primary btn--sm" onClick={handleAddSkill}>Add</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowAddSkill(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Skills by Category */}
          {Object.entries(groupedSkills).map(([cat, skills]) => (
            <div key={cat} className="skills-category">
              <h4 className="skills-category__title">{cat}</h4>
              <div className="skills-tags">
                {skills.map(skill => {
                  const lc = levelColors[skill.level];
                  return (
                    <div
                      key={skill.id}
                      className="skill-tag"
                      style={{ background: lc.bg, borderColor: lc.color }}
                    >
                      <span className="skill-tag__name">{skill.name}</span>
                      <span className="skill-tag__level" style={{ color: lc.color }}>
                        {skill.level}
                      </span>
                      <button
                        className="skill-tag__remove"
                        onClick={() => removeSkill(skill.id)}
                        aria-label={`Remove ${skill.name}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {userSkills.length === 0 && (
            <div className="empty-state empty-state--sm">
              <span className="empty-state__icon">🎯</span>
              <p>Add your skills to get internship recommendations!</p>
            </div>
          )}
        </div>

        {/* Right: Internships Panel */}
        <div className="internships-panel">
          <div className="internships-panel__header">
            <h3><Sparkles size={18} /> Recommended Internships</h3>
            <span className="internships-panel__count">{matchedInternships.length} found</span>
          </div>

          <div className="internship-list">
            {matchedInternships.map(intern => {
              const tc = typeColors[intern.type];
              return (
                <div key={intern.id} className="internship-card">
                  <div className="internship-card__header">
                    <div className="internship-card__company">
                      <div className="internship-card__logo">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h4 className="internship-card__title">{intern.title}</h4>
                        <span className="internship-card__company-name">{intern.company}</span>
                      </div>
                    </div>
                    <div className="internship-card__match">
                      <div
                        className="match-ring"
                        style={{
                          background: `conic-gradient(${
                            intern.matchPercent >= 70
                              ? 'var(--accent-green)'
                              : intern.matchPercent >= 40
                              ? 'var(--accent-orange)'
                              : 'var(--accent-red)'
                          } ${intern.matchPercent * 3.6}deg, var(--surface-2) 0deg)`,
                        }}
                      >
                        <span>{intern.matchPercent}%</span>
                      </div>
                      <span className="match-label">Match</span>
                    </div>
                  </div>

                  <div className="internship-card__meta">
                    <span><MapPin size={13} /> {intern.location}</span>
                    <span><Clock size={13} /> {intern.duration}</span>
                    <span><Briefcase size={13} /> {intern.stipend}</span>
                    <span className="internship-card__type" style={{ background: tc.bg, color: tc.color }}>
                      {tc.label}
                    </span>
                  </div>

                  <div className="internship-card__skills">
                    {intern.skills.map(skill => {
                      const isMatched = userSkills.some(
                        us => us.name.toLowerCase() === skill.toLowerCase()
                      );
                      return (
                        <span
                          key={skill}
                          className={`internship-skill ${isMatched ? 'internship-skill--matched' : ''}`}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    className="internship-card__expand"
                    onClick={() =>
                      setShowInternshipDetail(
                        showInternshipDetail === intern.id ? null : intern.id
                      )
                    }
                  >
                    {showInternshipDetail === intern.id ? 'Less Details' : 'More Details'}
                    <ChevronDown
                      size={14}
                      style={{
                        transform: showInternshipDetail === intern.id ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  {showInternshipDetail === intern.id && (
                    <div className="internship-card__detail">
                      <p>{intern.description}</p>
                      <div className="internship-card__deadline">
                        <Clock size={14} /> Deadline: {intern.deadline}
                      </div>
                      <button className="btn btn--primary btn--sm">
                        Apply Now <ExternalLink size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsPage;
