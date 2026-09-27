import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS, type PSEToolTierId } from '../../types/psemine';
import { gbpHour } from './pse';

const TIERS: PSEToolTierId[] = ['starter', 'builder', 'advanced', 'elite'];

/** Renders the accessible SVG illustration for a tool tier in compact or standard size. */
export function PSEMineToolVisual({ tier, size = 'standard' }: { tier: PSEToolTierId; size?: 'compact' | 'standard' }) {
  const labels: Record<PSEToolTierId, string> = {
    starter: 'Starter single-bay module',
    builder: 'Builder stacked two-bay module with central spine and service rail',
    advanced: 'Advanced three-bay array with layered rails and vents',
    elite: 'Elite multi-chamber module with crest and nameplate',
  };
  const accent = tier === 'starter' ? '#73C7D3' : tier === 'elite' ? '#9885D8' : '#5B83F5';

  return (
    <svg className={`pm-tool-visual pm-tool-visual-${tier} pm-tool-visual-${size}`} viewBox="0 0 144 42" role="img" aria-label={labels[tier]}>
      {tier === 'starter' && <g>
        <rect x="43" y="7" width="58" height="31" rx="4" fill="#20252C" stroke={accent} />
        <rect x="50" y="13" width="44" height="19" rx="2" fill="#2C333C" stroke="#52606B" />
        <path d="M57 18H87M57 23H87M57 28H78" stroke={accent} strokeWidth="1.4" />
        <circle cx="88" cy="28" r="2" fill={accent} />
        <path d="M39 39H105" stroke="#59616B" />
      </g>}
      {tier === 'builder' && <g>
        <path d="M27 7H117V35H27Z" fill="#20252C" stroke={accent} />
        <rect x="37" y="10" width="70" height="10" rx="2" fill="#2C333C" stroke={accent} />
        <rect x="37" y="23" width="70" height="9" rx="2" fill="#2C333C" stroke={accent} />
        <path d="M72 7V35M18 38H126M22 35V40M122 35V40" stroke={accent} strokeWidth="1.5" />
        <path d="M43 15H62M81 15H101M43 27H62M81 27H101" stroke="#9BA7B4" strokeWidth="1" />
      </g>}
      {tier === 'advanced' && <g>
        <path d="M13 10H131V34H13Z" fill="#20252C" stroke="#515B68" />
        {[24, 60, 96].map(x => <g key={x}>
          <rect x={x} y="13" width="26" height="18" rx="2" fill="#2C333C" stroke={accent} />
          <path d={`M${x + 5} 18H${x + 21}M${x + 5} 22H${x + 18}M${x + 5} 26H${x + 21}`} stroke={accent} strokeWidth="1" />
          <circle cx={x + 22} cy="28" r="1" fill="#9885D8" />
        </g>)}
        <path d="M8 7H136M8 37H136M15 5V9M129 5V9M17 34V39M127 34V39" stroke="#9885D8" strokeWidth="1.2" />
      </g>}
      {tier === 'elite' && <g>
        <path d="M21 11 29 7H115L123 11V35H21Z" fill="#20252C" stroke={accent} strokeWidth="1.4" />
        <path d="M58 7 72 1 86 7 82 12H62Z" fill={accent} />
        <rect x="34" y="14" width="30" height="8" rx="1.5" fill="#2C333C" stroke={accent} />
        <rect x="80" y="14" width="30" height="8" rx="1.5" fill="#2C333C" stroke={accent} />
        <rect x="42" y="25" width="60" height="7" rx="1.5" fill="#2C333C" stroke={accent} />
        <path d="M48 18H57M86 18H104M53 28H91M16 38H128M25 35V40M119 35V40" stroke={accent} strokeWidth="1.3" />
        <path d="M67 14H77V22H67Z" fill="#252B33" stroke="#B8A6F1" />
      </g>}
    </svg>
  );
}

