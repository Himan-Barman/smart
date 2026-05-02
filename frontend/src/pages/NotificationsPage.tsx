import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, MessageSquare, Building2 } from 'lucide-react';
import { api } from '../api';

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  date: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
};

const iconByType: Record<NotificationItem['type'], React.ReactNode> = {
  info: <Bell size={18} />,
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <Building2 size={18} />,
};

const getDateGroup = (date: string): 'Today' | 'Yesterday' | 'Earlier this week' | 'Older' => {
  const now = new Date();
  const value = new Date(`${date}T00:00:00`);
  const diffDays = Math.floor((now.getTime() - value.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Earlier this week';
  return 'Older';
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const list = await api.notifications.list();
      setNotifications(list);
    };

    void load();
  }, []);

  const markAllAsRead = async () => {
    await api.notifications.markAllRead();
    setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })));
  };

  const markAsRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, unread: false } : notification)));
  };

  const groupedNotifications = useMemo(() => {
    return notifications.reduce((acc, notification) => {
      const key = getDateGroup(notification.date);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(notification);
      return acc;
    }, {} as Record<string, NotificationItem[]>);
  }, [notifications]);

  const dateOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older'];

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="page__title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={24} className="text-accent-blue" /> Notifications
          </h2>
        </div>
        <button
          onClick={() => void markAllAsRead()}
          className="btn btn--ghost"
          style={{ color: 'var(--accent-blue)', fontWeight: '600' }}
        >
          Mark all as read
        </button>
      </div>

      <div className="notifications-list" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
        {dateOrder.map((dateGroup) => {
          const groupNotifs = groupedNotifications[dateGroup];
          if (!groupNotifs || groupNotifs.length === 0) return null;

          return (
            <div key={dateGroup} className="notification-group">
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', padding: '16px 20px 8px', margin: 0, background: 'var(--surface-1)' }}>
                {dateGroup}
              </h3>

              {groupNotifs.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item-full ${notification.unread ? 'unread' : ''}`}
                  onClick={() => void markAsRead(notification.id)}
                  style={{
                    display: 'flex', gap: '16px', padding: '16px 20px',
                    borderBottom: '1px solid var(--glass-border)', cursor: 'pointer',
                    background: notification.unread ? 'rgba(59,108,245,0.04)' : 'transparent',
                    transition: 'background 0.2s', position: 'relative',
                  }}
                >
                  <div className="notif-icon" style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: notification.unread ? 'var(--accent-blue)' : 'var(--surface-3)',
                    color: notification.unread ? 'white' : 'var(--accent-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {iconByType[notification.type]}
                  </div>

                  <div className="notif-content" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: notification.unread ? '700' : '600', color: 'var(--text-primary)', margin: 0 }}>
                        {notification.title}
                      </h4>
                      {notification.unread && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} />}
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.4 }}>
                      {notification.desc}
                    </p>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: notification.unread ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                      {notification.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={32} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
            <p>You have no notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
