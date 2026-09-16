import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { usePseState } from './PseStateProvider';

/**
 * Shared notification reader over the canonical psemine_notifications feed
 * (PseState → /api/mine/notifications). One component, two entry points:
 * the desktop navbar bell and the mobile header button (FIX 2). No duplicate
 * state, no second API — both instances consume the same PseState context.
 *
 * variant:
 *  - "desktop": bell + anchored popover (existing, unchanged presentation)
 *  - "mobile": full-width header button + fixed sheet (44px touch target)
 */
export const NotificationBell: React.FC<{ variant?: 'desktop' | 'mobile' }> = ({ variant = 'desktop' }) => {
  const { notifications, unreadNotifications, markNotificationRead, refresh, refreshing } = usePseState();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
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

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className={
        mobile
          ? 'relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition-colors hover:bg-white/5'
          : 'relative rounded-lg p-2.5 transition-colors hover:bg-white/5'
      }
      aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
      aria-expanded={open}
    >
      <Bell size={mobile ? 18 : 15} style={{ color: 'var(--pse-text-2)' }} />
      {unreadNotifications > 0 && (
        <span
          className={
            mobile
              ? 'absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold'
              : 'absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold'
          }
          style={{ background: 'var(--pse-blue)', color: '#fff' }}
        >
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )}
    </button>
  );

  const panel = (
    <div
      className={
        mobile
          ? 'fixed inset-x-0 top-14 z-50 mx-2 mt-1 max-h-[75vh] overflow-y-auto rounded-2xl border shadow-2xl'
          : 'absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-2xl'
      }
      style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface, #12161d)' }}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="sticky top-0 flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface, #12161d)' }}>
        <p className="pse-caption font-semibold">Notifications</p>
        {unreadNotifications > 0 && (
          <button
            type="button"
            onClick={() => {
              notifications.forEach(n => { if (!n.read) void markNotificationRead(n.id); });
            }}
            className="pse-btn pse-btn-ghost pse-btn-sm"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>
      <div className={mobile ? 'pb-2' : 'max-h-80 overflow-y-auto'}>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell size={18} className="mx-auto" style={{ color: 'var(--pse-text-3)' }} />
            <p className="pse-micro mt-2">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
            {notifications.map(n => (
              <li key={n.id} className="px-4 py-3" style={{ background: n.read ? undefined : 'rgba(46,144,250,0.05)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pse-caption font-medium truncate" style={{ color: 'var(--pse-text)' }}>{n.title}</p>
                    {n.message && <p className="pse-micro mt-0.5 line-clamp-2">{n.message}</p>}
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(n.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg pse-btn pse-btn-ghost"
                      aria-label={`Mark "${n.title}" read`}
                    >
                      <CheckCheck size={12} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--pse-line)' }}>
        <button
          type="button"
          onClick={() => { setOpen(false); void refresh(); }}
          disabled={refreshing}
          className="pse-micro font-medium hover:underline"
          style={{ color: 'var(--pse-blue)' }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh notifications'}
        </button>
      </div>
    </div>
  );

  if (mobile) {
    // Mobile: trigger + sheet both live in the header row; outside-click on
    // the fixed-position sheet is handled by the same document listener.
    return (
      <div ref={wrapRef} className="relative">
        {trigger}
        {open && panel}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      {trigger}
      {open && panel}
    </div>
  );
};

export default NotificationBell;
