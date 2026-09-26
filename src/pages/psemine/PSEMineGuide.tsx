import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  usePseDocumentTitle, gbp, gbpHour,
} from '../../components/psemine/pse';
import toast from 'react-hot-toast';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const FAQS = [
  { q: 'What happens when a mining session ends?', a: 'Starter, Builder and Advanced miners run finite mining sessions. When a session completes, mining stops — the tool accrues nothing until you restart it from the dashboard. Restarting is free, but the backend needs a short restart period before mining resumes. Nothing is lost: the tool stays owned throughout.' },
  { q: 'Which tools need manual restarts?', a: 'Starter, Builder and Advanced miners are session-based and need a manual restart between sessions. The Elite Miner operates continuously: once activated it keeps mining while the campaign is active, with no manual restart cycle.' },
  { q: 'Can I buy more tools mid-campaign?', a: 'Yes, while the campaign is active and purchases are enabled, up to each tool’s ownership limit. New tools start their own first operating cycle when activated.' },
  { q: 'Why is my earnings number moving slowly?', a: 'Earnings accrue by the hour against your capacity, and only while tools are in an active operating cycle. The figure shown is settled by the backend checkpoint — it never estimates ahead.' },
  { q: 'Is my payout wallet the same as my connected wallet?', a: 'No. The connected wallet is for browsing and payments. The payout wallet is a separate, server-stored destination that receives your settlement. Connecting a wallet never changes your payout destination.' },
  { q: 'When exactly do I get paid?', a: 'After the campaign ends and reaches settlement, payout requests open for eligible balances (minimum £10). Requests are reviewed, then processed to your payout wallet on BNB Smart Chain.' },
  { q: 'What if my BNB payment has a problem?', a: 'The backend records mismatches, underpayments and other verification failures as recovery evidence for review — nothing is auto-assigned or auto-refunded, and no tool activates without passing verification.' },
  { q: 'Does PSEmine use my PulseEarn points?', a: 'No. PSEmine and PulseEarn share one sign-in identity and nothing else. PSEmine works in GBP campaign earnings and BNB payouts; PulseEarn points, tasks and rewards never apply here.' },
];

const SecurityBody: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  return (
    <>
      <p>
        Balances live in an append-only ledger with deterministic entries. Purchases require on-chain verification with
        replay protection. Referral qualification has exactly one auditable path, and product access is an explicit,
        backend-enforced entitlement. The browser displays state — it can never create, claim or alter value.
      </p>
      <section>
        <h3>Purchase, settlement and wallet are separate concerns</h3>
        <p>Purchasing pays a quote-bound, chain-asserted BNB transaction that the backend verifies before a tool activates; settlement finalises the GBP ledger at day 90 and never moves funds itself; payouts move BNB to the wallet you configured before the lock. A connected wallet (signing) never changes the payout wallet (receiving) — that binding is server-stored and locks at settlement.</p>
      </section>
      <button type="button" onClick={() => setShowAdvanced(v => !v)} aria-expanded={showAdvanced}>
        {showAdvanced ? 'Hide advanced security details' : 'Show advanced security details'}
      </button>
      {showAdvanced && (
        <section>
          <h3>Advanced</h3>
          <p><strong>Quote binding</strong> — payer wallet is bound server-side before signing; a later request with a different wallet is rejected as WALLET_MISMATCH until the quote window lapses.</p>
          <p><strong>Chain assertion</strong> — wallet and quote chainId must match before signing; an unreadable chain fails closed, never pays on the wrong network.</p>
          <p><strong>One-send-attempt</strong> — the signing layer allows exactly one broadcast; uncertain submission never retries automatically.</p>
          <p><strong>Payout wallet lock</strong> — changes lock at settlement (backend enforces cut-off); payout requests require verified email and minimum £10 and are reviewed before processing.</p>
          <p><strong>Audit</strong> — every purchase intent, verification failure, referral qualification and settlement sweep is retained as an auditable record; recovery cases are listed for manual review.</p>
        </section>
      )}
    </>
  );
};

