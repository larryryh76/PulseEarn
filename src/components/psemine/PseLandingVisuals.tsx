import React from 'react';
import {
  LOCKED_PSEMINE_TOOLS,
  PSEMINE_CONSTANTS,
  type PSEMineCampaign,
  type PSEToolTierId,
} from '../../types/psemine';
import { gbp, gbpHour, REFERRAL_STAGES, REFERRAL_STAGE_MAP } from './pse';
import { MinerVisual } from './MinerVisual';

/**
 * PseLandingVisuals — the PSEmine product visual system (OWNER-BRIEF §27).
 * ─────────────────────────────────────────────────────────────────────────────
 * These are visual primitives for the product, not decorative widgets: every
 * one of them is built from the real domain — real tool tiers, real prices and
 * hourly rates, real capacity ceilings, real campaign lifecycle states, real
 * referral stages, real chain and quote constants from `src/types/psemine.ts`.
 *
 * Data rule (OWNER-BRIEF §23): nothing here invents a user, an earning, a
 * referral, a purchase or a statistic. Where the backend has nothing to show,
 * these components render a designed empty state. The single exception is the
 * ONE conceptual product visual on the landing page — the hero console preview
 * — which is explicitly labelled as an illustrative example in its own footer.
 */

export type MiningState = 'active' | 'paused' | 'settling' | 'ended';

const STATE_LABEL: Record<MiningState, string> = {
  active: 'Active',
  paused: 'Paused',
  settling: 'Settling',
  ended: 'Ended',
};

const STATE_CLASS: Record<MiningState, string> = {
  active: 'pse-state pse-state-active',
  paused: 'pse-state pse-state-paused',
  settling: 'pse-state pse-state-settling',
  ended: 'pse-state pse-state-ended',
};

