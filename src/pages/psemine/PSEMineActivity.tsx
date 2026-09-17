import React, { useMemo, useState } from 'react';
import {
  Activity as ActivityIcon, History, RefreshCcw, Filter, ArrowDownUp, Search,
} from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  PageHeader, Panel, PSEEmpty, PSELoading, PSEError, FeedNotice, gbp, timeAgo,
  fmtDateTime, toDateSafe, ACTIVITY_ICONS, SectionHeading,
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

function dayKey(createdAt: unknown): string {
  const d = toDateSafe(createdAt);
  if (!d) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string): string {
  if (key === 'unknown') return 'Undated records';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (key === todayKey) return 'Today';
  if (key === yKey) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export const PSEMineActivity: React.FC = () => {
  const { activities, refresh, refreshing, error, loading, state, feedErrors, refreshFeed } = usePseState();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = activities.filter(a => {
      if (!matchesFilter(a.type || '', filter)) return false;
      if (!q) return true;
      return `${a.title || ''} ${a.description || ''} ${a.type || ''}`.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const ta = toDateSafe(a.createdAt)?.getTime() || 0;
      const tb = toDateSafe(b.createdAt)?.getTime() || 0;
      return dir === 'desc' ? tb - ta : ta - tb;
    });
  }, [activities, filter, query, dir]);

  /** Date-grouped ledger — the shape a financial timeline should have. */
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const key = dayKey(a.createdAt);
      const existing = map.get(key);
      if (existing) existing.push(a);
      else map.set(key, [a]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totals = useMemo(() => {
    let credited = 0;
    let debited = 0;
    for (const a of activities) {
      const minor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
      const gbpVal = typeof a.amountGBP === 'number' ? a.amountGBP : null;
      const v = minor !== null ? minor / 100 : gbpVal;
      if (v === null) continue;
      if (v > 0) credited += v; else debited += Math.abs(v);
    }
    return { credited, debited };
  }, [activities]);

  if (loading && !state) {
    return <div className="pse-section pt-6 md:pt-8"><PSELoading skeleton label="Loading your ledger" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-section py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-section space-y-4 pb-24 pt-5 md:pt-7">
      <PageHeader
        eyebrow="Activity"
        title="Account ledger"
        sub="Every recorded event for this PSEmine account — purchases, maintenance, referral qualifications and campaign milestones. Nothing here comes from PulseEarn."
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))} className="pse-btn pse-btn-secondary pse-btn-sm">
              <ArrowDownUp size={13} /> {dir === 'desc' ? 'Newest first' : 'Oldest first'}
            </button>
            <button onClick={() => void refreshFeed('activities')} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm">
              <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        }
      />

      {/* Summary strip — real aggregates of the loaded ledger */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="pse-card p-4">
          <p className="pse-eyebrow">Entries loaded</p>
          <p className="pse-num mt-1.5 text-[22px] font-semibold">{activities.length}</p>
        </div>
        <div className="pse-card p-4">
          <p className="pse-eyebrow">Credited to account</p>
          <p className="pse-num mt-1.5 text-[22px] font-semibold" style={{ color: 'var(--pse-success)' }}>{gbp(totals.credited)}</p>
        </div>
        <div className="pse-card col-span-2 p-4 sm:col-span-1">
          <p className="pse-eyebrow">Last recorded event</p>
          <p className="pse-caption mt-1.5 font-semibold" style={{ color: 'var(--pse-text)' }}>
            {activities.length > 0 ? timeAgo(activities[0]?.createdAt) : '—'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pse-micro flex items-center gap-1.5"><Filter size={12} /> Filter</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter activity by type">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn('pse-btn pse-btn-sm', filter === f.id ? 'pse-btn-primary' : 'pse-btn-secondary')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pse-input pl-10"
            placeholder="Search recorded events…"
            aria-label="Search activity"
          />
        </div>
      </div>

      {feedErrors.activities && (
        <FeedNotice
          message="The activity feed could not be fully loaded — entries may be missing."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Panel>
          <PSEEmpty
            icon={activities.length === 0 ? History : ActivityIcon}
            title={activities.length === 0 ? 'No activity yet' : 'No events match this view'}
            body={activities.length === 0
              ? 'Purchases, maintenance events, referral qualifications and campaign updates appear here as they happen.'
              : 'Clear the search or choose a different filter to see other recorded events.'}
            action={activities.length > 0 ? (
              <button onClick={() => { setFilter('all'); setQuery(''); }} className="pse-btn pse-btn-secondary pse-btn-sm">
                Reset view
              </button>
            ) : undefined}
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          {groups.map(([key, rows]) => (
            <section key={key} className="space-y-2">
              <SectionHeading
                title={dayLabel(key)}
                meta={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`}
              />
              <Panel bodyClassName="divide-y">
                {rows.map(a => {
                  const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
                  const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
                  const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
                  const amount = amountMinor !== null ? amountMinor / 100 : amountGBP;
                  return (
                    <div key={a.id} className="flex items-start gap-3.5 px-5 py-4">
                      <div className="pse-rail relative w-9 shrink-0">
                        <span className="pse-rail-node" aria-hidden="true">
                          <Icon size={11} style={{ color: 'var(--pse-text-2)' }} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="pse-caption font-medium" style={{ color: 'var(--pse-text)' }}>
                            {a.title || 'Account event'}
                          </p>
                          {amount !== null && amount !== 0 && (
                            <p className="pse-num pse-caption font-semibold" style={{ color: amount > 0 ? 'var(--pse-success)' : 'var(--pse-text)' }}>
                              {amount > 0 ? '+' : ''}{gbp(amount)}
                            </p>
                          )}
                        </div>
                        {a.description && <p className="pse-micro mt-1">{a.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="pse-micro">{fmtDateTime(a.createdAt)}</span>
                          {a.type && <span className="pse-micro" style={{ color: 'var(--pse-text-3)' }}>{a.type}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Panel>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default PSEMineActivity;