type Section = { id: string; title: string; summary: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: 'what', title: 'What PSEmine is', summary: 'A 90-day, GBP-denominated mining campaign',
    body: (
      <>
        <p>
          PSEmine is a 90-day, campaign-based mining product. You purchase mining tools with BNB on BNB Smart Chain.
          Each tool provides a fixed hourly capacity denominated in GBP. Across the campaign, your capacity accrues
          earnings that are calculated and stored server-side. When the campaign ends, accrued balances settle and are paid out.
        </p>
        <dl>
          <div><dt>Duration</dt><dd>90 days, then settlement</dd></div>
          <div><dt>Accounting</dt><dd>GBP (£) fixed rates</dd></div>
          <div><dt>Payment</dt><dd>BNB on BNB Smart Chain</dd></div>
        </dl>
        <p>PSEmine shares its sign-in identity with PulseEarn but is a separate product: separate tools, separate accounting, separate activity and notifications. Points, tasks and PulseEarn rewards never apply here.</p>
      </>
    ),
  },
  {
    id: 'lifecycle', title: 'Campaign lifecycle', summary: 'Four phases from start to payout',
    body: (
      <>
        <p>The campaign moves through four phases. The current phase is always shown in the console strip and on the dashboard — never inferred from dates in your browser.</p>
        <ol>
          <li><strong>Day 0 — Start</strong><p>The campaign opens. Purchases become available and tools begin their first operating cycle.</p></li>
          <li><strong>Days 1–90 — Operations</strong><p>Session tools mine in finite sessions and stop when a session completes until you restart them; Elite mines continuously. Restarts are free and take a short backend period, during which nothing accrues. Capacity adds to your hourly rate as you buy tools and qualify referrals.</p></li>
          <li><strong>Day 90 — Settlement</strong><p>Accrual stops. Final balances are calculated from the append-only mining ledger.</p></li>
          <li><strong>After day 90 — Payout</strong><p>Payout requests open (minimum £10), are reviewed, then processed to your configured payout wallet.</p></li>
        </ol>
      </>
    ),
  },
  {
    id: 'tools', title: 'Mining tools', summary: 'Four tiers, fixed price and fixed capacity',
    body: (
      <>
        <p>Four tools are available, each with a fixed price, a fixed hourly rate and a per-account ownership limit. Tool economics are fixed for the campaign — they don’t change after purchase.</p>
        <dl>
          {TOOLS.map(t => (
            <div key={t.id}>
              <dt>{t.name}</dt>
              <dd>{gbp(t.purchasePriceGBP)} · limit {t.maxPerUser} · {t.operating?.model === 'continuous' ? 'continuous duty' : 'session duty · manual restart'} · {gbpHour(t.hourlyRateGBP)}</dd>
            </div>
          ))}
          <div><dt>Maximum tool capacity (all tiers at limit)</dt><dd>{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</dd></div>
        </dl>
      </>
    ),
  },
  {
    id: 'cycles', title: 'Mining sessions & restarts', summary: 'Session tools restart manually; Elite runs continuously',
    body: (
      <>
        <p>
          Tools do not all run the same way. Starter, Builder and Advanced miners mine in finite <strong>sessions</strong>:
          when a session completes, mining stops and the tool waits for you to restart it. The Elite Miner mines
          <strong> continuously</strong> for as long as the campaign is active, with no manual restart cycle.
        </p>
        <p>
          Restarting a session tool is free, but it is not instant: the backend prepares the next session and mining
          resumes only once that restart period completes. Nothing accrues while a session is stopped or restarting.
          Session length and restart timing are set by the backend campaign configuration, not by the app.
        </p>
        <dl>
          <div><dt>Active</dt><dd>The session is running and the tool is accruing its hourly rate.</dd></div>
          <div><dt>Session Complete</dt><dd>The mining session finished. Mining has stopped — restart the tool to begin the next session.</dd></div>
          <div><dt>Restarting</dt><dd>The restart was requested. Mining resumes automatically once the backend completes the restart period.</dd></div>
          <div><dt>Maintenance Required</dt><dd>The session ended a while ago and no restart has been requested yet. The tool stays yours — restart it to resume.</dd></div>
          <div><dt>Continuous</dt><dd>Elite Miner: mining runs continuously while the campaign is active. No restart required.</dd></div>
        </dl>
        <p>Restarting is always free and always will be. There is no paid restart and no health-percentage system — the backend-reported state itself is the operational truth.</p>
      </>
    ),
  },
  {
    id: 'capacity', title: 'Mining capacity', summary: 'How your hourly rate is composed and capped',
    body: (
      <>
        <p>Your hourly capacity is the sum of your tools plus your qualified referrals — nothing else. The backend calculates every figure; the app only displays what the server reports.</p>
        <section aria-label="Capacity at every limit">
          <h3>Capacity at every limit</h3>
          <p>Every tier at its ownership limit plus five qualified referrals</p>
          <dl>
            {TOOLS.map(tool => {
              const owned = tool.maxPerUser;
              return (
                <div key={tool.id}>
                  <dt>{tool.name.replace(' Miner', '')}</dt>
                  <dd>{owned} of {tool.maxPerUser} owned; {gbpHour(owned * tool.hourlyRateGBP)} held.</dd>
                </div>
              );
            })}
            <div>
              <dt>Referrals</dt>
              <dd>{PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} of {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} qualified; {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} held.</dd>
            </div>
          </dl>
          <p>Tools: {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}. Referrals: {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}. Total: {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR + PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}.</p>
          <p>Maximums: {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} from tools, plus {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} from referrals; theoretical ceiling {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.</p>
        </section>
        <p>Accrual depends on live mining: a session tool earns only while its session is active, and a restarting tool earns nothing until the backend marks the next session active. Elite earns continuously.</p>
      </>
    ),
  },
  {
    id: 'referrals', title: 'Referral capacity', summary: '+£0.30/hour per qualified referral, up to 5',
    body: (
      <>
        <p>
          Invite miners with your referral link. A referral adds <strong>+£0.30/hour</strong> to your capacity only
          after it fully qualifies: the invite registers, connects a BNB Smart Chain wallet, purchases a tool, and their
          first tool activates mining. Up to 5 referrals can qualify (+£1.50/hour at maximum).
        </p>
        <p>Qualification settles on the backend exactly once, and your capacity changes from that moment forward — new referral capacity is never applied retroactively to past operating time.</p>
      </>
    ),
  },
  {
    id: 'purchases', title: 'BNB payments & verification', summary: 'Quotes, exact amounts, on-chain checks',
    body: (
      <>
        <p>Purchases begin with a server-generated quote: the fixed GBP price converted to an exact BNB amount at the live rate. Quotes expire, and the quoted amount is fixed inside that window.</p>
        <p>You send the exact amount to the campaign’s receiving wallet from your connected wallet. The backend then verifies your transaction on-chain — sender, recipient, exact amount, network and confirmation depth — before the tool activates. The app never marks a purchase confirmed on its own, and no other activation path exists.</p>
        <p>Payments and settlements happen only on BNB Smart Chain (chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}). Underpayments and mismatches are detected and recorded for manual review.</p>
        <p>Wallet distinction: the connected wallet signs the payment you approve in the wallet app; the payout wallet is a separate, server-stored address that receives settlement. Connecting a wallet never changes where settlement is paid — that address is set explicitly in Wallet and locks at settlement.</p>
      </>
    ),
  },
  {
    id: 'earnings', title: 'Mining earnings', summary: 'Hourly accrual against active capacity',
    body: (
      <>
        <p>Earnings accrue hourly against active capacity: tool capacity plus qualified referral capacity, capped at {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} maximum. Paused campaigns and completed cycles don’t accrue.</p>
        <p>The displayed balance is settled by the backend at checkpoints and reconciled against the mining ledger — the number you see is the number the ledger supports. Accrued earnings are campaign earnings and are not withdrawable mid-campaign.</p>
      </>
    ),
  },
  {
    id: 'settlement', title: 'Settlement & payouts', summary: 'Day 90, then reviewed payouts',
    body: (
      <>
        <p>At day 90, accrual stops and the campaign settles. Final balances are computed from the ledger, payout requests open (minimum £10), and each request is reviewed before being processed to your configured payout wallet on BNB Smart Chain.</p>
        <dl>
          <div><dt>Purchase</dt><dd>Spend BNB once per tool — quote-bound, verified on-chain, then the tool mines</dd></div>
          <div><dt>Settlement</dt><dd>Ledger finalised at day 90 — accrual stops, final GBP balances computed</dd></div>
          <div><dt>Payout</dt><dd>Request reviewed payout in BNB to your locked payout wallet (min £10)</dd></div>
        </dl>
        <p>Payout wallet changes lock at settlement. Set your payout wallet early and verify it carefully — the connected signing wallet never becomes the payout destination.</p>
      </>
    ),
  },
  {
    id: 'security', title: 'Security model', summary: 'Server-authoritative by design',
    body: <SecurityBody />,
  },
];

