/**
 * The PSEmine Guide — the product's operating manual, shown over the console.
 *
 * It is the same product as the dashboard, not a second one: the plate is built
 * from the console's own surfaces, rules and type scale, and every figure it
 * prints is derived from the same locked configuration the product runs on.
 *
 * Behaviour preserved from the previous guide: route-based and query-based
 * opening (owned by PSEMineShell), Escape and backdrop dismissal, counted scroll
 * locking, topic search, section rail, onboarding completion, and the onClose
 * contract. Focus is trapped while open and returned to the opener on close.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  gbp, gbpHour, REFERRAL_STAGES, REFERRAL_STAGE_MAP, useEscapeKey, useScrollLock,
} from './pseCore';
import { PseButton, PseFact, PseFacts, PseIconButton } from './PseBasics';
import { ArrowRight, BookOpen, Check, Search, X } from 'lucide-react';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const C = PSEMINE_CONSTANTS;
const SESSION_TOOL = TOOLS.find(t => t.operating.model === 'session');

interface GuideSection {
  id: string;
  short: string;
  title: string;
  tag: string;
  keywords: string;
  visual: React.ReactNode;
  summary: string;
  details: string[];
  action?: { to: string; label: string };
}

const SECTIONS: GuideSection[] = [
  {
    id: 'campaign',
    short: 'Campaign',
    title: 'How the 90-day campaign works',
    tag: 'Campaign',
    keywords: 'campaign 90 days term rules gbp bnb bsc settlement window',
    summary: `PSEmine runs one fixed campaign of ${C.CAMPAIGN_DURATION_DAYS} days. Unit prices and hourly capacity are denominated in GBP; a settled balance is paid in BNB on BNB Smart Chain.`,
    visual: (
      <PseFacts cols={2}>
        <PseFact label="Campaign term" value={`${C.CAMPAIGN_DURATION_DAYS} days`} />
        <PseFact label="Accounting" value="GBP" />
        <PseFact label="Payout asset" value="BNB" />
        <PseFact label="Payout network" value="BNB Smart Chain" text />
      </PseFacts>
    ),
    details: [
      `The campaign window is ${C.CAMPAIGN_DURATION_DAYS} days from launch. The dashboard prints the backend's own start and end dates; when they are not reported it says so rather than inventing a schedule.`,
      'Accrual is calculated by the PSEmine service against a server-side checkpoint. The console displays that checkpoint and interpolates between reads for presentation.',
      'Hourly capacity is a campaign rate, not a promise of return: nothing accrues while the campaign is paused or ended, or while a unit is not operating.',
      'Ownership limits, unit prices and hourly rates are fixed for the campaign and are enforced by the backend.',
    ],
    action: { to: '/mine/dashboard', label: 'Open the dashboard' },
  },
  {
    id: 'tools',
    short: 'Mining units',
    title: 'Mining units, prices and ownership caps',
    tag: 'Equipment',
    keywords: 'starter builder advanced elite miner price rate cap units hardware',
    summary: 'Four unit tiers, each with a fixed purchase price, a fixed hourly capacity and a per-account ownership cap.',
    visual: (
      <div className="pse-guide-roster">
        {TOOLS.map(t => (
          <div key={t.id} className="pse-guide-roster-cell">
            <span className="pse-guide-roster-name">{t.name}</span>
            <span className="pse-guide-roster-price">{gbp(t.purchasePriceGBP)}</span>
            <span className="pse-guide-roster-rate">{gbpHour(t.hourlyRateGBP)}</span>
            <span className="pse-guide-roster-note">
              {t.maxPerUser} max · {t.operating.model === 'continuous' ? 'continuous' : 'session'}
            </span>
          </div>
        ))}
      </div>
    ),
    details: TOOLS.map(t => `${t.name}: ${gbp(t.purchasePriceGBP)} for ${gbpHour(t.hourlyRateGBP)} of capacity, capped at ${t.maxPerUser} units per account.`),
    action: { to: '/mine/tools', label: 'Open mining tools' },
  },
  {
    id: 'capacity',
    short: 'Capacity',
    title: 'What your hourly capacity is made of',
    tag: 'Economics',
    keywords: 'capacity rate hourly unit referral ceiling arithmetic',
    summary: 'Total capacity is unit capacity plus qualified-referral capacity. It is the rate the account accrues at while units are operating, not a balance.',
    visual: (
      <PseFacts cols={2}>
        <PseFact label="Unit capacity ceiling" value={gbpHour(C.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} hint="maximum of every tier" />
        <PseFact label="Per qualified referral" value={`+${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}`} />
        <PseFact label="Referral capacity ceiling" value={gbpHour(C.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} hint={`${C.MAX_QUALIFIED_REFERRALS} qualified referrals`} />
        <PseFact label="Total capacity ceiling" value={gbpHour(C.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} hint="units plus referrals" />
      </PseFacts>
    ),
    details: [
      `Unit capacity is the combined hourly rate of the units you own. Holding the maximum of every tier gives ${gbpHour(C.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}.`,
      `Each qualified referral adds ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}, up to ${C.MAX_QUALIFIED_REFERRALS} referrals (${gbpHour(C.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}).`,
      `Total capacity therefore cannot exceed ${gbpHour(C.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.`,
      'Referral capacity accrues only while you have at least one unit actually operating.',
    ],
    action: { to: '/mine/dashboard', label: 'Check your capacity' },
  },
  {
    id: 'referrals',
    short: 'Referrals',
    title: 'How a referral qualifies',
    tag: 'Referrals',
    keywords: 'referral qualified stages bonus friends signup wallet purchase mining',
    summary: 'A referral counts at the fifth stage only. Each earlier stage is verified against the referral’s own account, and capacity is added from the moment of qualification — never retroactively.',
    visual: (
      <ol className="pse-chain">
        {REFERRAL_STAGES.map((stage, index) => {
          const view = REFERRAL_STAGE_MAP[stage.id];
          return (
            <li key={stage.id} className="pse-chain-step" data-terminal={index === REFERRAL_STAGES.length - 1}>
              <span className="pse-chain-num" aria-hidden="true">{index + 1}</span>
              <div className="pse-chain-body">
                <span className="pse-chain-name">
                  {view.label}
                  {index === REFERRAL_STAGES.length - 1 ? ` · +${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)}` : ''}
                </span>
                <span className="pse-chain-note">{view.help}</span>
              </div>
            </li>
          );
        })}
      </ol>
    ),
    details: [
      `Each qualified referral adds ${gbpHour(C.REFERRAL_BONUS_GBP_PER_HOUR)} of capacity, up to ${C.MAX_QUALIFIED_REFERRALS} qualified referrals (${gbpHour(C.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}).`,
      'Capacity applies from qualification forward. It is not credited for earlier time.',
      'A referral must purchase and operate a unit with their own funds; an account that never reaches the final stage adds nothing.',
      'Ineligible referrals can have the capacity they added removed when the account’s figures are recomputed.',
    ],
    action: { to: '/mine/referrals', label: 'Open referrals' },
  },
  {
    id: 'timeline',
    short: 'Timeline',
    title: 'Campaign states and the timeline',
    tag: 'Schedule',
    keywords: 'timeline schedule status active paused settling payout closed day 90',
    summary: 'The campaign moves through backend states. The status chip on every console page is the backend’s own status, not a client-side guess.',
    visual: (
      <ol className="pse-chain">
        {[
          { name: 'Scheduled', note: 'Dates are set. Accrual has not started.' },
          { name: 'Active', note: 'Units operate and the account accrues against a server checkpoint.' },
          { name: 'Paused', note: 'Accrual stops network-wide and resumes when the campaign resumes.' },
          { name: 'Settling', note: 'Mining has stopped. Final balances are being calculated.' },
          { name: 'Payout', note: 'Settled balances are being prepared for disbursement.' },
          { name: 'Closed', note: 'The campaign is finished and its records remain on the account.' },
        ].map((phase, index) => (
          <li key={phase.name} className="pse-chain-step" data-terminal={index === 5}>
            <span className="pse-chain-num" aria-hidden="true">{index + 1}</span>
            <div className="pse-chain-body">
              <span className="pse-chain-name">{phase.name}</span>
              <span className="pse-chain-note">{phase.note}</span>
            </div>
          </li>
        ))}
      </ol>
    ),
    details: [
      'The campaign day and progress are derived from the backend’s start and end dates. A scheduled campaign shows its opening date instead of progress.',
      'Nothing accrues while the campaign is paused or after it has ended, and nothing accrues for a unit that is not operating.',
      'Settlement finalises accrual at the end of the window. A settled balance then passes through review before it is paid.',
    ],
    action: { to: '/mine/dashboard', label: 'View the campaign window' },
  },
  {
    id: 'payment',
    short: 'Buying a unit',
    title: 'Quotes, payment and activation',
    tag: 'Blockchain',
    keywords: 'payment bnb bep20 quote transaction verification activation bsc',
    summary: 'A unit’s price is fixed in GBP. You pay the BNB amount on your own live quote, and the unit activates only after the payment is verified on-chain.',
    visual: (
      <ol className="pse-chain">
        {[
          { name: 'Request a quote', note: 'The quote states the GBP price and the exact BNB amount, and expires after a short window.' },
          { name: 'Send the exact amount', note: 'From your own wallet, on BNB Smart Chain, to the address printed on the quote.' },
          { name: 'Verification', note: 'PSEmine matches the transfer against the purchase and the chain record.' },
          { name: 'Activation', note: 'The unit is recorded on the account and its capacity starts from activation.' },
        ].map((step, index) => (
          <li key={step.name} className="pse-chain-step" data-terminal={index === 3}>
            <span className="pse-chain-num" aria-hidden="true">{index + 1}</span>
            <div className="pse-chain-body">
              <span className="pse-chain-name">{step.name}</span>
              <span className="pse-chain-note">{step.note}</span>
            </div>
          </li>
        ))}
      </ol>
    ),
    details: [
      'A quote is time-limited. If it expires, request a new one instead of reusing the old amount.',
      'Send only to the address printed on your own live quote, and only on BNB Smart Chain. A blockchain transaction cannot be recalled.',
      'A expired, underpaid, mismatched or wrong-network payment is recorded against the purchase and reviewed; it is not silently absorbed or auto-corrected.',
      'Capacity begins at activation, not at the moment the payment was sent.',
    ],
    action: { to: '/mine/tools', label: 'Open mining tools' },
  },
  {
    id: 'operations',
    short: 'Operations',
    title: 'Session and continuous units',
    tag: 'Operations',
    keywords: 'duty cycle session continuous restart maintenance operating uptime',
    summary: 'Starter, Builder and Advanced use a 24-hour session cycle with free manual maintenance. Elite operates continuously while the campaign is active.',
    visual: (
      <PseFacts cols={1}>
        <PseFact label="Session units" value="Starter, Builder and Advanced mine in fixed sessions, then stop until restarted." text />
        <PseFact label="Continuous units" value="Elite mines while the campaign is active and needs no manual restart." text />
        <PseFact
          label="Restart delay"
          value={SESSION_TOOL?.operating.restartDelayMinutes ? `${SESSION_TOOL.operating.restartDelayMinutes} minutes` : 'Backend-scheduled'}
          hint="nothing accrues during the restart"
        />
      </PseFacts>
    ),
    details: [
      'Starter, Builder and Advanced complete a 24-hour operating session. Use the following 6-hour maintenance window to request a free manual restart; earnings accrue during active operating sessions.',
      'After maintenance is requested, the next session starts after a 10-minute restart delay. The next 24-hour earning session begins when the tool is active again.',
      'If the 6-hour maintenance window passes, the tool stays paused until you request maintenance. You can restart it from the tools page.',
      'Elite operates continuously while the campaign is active and does not use this manual maintenance cycle. Live states and countdowns come from your account records.',
    ],
    action: { to: '/mine/tools', label: 'Manage owned units' },
  },
  {
    id: 'settlement',
    short: 'Settlement',
    title: 'Settlement, payouts and the payout wallet',
    tag: 'Payouts',
    keywords: 'settlement wallet payout bnb bep20 review withdrawal address',
    summary: 'Accrual becomes payable when settlement finalises it. Payouts are made in BNB to the payout wallet recorded on your account.',
    visual: (
      <ol className="pse-chain">
        {[
          { name: 'Accrual', note: 'Capacity accrues campaign earnings in GBP against a server-side checkpoint.' },
          { name: 'Settlement', note: 'Mining stops at the end of the window and final balances are computed.' },
          { name: 'Review', note: 'Each payout passes review before anything is sent.' },
          { name: 'Payout', note: 'Settled GBP is paid in BNB to the recorded payout wallet.' },
        ].map((step, index) => (
          <li key={step.name} className="pse-chain-step" data-terminal={index === 3}>
            <span className="pse-chain-num" aria-hidden="true">{index + 1}</span>
            <div className="pse-chain-body">
              <span className="pse-chain-name">{step.name}</span>
              <span className="pse-chain-note">{step.note}</span>
            </div>
          </li>
        ))}
      </ol>
    ),
    details: [
      'Set your payout wallet before the campaign’s wallet-change cutoff. After the cutoff, the address on file is the address that is paid.',
      'Accrual before settlement, the purchase price you paid and referral capacity are not payable as a payout. Only a settled, approved balance is.',
      'Payout requests open after settlement. The request form states the minimum and the amount available; one request is reviewed at a time.',
      'Check the address carefully: PSEmine pays the address you record and cannot reverse a payout that reached it.',
    ],
    action: { to: '/mine/wallet', label: 'Open wallet and settlement' },
  },
];

export const PseGuide: React.FC<{
  mode?: 'reference' | 'onboarding';
  onClose: () => void;
}> = ({ mode = 'reference', onClose }) => {
  const { currentUser } = usePSEMineAuth();
  const isOnboarding = mode === 'onboarding';

  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [dragY, setDragY] = useState(0);

  const dragging = useRef(false);
  const dragStart = useRef(0);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useScrollLock(true);
  useEscapeKey(true, onClose);

  // Dialog semantics: focus moves into the plate, Tab stays inside it, and the
  // opener gets focus back when the plate closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !plateRef.current) return;
      const focusable = Array.from(
        plateRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

  const handleCompleteOnboarding = async () => {
    if (!currentUser) { onClose(); return; }
    setFinishing(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true });
      toast.success('Welcome to PSEmine');
      onClose();
    } catch {
      toast.error('Your onboarding progress could not be saved. You can close the guide and try again.');
    } finally {
      setFinishing(false);
    }
  };

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(s =>
      [s.title, s.short, s.tag, s.keywords, s.summary, ...s.details]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [searchQuery]);

  const currentSection = filteredSections.find(s => s.id === activeId) ?? filteredSections[0] ?? null;
  const visibleIndex = currentSection ? filteredSections.findIndex(s => s.id === currentSection.id) : -1;
  const isFirst = visibleIndex <= 0;
  const isLast = visibleIndex === filteredSections.length - 1;

  const selectSection = (id: string) => {
    setActiveId(id);
    stageRef.current?.scrollTo({ top: 0 });
  };

  const goTo = (index: number) => {
    const next = filteredSections[Math.max(0, Math.min(filteredSections.length - 1, index))];
    if (next) selectSection(next.id);
  };

  // Mobile bottom-sheet swipe dismissal. The grip is not a control: the Close
  // button is the operable dismissal, and this is an addition to it.
  const onGripDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragStart.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onGripMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  };

  const onGripEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > 120) onClose();
    setDragY(0);
  };

  const totalTopics = SECTIONS.length;
  const position = currentSection ? SECTIONS.findIndex(s => s.id === currentSection.id) + 1 : 0;

  return (
    <div className="pse-guide-scrim" onClick={onClose} role="presentation">
      <div
        ref={plateRef}
        className="pse-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pse-guide-title"
        data-dragging={dragY > 0 ? 'true' : undefined}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="pse-guide-grip"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripEnd}
          onPointerCancel={onGripEnd}
        >
          <span className="pse-guide-grip-bar" />
        </div>

        <header className="pse-guide-head">
          <div className="pse-guide-id">
            <BookOpen size={15} aria-hidden="true" className="pse-guide-mark" />
            <h2
              id="pse-guide-title"
              className="pse-guide-name"
              ref={headingRef}
              tabIndex={-1}
            >
              {isOnboarding ? 'PSEmine onboarding' : 'PSEmine operating guide'}
            </h2>
          </div>
          <span className="pse-guide-progress">
            {position > 0 ? `${position} / ${totalTopics}` : `0 / ${totalTopics}`}
          </span>
          <PseIconButton label="Close guide" onClick={onClose}>
            <X size={16} />
          </PseIconButton>
        </header>

        <div className="pse-guide-toolbar">
          <div className="pse-guide-search">
            <Search size={14} aria-hidden="true" className="pse-guide-search-icon" />
            <input
              type="search"
              className="pse-input pse-guide-search-input"
              placeholder="Search topics — tools, settlement, wallets…"
              aria-label="Search guide topics"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="pse-guide-search-clear"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="pse-guide-body">
          <nav className="pse-guide-rail" aria-label="Guide topics">
            {filteredSections.length === 0 ? (
              <div className="pse-guide-empty">
                <p>No topic matches “{searchQuery}”.</p>
                <PseButton variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                  Clear search
                </PseButton>
              </div>
            ) : (
              <ul className="pse-guide-rail-list">
                {filteredSections.map(section => {
                  const fullIndex = SECTIONS.findIndex(s => s.id === section.id);
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        className="pse-guide-rail-item"
                        aria-current={section.id === currentSection?.id ? 'true' : undefined}
                        onClick={() => selectSection(section.id)}
                      >
                        <span className="pse-guide-rail-num" aria-hidden="true">
                          {String(fullIndex + 1).padStart(2, '0')}
                        </span>
                        <span>{section.short}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <div className="pse-guide-stage" ref={stageRef}>
            {currentSection ? (
              <div className="pse-guide-stack">
                <header>
                  <span className="pse-guide-sub-title">{currentSection.tag}</span>
                  <h3 className="pse-guide-title">{currentSection.title}</h3>
                  <p className="pse-guide-lede">{currentSection.summary}</p>
                </header>

                <div className="pse-guide-visual">{currentSection.visual}</div>

                <div className="pse-guide-sub">
                  <h4 className="pse-guide-sub-title">Key terms</h4>
                  <ul className="pse-guide-points">
                    {currentSection.details.map(point => (
                      <li key={point} className="pse-guide-point">
                        <Check size={13} aria-hidden="true" className="pse-guide-point-glyph" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentSection.action && (
                  <div>
                    <Link
                      to={currentSection.action.to}
                      onClick={onClose}
                      className="pse-btn pse-btn--secondary pse-btn--sm"
                    >
                      <span>{currentSection.action.label}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="pse-guide-stack">
                <h3 className="pse-guide-title">No matching topic</h3>
                <p className="pse-guide-lede">
                  Nothing in the guide matches “{searchQuery}”. Clear the search to browse the topics.
                </p>
                <div>
                  <PseButton variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                    Clear search
                  </PseButton>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="pse-guide-foot">
          <span className="pse-guide-foot-note">
            {currentSection ? `${currentSection.short} · ${position} of ${totalTopics}` : 'No topic selected'}
          </span>

          {isOnboarding ? (
            <>
              <PseButton
                variant="secondary"
                size="sm"
                onClick={() => goTo(visibleIndex - 1)}
                disabled={isFirst}
              >
                Back
              </PseButton>
              {isLast ? (
                <PseButton size="sm" onClick={() => void handleCompleteOnboarding()} busy={finishing} disabled={finishing}>
                  Finish and open dashboard
                </PseButton>
              ) : (
                <PseButton size="sm" onClick={() => goTo(visibleIndex + 1)}>
                  Next topic
                </PseButton>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="pse-btn pse-btn--secondary pse-btn--sm"
                onClick={() => goTo(visibleIndex - 1)}
                disabled={isFirst}
              >
                Previous
              </button>
              <button
                type="button"
                className="pse-btn pse-btn--secondary pse-btn--sm"
                onClick={() => goTo(visibleIndex + 1)}
                disabled={isLast}
              >
                Next
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PseGuide;
