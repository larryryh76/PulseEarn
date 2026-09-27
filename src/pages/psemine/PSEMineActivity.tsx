import { useMemo, useState } from 'react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { PSEError, PSELoading, gbp, fmtDateTime, toDateSafe } from '../../components/psemine/pse';
import type { PseActivity } from '../../engines/psemine/pseMineApi';

type FilterId = 'all' | 'purchase' | 'maintenance' | 'referral' | 'wallet' | 'campaign';
const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All events' }, { id: 'purchase', label: 'Purchases' },
  { id: 'maintenance', label: 'Maintenance' }, { id: 'referral', label: 'Referrals' },
  { id: 'wallet', label: 'Wallet' }, { id: 'campaign', label: 'Campaign & payout' },
];

/** Matches an activity type to a filter using case-insensitive event-name fragments. */
function matchesFilter(type: string, filter: FilterId): boolean {
  if (filter === 'all') return true;
  const value = type.toLowerCase();
  if (filter === 'purchase') return value.includes('purchase') || value.includes('payment');
  if (filter === 'maintenance') return value.includes('maintenance');
  if (filter === 'referral') return value.includes('referral');
  if (filter === 'wallet') return value.includes('wallet');
  return value.includes('campaign') || value.includes('settlement') || value.includes('payout') || value.includes('accrual');
}

/** Returns the event metadata status when it is a string, otherwise null. */
function eventStatus(activity: PseActivity): string | null {
  const status = activity.metadata?.status;
  return typeof status === 'string' ? status : null;
}
/** Returns the first non-nullish reference field when it is a string, otherwise null. */
function eventReference(activity: PseActivity): string | null {
  const reference = activity.metadata?.referenceId ?? activity.metadata?.purchaseId ?? activity.metadata?.referralId ?? activity.metadata?.payoutId;
  return typeof reference === 'string' ? reference : null;
}
/** Groups an activity by its local calendar date, using an undated key for invalid or missing timestamps. */
function dayKey(activity: PseActivity) {
  const date = toDateSafe(activity.createdAt);
  return date ? date.toLocaleDateString('en-CA') : 'undated';
}
/** Formats a year-month-day group key as a local date heading, with a label for undated records. */
function dayLabel(key: string) {
  if (key === 'undated') return 'Undated records';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Displays backend activity records with search, type and status filters, date sorting, and daily groups. */
export const PSEMineActivity: React.FC = () => {
  const { activities, refresh, refreshing, error, loading, state, feedErrors, refreshFeed } = usePseState();
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [direction, setDirection] = useState<'desc' | 'asc'>('desc');

  const statuses = useMemo(() => [...new Set(activities.map(eventStatus).filter((status): status is string => Boolean(status)))].sort(), [activities]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = activities.filter(activity => {
      const reference = eventReference(activity) || '';
      const matchesSearch = !term || `${activity.title || ''} ${activity.description || ''} ${activity.type || ''} ${reference} ${eventStatus(activity) || ''}`.toLowerCase().includes(term);
      return matchesFilter(activity.type || '', filter) && (statusFilter === 'all' || eventStatus(activity) === statusFilter) && matchesSearch;
    });
    return [...rows].sort((a, b) => {
      const aTime = toDateSafe(a.createdAt)?.getTime() || 0;
      const bTime = toDateSafe(b.createdAt)?.getTime() || 0;
      return direction === 'desc' ? bTime - aTime : aTime - bTime;
    });
  }, [activities, filter, query, statusFilter, direction]);

  const groups = useMemo(() => {
    const map = new Map<string, PseActivity[]>();
    for (const activity of filtered) {
      const key = dayKey(activity);
      map.set(key, [...(map.get(key) || []), activity]);
    }
    return [...map.entries()];
  }, [filtered]);

  if (loading && !state) return <main className="pm-page"><PSELoading label="Loading account ledger" /></main>;
  if (error && !state) return <main className="pm-page"><PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} /></main>;

  return (
    <main className="pm-page">
      <header>
        <p className="pm-eyebrow">Activity · financial ledger</p>
        <h1>Recorded events</h1>
        <p>Backend records only. Events are grouped by date; amounts and references appear only when supplied by the record.</p>
        <div className="pm-inline-actions"><span>{activities.length} records loaded</span><button type="button" onClick={() => setDirection(value => value === 'desc' ? 'asc' : 'desc')}>{direction === 'desc' ? 'Newest first' : 'Oldest first'}</button><button type="button" onClick={() => void refreshFeed('activities')} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh ledger'}</button></div>
      </header>

      <section aria-label="Activity search and filters">
        <div className="pm-inline-actions" role="group" aria-label="Filter event type">
          {FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
        <div className="pm-ledger-filters">
          <label>Search records<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Event, reference or status" /></label>
          <label>Status
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">All reported statuses</option>{statuses.map(status => <option value={status} key={status}>{status}</option>)}
            </select>
          </label>
        </div>
        <p className="pm-micro">Showing {filtered.length} of {activities.length} records.</p>
      </section>

      {feedErrors.activities && <div role="alert" className="pm-note"><p>The activity feed may be incomplete because the backend could not return all records.</p><button type="button" onClick={() => void refreshFeed('activities')} disabled={refreshing}>Retry activity feed</button></div>}

      <section aria-labelledby="activity-records-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Account history</p><h2 id="activity-records-heading">Ledger entries</h2></div></div>
        {filtered.length === 0 ? (
          <div className="pm-empty"><h3>{activities.length === 0 ? 'No activity recorded' : 'No matching records'}</h3><p>{activities.length === 0 ? 'Purchases, maintenance events, referral qualifications and campaign milestones appear here when recorded by the backend.' : 'Adjust the event type, status or search to view other records.'}</p>{activities.length > 0 && <button type="button" onClick={() => { setFilter('all'); setStatusFilter('all'); setQuery(''); }}>Clear filters</button>}</div>
        ) : groups.map(([key, rows]) => (
          <section className="pm-activity-group" key={key} aria-label={dayLabel(key)}>
            <h3>{dayLabel(key)}</h3>
            <div className="pm-activity-row pm-activity-head" aria-hidden="true"><span>Timestamp</span><span>Event · type</span><span>Amount</span><span>Reference</span><span>Status</span></div>
            {rows.map(activity => {
              const amount = typeof activity.amountMinor === 'number' ? activity.amountMinor / 100 : activity.amountGBP;
              const reference = eventReference(activity);
              const status = eventStatus(activity);
              return (
                <details className="pm-activity-entry" key={activity.id}>
                  <summary className="pm-activity-row">
                    <span>{fmtDateTime(activity.createdAt)}</span>
                    <span><strong>{activity.title || 'Account event'}</strong><small>{activity.type || 'Type unavailable'}</small></span>
                    <span className="pm-amount">{amount == null ? '—' : gbp(amount)}</span>
                    <span className="pm-mono">{reference || '—'}</span>
                    <span>{status || 'Recorded'}</span>
                  </summary>
                  {(activity.description || activity.metadata) && <div className="pm-activity-detail">
                    {activity.description && <p>{activity.description}</p>}
                    <p>Reference: <span className="pm-mono">{reference || 'Not supplied'}</span></p>
                    <p>Status: {status || 'Not supplied by the event record'}</p>
                    {activity.metadata && <details><summary>Technical details</summary><dl>{Object.entries(activity.metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'string' ? value : JSON.stringify(value)}</dd></div>)}</dl></details>}
                  </div>}
                </details>
              );
            })}
          </section>
        ))}
      </section>
    </main>
  );
};

export default PSEMineActivity;
