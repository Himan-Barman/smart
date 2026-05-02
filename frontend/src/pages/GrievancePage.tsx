import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus, X, AlertTriangle, Clock, CheckCircle, XCircle,
  ChevronDown, MessageCircle, ArrowUpRight, Shield, Send,
  BookOpen, Building2, ClipboardList, Calendar, User, Layers,
} from 'lucide-react';
import type { Grievance } from '../types';

const typeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  academic:       { icon: <BookOpen size={13} />,       label: 'Academic' },
  infrastructure: { icon: <Building2 size={13} />,      label: 'Infrastructure' },
  administrative: { icon: <ClipboardList size={13} />,  label: 'Administrative' },
  harassment:     { icon: <Shield size={13} />,          label: 'Harassment' },
  other:          { icon: <Layers size={13} />,          label: 'Other' },
};

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: 'var(--accent-green)',  bg: 'var(--accent-green-bg)',           label: 'Low' },
  medium:   { color: 'var(--accent-orange)', bg: 'var(--accent-orange-bg)',          label: 'Medium' },
  high:     { color: 'var(--accent-red)',    bg: 'var(--accent-red-bg)',             label: 'High' },
  critical: { color: '#dc2626',              bg: 'rgba(220, 38, 38, 0.15)',          label: 'Critical' },
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  submitted: { icon: <Clock size={14} />, color: 'var(--accent-orange)', label: 'Submitted' },
  in_progress: { icon: <AlertTriangle size={14} />, color: 'var(--accent-blue)', label: 'In Progress' },
  resolved: { icon: <CheckCircle size={14} />, color: 'var(--accent-green)', label: 'Resolved' },
  rejected: { icon: <XCircle size={14} />, color: 'var(--accent-red)', label: 'Rejected' },
};

