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
import { gbp, gbpHour, Chip, Meter, Panel, usePseDocumentTitle } from '../../components/psemine/pse';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const FAQS = [
  { q: 'What happens if I don\u2019t maintain a tool?', a: 'A tool whose cycle completed stops accruing until maintenance is performed. Nothing is lost — the tool stays owned, and one free maintenance action restarts accrual for the next cycle.' },
  { q: 'Can I buy more tools mid-campaign?', a: 'Yes, while the campaign is active and purchases are enabled, up to each tool\u2019s ownership limit. New tools start their own first operating cycle when activated.' },
  { q: 'Why is my earnings number moving slowly?', a: 'Earnings accrue by the hour against your capacity, and only while tools are in an active operating cycle. The figure shown is settled by the backend checkpoint — it never estimates ahead.' },
  { q: 'Is my payout wallet the same as my connected wallet?', a: 'No. The connected wallet is for browsing and payments. The payout wallet is a separate, server-stored destination that receives your settlement. Connecting a wallet never changes your payout destination.' },
  { q: 'When exactly do I get paid?', a: 'After the campaign ends and reaches settlement, payout requests open for eligible balances (minimum £10). Requests are reviewed, then processed to your payout wallet on BNB Smart Chain.' },
  { q: 'What if my BNB payment has a problem?', a: 'The backend records mismatches, underpayments and other verification failures as recovery evidence for review — nothing is auto-assigned or auto-refunded, and no tool activates without passing verification.' },
  { q: 'Does PSEmine use my PulseEarn points?', a: 'No. PSEmine and PulseEarn share one sign-in identity and nothing else. PSEmine works in GBP campaign earnings and BNB payouts; PulseEarn points, tasks and rewards never apply here.' },
];

