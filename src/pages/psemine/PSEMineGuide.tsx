import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PseButton, PseCell, PseNotice, PsePage, PseRow, PseSection, PseTable } from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * Campaign guide and onboarding — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger guide (chapter rail, scroll-spy, progress instrument,
 * accordions) was purged in `refactor(psemine): purge legacy design
 * implementation`. The documentation content stays, stated plainly from the
 * locked economics and the backend rules, and the onboarding completion write is
 * unchanged: it persists `users/{uid}.onboardingCompleted`, the exact field the
 * PSEmine auth gate reads.
 */
const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const RULES: Array<{ title: string; body: string }> = [
  {
    title: 'Tools are capacity, not hardware',
    body: `Mining tools provide a fixed hourly capacity denominated in GBP. You never manage hardware, electricity or hosting — the campaign operates it. Prices and hourly rates are fixed in GBP.`,
  },
  {
    title: 'Sessions and continuous duty',
    body: 'Starter, Builder and Advanced run finite mining sessions: when a session ends, mining stops until the tool is restarted, and the backend needs a short restart period before mining resumes. Elite Miner runs continuously while the campaign is active and never needs a manual restart.',
  },
  {
    title: 'Capacity arithmetic',
    body: `Tool capacity is the sum of your owned tools, capped at ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}. Each qualified referral adds ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}, up to ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referrals (+${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}). Maximum total capacity is ${gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}. Your capacity figure always comes from the backend.`,
  },
  {
    title: 'Payment',
    body: `Purchases are paid in BNB on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} (chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}). The GBP price is fixed; you pay it in BNB at the rate quoted when you request the purchase, and the quoted amount is exact for its window. The backend verifies sender, recipient, amount and confirmations on-chain before a tool activates.`,
  },
  {
    title: 'Referrals',
    body: 'A referral qualifies at the last of five stages: registered, wallet connected, tool purchased, mining active, qualified. Only qualified referrals add capacity, it applies from the qualification moment forward, and at most the stated number of referrals count. Qualification and fraud controls are enforced by the backend.',
  },
  {
    title: 'Settlement and payouts',
    body: `Accrual runs while the campaign is active and stops when it ends. Balances settle after the campaign, then payout requests open for settled amounts (minimum ${gbp(10)}), paid in BNB to the payout wallet configured on your account, after review. Accrued earnings are not withdrawable before settlement finalises them.`,
  },
  {
    title: 'Your account',
    body: 'Your PSEmine account holds its own tools, GBP accounting, activity and payouts. Signing in is the only step shared with anything else; everything you buy, accrue and withdraw belongs to PSEmine and is recorded against your account.',
  },
];

export const PSEMineGuide: React.FC<{ onboarding?: boolean }> = ({ onboarding = false }) => {
  usePseDocumentTitle(onboarding ? 'Onboarding' : 'Campaign guide');
  const { currentUser, userData } = usePSEMineAuth();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);

  const completeOnboarding = async () => {
    if (!currentUser) return;
    setCompleting(true);
    try {
      // Persists to users/{uid}.onboardingCompleted — the exact field the PSEmine
      // auth gate reads. Firestore rules whitelist this single field for owner
      // updates; nothing else may accompany it.
      await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true });
      toast.success('You\u2019re ready. Welcome to PSEmine.');
      navigate('/mine/dashboard', { replace: true });
    } catch {
      toast('Could not save the flag — continuing to your dashboard.');
      navigate('/mine/dashboard', { replace: true });
    } finally {
      setCompleting(false);
    }
  };

  const alreadyOnboarded = userData?.onboardingCompleted !== false;

  return (
    <PsePage
      title={onboarding ? 'Your campaign, explained' : 'How PSEmine works'}
      objective={`Everything you need to understand tools, operating cycles, referrals, payments and settlement in the ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day campaign.`}
      actions={onboarding ? <PseButton onClick={() => void completeOnboarding()} disabled={completing}>{completing ? 'Saving…' : 'Complete onboarding'}</PseButton> : undefined}
    >
      {onboarding && (
        <PseNotice>
          This walkthrough appears once after enrolment. You can return to it any time from the console navigation.
          {alreadyOnboarded ? ' Onboarding is already recorded as complete on this account.' : ''}
        </PseNotice>
      )}

      <PseSection title="The tools">
        <PseTable head={['Tool', 'Price', 'Capacity', 'Ownership limit', 'At limit', 'Operation']}>
          {TOOLS.map(tool => (
            <PseRow key={tool.id}>
              <PseCell>{tool.name}</PseCell>
              <PseCell>{gbp(tool.purchasePriceGBP)}</PseCell>
              <PseCell>{gbpHour(tool.hourlyRateGBP)}</PseCell>
              <PseCell>{tool.maxPerUser}</PseCell>
              <PseCell>{gbpHour(tool.hourlyRateGBP * tool.maxPerUser)}</PseCell>
              <PseCell>{tool.operating.model === 'continuous' ? 'Continuous' : 'Session — manual restart'}</PseCell>
            </PseRow>
          ))}
        </PseTable>
      </PseSection>

      {RULES.map(rule => (
        <PseSection key={rule.title} title={rule.title}>
          <p className="max-w-3xl text-sm text-text-secondary">{rule.body}</p>
        </PseSection>
      ))}

      <PseSection title="Where to go next">
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
          <li><Link to="/mine/dashboard" className="underline">Mining console</Link> — mining state, earnings, equipment.</li>
          <li><Link to="/mine/tools" className="underline">Mining tools</Link> — the catalogue and the purchase flow.</li>
          <li><Link to="/mine/wallet" className="underline">Wallet &amp; payouts</Link> — payout wallet and settlement.</li>
          <li><Link to="/mine/referrals" className="underline">Referrals</Link> — invite link and qualification.</li>
          <li><Link to="/help" className="underline">Support</Link></li>
        </ul>
      </PseSection>

      {onboarding && (
        <PseSection title="Finish onboarding">
          <PseButton onClick={() => void completeOnboarding()} disabled={completing}>
            {completing ? 'Saving…' : 'Complete onboarding and open the console'}
          </PseButton>
        </PseSection>
      )}
    </PsePage>
  );
};

export default PSEMineGuide;