const GrievancePage: React.FC = () => {
  const { grievances, addGrievance, updateGrievance } = useApp();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';

  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [form, setForm] = useState({
    type: 'academic' as Grievance['type'],
    subject: '',
    description: '',
    priority: 'medium' as Grievance['priority'],
  });

  /* ─── Role-based filtering ─── */
  const filtered = useMemo(() => {
    let list = grievances;
    // Students only see their own grievances
    if (role === 'student') {
      list = list.filter(g => g.submittedBy === currentUser?.name);
    }
    // Teachers see grievances assigned to them
    else if (role === 'teacher') {
      list = list.filter(g => g.assignedTo === 'teacher');
    }
    // Admin sees grievances assigned to admin + all
    // (admin sees everything)

    if (filterStatus !== 'all') {
      list = list.filter(g => g.status === filterStatus);
    }
    return list;
  }, [grievances, filterStatus, role, currentUser]);

  /* ─── Submit new grievance ─── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    addGrievance({
      ...form,
      submittedBy: currentUser?.name || 'Anonymous',
      submitterRole: role as 'student' | 'teacher' | 'admin',
      // Student → Teacher, Teacher → Admin
      assignedTo: role === 'student' ? 'teacher' : 'admin',
    });
    setForm({ type: 'academic', subject: '', description: '', priority: 'medium' });
    setShowForm(false);
  };

  /* ─── Resolve grievance ─── */
  const handleResolve = (id: string) => {
    if (!resolutionText.trim()) return;
    updateGrievance(id, {
      status: 'resolved',
      resolution: resolutionText,
    });
    setResolveId(null);
    setResolutionText('');
  };

  /* ─── Escalate to admin (teacher action) ─── */
  const handleEscalate = (id: string) => {
    updateGrievance(id, {
      assignedTo: 'admin',
      status: 'in_progress',
    });
  };

  /* ─── Reject grievance ─── */
  const handleReject = (id: string) => {
    updateGrievance(id, { status: 'rejected' });
  };

  /* Can this user act on this grievance? */
  const canAct = (grv: Grievance) => {
    if (grv.status === 'resolved' || grv.status === 'rejected') return false;
    if (role === 'admin') return true;
    if (role === 'teacher' && grv.assignedTo === 'teacher') return true;
    return false;
  };

  const canFile = role === 'student' || role === 'teacher';

  return (
    <div className="page">
      {/* Summary Stats */}
      <div className="grievance-stats">
        <div className="grievance-stat">
          <span className="grievance-stat__count">{filtered.length}</span>
          <span className="grievance-stat__label">Total</span>
        </div>
        <div className="grievance-stat grievance-stat--submitted">
          <span className="grievance-stat__count">
            {filtered.filter(g => g.status === 'submitted').length}
          </span>
          <span className="grievance-stat__label">Submitted</span>
        </div>
        <div className="grievance-stat grievance-stat--progress">
          <span className="grievance-stat__count">
            {filtered.filter(g => g.status === 'in_progress').length}
          </span>
          <span className="grievance-stat__label">In Progress</span>
        </div>
        <div className="grievance-stat grievance-stat--resolved">
          <span className="grievance-stat__count">
            {filtered.filter(g => g.status === 'resolved').length}
          </span>
          <span className="grievance-stat__label">Resolved</span>
        </div>
      </div>

      <div className="page__toolbar">
        <div className="page__filters">
          {['all', 'submitted', 'in_progress', 'resolved', 'rejected'].map(s => (
            <button
              key={s}
              className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? '🔍 All' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
        {canFile && (
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> File Grievance
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>⚖️ File a Grievance</h3>
              <button className="modal__close" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Routing info */}
            <div className="grv-routing-info">
              <Shield size={14} />
              <span>
                {role === 'student'
                  ? 'Your grievance will be sent to your department teacher for review.'
                  : 'Your grievance will be sent to the administration for review.'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as Grievance['type'] })}
                  >
                    {Object.entries(typeConfig).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value as Grievance['priority'] })}
                  >
                    {Object.entries(priorityConfig).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Brief subject..."
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Describe your grievance in detail..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full">
                <Send size={16} /> Submit Grievance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grievance List */}
      <div className="grievance-list">
        {filtered.map(grv => {
          const tc = typeConfig[grv.type];
          const pc = priorityConfig[grv.priority];
          const sc = statusConfig[grv.status];
          const expanded = expandedId === grv.id;
          const isResolving = resolveId === grv.id;

          return (
            <div key={grv.id} className={`grievance-card ${expanded ? 'grievance-card--expanded' : ''}`}>
              <div
                className="grievance-card__main"
                onClick={() => setExpandedId(expanded ? null : grv.id)}
              >
                <div className="grievance-card__left">
                  <div className="grievance-card__priority" style={{ background: pc.bg }}>
                    <span style={{ color: pc.color }}>{pc.label}</span>
                  </div>
                  <div className="grievance-card__info">
                    <h4>{grv.subject}</h4>
                    <div className="grievance-card__meta">
                      <span style={{display:'flex',alignItems:'center',gap:'5px'}}>{tc.icon} {tc.label}</span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:'4px'}}><User size={12}/> {grv.submittedBy}</span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:'4px'}}><Calendar size={12}/> {grv.date}</span>
                      <span className="grv-assigned-badge">
                        → {grv.assignedTo === 'teacher' ? <><User size={11}/> Teacher</> : <><Shield size={11}/> Admin</>}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grievance-card__right">
                  <span className="grievance-card__status" style={{ color: sc.color }}>
                    {sc.icon} {sc.label}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: expanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>
              </div>
              {expanded && (
                <div className="grievance-card__detail">
                  <p className="grievance-card__desc">{grv.description}</p>
                  {grv.resolution && (
                    <div className="grievance-card__resolution">
                      <MessageCircle size={14} />
                      <div>
                        <strong>Resolution:</strong>
                        <p>{grv.resolution}</p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons for teacher/admin */}
                  {canAct(grv) && !isResolving && (
                    <div className="grv-actions">
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => { setResolveId(grv.id); setResolutionText(''); }}
                      >
                        <CheckCircle size={14} /> Resolve
                      </button>
                      {role === 'teacher' && grv.assignedTo === 'teacher' && (
                        <button
                          className="btn btn--outline btn--sm"
                          onClick={() => handleEscalate(grv.id)}
                        >
                          <ArrowUpRight size={14} /> Escalate to Admin
                        </button>
                      )}
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleReject(grv.id)}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}

                  {/* Resolve input */}
                  {isResolving && (
                    <div className="grv-resolve-form">
                      <textarea
                        value={resolutionText}
                        onChange={e => setResolutionText(e.target.value)}
                        placeholder="Enter resolution details..."
                        rows={3}
                        autoFocus
                      />
                      <div className="grv-resolve-form__actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => setResolveId(null)}>Cancel</button>
                        <button className="btn btn--primary btn--sm" onClick={() => handleResolve(grv.id)} disabled={!resolutionText.trim()}>
                          <CheckCircle size={14} /> Submit Resolution
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">⚖️</span>
          <h3>No grievances found</h3>
          <p>{role === 'student' ? "You haven't filed any grievances yet." : 'No grievances assigned to you.'}</p>
        </div>
      )}
    </div>
  );
};

export default GrievancePage;