type Section = { id: string; icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties; className?: string }>; title: string; summary: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: 'what', icon: BookOpen, title: 'What PSEmine is', summary: 'A 90-day, GBP-denominated mining campaign',
    body: (
      <>
        <p className="pse-caption">
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
            <div key={k} className="pse-inset p-3.5">
              <p className="pse-eyebrow">{k}</p>
              <p className="pse-caption mt-1 font-medium" style={{ color: 'var(--pse-text)' }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="pse-inset mt-4 flex items-start gap-2.5 p-3.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
          <p className="pse-micro">
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
        <p className="pse-caption">
          The campaign moves through four phases. The current phase is always shown in the console strip and on the
          dashboard — never inferred from dates in your browser.
        </p>
        <ol className="mt-4 space-y-3">
          {[
            ['Day 0 — Start', 'The campaign opens. Purchases become available and tools begin their first operating cycle.'],
            ['Days 1–90 — Operations', 'Tools run 24-hour cycles. Maintenance keeps them accruing. Capacity adds to your hourly rate as you buy tools and qualify referrals.'],
            ['Day 90 — Settlement', 'Accrual stops. Final balances are calculated from the append-only mining ledger.'],
            ['After day 90 — Payout', 'Payout requests open (minimum £10), are reviewed, then processed to your configured payout wallet.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-3">
              <span className="pse-step pse-step-active">{i + 1}</span>
              <div>
                <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{t}</p>
                <p className="pse-micro mt-0.5">{d}</p>
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
        <p className="pse-caption">
          Four tools are available, each with a fixed price, a fixed hourly rate and a per-account ownership limit.
          Tool economics are fixed for the campaign — they don't change after purchase.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="pse-table">
            <thead>
              <tr><th>Tool</th><th className="pse-num-cell">Price</th><th className="pse-num-cell">Capacity</th><th className="pse-num-cell">Limit</th></tr>
            </thead>
            <tbody>
              {TOOLS.map(t => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td className="pse-num-cell">{gbp(t.purchasePriceGBP)}</td>
                  <td className="pse-num-cell" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</td>
                  <td className="pse-num-cell">{t.maxPerUser}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Maximum tool capacity</td>
                <td className="pse-num-cell">—</td>
                <td className="pse-num-cell font-semibold" style={{ color: 'var(--pse-cyan)' }}>
                  {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}
                </td>
                <td className="pse-num-cell">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'cycles', icon: Repeat, title: 'Operating cycles & maintenance', summary: '24-hour cycles, always-free maintenance',
    body: (
      <>
        <p className="pse-caption">
          Every tool runs 24-hour operating cycles. While a cycle is active, the tool accrues its hourly rate. When the
          cycle completes, the tool stops accruing until it is maintained.
        </p>
        <div className="mt-4 space-y-2.5">
          {[
            ['Active', 'The 24-hour cycle is running and accruing.', 'pse-chip-success'],
            ['Cycle Complete', 'The cycle finished. Maintenance is available — one free action.', 'pse-chip-warning'],
            ['Maintenance Required', 'The grace window passed. Maintain to resume mining; the tool stays yours.', 'pse-chip-danger'],
          ].map(([label, desc, chip]) => (
            <div key={label} className="flex items-start gap-3 pse-inset p-3.5">
              <Chip label={label} chip={`pse-chip ${chip}`} dot={false} />
              <p className="pse-caption">{desc}</p>
            </div>
          ))}
        </div>
        <p className="pse-caption mt-3.5 flex items-start gap-2">
          <Wrench size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
          Maintenance is always free and always will be. There is no paid maintenance and no health-percentage system —
          the state itself is the operational truth.
        </p>
      </>
    ),
  },
  {
    id: 'capacity', icon: LineChart, title: 'Mining capacity', summary: 'How your hourly rate is composed and capped',
    body: (
      <>
        <p className="pse-caption">
          Your hourly capacity is the sum of your tools plus your qualified referrals — nothing else. The backend
          calculates every figure; the app only displays what the server reports.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="pse-caption">Tool capacity (all four tiers at limit)</span>
              <span className="pse-num pse-caption font-semibold">{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</span>
            </div>
            <Meter
              value={(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR / PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR) * 100}
              label="Tool capacity share"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="pse-caption">Referral capacity (5 qualified)</span>
              <span className="pse-num pse-caption font-semibold">{gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}</span>
            </div>
            <Meter
              value={(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR / PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR) * 100}
              tone="purple"
              label="Referral capacity share"
            />
          </div>
          <div className="pse-divider my-1" />
          <div className="flex items-baseline justify-between">
            <span className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>Maximum total capacity</span>
            <span className="pse-num text-[20px] font-semibold" style={{ color: 'var(--pse-cyan)' }}>
              {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}
            </span>
          </div>
        </div>
        <p className="pse-micro mt-4">
          Accrual depends on active operating cycles — a tool between cycles does not accrue until maintenance restarts it.
        </p>
      </>
    ),
  },
  {
    id: 'referrals', icon: Users, title: 'Referral capacity', summary: '+£0.30/hour per qualified referral, up to 5',
    body: (
      <>
        <p className="pse-caption">
          Invite miners with your referral link. A referral adds <strong>+£0.30/hour</strong> to your capacity only
          after it fully qualifies: the invite registers, connects a BNB Smart Chain wallet, purchases a tool, and their
          first tool activates mining. Up to 5 referrals can qualify (+£1.50/hour at maximum).
        </p>
        <p className="pse-caption mt-2.5">
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
        <p className="pse-caption">
          Purchases begin with a server-generated quote: the fixed GBP price converted to an exact BNB amount at the live
          rate. Quotes expire, and the quoted amount is fixed inside that window.
        </p>
        <p className="pse-caption mt-2.5">
          You send the exact amount to the campaign&apos;s receiving wallet from your connected wallet. The backend then
          verifies your transaction on-chain — sender, recipient, exact amount, network and confirmation depth — before
          the tool activates. The app never marks a purchase confirmed on its own, and no other activation path exists.
        </p>
        <div className="pse-inset mt-4 flex items-start gap-2.5 p-3.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-cyan)' }} />
          <p className="pse-micro">
            Payments and settlements happen only on BNB Smart Chain (chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}).
            Underpayments and mismatches are detected and recorded for manual review.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'earnings', icon: LineChart, title: 'Mining earnings', summary: 'Hourly accrual against active capacity',
    body: (
      <>
        <p className="pse-caption">
          Earnings accrue hourly against active capacity: tool capacity plus qualified referral capacity, capped at{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} maximum. Paused campaigns and completed
          cycles don&apos;t accrue.
        </p>
        <p className="pse-caption mt-2.5">
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
        <p className="pse-caption">
          At day 90, accrual stops and the campaign settles. Final balances are computed from the ledger, payout requests
          open (minimum £10), and each request is reviewed before being processed to your configured payout wallet on BNB
          Smart Chain.
        </p>
        <div className="pse-inset mt-4 flex items-start gap-2.5 p-3.5">
          <Clock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
          <p className="pse-micro">
            Payout wallet changes lock at settlement. Set your payout wallet early and verify it carefully.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'security', icon: ShieldCheck, title: 'Security model', summary: 'Server-authoritative by design',
    body: (
      <p className="pse-caption">
        Balances live in an append-only ledger with deterministic entries. Purchases require on-chain verification with
        replay protection. Referral qualification has exactly one auditable path, and product access is an explicit,
        backend-enforced entitlement. The browser displays state — it can never create, claim or alter value.
      </p>
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
    () => new Set(onboarding ? [SECTIONS[0]?.id ?? 'what'] : SECTIONS.map(s => s.id)),
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
    <div className="pse-section pb-24 pt-5 md:pt-7">
      {/* Header — a guide gets the section scale, not a documentation heading. */}
      <p className="pse-eyebrow">
        {onboarding ? 'Welcome to PSEmine' : 'Campaign guide'}
      </p>
      <h1 className="pse-section-xl mt-3">
        {onboarding ? 'Your 90-day campaign, explained' : 'How PSEmine works'}
      </h1>
      <p className="pse-caption pse-measure mt-3">
        Everything you need to understand tools, operating cycles, referrals, payments and settlement. Read it once — the
        console always shows the live state.
      </p>

      {onboarding && (
        <div className="pse-inset mt-4 flex flex-wrap items-center gap-3 p-3.5">
          <Coins size={14} style={{ color: 'var(--pse-blue)' }} className="shrink-0" />
          <p className="pse-micro flex-1 min-w-[200px]">This walkthrough appears once. You can return any time from the footer or the account menu.</p>
          <span className="pse-micro shrink-0" style={{ color: 'var(--pse-text-3)' }}>{doneSections.size}/{SECTIONS.length} read</span>
        </div>
      )}

      {/* Mobile section navigation */}
      <nav aria-label="Guide sections" className="pse-sticky-nav mt-4 px-1 py-3 lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pse-no-scrollbar">
          {SECTIONS.map((s, i) => {
            const active = activeSection === s.id;
            return (
              <button key={s.id} type="button" onClick={() => jumpToSection(s.id)}
                aria-current={active ? 'true' : undefined}
                className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={active
                  ? { background: 'var(--pse-inset)', borderColor: 'var(--pse-blue)', color: 'var(--pse-blue)' }
                  : { background: 'var(--pse-inset)', borderColor: 'var(--pse-line)', color: 'var(--pse-text-2)' }}>
                <span className="pse-num mr-1.5 text-[10px]" style={{ color: active ? 'var(--pse-blue)' : 'var(--pse-text-3)' }}>{i + 1}</span>
                {s.title}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <Meter value={progress} label="Guide progress" />
          <span className="pse-micro shrink-0">{doneSections.size}/{SECTIONS.length} read</span>
        </div>
      </nav>

      <div className="mt-5 lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-7">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="pse-card sticky top-20 overflow-hidden">
            <div className="border-b px-4 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
              <p className="pse-eyebrow">Contents</p>
              <div className="mt-2.5">
                <Meter value={progress} label="Guide progress" />
              </div>
              <p className="pse-micro mt-1.5">{doneSections.size}/{SECTIONS.length} sections read</p>
            </div>
            <nav className="py-1" aria-label="Guide contents">
              {SECTIONS.map((s, i) => {
                const active = activeSection === s.id;
                const done = doneSections.has(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => jumpToSection(s.id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn('flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors',
                      active ? 'font-semibold' : '')}
                    style={{ color: active ? 'var(--pse-text)' : 'var(--pse-text-2)', background: active ? 'var(--pse-inset)' : undefined }}>
                    <span className={done ? 'pse-step pse-step-done' : 'pse-step'}>{done ? '✓' : i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t p-3.5" style={{ borderColor: 'var(--pse-line)' }}>
              <Link to={onboarding ? '/mine/dashboard' : '/mine/tools'} className="pse-btn pse-btn-secondary pse-btn-sm w-full justify-center">
                {onboarding ? 'Open the console' : 'Open the marketplace'}
              </Link>
            </div>
          </div>
        </aside>

        {/* Sections — one surface, ruled into chapters.
            A guide reads as a document with sections, not as nine separate cards,
            so the chapters share a single container and are separated by
            hairlines (measured: 21 card-like boxes before this change). */}
        <div>
          <div className="pse-list-group">
          {SECTIONS.map((s, idx) => {
            const Icon = s.icon;
            const open = openSections.has(s.id);
            return (
              <section key={s.id} data-section-id={s.id}
                ref={el => { sectionRefs.current[s.id] = el; }}
                className="scroll-mt-32 border-t first:border-t-0"
                style={{ borderColor: 'var(--pse-line)' }}>
                <div className="flex items-start gap-3.5 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-blue)' }}>
                    <Icon size={17} style={{ color: 'var(--pse-blue)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Chapter titles are real headings: the guide previously exposed only
                            two heading elements, so chapters could not be reached by heading
                            navigation (screen readers) or indexed as structure. The toggle is a
                            button inside the heading, which is the accessible accordion pattern. */}
                        <h2 className="pse-section-sm m-0">
                          <button type="button" onClick={() => toggleSection(s.id)} aria-expanded={open}
                            className="pse-chapter-toggle flex w-full items-center gap-2 text-left">
                            <span className="pse-step">{idx + 1}</span>
                            {s.title}
                          </button>
                        </h2>
                        <p className="pse-micro mt-1">{s.summary}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {onboarding && (
                          <button type="button" onClick={() => markRead(s.id, true)}
                            className="pse-btn pse-btn-ghost pse-btn-sm"
                            aria-pressed={doneSections.has(s.id)}>
                            {doneSections.has(s.id)
                              ? <><Check size={12} style={{ color: 'var(--pse-success)' }} /> Read</>
                              : 'Mark read & next'}
                          </button>
                        )}
                        <button type="button" onClick={() => toggleSection(s.id)} aria-expanded={open}
                          aria-label={open ? `Collapse ${s.title}` : `Expand ${s.title}`}
                          className="pse-btn pse-btn-ghost pse-btn-sm">
                          <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
                        </button>
                      </div>
                    </div>
                    {open && <div className="pse-guide-body mt-4">{s.body}</div>}
                  </div>
                </div>
              </section>
            );
          })}

          {/* FAQ — same surface, so the guide stays one continuous document. */}
          <section className="border-t" style={{ borderColor: 'var(--pse-line)' }}>
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--pse-line)' }}>
              <h2 className="pse-section-sm">Frequently asked questions</h2>
              <p className="pse-micro mt-0.5">Operational questions in the order they usually come up.</p>
            </div>
            <div>
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q}>
                    <button type="button" onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open}>
                      <span className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{f.q}</span>
                      <ChevronDown size={15} className={cn('shrink-0 transition-transform', open && 'rotate-180')} style={{ color: 'var(--pse-text-3)' }} />
                    </button>
                    {open && <p className="pse-caption px-5 pb-4">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
          </div>

          {/* Onboarding CTA */}
          {onboarding && (
            <Panel className="mt-3" bodyClassName="p-6 text-center">
              <CheckCircle2 size={22} className="mx-auto" style={{ color: doneSections.size === SECTIONS.length ? 'var(--pse-success)' : 'var(--pse-text-3)' }} />
              <p className="pse-h3 mt-3">Ready to open your console?</p>
              <p className="pse-caption mt-1.5">
                {TOOLS[0] && `Tools start at ${gbp(TOOLS[0].purchasePriceGBP)} with ${gbpHour(TOOLS[0].hourlyRateGBP)} of capacity.`}
                {' '}The peak rate is {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={() => void completeOnboarding()} disabled={completing} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
                  {completing ? 'Opening…' : 'Continue to dashboard'} <ArrowRight size={15} />
                </button>
                <Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-lg justify-center">Browse tools first</Link>
              </div>
              {alreadyOnboarded && <p className="pse-micro mt-3">You can skip this — your account is already set up.</p>}
            </Panel>
          )}

          {/* Non-onboarding closing CTA */}
          {!onboarding && (
            <Panel className="mt-3" bodyClassName="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="pse-h3">Understand it? Put capacity to work.</p>
                <p className="pse-micro mt-1">Tools start at {gbp(TOOLS[0]?.purchasePriceGBP ?? 3)} and accrue hourly while active.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link to="/mine/tools" className="pse-btn pse-btn-primary pse-btn-sm">Open the marketplace</Link>
                <Link to="/mine/dashboard" className="pse-btn pse-btn-secondary pse-btn-sm">Go to console</Link>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};

export default PSEMineGuide;
