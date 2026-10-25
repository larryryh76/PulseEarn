import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { fmtDateTime, gbp, timeAgo, toDateSafe } from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseField, PseInput,
  PsePage, PseSection, PseSkeleton, PseSkeletonRows, PseStat, PseStatBar,
} from '../../components/psemine/PseBasics';

/**
 * The account ledger.
 *
 * Every row is a backend record: nothing is generated to fill the page, and the
 * credit/debit direction is taken from the recorded amount, never inferred. The
 * page is a chronological register with day groups, not a stack of oversized
 * cards — the reader is here to find one event and read its amount. It is
 * rendered as a responsive log rather than a wide table, so a phone never has to
 * scroll the page sideways to read a record.
 */
type FilterId = 'all' | 'purchase' | 'maintenance' | 'referral' | 'wallet' | 'campaign';

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All events' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'referral', label: 'Referrals' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'campaign', label: 'Campaign & settlement' },
];

function matchesFilter(type: string, filter: FilterId): boolean {
  if (filter === 'all') return true;
  const t = (type || '').toLowerCase();
  switch (filter) {
    case 'purchase': return t.includes('purchase') || t.includes('payment');
    case 'maintenance': return t.includes('maintenance') || t.includes('restart');
    case 'referral': return t.includes('referral');
    case 'wallet': return t.includes('wallet');
    case 'campaign': return t.includes('campaign') || t.includes('settlement') || t.includes('payout') || t.includes('accrual');
    default: return true;
  }
}

/** A backend event type, printed as words rather than as a constant. */
function typeLabel(type?: string): string {
  if (!type) return 'Event';
  return type
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
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

export const PSEMineActivity: React.FC = () => {
  const { activities, refresh, refreshing, error, loading, state, feedErrors, refreshFeed } = usePseState();
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities
      .filter(a => {
        if (!matchesFilter(a.type || '', filter)) return false;
        if (!q) return true;
        return `${a.title || ''} ${a.description || ''} ${a.type || ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ta = toDateSafe(a.createdAt)?.getTime() || 0;
        const tb = toDateSafe(b.createdAt)?.getTime() || 0;
        return dir === 'desc' ? tb - ta : ta - tb;
      });
  }, [activities, filter, query, dir]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const key = dayKey(a.createdAt);
      map.set(key, [...(map.get(key) || []), a]);
    }
    return [...map.entries()];
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

  /* The page keeps its head, its controls and its ledger shape while the records
     are read; only the rows are placeholders. A ledger is not a page-level wait. */
  if (loading && !state) {
    return (
      <PsePage
        title="Activity"
        objective="Recent backend-recorded PSEmine events, newest first, grouped by day with the recorded amount."
      >
        <PseStatBar cols={4}>
          {['Recorded events', 'Credited', 'Debited', 'Net recorded'].map(label => (
            <PseStat key={label} label={label} value={<PseSkeleton width="5ch" height="1.0625rem" />} />
          ))}
        </PseStatBar>
        <PseSection title="Records" meta="Reading the ledger">
          <PseSkeletonRows rows={6} label="Loading your activity ledger" />
        </PseSection>
      </PsePage>
    );
  }
  if (error && !state) {
    return (
      <PsePage title="Activity" objective="Every recorded PSEmine event on this account, newest first, grouped by day with its recorded amount.">
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </PsePage>
    );
  }

  const filteredView = filter !== 'all' || query.trim().length > 0;
  const net = totals.credited - totals.debited;

  return (
    <PsePage
      title="Activity"
      objective="Every recorded PSEmine event on this account, newest first, grouped by day with its recorded amount."
      actions={<PseButton variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <PseStatBar cols={4}>
        <PseStat label="Recorded events" value={`${activities.length}`} note={totals.newest ? `Newest ${timeAgo(totals.newest)}` : 'No records'} />
        <PseStat label="Credited" value={gbp(totals.credited)} note="Positive amounts in the loaded feed" />
        <PseStat label="Debited" value={gbp(totals.debited)} note="Negative amounts in the loaded feed" />
        <PseStat label="Net recorded" value={`${net < 0 ? '−' : ''}${gbp(Math.abs(net))}`} note="Net of amounts currently loaded" />
      </PseStatBar>

      {feedErrors.activities && (
        <PseFeedNotice
          message="The activity feed could not be read."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}

      <PseSection
        title="Records"
        meta={filteredView ? `${filtered.length} of ${activities.length} entries` : `${activities.length} entries`}
      >
        <div className="pse-toolbar">
          <PseField label="Category" htmlFor="pse-activity-filter">
            <select
              id="pse-activity-filter"
              value={filter}
              onChange={e => setFilter(e.target.value as FilterId)}
              className="pse-input pse-input--select"
            >
              {FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </PseField>
          <PseField label="Search" htmlFor="pse-activity-search">
            <PseInput
              id="pse-activity-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Title, description or type"
            />
          </PseField>
          <PseButton
            variant="secondary"
            size="sm"
            onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))}
            aria-label={`Sort ${dir === 'desc' ? 'oldest first' : 'newest first'}`}
          >
            {dir === 'desc' ? 'Newest first' : 'Oldest first'}
          </PseButton>
          {filteredView && (
            <PseButton variant="secondary" size="sm" onClick={() => { setFilter('all'); setQuery(''); }}>
              Clear
            </PseButton>
          )}
        </div>

        {filtered.length === 0 ? (
          activities.length === 0 ? (
            <PseEmptyNote
              title="No events recorded yet"
              action={<Link to="/mine/tools" className="pse-btn pse-btn--secondary pse-btn--sm">Open the tool catalogue</Link>}
            >
              Purchases, maintenance and restarts, referral qualifications and campaign milestones
              appear here as the backend records them. Every entry is a recorded event on this
              account, so an empty ledger is a true statement about it.
            </PseEmptyNote>
          ) : (
            <PseEmptyNote title="No records match this view">
              The ledger holds {activities.length} recorded event{activities.length === 1 ? '' : 's'}, and none of
              them match the current category and search.
            </PseEmptyNote>
          )
        ) : (
          groups.map(([key, rows]) => (
            <section key={key} className="pse-activity-day" aria-label={dayLabel(key)}>
              <h2 className="pse-ledger-day">{dayLabel(key)}</h2>
              <ul className="pse-log">
                {rows.map(a => {
                  const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
                  const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
                  const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
                  return (
                    <li key={a.id} className="pse-log-row">
                      <span className="pse-log-when">{fmtDateTime(a.createdAt)}</span>
                      <span className="pse-log-body">
                        <span className="pse-log-title">{a.title || 'Account event'}</span>
                        {a.description && <span className="pse-log-note">{a.description}</span>}
                        <span className="pse-log-meta">{typeLabel(a.type)}</span>
                      </span>
                      <span
                        className={
                          'pse-log-amount'
                          + (displayAmount !== null && displayAmount > 0 ? ' is-credit' : '')
                          + (displayAmount !== null && displayAmount < 0 ? ' is-debit' : '')
                        }
                      >
                        {displayAmount !== null && displayAmount !== 0
                          ? `${displayAmount > 0 ? '+' : '−'}${gbp(Math.abs(displayAmount))}`
                          : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </PseSection>

      <p className="pse-prose--sm">
        Rows are backend records with their recorded sign: a credit is money accrued or returned to
        the account, a debit is money spent (a tool purchase) or paid out. The totals summarize only
        the records currently returned by the activity feed; they are not a lifetime balance or a
        substitute for the canonical wallet figures. Undated records remain undated rather than
        being given an invented time.
      </p>
    </PsePage>
  );
};

export default PSEMineActivity;
