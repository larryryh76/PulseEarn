import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Layers, Repeat, Wrench, Users, Wallet, LineChart, Landmark,
  ShieldCheck, ChevronDown, Check, ArrowRight, Coins, Clock, Route, CheckCircle2,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  Stamp, StatementHeader, Ledger, CapacityRail, usePseDocumentTitle,
  gbp, gbpHour, type StampTone,
} from '../../components/psemine/pse';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const FAQS = [
  { q: 'What happens when a mining session ends?', a: 'Starter, Builder and Advanced miners run finite mining sessions. When a session completes, mining stops — the tool accrues nothing until you restart it from the dashboard. Restarting is free, but the backend needs a short restart period before mining resumes. Nothing is lost: the tool stays owned throughout.' },
  { q: 'Which tools need manual restarts?', a: 'Starter, Builder and Advanced miners are session-based and need a manual restart between sessions. The Elite Miner operates continuously: once activated it keeps mining while the campaign is active, with no manual restart cycle.' },
  { q: 'Can I buy more tools mid-campaign?', a: 'Yes, while the campaign is active and purchases are enabled, up to each tool\u2019s ownership limit. New tools start their own first operating cycle when activated.' },
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
      <p className="pse-copy-s">
        Balances live in an append-only ledger with deterministic entries. Purchases require on-chain verification with
        replay protection. Referral qualification has exactly one auditable path, and product access is an explicit,
        backend-enforced entitlement. The browser displays state — it can never create, claim or alter value.
      </p>
      <div className="pse-sunken mt-4 flex items-start gap-2.5 p-3.5">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success-ink)' }} />
        <div className="min-w-0 flex-1">
          <p className="pse-label-b">Purchase, settlement and wallet are separate concerns</p>
          <p className="pse-meta mt-1">Purchasing pays a quote-bound, chain-asserted BNB transaction that the backend verifies before a tool activates; settlement finalises the GBP ledger at day 90 and never moves funds itself; payouts move BNB to the wallet you configured before the lock. A connected wallet (signing) never changes the payout wallet (receiving) — that binding is server-stored and locks at settlement.</p>
        </div>
      </div>
      <button type="button" onClick={() => setShowAdvanced(v => !v)} className="pse-btn pse-btn-3 pse-btn-sm mt-3">
        {showAdvanced ? 'Hide advanced security details' : 'Show advanced security details'}
      </button>
      {showAdvanced && (
        <div className="pse-sunken mt-3 p-3.5 pse-stack-tight">
          <p className="pse-np">Advanced</p>
          <p className="pse-meta"><span className="pse-label-b">Quote binding</span> — payer wallet is bound server-side before signing; a later request with a different wallet is rejected as WALLET_MISMATCH until the quote window lapses.</p>
          <p className="pse-meta"><span className="pse-label-b">Chain assertion</span> — wallet and quote chainId must match before signing; an unreadable chain fails closed, never pays on the wrong network.</p>
          <p className="pse-meta"><span className="pse-label-b">One-send-attempt</span> — the signing layer allows exactly one broadcast; uncertain submission never retries automatically.</p>
          <p className="pse-meta"><span className="pse-label-b">Payout wallet lock</span> — changes lock at settlement (backend enforces cut-off); payout requests require verified email and minimum £10 and are reviewed before processing.</p>
          <p className="pse-meta"><span className="pse-label-b">Audit</span> — every purchase intent, verification failure, referral qualification and settlement sweep is retained as an auditable record; recovery cases are listed for manual review.</p>
        </div>
      )}
    </>
  );
};

