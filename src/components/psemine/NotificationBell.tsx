import React, { useEffect, useId, useRef, useState } from 'react';
import { usePseState } from './PseStateProvider';

export const NotificationBell: React.FC<{ variant?: 'desktop' | 'mobile' }> = ({ variant = 'desktop' }) => {
  const { notifications, unreadNotifications, markNotificationRead, refresh, refreshing } = usePseState();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const mobile = variant === 'mobile';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={mobile
          ? (unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications')
          : (unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : 'Notifications')}
        aria-expanded={open}
        aria-controls={panelId}
      >
        Notifications{unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}
      </button>

      {open && (
        <section id={panelId} role="region" aria-label="Notifications">
          <header>
            <h2>Notifications</h2>
            {unreadNotifications > 0 && (
              <button
                type="button"
                onClick={() => {
                  notifications.forEach(n => { if (!n.read) void markNotificationRead(n.id); });
                }}
              >
                Mark all read
              </button>
            )}
          </header>

          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map(n => (
                <li key={n.id}>
                  <h3>{n.title}</h3>
                  {n.message && <p>{n.message}</p>}
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(n.id)}
                      aria-label={`Mark "${n.title}" read`}
                    >
                      Mark as read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <footer>
            <button
              type="button"
              onClick={() => { setOpen(false); void refresh(); }}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh notifications'}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
};

export default NotificationBell;
