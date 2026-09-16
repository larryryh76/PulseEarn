import React, { useMemo, useState } from 'react';
import { Activity as ActivityIcon, History, RefreshCcw } from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  PageHeader, PSEEmpty, gbp, timeAgo, ACTIVITY_ICONS,
} from '../../components/psemine/pse';
import { cn } from '../../utils';

const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'referral', label: 'Referrals' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'campaign', label: 'Campaign' },
];

function matchesFilter(type: string, filter: string): boolean {
  if (filter === 'all') return true;
  const t = (type || '').toLowerCase();
  switch (filter) {
    case 'purchase': return t.includes('purchase') || t.includes('payment');
    case 'maintenance': return t.includes('maintenance');
    case 'referral': return t.includes('referral');
    case 'wallet': return t.includes('wallet');
    case 'campaign': return t.includes('campaign') || t.includes('settlement') || t.includes('payout') || t.includes('accrual');
    default: return true;
  }
}

export const PSEMineActivity: React.FC = () => {
  const { activities, refresh, refreshing, error } = usePseState();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => activities.filter(a => matchesFilter(a.type || '', filter)),
    [activities, filter],
  );

  return (
    <div className="pse-section space-y-4 pb-24 pt-6 md:pt-8">
      <PageHeader
        eyebrow="Activity"
        title="Account ledger"
        sub="Every recorded event for your account — purchases, maintenance, qualifications, and campaign milestones."
      />

      {error && (
        <div className="pse-card flex items-center justify-between gap-3 p-4" style={{ borderColor: 'rgba(240,68,56,0.3)' }}>
          <p className="pse-caption">{error}</p>
          <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm shrink-0">
            <RefreshCcw size={12} className={refreshing ? 'animate-spin' : ''} /> Retry
          </button>
        </div>
      )}

      {/* FIX 9: these are filter toggles, not tab panels — use buttons with
          aria-pressed. Filtering logic itself is unchanged. */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filter activity by type">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn('pse-btn pse-btn-sm shrink-0', filter === f.id ? 'pse-btn-primary' : 'pse-btn-secondary')}
            style={{ minHeight: 44 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ledger */}
      <section className="pse-card overflow-hidden">
        {filtered.length === 0 ? (
          <PSEEmpty
            icon={activities.length === 0 ? History : ActivityIcon}
            title={activities.length === 0 ? 'No activity yet' : 'Nothing in this category'}
            body={activities.length === 0
              ? 'Purchases, maintenance events, referral qualifications, and campaign updates will appear here as they happen.'
              : 'Try a different filter to see other recorded events.'}
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
            {filtered.map(a => {
              const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
              const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
              const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
              const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
              return (
                <li key={a.id} className="flex items-center gap-3.5 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                    <Icon size={15} style={{ color: 'var(--pse-text-2)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="pse-caption font-medium" style={{ color: 'var(--pse-text)' }}>{a.title}</p>
                    {a.description && <p className="pse-micro mt-0.5 line-clamp-2">{a.description}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    {displayAmount !== null && displayAmount !== 0 && (
                      <p className="pse-num pse-caption font-semibold" style={{ color: displayAmount > 0 ? 'var(--pse-success)' : 'var(--pse-text)' }}>
                        {displayAmount > 0 ? '+' : ''}{gbp(displayAmount)}
                      </p>
                    )}
                    <p className="pse-micro">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PSEMineActivity;
