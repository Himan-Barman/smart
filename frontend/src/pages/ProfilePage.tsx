import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Phone, Building2, Hash, BookOpen, User as UserIcon, Shield, Briefcase, Edit2, Check, Star, Award, LogOut } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile, logoutAllDevices } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [editData, setEditData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '+1 (555) 000-0000',
    email: currentUser?.email || ''
  });

  if (!currentUser) return null;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2);
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Faculty Member',
    student: 'Student',
  };

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Shield size={16} />,
    teacher: <Briefcase size={16} />,
    student: <BookOpen size={16} />,
  };

  const handleSave = async () => {
    await updateProfile({
      name: editData.name,
      email: editData.email,
      phone: editData.phone,
    });
    setIsEditing(false);
  };

  const handleLogoutAllDevices = async () => {
    setSessionActionLoading(true);
    try {
      await logoutAllDevices();
    } finally {
      setSessionActionLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page__title">User Profile</h2>
          <p className="page__subtitle">Manage your personal information and preferences.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className="btn btn--outline"
            onClick={handleLogoutAllDevices}
            disabled={sessionActionLoading}
          >
            <LogOut size={16} /> Logout All Devices
          </button>
          <button
            className={`btn ${isEditing ? 'btn--primary' : 'btn--outline'}`}
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
          >
            {isEditing ? <><Check size={16} /> Save Changes</> : <><Edit2 size={16} /> Edit Profile</>}
          </button>
        </div>
      </div>

      <div className="profile-layout" style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', alignItems: 'start' }}>
        
        {/* Left Column: Avatar & Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="profile-card" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
            <div className="profile-avatar-wrap" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', fontWeight: '700', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(59, 108, 245, 0.3)' }}>
              {getInitials(editData.name).toUpperCase()}
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{editData.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{editData.email}</p>
            <div className="role-badge-large" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-2)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}>
              {roleIcons[currentUser.role]} {roleLabels[currentUser.role] || currentUser.role}
            </div>
          </div>

          {/* Teacher Rating Block */}
          {currentUser.role === 'teacher' && (
            <div className="profile-card" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '24px', boxShadow: 'var(--shadow-card)' }}>
               <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} className="text-accent-orange" /> Student Ratings
              </h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>4.8</span>
                <div style={{ display: 'flex', color: 'var(--accent-orange)', marginBottom: '6px' }}>
                  <Star fill="currentColor" size={18} />
                  <Star fill="currentColor" size={18} />
                  <Star fill="currentColor" size={18} />
                  <Star fill="currentColor" size={18} />
                  <Star size={18} /> {/* outline for half/empty */}
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Based on 124 student reviews across 4 courses this semester.</p>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Info */}
        <div className="profile-card" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={20} className="text-accent-blue" /> Personal Details
          </h4>
          
          <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            <div className="detail-group">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.name} 
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--accent-blue)', background: '#fff', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500', outline: 'none', boxShadow: '0 0 0 3px rgba(91, 140, 255, 0.1)' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                  <UserIcon size={16} style={{ color: 'var(--text-muted)' }} />
                  {editData.name}
                </div>
              )}
            </div>

            <div className="detail-group">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
              {isEditing ? (
                <input 
                  type="email" 
                  value={editData.email} 
                  onChange={e => setEditData({...editData, email: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--accent-blue)', background: '#fff', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500', outline: 'none', boxShadow: '0 0 0 3px rgba(91, 140, 255, 0.1)' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                  {editData.email}
                </div>
              )}
            </div>

            <div className="detail-group">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department <span style={{ color: 'var(--accent-red)', fontSize: '10px', marginLeft: '4px' }}>* Locked</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-muted)', fontWeight: '500', background: 'var(--surface-3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'not-allowed' }}>
                <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                {currentUser.department || 'Not Assigned'}
              </div>
            </div>

            {currentUser.role === 'student' && (
              <>
                <div className="detail-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enrollment Number <span style={{ color: 'var(--accent-red)', fontSize: '10px', marginLeft: '4px' }}>* Locked</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-muted)', fontWeight: '500', background: 'var(--surface-3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'not-allowed' }}>
                    <Hash size={16} style={{ color: 'var(--text-muted)' }} />
                    {currentUser.enrollmentNo || 'N/A'}
                  </div>
                </div>
                
                <div className="detail-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course / Semester <span style={{ color: 'var(--accent-red)', fontSize: '10px', marginLeft: '4px' }}>* Locked</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-muted)', fontWeight: '500', background: 'var(--surface-3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'not-allowed' }}>
                    <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
                    {currentUser.course || 'N/A'} • Sem {currentUser.semester || 'N/A'}
                  </div>
                </div>
              </>
            )}

            {currentUser.role === 'teacher' && (
              <div className="detail-group">
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee ID <span style={{ color: 'var(--accent-red)', fontSize: '10px', marginLeft: '4px' }}>* Locked</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-muted)', fontWeight: '500', background: 'var(--surface-3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'not-allowed' }}>
                  <Briefcase size={16} style={{ color: 'var(--text-muted)' }} />
                  {currentUser.employeeId || 'N/A'}
                </div>
              </div>
            )}

            <div className="detail-group">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
              {isEditing ? (
                <input 
                  type="tel" 
                  value={editData.phone} 
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--accent-blue)', background: '#fff', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500', outline: 'none', boxShadow: '0 0 0 3px rgba(91, 140, 255, 0.1)' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                  <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                  {editData.phone}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
