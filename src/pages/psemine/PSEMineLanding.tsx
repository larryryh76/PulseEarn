import React from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, gbp, gbpHour, useCampaignClock, usePseDocumentTitle,
} from '../../components/psemine/pseCore';

/**
 * PSEmine public page at /mine — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The marketing brief (seven ruled chapters, specimen console, instrument
 * sheets) was purged in `refactor(psemine): purge legacy design implementation`.
 * This page states the product's real facts and gives the visitor a way in; it
 * is not a design, and it invents nothing: campaign status, dates, prices,
 * hourly rates, ownership limits and capacity ceilings all come from the locked
 * economics and the campaign record.
 */
const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

export const PSEMineLanding: React.FC = () => {
  const { campaign } = usePSEMine();
  const { currentUser, loading: authLoading } = usePSEMineAuth();

  usePseDocumentTitle('90-day mining campaign');

  const clock = useCampaignClock(campaign);
  const status = campaignStatusView(campaign?.status);
  const durationDays = campaign?.durationDays ?? PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;
  const purchaseEnabled = campaign?.purchaseEnabled !== false && (!campaign?.status || campaign.status === 'active');

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 pb-16 sm:p-6">
      <header className="space-y-3 border-b border-border pb-5">
        <h1 className="text-2xl font-semibold text-text-primary">PSEmine — {durationDays}-day mining campaign</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          PSEmine is a campaign-based mining product. Mining tools are purchased with BNB, each tool provides a fixed
          hourly capacity denominated in GBP, and accrued earnings settle after the campaign ends. Tools are capacity
          operated for the campaign — no hardware, electricity or hosting is managed by the account holder.
        </p>
        <p className="text-sm text-text-secondary">
          Campaign status: {status.label}{' '}
          {clock.dayNumber !== null && <>· Day {clock.dayNumber} of {clock.totalDays}</>}
          {clock.daysLeft !== null && <> · {clock.daysLeft} days remaining</>}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {authLoading ? (
            <span className="text-sm text-text-secondary">Checking session…</span>
          ) : currentUser ? (
            <Link to="/mine/dashboard" className="text-sm underline">Open the mining console</Link>
          ) : (
            <>
              <Link to="/mine/signup" className="text-sm underline">Create account</Link>
              <Link to="/mine/login" className="text-sm underline">Sign in</Link>
            </>
          )}
          <Link to="/mine/guide" className="text-sm underline">How PSEmine works</Link>
          <Link to="/help" className="text-sm underline">Support</Link>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text-primary">Mining tools</h2>
        <p className="text-sm text-text-secondary">
          Prices and hourly rates are fixed in GBP; you pay the fixed GBP price in BNB at the rate quoted when the
          purchase is requested. Purchase availability: {purchaseEnabled ? 'open while the campaign is active' : 'closed for the current campaign status'}.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Tool', 'Tier', 'Price', 'Capacity', 'Ownership limit', 'Operation'].map(h => (
                  <th key={h} scope="col" className="border-b border-border py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOOLS.map(tool => (
                <tr key={tool.id}>
                  <td className="border-b border-border py-2 pr-3 text-text-primary">{tool.name}</td>
                  <td className="border-b border-border py-2 pr-3 text-text-primary">{tool.tier}</td>
                  <td className="border-b border-border py-2 pr-3 text-text-primary">{gbp(tool.purchasePriceGBP)}</td>
                  <td className="border-b border-border py-2 pr-3 text-text-primary">{gbpHour(tool.hourlyRateGBP)}</td>
                  <td className="border-b border-border py-2 pr-3 text-text-primary">{tool.maxPerUser}</td>
                  <td className="border-b border-border py-2 pr-3 text-text-primary">
                    {tool.operating?.model === 'continuous' ? 'Continuous' : 'Session — manual restart'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text-primary">Capacity and settlement</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
          <li>
            Tool capacity is the sum of the owned tools, capped at {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}.
          </li>
          <li>
            Each qualified referral adds {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}, up to{' '}
            {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referrals ({gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}).
          </li>
          <li>Maximum total capacity is {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.</li>
          <li>
            A tool with a session operating model stops mining when its session ends and accrues nothing until it is
            restarted; Elite Miner mines continuously while the campaign is active.
          </li>
          <li>
            Accrued earnings are campaign earnings: they settle after the campaign ends and are paid in BNB on{' '}
            {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} (chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}) to the payout
            wallet configured on the account, after review.
          </li>
          <li>
            A referral qualifies only at the last of five stages (registered → wallet connected → tool purchased →
            mining active → qualified), and adds capacity from that moment forward — never retroactively.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text-primary">Accounts</h2>
        <p className="max-w-3xl text-sm text-text-secondary">
          PSEmine and PulseEarn share one sign-in identity and nothing else. PSEmine has its own tools, GBP accounting,
          ledger, activity and payouts. Product access is explicit: an account without PSEmine access is told so and can
          enable it, and no PSEmine data is read for an account that is not enrolled.
        </p>
        <p className="text-sm text-text-secondary">
          Terms: <Link to="/terms" className="underline">Terms of Service</Link> ·{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </section>
    </main>
  );
};

export default PSEMineLanding;
