import React, { useMemo, useState } from 'react';
import {
  Activity as ActivityIcon, History, RefreshCcw, Search, ArrowDownUp,
} from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  WorkbenchHeader, AccentSurface, Surface, MetricRow, Rows, RowItem, Segmented, Toolbar,
  PSEEmpty, PSELoading, PSEError, FeedNotice, gbp, timeAgo, fmtDateTime, toDateSafe,
  ACTIVITY_ICONS, SectionHeading,
} from '../../components/psemine/pse';

type FilterId = 'all' | 'purchase' | 'maintenance' | 'referral' | 'wallet' | 'campaign';

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'referral', label: 'Referrals' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'campaign', label: 'Campaign' },
];

function matchesFilter(type: string, filter: FilterId): boolean {
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
  const k = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (key === k(today)) return 'Today';
  if (key === k(new Date(today.getTime() - 86_400_000))) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The account ledger.
 *
 * Composition (design system v2): a summary surface of REAL aggregates over the
 * loaded ledger, a ruled toolbar, then a day-grouped dense ledger. Every row is
 * a backend record — nothing is generated to fill the page.
 */
export const PSEMineActivity: React.FC = () => {
  const { activities, refresh, refreshing, error, loading, state, feedErrors, refreshFeed } = usePseState();
  const [filter, setFilter] = useState<FilterId>('all');
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
    const newest = activities.reduce<number>((acc, a) => {
      const t = toDateSafe(a.createdAt)?.getTime() || 0;
      return t > acc ? t : acc;
    }, 0);
    return { credited, debited, newest };
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

  const resetView = () => { setFilter('all'); setQuery(''); };

  return (
    <div className="pse-section pse-workbench pt-5 md:pt-7">
      <WorkbenchHeader
        title="Activity"
        purpose="Every recorded event for this PSEmine account — purchases, maintenance, referral qualifications and campaign milestones. Nothing here comes from PulseEarn."
        status={<span className="pse-micro">{activities.length} entr{activities.length === 1 ? 'y' : 'ies'} loaded</span>}
        actions={
          <>
            <button onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))} className="pse-btn pse-btn-secondary pse-btn-sm">
              <ArrowDownUp size={13} /> {dir === 'desc' ? 'Newest first' : 'Oldest first'}
            </button>
            <button onClick={() => void refreshFeed('activities')} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm">
              <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        }
      />

      {/* ══ Real aggregates over the loaded ledger ══ */}
      <AccentSurface>
        <MetricRow items={[
          { label: 'Entries loaded', value: String(activities.length), sub: 'Backend ledger records' },
          { label: 'Credited to account', value: gbp(totals.credited), tone: 'var(--pse-success)', sub: 'Sum of positive entries' },
          { label: 'Debited from account', value: gbp(totals.debited), sub: 'Sum of negative entries' },
          { label: 'Last recorded event', value: totals.newest ? timeAgo(totals.newest) : '—', sub: totals.newest ? fmtDateTime(totals.newest) : 'Nothing recorded yet' },
        ]} />
      </AccentSurface>

      {/* ══ Toolbar ══ */}
      <Toolbar>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Filter activity by type" />
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pse-input pl-10"
            placeholder="Search recorded events…"
            aria-label="Search activity"
          />
        </div>
      </Toolbar>

      {feedErrors.activities && (
        <FeedNotice
          message="The activity feed could not be fully loaded — entries may be missing."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}

      {/* ══ Ledger ══ */}
      {filtered.length === 0 ? (
        <Surface>
          <PSEEmpty
            icon={activities.length === 0 ? History : ActivityIcon}
            title={activities.length === 0 ? 'No activity yet' : 'No events match this view'}
            body={activities.length === 0
              ? 'Purchases, maintenance events, referral qualifications and campaign updates appear here as they happen.'
              : 'Clear the search or choose a different filter to see other recorded events.'}
            action={activities.length > 0 ? (
              <button onClick={resetView} className="pse-btn pse-btn-secondary pse-btn-sm">Reset view</button>
            ) : undefined}
          />
        </Surface>
      ) : (
        <div className="space-y-5">
          {groups.map(([key, rows]) => (
            <section key={key} className="space-y-2">
              <SectionHeading title={dayLabel(key)} meta={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`} />
              <Surface bodyClassName="pse-rows">
                <Rows>
                  {rows.map(a => {
                    const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
                    const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
                    const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
                    const amount = amountMinor !== null ? amountMinor / 100 : amountGBP;
                    return (
                      <RowItem key={a.id} className="items-start">
                        <div className="pse-rail relative w-8 shrink-0">
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
                      </RowItem>
                    );
                  })}
                </Rows>
              </Surface>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default PSEMineActivity;