/** Restrained status glyph per state — shape carries the meaning, not colour. */
const StateGlyph: React.FC<{ state: MiningState }> = ({ state }) => (
  <svg viewBox="0 0 12 12" className="pse-state-glyph" aria-hidden="true" fill="none">
    {state === 'active' && (
      <>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
        <circle cx="6" cy="6" r="2.2" fill="currentColor" />
      </>
    )}
    {state === 'paused' && (
      <>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
        <path d="M4.6 4v4M7.4 4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    )}
    {state === 'settling' && (
      <>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
        <path d="M6 3.2V6l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    )}
    {state === 'ended' && (
      <>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
        <path d="M3.8 6.2l1.5 1.5 3-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

export const StatePill: React.FC<{ state: MiningState; label?: string }> = ({ state, label }) => (
  <span className={STATE_CLASS[state]}>
    <StateGlyph state={state} />
    {label ?? STATE_LABEL[state]}
  </span>
);

const TIERS: Array<{ id: PSEToolTierId; rank: number; cell: string }> = [
  { id: 'starter', rank: 1, cell: 'pse-cell-on-neutral' },
  { id: 'builder', rank: 2, cell: 'pse-cell-on-blue' },
  { id: 'advanced', rank: 3, cell: 'pse-cell-on-purple' },
  { id: 'elite', rank: 4, cell: 'pse-cell-on' },
];

const tierDef = (id: PSEToolTierId) => LOCKED_PSEMINE_TOOLS[id];

/** Small plan-view marker used next to tool names in dense rows. */
const TierMark: React.FC<{ rank: number; count?: number }> = ({ rank, count }) => (
  <span className="pse-tier" aria-hidden="true">
    {count !== undefined && count > 0 ? `×${count}` : rank}
  </span>
);

/** Capacity cells: tier capacity drawn as filled segments out of four. */
const CapacityCells: React.FC<{ filled: number; tone?: string; compact?: boolean }> = ({
  filled, tone = 'pse-cell-on', compact,
}) => (
  <span className="pse-cells" aria-hidden="true">
    {[0, 1, 2, 3].map(i => (
      <span
        key={i}
        className={`pse-cell ${i < filled ? tone : ''}`}
        style={compact ? { width: 9, height: 4 } : undefined}
      />
    ))}
  </span>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Hero — the conceptual console preview
   A labelled illustration of the real console: real field names, real rates,
   example holdings. It must read like a product screenshot, and it must never
   be mistaken for a live account.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ConsolePreviewProps {
  counts: Record<PSEToolTierId, number>;
  /** Campaign day to illustrate; real campaign day when one is running. */
  dayIndex: number;
  durationDays: number;
  state: MiningState;
  /** Status wording override (e.g. "Pre-launch" before the campaign opens). */
  stateLabel?: string;
  /**
   * True when the preview is showing the documented example rather than a
   * running campaign. The frame then says so instead of claiming a status.
   */
  illustrative?: boolean;
  /** Illustrative activity entries — real activity types, example amounts. */
  activity: Array<{ title: string; detail: string; amount: string; tone: string }>;
}

export const ConsolePreview: React.FC<ConsolePreviewProps> = ({
  counts, dayIndex, durationDays, state, stateLabel, illustrative, activity,
}) => {
  const toolCapacity = TIERS.reduce(
    (sum, t) => sum + counts[t.id] * tierDef(t.id).hourlyRateGBP,
    0,
  );
  const toolsOwned = TIERS.reduce((sum, t) => sum + counts[t.id], 0);
  const progress = Math.max(0, Math.min(100, (dayIndex / durationDays) * 100));

  return (
    <div className="pse-frame">
      {/* Window chrome — this is a product screenshot, framed as one. */}
      <div className="pse-frame-bar">
        <div className="pse-frame-dots" aria-hidden="true">
          <span className="pse-frame-dot" />
          <span className="pse-frame-dot" />
          <span className="pse-frame-dot" />
        </div>
        <div className="pse-frame-url">
          <span aria-hidden="true">⌁</span> psemine.app/mine/dashboard
        </div>
        {illustrative
          ? <span className="pse-tag" style={{ borderColor: 'rgba(76,158,248,0.34)', color: 'var(--pse-blue-ink)' }}>Illustrative</span>
          : <StatePill state={state} label={stateLabel} />}
      </div>

      <div className="p-4 sm:p-5">
        {/* The verdict: hourly capacity, with the composition that produces it. */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="pse-eyebrow">Hourly mining capacity</p>
            <p className="pse-fig-1 mt-2" style={{ color: 'var(--pse-text)' }}>{gbpHour(toolCapacity)}</p>
            <p className="pse-tiny mt-1.5">
              {toolsOwned} owned {toolsOwned === 1 ? 'tool' : 'tools'} across {TIERS.filter(t => counts[t.id] > 0).length} tiers
            </p>
          </div>
          <span className="pse-tag" style={{ borderColor: 'rgba(76,158,248,0.34)', color: 'var(--pse-blue-ink)' }}>
            Example holdings
          </span>
        </div>

        {/* Composition: the exact arithmetic that produced the figure above. */}
        <div className="pse-inset-box mt-4">
          <div className="pse-specs">
            {TIERS.filter(t => counts[t.id] > 0).map(t => (
              <div key={t.id} className="pse-spec">
                <span className="pse-spec-k flex items-center gap-2.5">
                  <TierMark rank={t.rank} />
                  {tierDef(t.id).name}
                  <span className="pse-num" style={{ color: 'var(--pse-text-3)' }}>×{counts[t.id]}</span>
                </span>
                <span className="pse-spec-v" style={{ color: 'var(--pse-cyan-ink)' }}>
                  +{gbpHour(counts[t.id] * tierDef(t.id).hourlyRateGBP)}
                </span>
              </div>
            ))}
            <div className="pse-spec" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <span className="pse-spec-k font-semibold" style={{ color: 'var(--pse-text)' }}>Tool capacity</span>
              <span className="pse-spec-v">{gbpHour(toolCapacity)}</span>
            </div>
          </div>
        </div>

        {/* Campaign progress + accrual, side by side. */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="pse-plate p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="pse-eyebrow">Campaign</p>
              <span className="pse-num pse-tiny">Day {dayIndex} / {durationDays}</span>
            </div>
            <div className="pse-bar pse-bar-lg mt-3">
              <div className="pse-bar-fill pse-bar-fill-cyan" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="pse-tiny">Mining phase</span>
              {illustrative
                ? <span className="pse-tag">Example day</span>
                : <StatePill state={state} label={stateLabel} />}
            </div>
          </div>
          <div className="pse-plate p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="pse-eyebrow">{illustrative ? 'Example accrual' : 'Accrued earnings'}</p>
              <span className="pse-tiny">GBP</span>
            </div>
            <p className="pse-fig-2 mt-3" style={{ color: 'var(--pse-text)' }}>
              {gbp(toolCapacity * 24 * dayIndex)}
            </p>
            <p className="pse-tiny mt-2">
              {dayIndex} days × 24 hours at {gbpHour(toolCapacity)} — accrues hourly while a tool is in cycle, settles
              at day {durationDays}
            </p>
          </div>
        </div>

        {/* Owned tools: the product's objects, at a glance. */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="pse-eyebrow">Tool ownership</p>
            <span className="pse-tiny">{toolsOwned} units</span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIERS.map(t => {
              const owned = counts[t.id];
              return (
                <div key={t.id} className="pse-plate p-2.5" style={{ opacity: owned ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="pse-tiny whitespace-nowrap">{tierDef(t.id).name.replace(' Miner', '')}</span>
                    <span className="pse-num pse-tiny shrink-0" style={{ color: 'var(--pse-text)' }}>
                      ×{owned}<span style={{ color: 'var(--pse-text-3)' }}>/{tierDef(t.id).maxPerUser}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-[42px] items-end justify-center">
                    <MinerVisual tier={t.id} size="xs" className="h-full w-full" />
                  </div>
                  {/* Capacity rank, then the tier's hourly rate on its own line.
                      The rate is tabular and never truncates, so it gets the
                      full card width: side by side, rate + cells are wider than
                      a quarter-column card and the rate was the part that got
                      cut off by the frame's edge. */}
                  <div className="mt-2">
                    <CapacityCells filled={t.rank} tone={t.cell} compact />
                  </div>
                  <p className="pse-num pse-tiny mt-1.5" style={{ color: 'var(--pse-blue-ink)' }}>
                    {gbpHour(tierDef(t.id).hourlyRateGBP)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mining activity — example entries, labelled as an example. */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="pse-eyebrow">Mining activity</p>
            <span className="pse-tag">Example</span>
          </div>
          <div className="pse-inset-box mt-2.5">
            {activity.map((a, i) => (
              <div
                key={a.title + i}
                className="flex items-center gap-3 px-3.5 py-2.5"
                style={{ borderTop: i === 0 ? 0 : '1px solid var(--pse-edge)' }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: 999, background: a.tone, flexShrink: 0 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="pse-t-small font-medium" style={{ color: 'var(--pse-text)' }}>{a.title}</p>
                  <p className="pse-tiny">{a.detail}</p>
                </div>
                <span className="pse-num pse-tiny shrink-0" style={{ color: 'var(--pse-text-2)' }}>{a.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pse-panel-foot">
        <p className="pse-tiny">
          Illustrative preview — example holdings, example campaign day and example activity. Your console
          shows only your own figures, computed by the backend.
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   How it works — one small interface visual per step
   ═══════════════════════════════════════════════════════════════════════════ */

export const ConnectWalletVisual: React.FC = () => (
  <div className="pse-inset-box p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="pse-tiny" style={{ color: 'var(--pse-text)' }}>Connect wallet</span>
      <span className="pse-net"><span className="pse-net-mark" aria-hidden="true" />BNB Chain</span>
    </div>
    {[
      { t: 'Browser wallet', d: 'Detected by EIP-6963' },
      { t: 'WalletConnect', d: 'QR code or deep link' },
    ].map((w, i) => (
      <div
        key={w.t}
        className="pse-plate mt-2 flex items-center gap-2.5 px-2.5 py-2"
        style={{ background: i === 0 ? 'var(--pse-l3)' : undefined }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            background: i === 0 ? 'rgba(76,158,248,0.22)' : 'rgba(255,255,255,0.07)',
            border: '1px solid var(--pse-edge-2)',
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="pse-tiny" style={{ color: 'var(--pse-text)' }}>{w.t}</p>
          <p className="pse-tiny">{w.d}</p>
        </div>
        <span aria-hidden="true" className="pse-tiny">›</span>
      </div>
    ))}
    <p className="pse-tiny mt-2.5">The address you connect is recorded as the payer of your purchase.</p>
  </div>
);

export const MarketplaceVisual: React.FC = () => {
  const def = tierDef('starter');
  return (
    <div className="pse-inset-box p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="pse-tiny" style={{ color: 'var(--pse-text)' }}>Mining marketplace</span>
        <span className="pse-tiny">4 tiers</span>
      </div>
      <div className="pse-plate mt-2 flex items-center gap-2.5 p-2" style={{ background: 'var(--pse-l3)' }}>
        <div className="flex h-[38px] w-[52px] shrink-0 items-end justify-center">
          <MinerVisual tier="starter" size="xs" className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pse-tiny" style={{ color: 'var(--pse-text)' }}>{def.name}</p>
          <p className="pse-tiny pse-num" style={{ color: 'var(--pse-blue-ink)' }}>
            {gbpHour(def.hourlyRateGBP)}/hr · max {def.maxPerUser}
          </p>
        </div>
        <span className="pse-num pse-t-small font-semibold" style={{ color: 'var(--pse-text)' }}>
          {gbp(def.purchasePriceGBP)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <CapacityCells filled={1} tone="pse-cell-on-neutral" />
        <span className="pse-tiny">Purchases open with the campaign</span>
      </div>
    </div>
  );
};

export const PaymentVisual: React.FC = () => (
  <div className="pse-inset-box p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="pse-tiny" style={{ color: 'var(--pse-text)' }}>Confirm BNB payment</span>
      <span className="pse-pill" style={{ borderColor: 'rgba(76,158,248,0.34)', color: 'var(--pse-blue-ink)' }}>
        Confirming
      </span>
    </div>
    <div className="pse-specs mt-2">
      {[
        { k: 'Tool price', v: gbp(tierDef('starter').purchasePriceGBP) },
        { k: 'Payable', v: 'BNB · live quote' },
        { k: 'Network', v: PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME },
        { k: 'Quote window', v: `${PSEMINE_CONSTANTS.QUOTE_EXPIRATION_MINUTES} min` },
      ].map(r => (
        <div key={r.k} className="pse-spec" style={{ padding: '5px 0', minHeight: 0 }}>
          <span className="pse-tiny">{r.k}</span>
          <span className="pse-num pse-tiny" style={{ color: 'var(--pse-text)' }}>{r.v}</span>
        </div>
      ))}
    </div>
    <div className="pse-bar mt-2">
      <div className="pse-bar-fill" style={{ width: '66%' }} />
    </div>
  </div>
);

export const AccrualVisual: React.FC = () => (
  <div className="pse-inset-box p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="pse-tiny" style={{ color: 'var(--pse-text)' }}>Capacity live</span>
      <StatePill state="active" />
    </div>
    <p className="pse-fig-3 mt-2" style={{ color: 'var(--pse-text)' }}>Accrues hourly</p>
    <div className="pse-bar mt-2">
      <div className="pse-bar-fill pse-bar-fill-cyan" style={{ width: '100%' }} />
    </div>
    <div className="mt-2 space-y-1.5">
      <p className="pse-tiny">24-hour operating cycles, restarted by free maintenance.</p>
      <p className="pse-tiny">Accrual is computed from server-verified operating time.</p>
    </div>
  </div>
);

export const SettlementVisual: React.FC = () => (
  <div className="pse-inset-box p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="pse-tiny" style={{ color: 'var(--pse-text)' }}>Settlement</span>
      <StatePill state="settling" />
    </div>
    <div className="mt-2.5">
      {[
        { t: 'Day 90 — accrual stops', tone: 'var(--pse-blue)' },
        { t: 'Ledger finalised', tone: 'var(--pse-purple)' },
        { t: 'Payout reviewed, paid in BNB', tone: 'var(--pse-cyan)' },
      ].map((s, i) => (
        <div key={s.t} className="flex items-center gap-2.5" style={{ paddingTop: i === 0 ? 0 : 8 }}>
          <span
            aria-hidden="true"
            style={{ width: 7, height: 7, borderRadius: 999, background: s.tone, flexShrink: 0 }}
          />
          <span className="pse-tiny">{s.t}</span>
        </div>
      ))}
    </div>
    <p className="pse-tiny mt-2.5">Balances are not withdrawable before settlement.</p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Capacity system — owned tools + qualified referrals → total → hourly
   ═══════════════════════════════════════════════════════════════════════════ */

export const CapacityBuilder: React.FC = () => {
  const toolMax = PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR;
  const refMax = PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR;
  const total = PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR;
  const toolShare = (toolMax / total) * 100;
  const refShare = (refMax / total) * 100;

  return (
    <div className="pse-panel">
      <div className="pse-panel-head">
        <div className="min-w-0">
          <p className="pse-eyebrow">Mining capacity</p>
          <p className="pse-t-small mt-1" style={{ color: 'var(--pse-text)' }}>
            Owned tools + qualified referrals
          </p>
        </div>
        <span className="pse-tag" style={{ borderColor: 'rgba(34,211,238,0.34)', color: 'var(--pse-cyan-ink)' }}>
          Ceiling
        </span>
      </div>

      <div className="pse-panel-body">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="pse-fig-1" style={{ color: 'var(--pse-text)' }}>{gbpHour(total)}</p>
            <p className="pse-tiny mt-1.5">Maximum total capacity per account</p>
          </div>
          <div className="text-right">
            <p className="pse-num pse-t-small font-semibold" style={{ color: 'var(--pse-text)' }}>
              {gbpHour(toolMax)} <span className="pse-tiny">tools</span>
            </p>
            <p className="pse-num pse-t-small font-semibold" style={{ color: 'var(--pse-purple-ink)' }}>
              +{gbpHour(refMax)} <span className="pse-tiny">referrals</span>
            </p>
          </div>
        </div>

        <div className="pse-bar-stack mt-4">
          <span style={{ width: `${toolShare}%`, background: 'var(--pse-cyan)' }} />
          <span style={{ width: `${refShare}%`, background: 'var(--pse-purple)' }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="pse-tiny">Tools {Math.round(toolShare)}% of capacity</span>
          <span className="pse-tiny">Referrals {Math.round(refShare)}% of capacity</span>
        </div>
      </div>

      {/* Tool capacity, tier by tier, at each tier's ownership limit. */}
      <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
        {TIERS.map(t => {
          const def = tierDef(t.id);
          const atLimit = def.hourlyRateGBP * def.maxPerUser;
          return (
            <div key={t.id} className="pse-spec">
              <span className="pse-spec-k flex items-center gap-2.5">
                <TierMark rank={t.rank} />
                {def.maxPerUser} × {def.name}
              </span>
              <span className="pse-spec-v">
                {gbpHour(atLimit)}
                <small>{gbpHour(def.hourlyRateGBP)} per tool</small>
              </span>
            </div>
          );
        })}
        <div className="pse-spec" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="pse-spec-k font-semibold" style={{ color: 'var(--pse-text)' }}>Maximum tool capacity</span>
          <span className="pse-spec-v" style={{ color: 'var(--pse-cyan-ink)' }}>{gbpHour(toolMax)}</span>
        </div>
      </div>

      <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
        <div className="pse-spec">
          <span className="pse-spec-k flex items-center gap-2.5">
            <span className="pse-tier" aria-hidden="true">R</span>
            {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} × qualified referral
          </span>
          <span className="pse-spec-v" style={{ color: 'var(--pse-purple-ink)' }}>
            +{gbpHour(refMax)}
            <small>{gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} each</small>
          </span>
        </div>
      </div>

      <div className="pse-panel-foot">
        <p className="pse-tiny">
          Capacity only accrues while a tool is inside an active 24-hour operating cycle. The backend computes
          every figure; the app displays what the server reports.
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Campaign lifecycle — Launch → Mining → Settlement → Payout → Closed
   ═══════════════════════════════════════════════════════════════════════════ */

type PhaseKey = 'launch' | 'mining' | 'settlement' | 'payout' | 'closed';

const PHASES: Array<{ key: PhaseKey; label: string; detail: string }> = [
  { key: 'launch', label: 'Launch', detail: 'Tools go on sale. Each purchase begins its first operating cycle.' },
  { key: 'mining', label: 'Mining', detail: 'Cycles run for 90 days. Capacity accrues hourly against the ledger.' },
  { key: 'settlement', label: 'Settlement', detail: 'Accrual stops and final balances are computed from the mining ledger.' },
  { key: 'payout', label: 'Payout', detail: 'Reviewed payout requests are paid in BNB to your payout wallet.' },
  { key: 'closed', label: 'Closed', detail: 'The campaign is archived with its final ledger intact.' },
];

/** Campaign status → which lifecycle node is current, and which are done. */
const phaseState = (
  campaign: PSEMineCampaign | null,
  key: PhaseKey,
): 'done' | 'current' | 'pending' => {
  const order: PhaseKey[] = ['launch', 'mining', 'settlement', 'payout', 'closed'];
  const status = campaign?.status ?? 'scheduled';
  const index: Record<string, number> = {
    scheduled: 0, active: 1, paused: 1, settling: 2, payout: 3, closed: 4, archived: 4,
  };
  const current = index[status] ?? 0;
  const at = order.indexOf(key);
  if (at < current) return 'done';
  if (at === current) return 'current';
  return 'pending';
};

export const CampaignLifecycle: React.FC<{
  campaign: PSEMineCampaign | null;
  dayIndex: number | null;
  state: MiningState;
  stateLabel?: string;
  /** Present when dayIndex is a documented example rather than a real day. */
  dayLabel?: string;
}> = ({ campaign, dayIndex, state, stateLabel, dayLabel }) => {
  const duration = campaign?.durationDays ?? PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;
  const pct = dayIndex === null ? 0 : Math.max(0, Math.min(100, (dayIndex / duration) * 100));

  return (
    <div className="pse-panel">
      <div className="pse-panel-head">
        <div className="min-w-0">
          <p className="pse-eyebrow">Campaign</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="pse-fig-2">
              {dayIndex === null ? 'Day —' : `Day ${dayIndex}`}
              <span className="pse-t-small" style={{ color: 'var(--pse-text-3)' }}> / {duration}</span>
            </span>
            <StatePill state={state} label={stateLabel} />
            {dayLabel && <span className="pse-tag">{dayLabel}</span>}
          </div>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="pse-tiny">Settlement</p>
          <p className="pse-t-small pse-num" style={{ color: 'var(--pse-text)' }}>
            {dayIndex === null ? 'At day ' + duration : `${duration - dayIndex} days remaining`}
          </p>
        </div>
      </div>

      <div className="pse-panel-body">
        <div className="pse-bar pse-bar-lg">
          <div className="pse-bar-fill pse-bar-fill-cyan" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="pse-tiny">
            {dayIndex === null
              ? 'Campaign dates are published by the backend when the campaign opens.'
              : `${Math.round(pct)}% of the mining window elapsed`}
          </span>
          <span className="pse-tiny">Accrual stops at day {duration}</span>
        </div>
      </div>

      <div className="pse-life border-t" style={{ borderColor: 'var(--pse-edge)' }}>
        {PHASES.map(p => {
          const st = phaseState(campaign, p.key);
          return (
            <div key={p.key} className="pse-life-node" data-state={st}>
              <span className="pse-life-dot" aria-hidden="true" />
              <p className="pse-t-small font-semibold" style={{ color: 'var(--pse-text)' }}>{p.label}</p>
              <p className="pse-tiny mt-1.5">{p.detail}</p>
              <p className="pse-tiny mt-2.5" style={{ color: st === 'current' ? 'var(--pse-cyan-ink)' : 'var(--pse-text-3)' }}>
                {st === 'done' ? 'Complete' : st === 'current' ? 'In progress' : 'Scheduled'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** The four mining states, side by side — how each one reads. */
export const MiningStates: React.FC = () => (
  <div className="pse-panel">
    <div className="pse-panel-head">
      <p className="pse-eyebrow">Mining state</p>
      <span className="pse-tiny">Derived from backend campaign state</span>
    </div>
    <div className="pse-grid pse-grid-4 pse-panel-body">
      {(['active', 'paused', 'settling', 'ended'] as MiningState[]).map(s => (
        <div key={s} className="pse-plate p-3.5">
          <StatePill state={s} />
          <p className="pse-tiny mt-3">
            {s === 'active' && 'Capacity accrues hourly while every tool sits inside an active cycle.'}
            {s === 'paused' && 'Accrual is held. Cycles resume when the campaign is unpaused, without losing ledger entries.'}
            {s === 'settling' && 'Accrual has stopped. Final balances are being computed from the mining ledger.'}
            {s === 'ended' && 'The campaign window is complete. Earnings are final and payout review applies.'}
          </p>
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Referral qualification progression
   ═══════════════════════════════════════════════════════════════════════════ */

export const ReferralProgression: React.FC<{ qualified?: number }> = ({ qualified = 0 }) => (
  <div className="pse-panel">
    <div className="pse-panel-head">
      <div className="min-w-0">
        <p className="pse-eyebrow">Qualified referrals</p>
        <p className="pse-fig-2 mt-1.5">
          {qualified}
          <span className="pse-t-small" style={{ color: 'var(--pse-text-3)' }}>
            {' '}/ {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}
          </span>
        </p>
      </div>
      <span className="pse-num pse-t-small font-semibold" style={{ color: 'var(--pse-purple-ink)' }}>
        +{gbpHour(qualified * PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}
      </span>
    </div>

    <div className="pse-panel-body">
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              width: 26, height: 5, borderRadius: 2,
              background: i < qualified ? 'var(--pse-purple)' : 'rgba(255,255,255,0.09)',
            }}
          />
        ))}
        <span className="pse-tiny ml-1">
          {qualified}/{PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} slots filled
        </span>
      </div>
      <p className="pse-tiny mt-3">
        Each qualified referral adds {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}/hour for the rest of the
        campaign — {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} at full occupancy.
      </p>
    </div>

    <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
      {REFERRAL_STAGES.map((s, i) => {
        const view = REFERRAL_STAGE_MAP[s.id];
        return (
          <div key={s.id} className="pse-spec">
            <span className="pse-spec-k flex items-center gap-2.5">
              <span className="pse-step-no">{i + 1}</span>
              {view.label}
            </span>
            <span className="pse-spec-v" style={{ fontWeight: 400, whiteSpace: 'normal', maxWidth: '30ch', textAlign: 'right' }}>
              <span className="pse-tiny">{view.help}</span>
            </span>
          </div>
        );
      })}
    </div>

    <div className="pse-panel-foot">
      <p className="pse-tiny">
        Qualification settles once on the backend, with anti-abuse checks, from the qualification moment forward —
        never retroactively.
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Wallet zones — GBP campaign balance vs BNB settlement
   ═══════════════════════════════════════════════════════════════════════════ */

export const WalletZones: React.FC<{
  accruedGBP: number;
  capacityGBPPerHour: number;
  payoutWallet: string | null;
  connectedWallet: string | null;
}> = ({ accruedGBP, capacityGBPPerHour, payoutWallet, connectedWallet }) => (
  <div className="pse-wallet">
    <div className="pse-panel">
      <div className="pse-panel-head">
        <p className="pse-eyebrow">Campaign balance</p>
        <span className="pse-tag">GBP</span>
      </div>
      <div className="pse-panel-body">
        <p className="pse-fig-1" style={{ color: 'var(--pse-text)' }}>{gbp(accruedGBP)}</p>
        <p className="pse-tiny mt-1.5">Accrued campaign earnings</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="pse-plate p-3">
            <p className="pse-tiny">Hourly capacity</p>
            <p className="pse-num pse-fig-3 mt-1.5" style={{ color: 'var(--pse-blue-ink)' }}>
              {gbpHour(capacityGBPPerHour)}
            </p>
          </div>
          <div className="pse-plate p-3">
            <p className="pse-tiny">Payout</p>
            <p className="pse-fig-3 mt-1.5" style={{ color: 'var(--pse-text-2)' }}>Locked until settlement</p>
          </div>
        </div>
      </div>
      <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
        <div className="pse-spec">
          <span className="pse-spec-k">Accounting currency</span>
          <span className="pse-spec-v">GBP</span>
        </div>
        <div className="pse-spec">
          <span className="pse-spec-k">Settlement currency</span>
          <span className="pse-spec-v">BNB</span>
        </div>
        <div className="pse-spec">
          <span className="pse-spec-k">Settlement window</span>
          <span className="pse-spec-v">{PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days</span>
        </div>
      </div>
      <div className="pse-panel-foot">
        <p className="pse-tiny">
          Mid-campaign balances are accruals, not withdrawable funds. They become payable only after the campaign
          ledger is finalised.
        </p>
      </div>
    </div>

    <div className="pse-panel">
      <div className="pse-panel-head">
        <p className="pse-eyebrow">Settlement wallet</p>
        <span className="pse-net"><span className="pse-net-mark" aria-hidden="true" />{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</span>
      </div>
      <div className="pse-panel-body">
        <p className="pse-tiny">Connected wallet</p>
        <p className="pse-addr mt-1.5">{connectedWallet ?? 'Not connected'}</p>
        <p className="pse-tiny mt-3">Payout wallet</p>
        <p className="pse-addr mt-1.5">{payoutWallet ?? 'Set before the wallet-change deadline'}</p>

        <div className="pse-inset-box mt-4">
          {[
            { k: 'Chain', v: `BNB Smart Chain · ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}` },
            { k: 'Quote window', v: `${PSEMINE_CONSTANTS.QUOTE_EXPIRATION_MINUTES} minutes` },
            { k: 'Wallet changes', v: 'Until the campaign deadline' },
          ].map((r, i) => (
            <div
              key={r.k}
              className="px-3.5 py-2.5"
              style={{ borderTop: i === 0 ? 0 : '1px solid var(--pse-edge)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="pse-tiny">{r.k}</span>
                <span className="pse-num pse-tiny" style={{ color: 'var(--pse-text)' }}>{r.v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pse-panel-foot">
        <p className="pse-tiny">
          Payouts are reviewed, then paid in BNB to the payout wallet you configured before the deadline. The
          receiving address is shown in full before each payment.
        </p>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Comparison — price against capacity, drawn from the real tool economics
   ═══════════════════════════════════════════════════════════════════════════ */

export const ToolComparison: React.FC<{ onSelect?: (tier: PSEToolTierId) => void }> = ({ onSelect }) => {
  const priceMax = Math.max(...TIERS.map(t => tierDef(t.id).purchasePriceGBP));
  const rateMax = Math.max(...TIERS.map(t => tierDef(t.id).hourlyRateGBP));

  return (
    <div className="pse-panel">
      <div className="pse-panel-head">
        <div className="min-w-0">
          <p className="pse-eyebrow">Price against capacity</p>
          <p className="pse-t-small mt-1" style={{ color: 'var(--pse-text)' }}>
            Fixed for the whole campaign — no dynamic pricing
          </p>
        </div>
        <span className="pse-tiny hidden sm:block">Both bars share the same scale</span>
      </div>

      <div className="pse-cmp">
        {TIERS.map(t => {
          const def = tierDef(t.id);
          return (
            <div key={t.id} className="pse-cmp-row">
              {/* The product, at a comparable scale across tiers. */}
              <div className="flex items-center gap-3">
                <div className="h-[52px] w-[70px] shrink-0">
                  <MinerVisual tier={t.id} size="sm" fit="device" className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <p className="pse-t-small font-semibold" style={{ color: 'var(--pse-text)' }}>{def.name}</p>
                  <p className="pse-tiny">Tier {t.rank} of 4</p>
                </div>
              </div>

              {/* What it costs. */}
              <div className="pse-cmp-metric">
                <span className="pse-num pse-t-small w-[62px] shrink-0 font-semibold" style={{ color: 'var(--pse-text)' }}>
                  {gbp(def.purchasePriceGBP)}
                </span>
                <span className="pse-bar flex-1" aria-hidden="true">
                  <span
                    className="pse-bar-fill pse-bar-fill-neutral"
                    style={{ width: `${(def.purchasePriceGBP / priceMax) * 100}%`, display: 'block' }}
                  />
                </span>
                <span className="pse-tiny w-[54px] shrink-0 text-right">price</span>
              </div>

              {/* What it provides. */}
              <div className="pse-cmp-metric">
                <span className="pse-num pse-t-small w-[62px] shrink-0 font-semibold" style={{ color: 'var(--pse-blue-ink)' }}>
                  {gbpHour(def.hourlyRateGBP)}
                </span>
                <span className="pse-bar flex-1" aria-hidden="true">
                  <span
                    className="pse-bar-fill"
                    style={{ width: `${(def.hourlyRateGBP / rateMax) * 100}%`, display: 'block' }}
                  />
                </span>
                <span className="pse-tiny w-[54px] shrink-0 text-right">per hour</span>
              </div>

              {/* Ownership ceiling. */}
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="pse-tiny">Max per account {def.maxPerUser}</span>
                <span className="pse-num pse-t-small font-semibold" style={{ color: 'var(--pse-text-2)' }}>
                  {gbpHour(def.hourlyRateGBP * def.maxPerUser)} at limit
                </span>
                {onSelect && (
                  <button
                    type="button"
                    className="pse-btn pse-btn-outline pse-btn-sm"
                    onClick={() => onSelect(t.id)}
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pse-panel-foot">
        <p className="pse-tiny">
          Prices and hourly rates are fixed in GBP for the whole campaign. You pay the fixed GBP price in BNB at the
          live rate quoted at checkout. All four tiers are additive, up to {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}.
        </p>
      </div>
    </div>
  );
};