export const PSEMineGuide: React.FC<{ onboarding?: boolean }> = ({ onboarding = false }) => {
  usePseDocumentTitle(onboarding ? 'Onboarding' : 'Campaign guide');
  const { currentUser, userData } = usePSEMineAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [completing, setCompleting] = useState(false);
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([SECTIONS[0]?.id ?? 'what']),
  );
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0]?.id ?? 'what');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.sectionId;
            if (id) setActiveSection(id);
          }
        }
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    );
    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const progress = useMemo(
    () => (SECTIONS.length > 0 ? Math.round((doneSections.size / SECTIONS.length) * 100) : 0),
    [doneSections],
  );

  const jumpToSection = (id: string) => {
    setOpenSections(prev => new Set(prev).add(id));
    const el = sectionRefs.current[id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const markRead = (id: string, advance = false) => {
    setDoneSections(prev => new Set(prev).add(id));
    if (!advance) return;
    const idx = SECTIONS.findIndex(s => s.id === id);
    const next = SECTIONS[idx + 1];
    if (next) {
      setOpenSections(prev => new Set(prev).add(next.id));
      setTimeout(() => jumpToSection(next.id), 60);
    }
  };

  const completeOnboarding = async () => {
    if (!currentUser) return;
    setCompleting(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true });
      toast.success('You’re ready. Welcome to PSEmine.');
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
    <main>
      <header>
        <p>{onboarding ? 'Welcome to PSEmine' : 'Guide · campaign'}</p>
        <h1>{onboarding ? 'Your 90-day campaign, explained' : 'How PSEmine works'}</h1>
        <p>Everything you need to understand tools, operating cycles, referrals, payments and settlement. Read it once — the console always shows the live state.</p>
        {onboarding && <p role="status">{doneSections.size}/{SECTIONS.length} read</p>}
      </header>

      {onboarding && (
        <section aria-label="Onboarding progress">
          <p>This walkthrough appears once. You can return any time from the footer or the account menu.</p>
          <p>{doneSections.size}/{SECTIONS.length} read</p>
        </section>
      )}

      <nav aria-label="Guide sections">
        <h2>Guide sections</h2>
        <ul>
          {SECTIONS.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => jumpToSection(s.id)}
                aria-current={activeSection === s.id ? 'page' : undefined}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
        <progress value={progress} max={100} aria-label="Guide progress">{progress}%</progress>
        <p>{doneSections.size}/{SECTIONS.length} sections read ({progress}%)</p>
      </nav>

      <aside aria-label="Guide contents">
        <h2>Contents</h2>
        <progress value={progress} max={100} aria-label="Guide progress">{progress}%</progress>
        <p>{doneSections.size}/{SECTIONS.length} sections read ({progress}%)</p>
        <nav aria-label="Guide contents">
          <ol>
            {SECTIONS.map((s, i) => {
              const active = activeSection === s.id;
              const done = doneSections.has(s.id);
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => jumpToSection(s.id)} aria-current={active ? 'page' : undefined}>
                    {done ? 'Read' : `Section ${i + 1}`}: {s.title}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <p><Link to="/mine/dashboard">Open the console</Link></p>
        <p><Link to="/mine/tools">Open the tool marketplace</Link></p>
      </aside>

      <div>
        <section aria-labelledby="campaign-chapters-heading">
          <h2 id="campaign-chapters-heading">The campaign, chapter by chapter</h2>
          <p>{SECTIONS.length} chapters · the console always shows the live state</p>
          {SECTIONS.map((s, idx) => {
            const open = openSections.has(s.id);
            return (
              <section
                key={s.id}
                data-section-id={s.id}
                ref={el => { sectionRefs.current[s.id] = el; }}
                aria-labelledby={`guide-heading-${s.id}`}
              >
                <header>
                  <h2 id={`guide-heading-${s.id}`}>
                    <button type="button" onClick={() => toggleSection(s.id)} aria-expanded={open}>
                      {String(idx + 1).padStart(2, '0')} — {s.title}
                    </button>
                  </h2>
                  <p>{s.summary}</p>
                  {onboarding && (
                    <button type="button" onClick={() => markRead(s.id, true)} aria-pressed={doneSections.has(s.id)}>
                      {doneSections.has(s.id) ? 'Read' : 'Mark read & next'}
                    </button>
                  )}
                  <button type="button" onClick={() => toggleSection(s.id)} aria-expanded={open} aria-label={open ? `Collapse ${s.title}` : `Expand ${s.title}`}>
                    {open ? 'Collapse section' : 'Expand section'}
                  </button>
                </header>
                {open && <div>{s.body}</div>}
              </section>
            );
          })}

          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading">Frequently asked questions</h2>
            <p>Operational questions in the order they usually come up.</p>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <section key={f.q}>
                  <h3>
                    <button type="button" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}>
                      {f.q}
                    </button>
                  </h3>
                  {open && <p>{f.a}</p>}
                </section>
              );
            })}
          </section>
        </section>

        {onboarding && (
          <section aria-labelledby="onboarding-complete-heading">
            <h2 id="onboarding-complete-heading">Ready to open your console?</h2>
            <p>
              {TOOLS[0] && `Tools start at ${gbp(TOOLS[0].purchasePriceGBP)} with ${gbpHour(TOOLS[0].hourlyRateGBP)} of capacity.`}
              {' '}The peak rate is {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.
            </p>
            <button type="button" onClick={() => void completeOnboarding()} disabled={completing}>
              {completing ? 'Opening…' : 'Continue to dashboard'}
            </button>
            <Link to="/mine/tools">Browse tools first</Link>
            {alreadyOnboarded && <p>You can skip this — your account is already set up.</p>}
          </section>
        )}

        {!onboarding && (
          <section aria-labelledby="guide-closing-heading">
            <h2 id="guide-closing-heading">Understand it? Put capacity to work.</h2>
            <p>Tools start at {gbp(TOOLS[0]?.purchasePriceGBP ?? 3)} and accrue hourly while active.</p>
            <p><Link to="/mine/tools">Open the tool marketplace</Link></p>
            <p><Link to="/mine/dashboard">Go to console</Link></p>
          </section>
        )}
      </div>
    </main>
  );
};

export default PSEMineGuide;
