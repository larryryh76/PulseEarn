import React, { useMemo, useState } from 'react';
import {
  Activity as ActivityIcon, History, RefreshCcw, Search, ArrowDownUp,
} from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  Stamp, StatementHeader, Verdict, Ledger, LedgerRow, DayGroup, Attn, PSEEmpty,
  PSELoading, PSEError, gbp, timeAgo, fmtDateTime, toDateSafe, ACTIVITY_ICONS,
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
 * Composition law (Duty & Ledger): VERDICT → RAILS → LEDGERS → NOTES.
 *
 *   VERDICT  the account's ledger state: what has been credited, and over how
 *            many records — on the canvas.
 *   LEDGER   ONE bordered container. Every recorded event from the backend, in
 *            day groups, each row a financial record with a fixed credit/debit
 *            column. A day boundary is a ruled header inside the ledger, never
 *            another container.
 *   NOTES    the filters and the degraded-feed exception.
 *
 * Every row is a backend record — nothing is generated to fill the page.
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
    return <div className="pse-gut pt-6"><PSELoading label="Loading your ledger" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-gut py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  const resetView = () => { setFilter('all'); setQuery(''); };
  const filteredView = filter !== 'all' || query.trim().length > 0;

  return (
    <div className="pse-gut pse-stack" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey="Activity · ledger"
        title="Account ledger"
        objective="Every recorded event for this PSEmine account — purchases, maintenance, referral qualifications and campaign milestones. Nothing here comes from PulseEarn."
        status={
          <Stamp tone={activities.length > 0 ? 'info' : 'idle'} glyph="▤">
            {activities.length} entr{activities.length === 1 ? 'y' : 'ies'} loaded
          </Stamp>
        }
        actions={
          <>
            <button
              onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))}
              className="pse-btn pse-btn-2 pse-btn-sm"
            >
              <ArrowDownUp size={13} /> {dir === 'desc' ? 'Newest first' : 'Oldest first'}
            </button>
            <button
              onClick={() => void refreshFeed('activities')}
              disabled={refreshing}
              className="pse-btn pse-btn-2 pse-btn-sm"
            >
              <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        }
      />

      {/* ══ VERDICT — the ledger state, on the canvas ══ */}
      <Verdict
        label="Credited to this account"
        value={gbp(totals.credited)}
        status={
          <Stamp tone={totals.credited > 0 ? 'live' : 'idle'} glyph="●">
            {totals.credited > 0 ? 'Accrual recorded' : 'No credit recorded'}
          </Stamp>
        }
        note={
          activities.length === 0
            ? 'No backend record exists for this account yet. Purchases, maintenance events, referral qualifications and campaign updates appear here as they happen.'
            : `Across ${activities.length} recorded backend entr${activities.length === 1 ? 'y' : 'ies'}. Amounts are exactly as the backend recorded them — nothing on this page is estimated in the browser.`
        }
        side={
          <div className="pse-stack-tight">
            <div className="pse-spec-line"><span>Debited from account</span><span>{gbp(totals.debited)}</span></div>
            <div className="pse-spec-line"><span>Entries loaded</span><span>{activities.length}</span></div>
            <div className="pse-spec-line">
              <span>Last recorded event</span>
              <span>{totals.newest ? timeAgo(totals.newest) : '—'}</span>
            </div>
            <div className="pse-spec-line">
              <span>Last event time</span>
              <span>{totals.newest ? fmtDateTime(totals.newest) : '—'}</span>
            </div>
          </div>
        }
      />

      {/* ══ NOTES — the query instruments, ruled not carded ══ */}
      <div className="pse-query">
        <div className="pse-seg" role="group" aria-label="Filter activity by type">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
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
        {filteredView && (
          <span className="pse-meta pse-n">{filtered.length} of {activities.length} shown</span>
        )}
      </div>

      {feedErrors.activities && (
        <Attn
          tone="attn"
          title="The activity feed is degraded"
          body="The recorded ledger could not be fully loaded — entries may be missing from this statement."
          action={
            <button
              onClick={() => void refreshFeed('activities')}
              disabled={refreshing}
              className="pse-btn pse-btn-2 pse-btn-sm"
            >
              <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Retry
            </button>
          }
        />
      )}

      {/* ══ LEDGER — the only bordered container on this page ══ */}
      <Ledger
        title="Recorded events"
        meta={filteredView
          ? `Filtered view · ${filtered.length} of ${activities.length} entries`
          : 'Day-grouped · newest first'}
        legend={['Event', 'Amount']}
      >
        {filtered.length === 0 ? (
          <PSEEmpty
            icon={activities.length === 0 ? History : ActivityIcon}
            title={activities.length === 0 ? 'No activity yet' : 'No events match this view'}
            body={activities.length === 0
              ? 'Purchases, maintenance events, referral qualifications and campaign updates appear here as they happen.'
              : 'Clear the search or choose a different filter to see other recorded events.'}
            action={activities.length > 0 ? (
              <button onClick={resetView} className="pse-btn pse-btn-2 pse-btn-sm">Reset view</button>
            ) : undefined}
          />
        ) : (
          groups.map(([key, rows]) => (
            <React.Fragment key={key}>
              <DayGroup label={dayLabel(key)} meta={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`} />
              {rows.map(a => {
                const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
                const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
                const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
                const amount = amountMinor !== null ? amountMinor / 100 : amountGBP;
                const hasAmount = amount !== null && amount !== 0;
                return (
                  <LedgerRow
                    key={a.id}
                    sign={hasAmount ? (amount > 0 ? 'credit' : 'debit') : undefined}
                    title={
                      <span className="flex items-baseline gap-2.5">
                        <Icon size={13} style={{ color: 'var(--pse-text-3)', flexShrink: 0 }} />
                        {a.title || 'Account event'}
                      </span>
                    }
                    sub={
                      <>
                        {a.description ? `${a.description} · ` : ''}
                        {fmtDateTime(a.createdAt)}
                        {a.type ? <span className="pse-dim-3"> · {a.type}</span> : null}
                      </>
                    }
                    value={hasAmount ? gbp(Math.abs(amount)) : undefined}
                    valueTone={hasAmount && amount > 0 ? 'var(--pse-success)' : undefined}
                  />
                );
              })}
            </React.Fragment>
          ))
        )}
      </Ledger>
    </div>
  );
};

export default PSEMineActivity;
