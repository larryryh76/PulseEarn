/**
 * The PSEmine instrument.
 *
 * ONE bespoke, product-specific drawing: the campaign's actual mechanism, in the
 * product's own language.
 *
 *   TOOLS → CAPACITY → TIME → CAMPAIGN EARNINGS → SETTLEMENT → BNB PAYOUT
 *
 * Drawn rather than illustrated, because the mechanism IS the product. A stock
 * photograph, a 3D cube, a fake hashrate readout or an animated chart would each
 * communicate less and claim more. Every station is a schematic of something the
 * backend really does:
 *
 *   tools      — you buy mining modules with BNB; a verified payment activates one
 *   capacity   — each tool carries a fixed hourly capacity in GBP, bounded by an
 *                ownership limit and a capacity ceiling
 *   time       — capacity only earns while the campaign runs and while the tool's
 *                operating session is live
 *   earnings   — accrual is GBP-denominated and computed server-side
 *   settlement — accrual stops and final balances are computed
 *   payout     — settled GBP is disbursed in BNB to the account's payout wallet
 *
 * HONESTY: this is a diagram, not a readout. It carries no number, no live state
 * and no progress, because it knows nothing about a particular visitor. Every
 * figure a visitor sees near it comes from the locked economics or from the
 * campaign record — never from here.
 *
 * Rendering is a CSS grid of stations rather than one fixed-size SVG, so it
 * composes from 390px to 1440px instead of being scaled into illegibility.
 */
import React from 'react';

export type PseFlowStageId = 'tools' | 'capacity' | 'time' | 'earnings' | 'settlement' | 'payout';

/** Shared frame for the station glyphs: 32×32, one accent element each. */
const Glyph: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" role="img" aria-label={label}>
    {children}
  </svg>
);

const STRUCTURE = 'currentColor';
const ACCENT = 'var(--pse-accent)';

/**
 * Station glyphs. Each draws only the single idea its station states — no station
 * repeats another's drawing, and the accent marks the one quantity or direction
 * that the station is actually about.
 */
export const PseFlowGlyph: React.FC<{ stage: PseFlowStageId }> = ({ stage }) => {
  switch (stage) {
    case 'tools':
      return (
        <Glyph label="A mining tool module">
          <rect x="4.5" y="7.5" width="23" height="17" rx="2" stroke={STRUCTURE} strokeWidth="1.5" />
          <rect x="4.5" y="7.5" width="23" height="4" stroke={STRUCTURE} strokeWidth="1.5" opacity="0.45" />
          <rect x="9" y="14.5" width="3" height="6.5" fill={ACCENT} />
          <path d="M15.5 21h7" stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        </Glyph>
      );
    case 'capacity':
      return (
        <Glyph label="Ascending capacity bars">
          <path d="M4.5 26.5h23" stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="7" y="19" width="4" height="7.5" fill={STRUCTURE} opacity="0.35" />
          <rect x="14" y="14" width="4" height="12.5" fill={STRUCTURE} opacity="0.6" />
          <rect x="21" y="8" width="4" height="18.5" fill={ACCENT} />
        </Glyph>
      );
    case 'time':
      return (
        <Glyph label="A bounded campaign period">
          <circle cx="16" cy="16" r="10.5" stroke={STRUCTURE} strokeWidth="1.5" />
          <path
            d="M16 5.5v2.5M26.5 16h-2.5M16 26.5v-2.5M5.5 16h2.5"
            stroke={STRUCTURE}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M16 16V9.5" stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
          <path d="M16 16h7.5" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
        </Glyph>
      );
    case 'earnings':
      return (
        <Glyph label="A server-side accrual ledger">
          <rect x="5.5" y="5" width="21" height="22" rx="2" stroke={STRUCTURE} strokeWidth="1.5" />
          <path
            d="M10 11.5h7M10 16h4.5M10 20.5h7"
            stroke={STRUCTURE}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.45"
          />
          <rect x="19" y="13.5" width="3" height="7" fill={ACCENT} />
        </Glyph>
      );
    case 'settlement':
      return (
        <Glyph label="Final balances reconciled">
          <path d="M5 10.5h6.5M5 21.5h6.5" stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
          <path d="M11.5 10.5h2a5 5 0 0 1 5 5M11.5 21.5h2a5 5 0 0 0 5-5" stroke={STRUCTURE} strokeWidth="1.5" />
          <path d="M19.5 16h7" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
        </Glyph>
      );
    case 'payout':
      return (
        <Glyph label="A payout sent to the configured wallet">
          <path d="M4.5 12.5h12v11h-12z" stroke={STRUCTURE} strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d="M7.5 10.5v-2h12v11h-3"
            stroke={STRUCTURE}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.45"
          />
          <circle cx="10.5" cy="18" r="1.75" fill={ACCENT} />
          <path
            d="M19.5 16h7M23 12.5l3.5 3.5-3.5 3.5"
            stroke={ACCENT}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Glyph>
      );
  }
};

/** The six stations, in order. Labels are product facts, not marketing. */
export const PSE_FLOW_STATIONS: ReadonlyArray<{
  id: PseFlowStageId;
  index: string;
  name: string;
  note: string;
}> = [
  {
    id: 'tools',
    index: '01',
    name: 'Tools',
    note: 'You buy mining modules with BNB. A verified payment activates the tool on your account.',
  },
  {
    id: 'capacity',
    index: '02',
    name: 'Capacity',
    note: 'Each tool carries a fixed capacity in GBP per hour, bounded by the tier’s ownership limit.',
  },
  {
    id: 'time',
    index: '03',
    name: 'Time',
    note: 'Capacity only earns while the campaign runs and while the tool is inside a live operating session.',
  },
  {
    id: 'earnings',
    index: '04',
    name: 'Earnings',
    note: 'Earnings accrue in GBP, on the server, against a checkpoint. Nothing is credited by the browser.',
  },
  {
    id: 'settlement',
    index: '05',
    name: 'Settlement',
    note: 'When the campaign ends, accrual stops and final balances are computed for settlement.',
  },
  {
    id: 'payout',
    index: '06',
    name: 'BNB payout',
    note: 'Settled GBP is disbursed in BNB to the payout wallet on your account, after review.',
  },
];

/**
 * The instrument itself: six stations in sequence, each carrying its drawn idea,
 * its position, its name and one sentence about what really happens there.
 *
 * It marks no station as "current" and carries no figure, because nothing here
 * knows where a particular visitor is. The real campaign position is stated in
 * words by the section that reads the server.
 */
export const PseFlowRail: React.FC<{ className?: string }> = ({ className = '' }) => (
  <ol className={`pse-stage-list ${className}`} aria-label="How PSEmine works, in six stages">
    {PSE_FLOW_STATIONS.map(station => (
      <li key={station.id} className="pse-stage">
        <span className="pse-stage-glyph" aria-hidden="true">
          <PseFlowGlyph stage={station.id} />
        </span>
        <span className="pse-stage-index">{station.index}</span>
        <span className="pse-stage-name">{station.name}</span>
        <span className="pse-stage-note">{station.note}</span>
      </li>
    ))}
  </ol>
);

export default PseFlowRail;