type Section = { id: string; icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties; className?: string }>; title: string; summary: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: 'what', icon: BookOpen, title: 'What PSEmine is', summary: 'A 90-day, GBP-denominated mining campaign',
    body: (
      <>
        <p className="pse-copy-s">
          PSEmine is a 90-day, campaign-based mining product. You purchase mining tools with BNB on BNB Smart Chain.
          Each tool provides a fixed hourly capacity denominated in GBP. Across the campaign, your capacity accrues
          earnings that are calculated and stored server-side. When the campaign ends, accrued balances settle and are paid out.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            ['Duration', '90 days, then settlement'],
            ['Accounting', 'GBP (£) fixed rates'],
            ['Payment', 'BNB on BNB Smart Chain'],
          ].map(([k, v]) => (
            <div key={k} className="pse-sunken p-3.5">
              <p className="pse-np">{k}</p>
              <p className="pse-copy-s mt-1 font-medium" style={{ color: 'var(--pse-text)' }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="pse-sunken mt-4 flex items-start gap-2.5 p-3.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-text-2)' }} />
          <p className="pse-meta">
            PSEmine shares its sign-in identity with PulseEarn but is a separate product: separate tools, separate
            accounting, separate activity and notifications. Points, tasks and PulseEarn rewards never apply here.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'lifecycle', icon: Route, title: 'Campaign lifecycle', summary: 'Four phases from start to payout',
    body: (
      <>
        <p className="pse-copy-s">
          The campaign moves through four phases. The current phase is always shown in the console strip and on the
          dashboard — never inferred from dates in your browser.
        </p>
        <ol className="pse-stack-tight" style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {[
            ['Day 0 — Start', 'The campaign opens. Purchases become available and tools begin their first operating cycle.'],
            ['Days 1–90 — Operations', 'Session tools mine in finite sessions and stop when a session completes until you restart them; Elite mines continuously. Restarts are free and take a short backend period, during which nothing accrues. Capacity adds to your hourly rate as you buy tools and qualify referrals.'],
            ['Day 90 — Settlement', 'Accrual stops. Final balances are calculated from the append-only mining ledger.'],
            ['After day 90 — Payout', 'Payout requests open (minimum £10), are reviewed, then processed to your configured payout wallet.'],
          ].map(([t, d], i) => (
            <li key={t} className="pse-clause">
              <span className="pse-clause-no">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <p className="pse-label-b">{t}</p>
                <p className="pse-meta" style={{ marginTop: 4 }}>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    id: 'tools', icon: Layers, title: 'Mining tools', summary: 'Four tiers, fixed price and fixed capacity',
    body: (
      <>
        <p className="pse-copy-s">
          Four tools are available, each with a fixed price, a fixed hourly rate and a per-account ownership limit.
          Tool economics are fixed for the campaign — they don't change after purchase.
        </p>
        <div style={{ marginTop: 16 }}>
          <hr className="pse-rule" />
          {TOOLS.map(t => (
            <div key={t.id} className="pse-row">
              <div className="pse-row-k">
                <p className="pse-label-b">{t.name}</p>
                <p className="pse-meta" style={{ marginTop: 4 }}>
                  {gbp(t.purchasePriceGBP)} · limit {t.maxPerUser} ·{' '}
                  {t.operating?.model === 'continuous' ? 'continuous duty' : 'session duty · manual restart'}
                </p>
              </div>
              <span className="pse-row-v pse-n pse-cyan">{gbpHour(t.hourlyRateGBP)}</span>
            </div>
          ))}
          <div className="pse-spec-line" style={{ paddingTop: 12, paddingBottom: 4 }}>
            <span>Maximum tool capacity (all tiers at limit)</span>
            <span>{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</span>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'cycles', icon: Repeat, title: 'Mining sessions & restarts', summary: 'Session tools restart manually; Elite runs continuously',
    body: (
      <>
        <p className="pse-copy-s">
          Tools do not all run the same way. Starter, Builder and Advanced miners mine in finite <strong>sessions</strong>:
          when a session completes, mining stops and the tool waits for you to restart it. The Elite Miner mines
          <strong> continuously</strong> for as long as the campaign is active, with no manual restart cycle.
        </p>
        <p className="pse-copy-s mt-3">
          Restarting a session tool is free, but it is not instant: the backend prepares the next session and mining
          resumes only once that restart period completes. Nothing accrues while a session is stopped or restarting.
          Session length and restart timing are set by the backend campaign configuration, not by the app.
        </p>
        <div className="mt-4 space-y-2.5">
          {([
            ['Active', 'The session is running and the tool is accruing its hourly rate.', 'live'],
            ['Session Complete', 'The mining session finished. Mining has stopped — restart the tool to begin the next session.', 'attn'],
            ['Restarting', 'The restart was requested. Mining resumes automatically once the backend completes the restart period.', 'info'],
            ['Maintenance Required', 'The session ended a while ago and no restart has been requested yet. The tool stays yours — restart it to resume.', 'attn'],
            ['Continuous', 'Elite Miner: mining runs continuously while the campaign is active. No restart required.', 'info'],
          ] as Array<[string, string, StampTone]>).map(([label, desc, tone]) => (
            <div key={label} className="pse-clause">
              <span className="pse-clause-no">·</span>
              <div className="min-w-0">
                <Stamp tone={tone} glyph="●">{label}</Stamp>
                <p className="pse-meta" style={{ marginTop: 6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="pse-copy-s mt-3.5 flex items-start gap-2">
          <Wrench size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success-ink)' }} />
          Restarting is always free and always will be. There is no paid restart and no health-percentage system —
          the backend-reported state itself is the operational truth.
        </p>
      </>
    ),
  },
  {
    id: 'capacity', icon: LineChart, title: 'Mining capacity', summary: 'How your hourly rate is composed and capped',
    body: (
      <>
        <p className="pse-copy-s">
          Your hourly capacity is the sum of your tools plus your qualified referrals — nothing else. The backend
          calculates every figure; the app only displays what the server reports.
        </p>
        {/* The canonical capacity register, shown at every tier's ownership limit
            and every referral slot filled — the same register the console and the
            wallet render, so "how capacity adds up" is never drawn twice. */}
        <CapacityRail
          toolCapacity={PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR}
          referralCapacity={PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR}
          counts={{ starter: 5, builder: 3, advanced: 3, elite: 2 }}
          referralCount={PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}
          label="Capacity at every limit"
          meta="Every tier at its ownership limit plus five qualified referrals"
        />
        <p className="pse-meta mt-4">
          Accrual depends on live mining: a session tool earns only while its session is active, and a restarting tool
          earns nothing until the backend marks the next session active. Elite earns continuously.
        </p>
      </>
    ),
  },
  {
    id: 'referrals', icon: Users, title: 'Referral capacity', summary: '+£0.30/hour per qualified referral, up to 5',
    body: (
      <>
        <p className="pse-copy-s">
          Invite miners with your referral link. A referral adds <strong>+£0.30/hour</strong> to your capacity only
          after it fully qualifies: the invite registers, connects a BNB Smart Chain wallet, purchases a tool, and their
          first tool activates mining. Up to 5 referrals can qualify (+£1.50/hour at maximum).
        </p>
        <p className="pse-copy-s mt-2.5">
          Qualification settles on the backend exactly once, and your capacity changes from that moment forward — new
          referral capacity is never applied retroactively to past operating time.
        </p>
      </>
    ),
  },
  {
    id: 'purchases', icon: Wallet, title: 'BNB payments & verification', summary: 'Quotes, exact amounts, on-chain checks',
    body: (
      <>
        <p className="pse-copy-s">
          Purchases begin with a server-generated quote: the fixed GBP price converted to an exact BNB amount at the live
          rate. Quotes expire, and the quoted amount is fixed inside that window.
        </p>
        <p className="pse-copy-s mt-2.5">
          You send the exact amount to the campaign&apos;s receiving wallet from your connected wallet. The backend then
          verifies your transaction on-chain — sender, recipient, exact amount, network and confirmation depth — before
          the tool activates. The app never marks a purchase confirmed on its own, and no other activation path exists.
        </p>
        <div className="pse-sunken mt-4 flex items-start gap-2.5 p-3.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success-ink)' }} />
          <p className="pse-meta">
            Payments and settlements happen only on BNB Smart Chain (chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}).
            Underpayments and mismatches are detected and recorded for manual review.
          </p>
        </div>
        <p className="pse-meta mt-3">Wallet distinction: the connected wallet signs the payment you approve in the wallet app; the payout wallet is a separate, server-stored address that receives settlement. Connecting a wallet never changes where settlement is paid — that address is set explicitly in Wallet and locks at settlement.</p>
      </>
    ),
  },
  {
    id: 'earnings', icon: LineChart, title: 'Mining earnings', summary: 'Hourly accrual against active capacity',
    body: (
      <>
        <p className="pse-copy-s">
          Earnings accrue hourly against active capacity: tool capacity plus qualified referral capacity, capped at{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} maximum. Paused campaigns and completed
          cycles don&apos;t accrue.
        </p>
        <p className="pse-copy-s mt-2.5">
          The displayed balance is settled by the backend at checkpoints and reconciled against the mining ledger — the
          number you see is the number the ledger supports. Accrued earnings are campaign earnings and are not
          withdrawable mid-campaign.
        </p>
      </>
    ),
  },
  {
    id: 'settlement', icon: Landmark, title: 'Settlement & payouts', summary: 'Day 90, then reviewed payouts',
    body: (
      <>
        <p className="pse-copy-s">
          At day 90, accrual stops and the campaign settles. Final balances are computed from the ledger, payout requests
          open (minimum £10), and each request is reviewed before being processed to your configured payout wallet on BNB
          Smart Chain.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            ['Purchase', 'Spend BNB once per tool — quote-bound, verified on-chain, then the tool mines'],
            ['Settlement', 'Ledger finalised at day 90 — accrual stops, final GBP balances computed'],
            ['Payout', 'Request reviewed payout in BNB to your locked payout wallet (min £10)'],
          ].map(([k,v]) => (
            <div key={k} className="pse-sunken p-3.5">
              <p className="pse-np">{k}</p>
              <p className="pse-meta mt-1">{v}</p>
            </div>
          ))}
        </div>
        <div className="pse-sunken mt-4 flex items-start gap-2.5 p-3.5">
          <Clock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-amber)' }} />
          <p className="pse-meta">
            Payout wallet changes lock at settlement. Set your payout wallet early and verify it carefully — the connected signing wallet never becomes the payout destination.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'security', icon: ShieldCheck, title: 'Security model', summary: 'Server-authoritative by design',
    body: (
      <SecurityBody />
    ),
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

  // Scroll-spy keeps the rail and mobile chips honest about "where am I".
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
      // Persists to users/{uid}.onboardingCompleted — the exact field the
      // PSEmine auth gate reads. Firestore rules whitelist this single field
      // for owner updates; nothing else may accompany it.
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
    <div className="pse-gut pse-stack pse-canvas-bottom" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey={onboarding ? 'Welcome to PSEmine' : 'Guide · campaign'}
        title={onboarding ? 'Your 90-day campaign, explained' : 'How PSEmine works'}
        objective="Everything you need to understand tools, operating cycles, referrals, payments and settlement. Read it once — the console always shows the live state."
        status={onboarding
          ? <Stamp tone="info" glyph="▤">{doneSections.size}/{SECTIONS.length} read</Stamp>
          : undefined}
      />

      {onboarding && (
        <div className="pse-sunken pse-pad flex flex-wrap items-center gap-3">
          <Coins size={14} className="pse-cyan shrink-0" />
          <p className="pse-meta flex-1 min-w-[200px]">This walkthrough appears once. You can return any time from the footer or the account menu.</p>
          <span className="pse-n pse-dim-3 text-[12px]">{doneSections.size}/{SECTIONS.length} read</span>
        </div>
      )}

      {/* Mobile section navigation */}
      <nav aria-label="Guide sections" className="lg:hidden">
        <div className="pse-seg flex-wrap">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => jumpToSection(s.id)}
              aria-current={activeSection === s.id ? 'page' : undefined}
              data-active={activeSection === s.id}>
              {s.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
          <div className="pse-progress" role="progressbar" aria-label="Guide progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span className="pse-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="pse-n pse-meta shrink-0">{doneSections.size}/{SECTIONS.length} read</span>
        </div>
      </nav>

      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-7">
        {/* Desktop sidebar — a ruled contents rail, not another bordered box. */}
        <aside className="hidden lg:block">
          <div className="pse-stack-tight" style={{ position: 'sticky', top: 96 }}>
            <div>
              <p className="pse-np">Contents</p>
              <div className="pse-progress" role="progressbar" aria-label="Guide progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ marginTop: 10 }}>
                <span className="pse-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="pse-n pse-meta" style={{ marginTop: 8 }}>{doneSections.size}/{SECTIONS.length} sections read</p>
            </div>
            <nav className="pse-stack-tight" aria-label="Guide contents">
              {SECTIONS.map((s, i) => {
                const active = activeSection === s.id;
                const done = doneSections.has(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => jumpToSection(s.id)}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 40,
                      background: 'none', border: 0, borderLeft: '2px solid',
                      borderLeftColor: active ? 'var(--pse-success-ink)' : 'var(--pse-line)',
                      paddingLeft: 12, cursor: 'pointer', font: 'inherit', textAlign: 'left',
                      fontSize: 13.5, fontWeight: active ? 600 : 500,
                      color: active ? 'var(--pse-bone)' : done ? 'var(--pse-text-2)' : 'var(--pse-text-3)',
                    }}>
                    <span className="pse-row-sign" aria-hidden="true">{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  </button>
                );
              })}
            </nav>
            <div className="flex flex-col gap-2">
              <Link to="/mine/dashboard" className="pse-btn pse-btn-2 pse-btn-sm pse-btn-full">Open the console</Link>
              <Link to="/mine/tools" className="pse-btn pse-btn-2 pse-btn-sm pse-btn-full">Open the tool marketplace</Link>
            </div>
          </div>
        </aside>

        {/* Sections — one surface, ruled into chapters.
            A guide reads as a document with sections, not as nine separate cards,
            so the chapters share a single container and are separated by
            hairlines (measured: 21 card-like boxes before this change). */}
        <div>
          {/* One bordered surface for the whole guide: chapters are ruled into it
              and separated by hairlines, never lifted into their own cards. */}
          <Ledger title="The campaign, chapter by chapter" meta="Ten chapters · the console always shows the live state">
          {SECTIONS.map((s, idx) => {
            const Icon = s.icon;
            const open = openSections.has(s.id);
            return (
              <section key={s.id} data-section-id={s.id}
                ref={el => { sectionRefs.current[s.id] = el; }}
                className="scroll-mt-32 border-t first:border-t-0"
                style={{ borderColor: 'var(--pse-line)' }}>
                <div className="flex items-start gap-3.5 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'var(--pse-sunken)', border: '1px solid var(--pse-line)' }}>
                    <Icon size={17} style={{ color: 'var(--pse-success-ink)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Chapter titles are real headings: the guide previously exposed only
                            two heading elements, so chapters could not be reached by heading
                            navigation (screen readers) or indexed as structure. The toggle is a
                            button inside the heading, which is the accessible accordion pattern. */}
                        <h2 className="pse-h3" style={{ margin: 0 }}>
                          <button type="button" onClick={() => toggleSection(s.id)} aria-expanded={open}
                            className="flex w-full items-center gap-2.5 text-left"
                            style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                            <span className="pse-row-sign" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</span>
                            {s.title}
                          </button>
                        </h2>
                        <p className="pse-meta" style={{ marginTop: 4 }}>{s.summary}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {onboarding && (
                          <button type="button" onClick={() => markRead(s.id, true)}
                            className="pse-btn pse-btn-3 pse-btn-sm"
                            aria-pressed={doneSections.has(s.id)}>
                            {doneSections.has(s.id)
                              ? <><Check size={12} className="pse-cyan" /> Read</>
                              : 'Mark read & next'}
                          </button>
                        )}
                        <button type="button" onClick={() => toggleSection(s.id)} aria-expanded={open}
                          aria-label={open ? `Collapse ${s.title}` : `Expand ${s.title}`}
                          className="pse-btn pse-btn-3 pse-btn-sm">
                          <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
                        </button>
                      </div>
                    </div>
                    {open && <div style={{ marginTop: 16 }}>{s.body}</div>}
                  </div>
                </div>
              </section>
            );
          })}

          {/* FAQ — same surface, so the guide stays one continuous document. */}
          <section className="border-t" style={{ borderColor: 'var(--pse-line)' }}>
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--pse-line)' }}>
              <h2 className="pse-h3">Frequently asked questions</h2>
              <p className="pse-meta" style={{ marginTop: 4 }}>Operational questions in the order they usually come up.</p>
            </div>
            <div>
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q}>
                    <button type="button" onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open}>
                      <span className="pse-label-b">{f.q}</span>
                      <ChevronDown size={15} className={cn('shrink-0 transition-transform', open && 'rotate-180')} style={{ color: 'var(--pse-text-3)' }} />
                    </button>
                    {open && <p className="pse-label px-5 pb-4">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
          </Ledger>

          {/* Onboarding CTA */}
          {onboarding && (
            <div className="pse-rule pse-note" style={{ marginTop: 18, paddingTop: 22, textAlign: 'center', alignItems: 'center' }}>
              <CheckCircle2 size={22} style={{ color: doneSections.size === SECTIONS.length ? 'var(--pse-success-ink)' : 'var(--pse-text-4)' }} />
              <p className="pse-h3" style={{ marginTop: 12 }}>Ready to open your console?</p>
              <p className="pse-meta">
                {TOOLS[0] && `Tools start at ${gbp(TOOLS[0].purchasePriceGBP)} with ${gbpHour(TOOLS[0].hourlyRateGBP)} of capacity.`}
                {' '}The peak rate is {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={() => void completeOnboarding()} disabled={completing} className="pse-btn pse-btn-lg justify-center">
                  {completing ? 'Opening…' : 'Continue to dashboard'} <ArrowRight size={15} />
                </button>
                <Link to="/mine/tools" className="pse-btn pse-btn-2 pse-btn-lg justify-center">Browse tools first</Link>
              </div>
              {alreadyOnboarded && <p className="pse-meta" style={{ marginTop: 12 }}>You can skip this — your account is already set up.</p>}
            </div>
          )}

          {/* Non-onboarding closing CTA */}
          {!onboarding && (
            <div className="pse-rule flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center" style={{ marginTop: 18, paddingTop: 22 }}>
              <div>
                <p className="pse-h3">Understand it? Put capacity to work.</p>
                <p className="pse-meta" style={{ marginTop: 4 }}>Tools start at {gbp(TOOLS[0]?.purchasePriceGBP ?? 3)} and accrue hourly while active.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link to="/mine/tools" className="pse-btn pse-btn-sm">Open the tool marketplace</Link>
                <Link to="/mine/dashboard" className="pse-btn pse-btn-2 pse-btn-sm">Go to console</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PSEMineGuide;
