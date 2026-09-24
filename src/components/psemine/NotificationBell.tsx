import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { usePseState } from './PseStateProvider';

/**
 * Shared notification reader over the canonical psemine_notifications feed
 * (PseState → /api/mine/notifications). One component, two entry points:
 * the desktop navbar bell and the mobile header button (FIX 2). No duplicate
 * state, no second API — both instances consume the same PseState context.
 *
 * Duty & Ledger: the feed is a ledger — ruled rows, unread marked by a sunken
 * ground, states keyed in mono caps. The unread count is a solid key, not a
 * decorative pill.
 *
 * variant:
 *  - "desktop": bell + anchored sheet (existing behaviour)
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
      className={mobile
        ? 'relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5'
        : 'relative flex items-center justify-center rounded-md p-2.5'}
      aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
      aria-expanded={open}
    >
      <Bell size={mobile ? 18 : 15} style={{ color: 'var(--pse-text-2)' }} />
      {unreadNotifications > 0 && (
        <span
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm px-1 pse-n"
          style={{ background: 'var(--pse-jade)', color: '#0b0b0c', fontSize: 9, fontWeight: 700 }}
        >
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )}
    </button>
  );

  const panel = (
    <div
      className={mobile
        ? 'fixed inset-x-0 top-14 z-50 mx-2 mt-1 max-h-[75vh] overflow-y-auto'
        : 'absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden'}
      style={{
        border: '1px solid var(--pse-line-2)',
        background: 'var(--pse-plane)',
        borderRadius: 'var(--pse-r-2)',
        boxShadow: 'var(--pse-shadow-sheet)',
      }}
      role="dialog"
      aria-label="Notifications"
    >
      <div
        className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--pse-line)', background: 'var(--pse-plane)' }}
      >
        <p className="pse-np pse-np-bone">Notifications</p>
        {unreadNotifications > 0 && (
          <button
            type="button"
            onClick={() => {
              notifications.forEach(n => { if (!n.read) void markNotificationRead(n.id); });
            }}
            className="pse-btn pse-btn-3 pse-btn-sm"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      <div className={mobile ? 'pb-2' : 'max-h-80 overflow-y-auto'}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Bell size={18} style={{ color: 'var(--pse-text-4)' }} />
            <p className="pse-meta">No notifications yet.</p>
          </div>
        ) : (
          <ul>
            {notifications.map(n => (
              <li
                key={n.id}
                className="px-4 py-3"
                style={{
                  background: n.read ? undefined : 'var(--pse-sunken)',
                  borderTop: '1px solid var(--pse-line)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pse-label-b truncate">{n.title}</p>
                    {n.message && <p className="pse-meta line-clamp-2" style={{ marginTop: 3 }}>{n.message}</p>}
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(n.id)}
                      className="pse-btn pse-btn-3 pse-btn-sm shrink-0"
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

      <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--pse-line)' }}>
        <button
          type="button"
          onClick={() => { setOpen(false); void refresh(); }}
          disabled={refreshing}
          className="pse-meta pse-link"
        >
          {refreshing ? 'Refreshing…' : 'Refresh notifications'}
        </button>
      </div>
    </div>
  );

  // Both variants share the same trigger/panel pair; only the panel's anchoring
  // differs (anchored menu on desktop, fixed sheet on mobile).
  return (
    <div ref={wrapRef} className="relative">
      {trigger}
      {open && panel}
    </div>
  );
};

export default NotificationBell;
