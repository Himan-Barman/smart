import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Pin, Plus, X, Search, Calendar, User, Trash2,
  BookOpen, Sparkles, AlertTriangle, Megaphone, Bell,
} from 'lucide-react';
import type { Notice } from '../types';

const categoryConfig: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
  academic: { bg: 'var(--accent-blue-bg)',   color: 'var(--accent-blue)',   label: 'Academic', icon: <BookOpen size={12}/> },
  event:    { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)', label: 'Event',    icon: <Sparkles size={12}/> },
  urgent:   { bg: 'var(--accent-red-bg)',    color: 'var(--accent-red)',    label: 'Urgent',   icon: <AlertTriangle size={12}/> },
  general:  { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)',  label: 'General',  icon: <Pin size={12}/> },
};
const categoryColors = categoryConfig;

const NoticeBoard: React.FC = () => {
  const { notices, addNotice, deleteNotice } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'general' as Notice['category'],
    author: '',
    pinned: false,
  });

  const filteredNotices = notices.filter(n => {
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || n.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const pinnedNotices = filteredNotices.filter(n => n.pinned);
  const regularNotices = filteredNotices.filter(n => !n.pinned);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    addNotice(form);
    setForm({ title: '', content: '', category: 'general', author: '', pinned: false });
    setShowForm(false);
  };

  return (
    <div className="page">
      <div className="page__toolbar">
        <div className="page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="page__filters">
          {['all', 'academic', 'event', 'urgent', 'general'].map(cat => (
            <button
              key={cat}
              className={`filter-chip ${filterCategory === cat ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat === 'all'
                ? <><Search size={13}/> All</>
                : <>{categoryConfig[cat]?.icon} {categoryConfig[cat]?.label}</>}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Post Notice
        </button>
      </div>

      {/* New Notice Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}><Megaphone size={18}/> Post New Notice</h3>
              <button className="modal__close" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Notice title..."
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  placeholder="Write notice details..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value as Notice['category'] })}
                  >
                    <option value="academic">Academic</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Author</label>
                  <input
                    type="text"
                    placeholder="Author name..."
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    required
                  />
                </div>
              </div>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm({ ...form, pinned: e.target.checked })}
                />
                <span style={{display:'flex',alignItems:'center',gap:'6px'}}><Pin size={13}/> Pin this notice</span>
              </label>
              <button type="submit" className="btn btn--primary btn--full">
                Publish Notice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pinned Notices */}
      {pinnedNotices.length > 0 && (
        <div className="notice-section">
          <h3 className="notice-section__title">
            <Pin size={16} /> Pinned Notices
          </h3>
          <div className="notice-grid">
            {pinnedNotices.map(notice => (
              <NoticeCard key={notice.id} notice={notice} onDelete={deleteNotice} />
            ))}
          </div>
        </div>
      )}

      {/* Regular Notices */}
      <div className="notice-section">
        <h3 className="notice-section__title">All Notices</h3>
        <div className="notice-grid">
          {regularNotices.map(notice => (
            <NoticeCard key={notice.id} notice={notice} onDelete={deleteNotice} />
          ))}
        </div>
      </div>

      {filteredNotices.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon"><Bell size={48} strokeWidth={1}/></span>
          <h3>No notices found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

const NoticeCard: React.FC<{ notice: Notice; onDelete: (id: string) => void }> = ({
  notice,
  onDelete,
}) => {
  const cat = categoryColors[notice.category];

  return (
    <div className={`notice-card ${notice.pinned ? 'notice-card--pinned' : ''}`}>
      <div className="notice-card__header">
        <span className="notice-card__badge" style={{ background: cat.bg, color: cat.color, display:'inline-flex', alignItems:'center', gap:'5px' }}>
          {cat.icon} {cat.label}
        </span>
        {notice.pinned && (
          <span className="notice-card__pin">
            <Pin size={14} />
          </span>
        )}
        <button className="notice-card__delete" onClick={() => onDelete(notice.id)} aria-label="Delete notice">
          <Trash2 size={14} />
        </button>
      </div>
      <h4 className="notice-card__title">{notice.title}</h4>
      <p className="notice-card__content">{notice.content}</p>
      <div className="notice-card__footer">
        <span>
          <User size={12} /> {notice.author}
        </span>
        <span>
          <Calendar size={12} /> {notice.date}
        </span>
      </div>
    </div>
  );
};

export default NoticeBoard;
