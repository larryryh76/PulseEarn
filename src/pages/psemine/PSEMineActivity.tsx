import React, { useMemo, useState } from 'react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { fmtDateTime, gbp, timeAgo, toDateSafe } from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseField, PseInput,
  PseLoading, PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';

/**
 * The account ledger — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger statement was purged in
 * `refactor(psemine): purge legacy design implementation`. Every row is still a
 * backend record: nothing is generated to fill the page, and the credit/debit
 * direction is taken from the recorded amount, never inferred.
 */
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

  if (loading && !state) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Loading your ledger" />
      </div>
    );
  }
  if (error && !state) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  const filteredView = filter !== 'all' || query.trim().length > 0;

  return (
    <PsePage
      title="Activity"
      objective="Every recorded PSEmine event on this account, in day groups, with its credit or debit column."
      actions={<PseButton onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <PseSection title="Account ledger state">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[
            ['Credited', gbp(totals.credited)],
            ['Debited', gbp(totals.debited)],
            ['Records', `${activities.length}`],
            ['Newest record', totals.newest ? timeAgo(totals.newest) : '—'],
            ['Newest record (exact)', totals.newest ? fmtDateTime(totals.newest) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      </PseSection>

      {feedErrors.activities && (
        <PseFeedNotice
          message="The activity feed could not be refreshed."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}

      <PseSection
        title="Records"
        meta={filteredView ? `Filtered view · ${filtered.length} of ${activities.length} entries` : `${activities.length} entries`}
      >
        <div className="flex flex-wrap items-end gap-3">
          <PseField label="Filter" htmlFor="pse-activity-filter">
            <select
              id="pse-activity-filter"
              value={filter}
              onChange={e => setFilter(e.target.value as FilterId)}
              className="min-h-[36px] rounded border border-border-bright px-2 py-1.5 text-sm text-text-primary"
            >
              {FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </PseField>
          <div className="min-w-[200px] flex-1">
            <PseField label="Search" htmlFor="pse-activity-search">
              <PseInput
                id="pse-activity-search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="title, description or type"
              />
            </PseField>
          </div>
          <PseButton onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))}>
            {dir === 'desc' ? 'Newest first' : 'Oldest first'}
          </PseButton>
          {filteredView && (
            <PseButton onClick={() => { setFilter('all'); setQuery(''); }}>Clear</PseButton>
          )}
        </div>

        {filtered.length === 0 ? (
          <PseEmptyNote>
            {activities.length === 0
              ? 'No records yet. Purchases, maintenance, referral qualifications and campaign milestones appear here as the backend records them.'
              : 'No records match this filter.'}
          </PseEmptyNote>
        ) : (
          groups.map(([key, rows]) => (
            <div key={key} className="space-y-1">
              <h3 className="pt-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">{dayLabel(key)}</h3>
              <PseTable head={['Record', 'Type', 'When', 'Amount']}>
                {rows.map(a => {
                  const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
                  const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
                  const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
                  return (
                    <PseRow key={a.id}>
                      <PseCell>
                        {a.title || 'Account event'}
                        {a.description ? <span className="block text-xs text-text-tertiary">{a.description}</span> : null}
                      </PseCell>
                      <PseCell>{a.type || '—'}</PseCell>
                      <PseCell>{fmtDateTime(a.createdAt)}</PseCell>
                      <PseCell>
                        {displayAmount !== null && displayAmount !== 0
                          ? `${displayAmount > 0 ? '+' : '−'}${gbp(Math.abs(displayAmount))}`
                          : '—'}
                      </PseCell>
                    </PseRow>
                  );
                })}
              </PseTable>
            </div>
          ))
        )}
      </PseSection>

      <PseSection title="About this ledger">
        <p className="text-sm text-text-secondary">
          Rows are backend records with their recorded sign: a credit is money accrued or returned to the account, a
          debit is money spent (a tool purchase) or paid out. Undated records are shown honestly as undated rather than
          being given an invented time.
        </p>
      </PseSection>
    </PsePage>
  );
};

export default PSEMineActivity;