/** Displays all four tool tiers with their configured prices, capacities, and ownership limits. */
export function PSEMineToolFamily() {
  return (
    <div className="pm-tool-family">
      {TIERS.map(tier => {
        const tool = LOCKED_PSEMINE_TOOLS[tier];
        return (
          <article className={`pm-tool-product pm-tool-product-${tier}`} key={tool.id}>
            <PSEMineToolVisual tier={tier} />
            <p className="pm-eyebrow">Tier {tool.tier}</p>
            <h3>{tool.name}</h3>
            <p>{tool.tagline}</p>
            <dl className="pm-tool-facts">
              <div><dt>Price</dt><dd>{`£${tool.purchasePriceGBP.toFixed(2)}`}</dd></div>
              <div><dt>Capacity</dt><dd>{gbpHour(tool.hourlyRateGBP)}</dd></div>
              <div><dt>Limit</dt><dd>{tool.maxPerUser} per account</dd></div>
              <div><dt>Operating model</dt><dd>{tool.operating.model === 'continuous' ? 'Continuous' : '24-hour sessions'}</dd></div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

/** Displays tool ownership and backend capacity totals, marking missing values as unavailable. */
export function PSEMineCapacityRegister({ counts, qualifiedReferrals, toolCapacity, referralCapacity, totalCapacity }: {
  counts?: Partial<Record<PSEToolTierId, number>> | null;
  qualifiedReferrals?: number | null;
  toolCapacity?: number | null;
  referralCapacity?: number | null;
  totalCapacity?: number | null;
}) {
  const tiers = TIERS.map(tier => {
    const tool = LOCKED_PSEMINE_TOOLS[tier];
    const count = counts?.[tier];
    return { name: tool.name.replace(' Miner', ''), count, amount: gbpHour(tool.hourlyRateGBP) };
  });
  const rows = [
    ...tiers.map(t => ({ label: t.name, detail: t.count === undefined ? 'Ownership unavailable' : `${t.count} owned`, amount: t.amount })),
    { label: 'Referrals', detail: qualifiedReferrals == null ? 'Qualification unavailable' : `${qualifiedReferrals} qualified`, amount: `+${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} each` },
    { label: 'Tools total', detail: 'Backend-reported capacity', amount: toolCapacity == null ? null : gbpHour(toolCapacity) },
    { label: 'Referral total', detail: 'Backend-reported capacity', amount: referralCapacity == null ? null : gbpHour(referralCapacity) },
    { label: 'Overall total', detail: 'Backend-reported capacity', amount: totalCapacity == null ? null : gbpHour(totalCapacity) },
  ];

  return (
    <div className="pm-capacity-register" aria-label="Capacity register">
      <div className="pm-capacity-head"><span>Capacity source</span><span>Position</span><span>Rate / hour</span></div>
      {rows.map(row => (
        <div className={`pm-capacity-row${row.label.includes('total') || row.label === 'Overall total' ? ' pm-capacity-total' : ''}`} key={row.label}>
          <span>{row.label}</span><span>{row.detail}</span><strong>{row.amount === null ? '—' : row.amount}</strong>
        </div>
      ))}
      <div className="pm-capacity-mobile" aria-label="Capacity summary">
        <div><span>Tools</span><strong>{toolCapacity == null ? '—' : gbpHour(toolCapacity)}</strong></div>
        <div><span>Referrals</span><strong>{referralCapacity == null ? '—' : gbpHour(referralCapacity)}</strong></div>
        <div><span>Total</span><strong>{totalCapacity == null ? '—' : gbpHour(totalCapacity)}</strong></div>
      </div>
      <p className="pm-capacity-equation">Tool capacity + referral capacity = total capacity / hour</p>
    </div>
  );
}

const CAMPAIGN_STAGES = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'active', label: 'Active / Mining' },
  { id: 'ended', label: 'Mining Ends' },
  { id: 'settling', label: 'Settlement' },
  { id: 'payout', label: 'Payout Processing' },
  { id: 'closed', label: 'Closed' },
  { id: 'archived', label: 'Archived' },
] as const;

const CAMPAIGN_STAGE_INDEX: Record<string, number> = {
  scheduled: 0,
  active: 1,
  paused: 1,
  ended: 2,
  settling: 3,
  payout: 4,
  closed: 5,
  archived: 6,
};

/** Shows the reported campaign stage; paused shares the active position and unknown states select none. */
export function PSEMineCampaignRail({ status }: { status?: string | null }) {
  const index = status ? CAMPAIGN_STAGE_INDEX[status] : undefined;
  const current = index === undefined ? null : CAMPAIGN_STAGES[index];
  const detail = status === 'paused' ? 'Mining is paused by the campaign.' : current ? `Current backend state: ${current.label}.` : 'The current campaign position is unavailable.';

  return (
    <div className="pm-campaign-rail">
      <ol aria-label="Campaign lifecycle">
        {CAMPAIGN_STAGES.map((stage, i) => (
          <li className={index === i ? 'is-current' : index !== undefined && i < index ? 'is-complete' : ''} key={stage.id} aria-current={index === i ? 'step' : undefined}>
            <span className="pm-rail-node" aria-hidden="true">{index !== undefined && i < index ? '✓' : String(i + 1).padStart(2, '0')}</span>
            <span>{stage.label}</span>
          </li>
        ))}
      </ol>
      <p>{detail}</p>
    </div>
  );
}

/** Labels a zero-based referral lane as qualified when its index is below the qualified count. */
export function qualifiedReferralLaneLabel(index: number, qualified: number) {
  return index < qualified ? 'Qualified' : 'Available';
}

export const MAX_REFERRAL_CAPACITY = PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR;
