/**
 * The PSEmine authentication frame.
 *
 * ONE shell shared by every PSEmine authentication surface — sign in, sign up,
 * password reset, email verification and the entitlement gate. That is the whole
 * point: a person moving from "create account" to "verify email" to "enable
 * PSEmine" must feel they are inside one product, not three unrelated forms.
 *
 * Composition (desktop): a briefing column stating what PSEmine is and the real
 * terms of the campaign, then the working column with the form. Below 1024px the
 * briefing collapses to a compact masthead above the form plus the same facts
 * underneath it, so a phone gets the identity and the terms without a wall of
 * text before the input.
 *
 * Every fact on the briefing side is REAL: campaign status, duration and the
 * purchase/mining/referral flags come from the server's public campaign contract
 * (`GET /api/mine/campaign/status`), and prices, rates and ceilings come from the
 * locked economics in src/types/psemine.ts (the frontend mirror of
 * api/psemine_core.py). When the campaign cannot be read, the frame says so and
 * offers a retry — it never prints a default status as though it were live.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { campaignStatusView, gbp, gbpHour } from './pseCore';
import { PSEmineLogo } from './PSEBrand';
import { usePublicCampaign } from './psePublicCampaign';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const PRICE_FROM = Math.min(...TOOLS.map(t => t.purchasePriceGBP));
const PRICE_TO = Math.max(...TOOLS.map(t => t.purchasePriceGBP));

/**
 * The campaign's real terms. Rendered twice (briefing column and, compact, under
 * the form on small screens) — one component so the two can never disagree.
 */
export const PseAuthFacts: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { campaign, loading, refreshing, error, refresh } = usePublicCampaign();
  const status = campaignStatusView(campaign?.status);
  const duration = campaign?.durationDays ?? PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;
  const purchaseOpen = campaign?.purchaseEnabled === true && campaign?.status !== 'closed' && campaign?.status !== 'archived';

  /** One row. `value` is a node so a row can carry a retry control. */
  const Row: React.FC<{ term: string; value: React.ReactNode }> = ({ term, value }) => (
    <div className="pse-auth-fact">
      <dt className="pse-auth-fact-key">{term}</dt>
      <dd className="pse-auth-fact-val">{value}</dd>
    </div>
  );

  return (
    <dl className={`pse-auth-facts ${className}`}>
      <Row
        term="Campaign"
        value={
          loading ? (
            <span>Reading…</span>
          ) : error ? (
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              Not available
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="pse-btn pse-btn-quiet pse-btn-sm"
              >
                {refreshing ? 'Retrying…' : 'Retry'}
              </button>
            </span>
          ) : (
            <span>
              {status.label} · {duration} days
            </span>
          )
        }
      />
      <Row
        term="Purchase window"
        value={
          loading ? <span>Reading…</span> : error ? <span>Not available</span> : <span>{purchaseOpen ? 'Open while active' : 'Closed'}</span>
        }
      />
      <Row term="Mining tools" value={<span>{TOOLS.length} tiers · {gbp(PRICE_FROM)}–{gbp(PRICE_TO)}</span>} />
      <Row term="Capacity ceiling" value={<span>{gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}</span>} />
      <Row
        term="Referral capacity"
        value={<span>{gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} × {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}</span>}
      />
      <Row
        term="Payment · payout"
        value={<span className="pse-asset"><span className="pse-asset-dot" aria-hidden="true" />{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</span>}
      />
    </dl>
  );
};

export const PseAuthFrame: React.FC<{
  /** The task this surface performs. Rendered as the working column's heading. */
  title: string;
  /** One truthful sentence about what this surface is for. */
  lede: React.ReactNode;
  children: React.ReactNode;
  /** Cross-links to the sibling surfaces, under the form. */
  footer?: React.ReactNode;
  /**
   * `page` — a standalone full-page surface with the campaign briefing beside it
   * (sign in, sign up, reset, verify).
   * `embedded` — the same design language wrapped by the console shell, which
   * already provides chrome (the entitlement gate renders inside the shell).
   */
  variant?: 'page' | 'embedded';
}> = ({ title, lede, children, footer, variant = 'page' }) => {
  const isPage = variant === 'page';
  return (
  <div className={isPage ? 'pse pse-surface pse-auth' : 'pse pse-surface'}> 
    {/* ── Briefing column (≥1024px, standalone pages only) ──────────────── */}
    {isPage && (
    <section className="pse-auth-brief" aria-label="About PSEmine">
      <div className="pse-auth-brief-inner">
        <Link to="/mine" className="inline-flex w-fit min-h-[44px] items-center">
          <PSEmineLogo size={34} withSub />
        </Link>

        <div className="space-y-4">
          <p className="pse-micro">A PulseEarn campaign product</p>
          <h2 className="pse-h2">
            Mining capacity, held for the length of the campaign and settled in GBP.
          </h2>
          <p className="pse-lead">
            PSEmine sells mining tools for BNB. Each tool adds a fixed hourly capacity in GBP, that capacity accrues
            while the campaign runs, and settled earnings are paid out in BNB to the payout wallet on your account.
          </p>
        </div>

        <div className="space-y-3">
          <p className="pse-micro">Campaign terms</p>
          <PseAuthFacts />
        </div>
      </div>

      <div className="pse-auth-brief-inner">
        <p className="pse-small">
          PulseEarn and PSEmine share a sign-in identity and nothing else. This account is separate from your PulseEarn
          rewards: PSEmine has its own tools, capacity, ledger, activity and payouts.
        </p>
        <p className="pse-small pse-links">
          <Link to="/mine">What PSEmine is</Link>
          {' · '}
          <Link to="/mine/guide">Campaign guide</Link>
          {' · '}
          <Link to="/terms">Terms</Link>
          {' · '}
          <Link to="/privacy">Privacy</Link>
        </p>
      </div>
    </section>
    )}

    {/* ── Working column ────────────────────────────────────────────────── */}
    <section className={isPage ? 'pse-auth-panel' : 'pse-auth-panel min-h-[70vh] justify-center'}>
      <div className="pse-auth-panel-inner">
        {/* Compact masthead: on small screens it carries the identity the
            briefing column shows on desktop; on embedded surfaces the console
            shell already provides the product chrome. */}
        {isPage && (
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <Link to="/mine" className="inline-flex min-h-[44px] items-center">
              <PSEmineLogo size={30} withSub />
            </Link>
            <Link to="/mine" className="pse-small pse-link inline-flex min-h-[44px] items-center">
              About PSEmine
            </Link>
          </div>
        )}

        <header className="space-y-2">
          <h1 className="pse-h2">{title}</h1>
          <p className="pse-body">{lede}</p>
        </header>

        {children}

        {footer && <div className="pt-1">{footer}</div>}

        <div className={`space-y-3 pt-2 ${isPage ? 'lg:hidden' : ''}`}>
          <p className="pse-micro">Campaign terms</p>
          <PseAuthFacts />
          <p className="pse-small">
            Separate product from PulseEarn — the sign-in identity is shared, the product access is not.
          </p>
        </div>
      </div>
    </section>
  </div>
  );
};

export default PseAuthFrame;
