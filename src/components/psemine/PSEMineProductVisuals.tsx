import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS, type PSEMineToolDefinition, type PSEToolTierId } from '../../types/psemine';
import { gbpHour } from './pse';

const TIERS: PSEToolTierId[] = ['starter', 'builder', 'advanced', 'elite'];

export function PSEMineToolVisual({ tier, size = 'standard' }: { tier: PSEToolTierId; size?: 'compact' | 'standard' }) {
  const labels: Record<PSEToolTierId, string> = {
    starter: 'Single-bay tool module',
    builder: 'Two-bay tool module with central spine and service rail',
    advanced: 'Three-bay tool array with layered rails',
    elite: 'Flagship multi-chamber tool module with crest and nameplate',
  };
  const accent = tier === 'starter' ? '#73C7D3' : tier === 'elite' ? '#9885D8' : '#5B83F5';
  const bays = tier === 'starter' ? [15] : tier === 'builder' ? [8, 22] : tier === 'advanced' ? [5, 15, 25] : [7, 17, 27];

  return (
    <svg className={`pm-tool-visual pm-tool-visual-${tier} pm-tool-visual-${size}`} viewBox="0 0 144 42" role="img" aria-label={labels[tier]}>
      {tier === 'elite' && <path d="M61 4 72 1 83 4 80 9H64Z" fill={accent} />}
      <rect x="2" y="9" width="140" height="29" rx="5" fill="#20252C" stroke="#3A424D" />
      {tier !== 'starter' && <path d="M12 6H132" stroke={tier === 'advanced' ? '#9885D8' : accent} strokeWidth="1.5" />}
      {tier === 'elite' && <path d="M20 5H124M27 3H117" stroke="#9885D8" strokeWidth="1" opacity=".7" />}
      {bays.map((y, index) => {
        const width = tier === 'starter' ? 32 : tier === 'builder' ? 47 : tier === 'advanced' ? 34 : 39;
        const x = tier === 'starter' ? 19 : tier === 'builder' ? 25 : tier === 'advanced' ? 16 + index * 42 : 13 + index * 39;
        const height = tier === 'starter' ? 17 : tier === 'builder' ? 9 : tier === 'advanced' ? 14 : 20;
        return (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width={width} height={height} rx="2" fill="#2C333C" stroke={accent} strokeOpacity=".75" />
            <path d={`M${x + 5} ${y + 4}H${x + width - 5}`} stroke={accent} strokeWidth="1.5" />
            <circle cx={x + width - 5} cy={y + height - 4} r="1.4" fill={accent} />
          </g>
        );
      })}
      {tier === 'builder' && <path d="M72 7V38M11 35H133" stroke={accent} strokeWidth="1.5" />}
      {tier === 'advanced' && <path d="M9 35H135M14 7H130" stroke="#9885D8" strokeWidth="1" />}
      {tier === 'elite' && <>
        <rect x="58" y="14" width="28" height="12" rx="2" fill="#252B33" stroke={accent} />
        <path d="M63 18H81M67 22H77" stroke={accent} strokeWidth="1" />
      </>}
      {tier === 'starter' && <path d="M13 18H17M13 23H17M13 28H17" stroke={accent} strokeWidth="1.4" />}
      <path d="M8 39H136" stroke="#59616B" strokeWidth="1" />
      <circle cx="11" cy="38" r="2" fill={accent} />
      <circle cx="133" cy="38" r="2" fill={accent} />
    </svg>
  );
}

export function PSEMineToolFamily({ onSelect, actionLabel = 'Explore tool' }: {
  onSelect?: (tool: PSEMineToolDefinition) => void;
  actionLabel?: string;
}) {
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
            {onSelect && <button type="button" className="pm-button pm-button-secondary" onClick={() => onSelect(tool)}>{actionLabel}</button>}
          </article>
        );
      })}
    </div>
  );
}

export function PSEMineCapacityRegister({ counts, toolCapacity, referralCapacity, totalCapacity }: {
  counts?: Partial<Record<PSEToolTierId, number>> | null;
  toolCapacity?: number | null;
  referralCapacity?: number | null;
  totalCapacity?: number | null;
}) {
  const tiers = TIERS.map(tier => {
    const tool = LOCKED_PSEMINE_TOOLS[tier];
    const count = counts?.[tier];
    return { name: tool.name.replace(' Miner', ''), count, amount: count === undefined ? null : count * tool.hourlyRateGBP };
  });
  const rows = [
    ...tiers.map(t => ({ label: t.name, detail: t.count === undefined ? 'Ownership unavailable' : `${t.count} owned`, amount: t.amount })),
    { label: 'Referrals', detail: 'Qualified lanes', amount: referralCapacity ?? null },
    { label: 'Tools total', detail: 'Reported capacity', amount: toolCapacity ?? null },
    { label: 'Referral total', detail: 'Reported capacity', amount: referralCapacity ?? null },
    { label: 'Overall total', detail: 'Reported capacity', amount: totalCapacity ?? null },
  ];

  return (
    <div className="pm-capacity-register" aria-label="Capacity register">
      <div className="pm-capacity-head"><span>Capacity source</span><span>Position</span><span>Per hour</span></div>
      {rows.map(row => (
        <div className={`pm-capacity-row${row.label.includes('total') || row.label === 'Overall total' ? ' pm-capacity-total' : ''}`} key={row.label}>
          <span>{row.label}</span><span>{row.detail}</span><strong>{row.amount === null ? '—' : gbpHour(row.amount)}</strong>
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

export function qualifiedReferralLaneLabel(index: number, qualified: number) {
  return index < qualified ? 'Qualified' : 'Available';
}

export const MAX_REFERRAL_CAPACITY = PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR;
