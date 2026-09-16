import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Layers, Repeat, Wrench, Users, Wallet, LineChart, Landmark,
  ShieldCheck, ChevronDown, Check, ArrowRight, Coins, Clock,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, Chip } from '../../components/psemine/pse';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const FAQS = [
  { q: 'What happens if I don\u2019t maintain a tool?', a: 'A tool whose cycle completed stops accruing until maintenance is performed. Nothing is lost — the tool stays owned, and one free maintenance action restarts accrual for the next cycle.' },
  { q: 'Can I buy more tools mid-campaign?', a: 'Yes, while the campaign is active and purchases are enabled, up to each tool\u2019s ownership limit. New tools start their own first operating cycle when activated.' },
  { q: 'Why is my earnings number moving slowly?', a: 'Earnings accrue by the hour against your capacity, and only while tools are in an active operating cycle. The figure shown is settled by the backend checkpoint — it never estimates ahead.' },
  { q: 'Is my payout wallet the same as my connected wallet?', a: 'No. The connected wallet is for browsing and payments. The payout wallet is a separate, server-stored destination that receives your settlement. Connecting a wallet never changes your payout destination.' },
  { q: 'When exactly do I get paid?', a: 'After the campaign ends and reaches settlement, payout requests open for eligible balances (minimum £10). Requests are reviewed, then processed to your payout wallet on BNB Smart Chain.' },
  { q: 'What if my BNB payment has a problem?', a: 'The backend records mismatches, underpayments, and other verification failures as recovery evidence for review — nothing is auto-assigned or auto-refunded, and no tool activates without passing verification.' },
];

