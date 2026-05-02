import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus, X, Star, MessageSquare, CheckCircle, Clock, Eye,
  BookOpen, User, Wrench, Lock, Search,
} from 'lucide-react';
import type { Feedback } from '../types';

const typeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  course:         { icon: <BookOpen size={13} />,     label: 'Course' },
  faculty:        { icon: <User size={13} />,         label: 'Faculty' },
  infrastructure: { icon: <Wrench size={13} />,       label: 'Infrastructure' },
  general:        { icon: <MessageSquare size={13} />,label: 'General' },
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock size={14} />, color: 'var(--accent-orange)', label: 'Pending' },
  reviewed: { icon: <Eye size={14} />, color: 'var(--accent-blue)', label: 'Reviewed' },
  resolved: { icon: <CheckCircle size={14} />, color: 'var(--accent-green)', label: 'Resolved' },
};

const FeedbackPage: React.FC = () => {
  const { feedbacks, addFeedback } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const [form, setForm] = useState({
    type: 'general' as Feedback['type'],
    subject: '',
    message: '',
    rating: 0,
    anonymous: false,
  });

  const [hoverRating, setHoverRating] = useState(0);

  const filtered = feedbacks.filter(f => filterType === 'all' || f.type === filterType);

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((a, b) => a + b.rating, 0) / feedbacks.length).toFixed(1)
    : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim() || form.rating === 0) return;
    addFeedback(form);
    setForm({ type: 'general', subject: '', message: '', rating: 0, anonymous: false });
    setShowForm(false);
  };

  return (
    <div className="page">
      {/* Stats */}
      <div className="feedback-stats">
        <div className="feedback-stat-card">
          <span className="feedback-stat-card__value">{feedbacks.length}</span>
          <span className="feedback-stat-card__label">Total Feedback</span>
        </div>
        <div className="feedback-stat-card">
          <span className="feedback-stat-card__value">{avgRating}</span>
          <span className="feedback-stat-card__label">Average Rating</span>
          <div className="feedback-stat-card__stars">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={14} fill={i <= Math.round(Number(avgRating)) ? '#f59e0b' : 'none'} color="#f59e0b" />
            ))}
          </div>
        </div>
        <div className="feedback-stat-card">
          <span className="feedback-stat-card__value">
            {feedbacks.filter(f => f.status === 'resolved').length}
          </span>
          <span className="feedback-stat-card__label">Resolved</span>
        </div>
        <div className="feedback-stat-card">
          <span className="feedback-stat-card__value">
            {feedbacks.filter(f => f.status === 'pending').length}
          </span>
          <span className="feedback-stat-card__label">Pending</span>
        </div>
      </div>

      <div className="page__toolbar">
        <div className="page__filters">
          {['all', 'course', 'faculty', 'infrastructure', 'general'].map(t => (
            <button
              key={t}
              className={`filter-chip ${filterType === t ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'all'
                ? <><Search size={13}/> All</>
                : <>{typeConfig[t]?.icon} {typeConfig[t]?.label}</>}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Submit Feedback
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}><MessageSquare size={18}/> Submit Feedback</h3>
              <button className="modal__close" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as Feedback['type'] })}
                  >
                     <option value="course">Course</option>
                    <option value="faculty">Faculty</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    placeholder="Feedback subject..."
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  placeholder="Share your feedback in detail..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      type="button"
                      key={i}
                      className="star-rating__star"
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setForm({ ...form, rating: i })}
                    >
                      <Star
                        size={28}
                        fill={i <= (hoverRating || form.rating) ? '#f59e0b' : 'none'}
                        color="#f59e0b"
                      />
                    </button>
                  ))}
                  <span className="star-rating__label">
                    {form.rating > 0 ? `${form.rating}/5` : 'Select rating'}
                  </span>
                </div>
              </div>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={e => setForm({ ...form, anonymous: e.target.checked })}
                />
                <span style={{display:'flex',alignItems:'center',gap:'6px'}}><Lock size={13}/> Submit anonymously</span>
              </label>
              <button type="submit" className="btn btn--primary btn--full">
                Submit Feedback
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Cards */}
      <div className="feedback-grid">
        {filtered.map(fb => {
          const tc = typeConfig[fb.type];
          const sc = statusConfig[fb.status];
          return (
            <div key={fb.id} className="feedback-card">
              <div className="feedback-card__header">
                <span className="feedback-card__type" style={{display:'flex',alignItems:'center',gap:'5px'}}>{tc.icon} {tc.label}</span>
                <span className="feedback-card__status" style={{ color: sc.color }}>
                  {sc.icon} {sc.label}
                </span>
              </div>
              <h4 className="feedback-card__subject">{fb.subject}</h4>
              <p className="feedback-card__message">{fb.message}</p>
              <div className="feedback-card__footer">
                <div className="feedback-card__stars">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={14} fill={i <= fb.rating ? '#f59e0b' : 'none'} color="#f59e0b" />
                  ))}
                </div>
                <span className="feedback-card__date">
                  {fb.anonymous && <span className="feedback-card__anon" style={{display:'inline-flex',alignItems:'center',gap:'4px'}}><Lock size={11}/> Anonymous</span>}
                  {fb.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon"><MessageSquare size={48} strokeWidth={1}/></span>
          <h3>No feedback found</h3>
          <p>Be the first to submit feedback!</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
