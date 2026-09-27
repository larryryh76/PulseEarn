/**
 * The PSEmine product instrument.
 *
 * ONE bespoke, product-specific visual: the campaign's actual mechanism, drawn
 * in the product's own language.
 *
 *   TOOLS → CAPACITY → TIME → CAMPAIGN EARNINGS → SETTLEMENT → BNB PAYOUT
 *
 * Why it is drawn rather than illustrated: the mechanism IS the product. A
 * generic dashboard screenshot, a stock photograph, a 3D cube, a fake hashrate
 * readout or an animated chart would all communicate less and claim more. Every
 * station here is a schematic of something the backend really does:
 *
 *   tools      — you buy mining modules (BSC transactions, activation)
 *   capacity   — the tools' fixed hourly GBP capacity, bounded by an ownership
 *                cap and a capacity ceiling
 *   time       — capacity only earns while the campaign is running and while the
 *                tool's operating session is live
 *   earnings   — accrual is GBP-denominated, computed server-side
 *   settlement — accrual stops, final balances are computed
 *   payout     — settled GBP is disbursed in BNB to the account's payout wallet
 *
 * HONESTY: this is a diagram, not a live readout. It carries no numbers, no
 * live state and no progress. Every figure a visitor sees next to it comes from
 * the locked economics or from the campaign record, never from here.
 *
 * Rendering is CSS-driven (a station grid), not one fixed-size SVG, so it composes
 * properly from 390px to 1440px instead of being scaled down into illegibility.
 */
import React from 'react';
import { PSE_MARK_BARS } from './PSEBrand';

export type PseFlowStageId = 'tools' | 'capacity' | 'time' | 'earnings' | 'settlement' | 'payout';

/** Shared frame for the station glyphs: 32×32, one accent element each. */
const Glyph: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" role="img" aria-label={label}>
    {children}
  </svg>
);

const STROKE = 'currentColor';

/**
 * Station glyphs. Each one draws the single idea its station states — no station
 * repeats another's drawing, and the accent is reserved for the quantity or the
 * direction that the station is actually about.
 */
export const PseFlowGlyph: React.FC<{ stage: PseFlowStageId }> = ({ stage }) => {
  switch (stage) {
    case 'tools':
      return (
        <Glyph label="A mining tool module">
          <rect x="4.5" y="6.5" width="23" height="19" rx="3.5" stroke={STROKE} strokeWidth="1.6" />
          <rect x="10" y="12" width="3.4" height="9.5" rx="1.2" fill="var(--pse-accent)" />
          <path d="M18 21.5v-5.2l3.4-3.4" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" />
        </Glyph>
      );
    case 'capacity':
      return (
        <Glyph label="Ascending capacity bars">
          <path d="M4.5 26.4h23" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" />
          {PSE_MARK_BARS.map((d, i) => (
            <path
              key={d}
              d={d}
              fill={i === PSE_MARK_BARS.length - 1 ? 'var(--pse-accent)' : STROKE}
              opacity={i === PSE_MARK_BARS.length - 1 ? 1 : 0.45}
            />
          ))}
        </Glyph>
      );
    case 'time':
      return (
        <Glyph label="A bounded campaign period">
          <circle cx="16" cy="16" r="10.5" stroke={STROKE} strokeWidth="1.6" />
          <path d="M16 5.5v3M26.5 16h-3M16 26.5v-3M5.5 16h3" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 16V8.5" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 16h7.5" stroke="var(--pse-accent)" strokeWidth="2" strokeLinecap="round" />
        </Glyph>
      );
    case 'earnings':
      return (
        <Glyph label="A server-side accrual ledger">
          <rect x="5" y="5" width="22" height="22" rx="2.5" stroke={STROKE} strokeWidth="1.6" />
          <path d="M9.5 12h9M9.5 16.5h6M9.5 21h9" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <rect x="20" y="14.5" width="3" height="6.5" rx="1.2" fill="var(--pse-accent)" />
        </Glyph>
      );
    case 'settlement':
      return (
        <Glyph label="Final balances reconciled">
          <path d="M5 10.5h8M5 21.5h8" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
          <path d="M13 10.5h2.5a4.5 4.5 0 0 1 4.5 4.5M13 21.5h2.5a4.5 4.5 0 0 0 4.5-4.5" stroke={STROKE} strokeWidth="1.6" />
          <path d="M20 16h7" stroke="var(--pse-accent)" strokeWidth="2" strokeLinecap="round" />
        </Glyph>
      );
    case 'payout':
      return (
        <Glyph label="A payout sent to the configured wallet">
          <path d="M4.5 12.5h13v11h-13z" stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M7.5 10.5V8.5h13v11h-3.5" stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round" opacity="0.5" />
          <circle cx="11" cy="18" r="2" fill="var(--pse-accent)" />
          <path d="M19.5 16h7M23 12.5l3.5 3.5L23 19.5" stroke="var(--pse-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    note: 'You buy mining modules with BNB. Each activation adds its fixed hourly capacity to your account.',
  },
  {
    id: 'capacity',
    index: '02',
    name: 'Capacity',
    note: 'Capacity is a rate in GBP per hour — the sum of your tools, bounded by each tier\u2019s ownership limit.',
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
 * The instrument itself: a ticked rail with six stations, each carrying the
 * drawn idea, its position in the sequence, its name and one sentence about what
 * really happens there.
 *
 * The rail is explanatory only: it marks no station as "current" and carries no
 * figure, because nothing here knows where a particular visitor is. The real
 * campaign position is stated in words by the section that reads the server.
 */
export const PseFlowRail: React.FC<{ className?: string }> = ({ className = '' }) => (
  <ol className={`pse-stage-list ${className}`} aria-label="How PSEmine works, in six stages">
    {PSE_FLOW_STATIONS.map(station => (
      <li key={station.id} className="pse-stage">
        <span className="pse-stage-rail" aria-hidden="true">
          <span className="pse-stage-node" />
        </span>
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
