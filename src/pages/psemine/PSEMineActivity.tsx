import React, { useMemo, useState } from 'react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  PSELoading, PSEError, gbp, timeAgo, fmtDateTime, toDateSafe,
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

/** Every row is a backend record; no activity is generated in the browser. */
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
    return <main><PSELoading label="Loading your ledger" /></main>;
  }
  if (error && !state) {
    return (
      <main>
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </main>
    );
  }

  const resetView = () => { setFilter('all'); setQuery(''); };
  const filteredView = filter !== 'all' || query.trim().length > 0;

  return (
    <main>
      <header>
        <p>Activity · ledger</p>
        <h1>Account ledger</h1>
        <p>Every recorded event for this PSEmine account — purchases, maintenance, referral qualifications and campaign milestones. Nothing here comes from PulseEarn.</p>
        <p role="status">{activities.length} entr{activities.length === 1 ? 'y' : 'ies'} loaded</p>
        <div>
          <button
            type="button"
            onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))}
          >
            {dir === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
          <button
            type="button"
            onClick={() => void refreshFeed('activities')}
            disabled={refreshing}
          >
            Refresh
          </button>
        </div>
      </header>

      <section aria-labelledby="activity-credit-heading">
        <h2 id="activity-credit-heading">Credited to this account</h2>
        <p>{gbp(totals.credited)}</p>
        <p role="status">{totals.credited > 0 ? 'Accrual recorded' : 'No credit recorded'}</p>
        <p>
          {activities.length === 0
            ? 'No backend record exists for this account yet. Purchases, maintenance events, referral qualifications and campaign updates appear here as they happen.'
            : `Across ${activities.length} recorded backend entr${activities.length === 1 ? 'y' : 'ies'}. Amounts are exactly as the backend recorded them — nothing on this page is estimated in the browser.`}
        </p>
        <dl>
          <div><dt>Debited from account</dt><dd>{gbp(totals.debited)}</dd></div>
          <div><dt>Entries loaded</dt><dd>{activities.length}</dd></div>
          <div><dt>Last recorded event</dt><dd>{totals.newest ? timeAgo(totals.newest) : '—'}</dd></div>
          <div><dt>Last event time</dt><dd>{totals.newest ? fmtDateTime(totals.newest) : '—'}</dd></div>
        </dl>
      </section>

      <section aria-label="Activity filters and search">
        <div role="group" aria-label="Filter activity by type">
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
        <label>
          Search recorded events
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search recorded events…"
          />
        </label>
        {filteredView && <p>{filtered.length} of {activities.length} shown</p>}
      </section>

      {feedErrors.activities && (
        <aside aria-label="Activity feed notice" role="status">
          <h2>The activity feed is degraded</h2>
          <p>The recorded ledger could not be fully loaded — entries may be missing from this statement.</p>
          <button
            type="button"
            onClick={() => void refreshFeed('activities')}
            disabled={refreshing}
          >
            Retry
          </button>
        </aside>
      )}

      <section aria-labelledby="recorded-events-heading">
        <h2 id="recorded-events-heading">Recorded events</h2>
        <p>{filteredView
          ? `Filtered view · ${filtered.length} of ${activities.length} entries`
          : 'Day-grouped · newest first'}</p>
        {filtered.length === 0 ? (
          <>
            <p>{activities.length === 0 ? 'No activity yet' : 'No events match this view'}</p>
            <p>{activities.length === 0
              ? 'Purchases, maintenance events, referral qualifications and campaign updates appear here as they happen.'
              : 'Clear the search or choose a different filter to see other recorded events.'}</p>
            {activities.length > 0 && <button type="button" onClick={resetView}>Reset view</button>}
          </>
        ) : (
          groups.map(([key, rows]) => (
            <section key={key} aria-label={dayLabel(key)}>
              <h3>{dayLabel(key)} — {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</h3>
              <ul>
                {rows.map(a => {
                  const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
                  const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
                  const amount = amountMinor !== null ? amountMinor / 100 : amountGBP;
                  const hasAmount = amount !== null && amount !== 0;
                  return (
                    <li key={a.id}>
                      <h4>{a.title || 'Account event'}</h4>
                      <p>
                        {a.description ? `${a.description} · ` : ''}
                        {fmtDateTime(a.createdAt)}
                        {a.type ? ` · ${a.type}` : null}
                      </p>
                      {hasAmount && <p>{amount > 0 ? 'Credit' : 'Debit'}: {gbp(Math.abs(amount))}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </section>
    </main>
  );
};

export default PSEMineActivity;