const SECTIONS = [
  {
    id: 'what', icon: BookOpen, title: 'What is PSEmine?',
    body: (
      <>
        <p className="pse-caption">
          PSEmine is a 90-day, campaign-based mining product. You purchase mining tools with BNB on
          BNB Smart Chain. Each tool provides a fixed hourly capacity denominated in GBP. Across the
          campaign, your capacity accrues earnings that are calculated and stored server-side in an
          append-only ledger. When the campaign ends, accrued balances settle and are paid out.
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
      </>
    ),
  },
  {
    id: 'tools', icon: Layers, title: 'Mining tools',
    body: (
      <>
        <p className="pse-caption">
          Four tools are available, each with a fixed price, a fixed hourly rate, and a per-account
          ownership limit. Tool economics are fixed for the campaign — they don't change after purchase.
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
                  <td className="pse-num-cell" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP).replace('/hour', '/hr')}</td>
                  <td className="pse-num-cell">{t.maxPerUser}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'cycles', icon: Repeat, title: 'Operating cycles & maintenance',
    body: (
      <>
        <p className="pse-caption">
          Every tool runs 24-hour operating cycles. While a cycle is active, the tool accrues its
          hourly rate. When the cycle completes, the tool stops accruing until it is maintained.
        </p>
        <div className="mt-4 space-y-2.5">
          {[
            ['Active', 'The 24-hour cycle is running and accruing.', 'pse-chip-success'],
            ['Cycle Complete', 'The cycle finished. Maintenance is available — a single free action.', 'pse-chip-warning'],
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
          Maintenance is always free and always will be. There is no paid maintenance and no health-percentage system — the state itself is the operational truth.
        </p>
      </>
    ),
  },
  {
    id: 'referrals', icon: Users, title: 'Referrals',
    body: (
      <>
        <p className="pse-caption">
          Invite miners with your referral link. A referral adds <strong>+£0.30/hour</strong> to your
          capacity only after it fully qualifies: the invite registers, connects a BNB Smart Chain
          wallet, purchases a tool, and their first tool activates mining. Up to 5 referrals can
          qualify (+£1.50/hour at maximum).
        </p>
        <p className="pse-caption mt-2.5">
          Qualification settles on the backend exactly once, and your capacity changes from that
          moment forward — new referral capacity is never applied retroactively to past operating time.
        </p>
      </>
    ),
  },
  {
    id: 'purchases', icon: Wallet, title: 'BNB purchases & verification',
    body: (
      <>
        <p className="pse-caption">
          Purchases begin with a server-generated quote: the fixed GBP price converted to an exact
          BNB amount at the live rate. Quotes expire after 15 minutes. You send the exact amount to
          the campaign's receiving wallet from your connected wallet.
        </p>
        <p className="pse-caption mt-2.5">
          The backend then verifies your transaction on-chain — sender, recipient, exact amount,
          network, and confirmation depth — before the tool activates. The app never marks a purchase
          confirmed on its own, and no other activation path exists.
        </p>
      </>
    ),
  },
  {
    id: 'earnings', icon: LineChart, title: 'Mining earnings',
    body: (
      <>
        <p className="pse-caption">
          Earnings accrue hourly against active capacity: tool capacity plus qualified referral
          capacity, capped at £10.60/hour + £1.50/hour = <strong>£12.10/hour</strong> maximum.
          Paused campaigns and completed cycles don't accrue.
        </p>
        <p className="pse-caption mt-2.5">
          The displayed balance is settled by the backend at checkpoints and reconciled against the
          mining ledger — the number you see is the number the ledger supports.
        </p>
      </>
    ),
  },
  {
    id: 'settlement', icon: Landmark, title: 'Campaign settlement & payouts',
    body: (
      <>
        <p className="pse-caption">
          At day 90, accrual stops and the campaign settles. Final balances are computed from the
          ledger, payout requests open (minimum £10), and each request is reviewed before being
          processed to your configured payout wallet on BNB Smart Chain.
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
    id: 'security', icon: ShieldCheck, title: 'Security',
    body: (
      <p className="pse-caption">
        Balances live in an append-only ledger with deterministic entries. Purchases require on-chain
        verification with replay protection. Referral qualification has exactly one auditable path.
        The browser displays state — it can never create, claim, or alter value.
      </p>
    ),
  },
];

export const PSEMineGuide: React.FC<{ onboarding?: boolean }> = ({ onboarding = false }) => {
  const { currentUser, userData } = usePSEMineAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [completing, setCompleting] = useState(false);
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setDoneSections(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const completeOnboarding = async () => {
    if (!currentUser) return;
    setCompleting(true);
    try {
      // D2 fix: persist to users/{uid}.onboardingCompleted — the exact field+collection
      // the PSEmine auth gate reads (PSEmineAuth.tsx reads userData from AuthContext =
      // users/{uid}). Firestore rules whitelist this field for owner updates; no other
      // fields may accompany it (updatedAt is NOT whitelisted).
      await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true });
      toast.success('You\u2019re ready. Welcome to PSEmine.');
      navigate('/mine/dashboard', { replace: true });
    } catch {
      // Firestore may reject client updates on some profiles; the dashboard
      // remains accessible and this flag is convenience-only.
      toast('Could not save the flag — continuing to your dashboard.');
      navigate('/mine/dashboard', { replace: true });
    } finally {
      setCompleting(false);
    }
  };

  const alreadyOnboarded = userData?.onboardingCompleted !== false;

  return (
    <div className="pse-section max-w-4xl space-y-4 pb-24 pt-6 md:pt-8">
      <div>
        <p className="pse-eyebrow">{onboarding ? 'Welcome to PSEmine' : 'Campaign guide'}</p>
        <h1 className="pse-h2 mt-2">
          {onboarding ? 'Your 90-day campaign, explained' : 'How PSEmine works'}
        </h1>
        <p className="pse-caption mt-2 max-w-2xl">
          Everything you need to understand tools, operating cycles, referrals, payments, and
          settlement. Read it once — the console always shows the live state.
        </p>
        {onboarding && (
          <div className="pse-inset mt-4 flex items-center gap-2.5 p-3.5">
            <Coins size={14} style={{ color: 'var(--pse-blue)' }} className="shrink-0" />
            <p className="pse-micro">This walkthrough appears once. You can return any time from the footer.</p>
          </div>
        )}
      </div>

      {SECTIONS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <section key={s.id} className="pse-card p-6">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(46,144,250,0.10)', border: '1px solid rgba(46,144,250,0.25)' }}>
                <Icon size={17} style={{ color: 'var(--pse-blue)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="pse-h3">{idx + 1}. {s.title}</p>
                  {onboarding && (
                    <button
                      type="button"
                      onClick={() => toggleSection(s.id)}
                      className="pse-btn pse-btn-ghost pse-btn-sm shrink-0"
                      aria-pressed={doneSections.has(s.id)}
                    >
                      {doneSections.has(s.id)
                        ? <><Check size={12} style={{ color: 'var(--pse-success)' }} /> Read</>
                        : 'Mark read'}
                    </button>
                  )}
                </div>
                <div className="mt-3">{s.body}</div>
              </div>
            </div>
          </section>
        );
      })}

      {/* FAQ */}
      <section className="pse-card p-6">
        <p className="pse-h3">Frequently asked questions</p>
        <div className="mt-4 space-y-2.5">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="pse-inset overflow-hidden">
                <button type="button" onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left" aria-expanded={open}>
                  <span className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{f.q}</span>
                  <ChevronDown size={15} className={cn('shrink-0 transition-transform', open && 'rotate-180')} style={{ color: 'var(--pse-text-3)' }} />
                </button>
                {open && <p className="pse-micro px-4 pb-4">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Onboarding CTA */}
      {onboarding && (
        <div className="pse-card p-6 text-center">
          <p className="pse-h3">Ready to open your console?</p>
          <p className="pse-caption mt-1.5">
            {TOOLS[0] && `Tools start at ${gbp(TOOLS[0].purchasePriceGBP)} with ${gbpHour(TOOLS[0].hourlyRateGBP).replace('/hour', '/hr')} of capacity.`}
            {' '}The peak rate is {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR).replace('/hour', '/hr')}.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => void completeOnboarding()} disabled={completing} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
              {completing ? 'Opening…' : 'Continue to dashboard'} <ArrowRight size={15} />
            </button>
            <Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-lg justify-center">Browse tools first</Link>
          </div>
          {alreadyOnboarded && (
            <p className="pse-micro mt-3">You can skip this — your account is already set up.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PSEMineGuide;
