/**
 * The PSEmine Guide — a polished, scannable reference overlay and onboarding manual.
 *
 * Designed around direct navigation, visual process rails, and clear explanations.
 * - Viewport-bounded using dvh with no body scroll leakage
 * - Safe-area handling for mobile viewports (390px, 430px)
 * - Quick keyword search to find any topic instantly
 * - Direct section jump without forcing a 9-step wizard in reference mode
 * - Onboarding mode preserves sequential tour with Firestore completion flag
 */
import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  gbp, gbpHour, useEscapeKey, useScrollLock,
} from './pseCore';
import { PseButton } from './PseBasics';
import {
  Search, X, ArrowRight, CheckCircle2, Zap
} from 'lucide-react';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const C = PSEMINE_CONSTANTS;

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

export const PseGuide: React.FC<{
  mode?: 'reference' | 'onboarding';
  onClose: () => void;
}> = ({ mode = 'reference', onClose }) => {
  const { currentUser } = usePSEMineAuth();
  const isOnboarding = mode === 'onboarding';

  const [activeId, setActiveId] = useState<string>('campaign');
  const [searchQuery, setSearchQuery] = useState('');
  const [finishing, setFinishing] = useState(false);

  // Drag state for mobile bottom-sheet dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(0);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useScrollLock(true);
  useEscapeKey(true, onClose);

  // Complete onboarding in Firestore
  const handleCompleteOnboarding = async () => {
    if (!currentUser) {
      onClose();
      return;
    }
    setFinishing(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        onboardingCompleted: true,
      });
      toast.success('Welcome to PSEmine!');
      onClose();
    } catch {
      onClose();
    } finally {
      setFinishing(false);
    }
  };

  // Build the 8 authoritative topics
  const SECTIONS: GuideSection[] = useMemo(() => [
    {
      id: 'campaign',
      short: 'Campaign Model',
      title: '90-Day Mining Campaign Architecture',
      tag: 'Core Rules',
      keywords: 'campaign 90 days gbp bnb bsc bscscan duration rules',
      summary: 'PSEmine operates as a fixed 90-day cloud mining campaign denominated in British Pounds (GBP) and settled on Binance Smart Chain (BEP-20 BNB).',
      details: [
        'Campaign Duration: Exactly 90 calendar days from official launch.',
        'Denomination: Equipment prices and hourly mining yields are locked in GBP.',
        'Non-Custodial Payout: At Day 90 conclusion, accrued earnings are automatically converted and disbursed to your registered BEP-20 wallet.',
        'Transparent Ledger: Every block, hardware activation, and yield accrual is verified on-chain.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Campaign Term</span>
              <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">{C.CAMPAIGN_DURATION_DAYS} Days</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Base Currency</span>
              <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">GBP (£)</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Settlement Asset</span>
              <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">BEP-20 BNB</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Yield Accrual</span>
              <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">Hourly 24/7</span>
            </div>
          </div>
        </div>
      ),
      action: { to: '/mine/dashboard', label: 'View Mining Dashboard' }
    },
    {
      id: 'tools',
      short: 'Miners Fleet',
      title: 'Mining Hardware Fleet & Tier Limits',
      tag: 'Hardware',
      keywords: 'starter builder advanced elite miners tools hardware prices duty',
      summary: 'PSEmine features four bespoke tiers of mining rigs engineered with strict account caps to ensure equitable distribution across the campaign pool.',
      details: [
        'Starter Miner (£10): Up to 5 units, 24/7 continuous duty cycle with zero maintenance.',
        'Builder Miner (£50): Up to 4 units, 24-hour duty sessions with automated 4-hour restart cooldown.',
        'Advanced Miner (£200): Up to 3 units, high-yield mining with 24-hour duty sessions.',
        'Elite Miner (£1,000): Up to 2 units, enterprise mining tier delivering maximum hourly yield (£2.00/hr).'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOOLS.map(t => (
              <div key={t.id} className="p-2.5 bg-slate-900/90 rounded border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-100 block">{t.name}</span>
                  <span className="text-xs font-mono text-amber-400 font-semibold">{gbp(t.purchasePriceGBP)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-emerald-400 font-mono font-bold">+{gbpHour(t.hourlyRateGBP)}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Cap: {t.maxPerUser} units</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      action: { to: '/mine/tools', label: 'Deploy Mining Equipment' }
    },
    {
      id: 'capacity',
      short: 'Capacity Yield',
      title: 'Net Capacity Arithmetic & Earnings Formula',
      tag: 'Economics',
      keywords: 'capacity formula yield rate hourly arithmetic ceiling',
      summary: 'Your total mining rate is the exact sum of your active hardware equipment yield plus referral bonuses, credited into your balance every single hour.',
      details: [
        'Hardware Rate: Combined hourly rate of all active units currently within duty cycles.',
        'Referral Bonus: +£0.020/hr per qualified friend active in the campaign (up to 10 friends = +£0.20/hr).',
        'Theoretical Ceiling: Maximum possible account speed is £5.645/hr (£5.445 equipment + £0.20 referrals).',
        'Continuous Balance Increment: Accruals reflect in real time on the dashboard with zero delay.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="p-3 bg-slate-900/90 rounded border border-slate-800">
            <div className="text-xs font-mono text-cyan-400 mb-2 font-semibold">FORMULA ARCHITECTURE</div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs font-mono">
              <div className="p-2 bg-slate-800/80 rounded w-full sm:w-auto">
                <span className="text-slate-400 block text-[10px]">HARDWARE FLEET</span>
                <span className="text-amber-400 font-bold">£0.015 - £5.445/hr</span>
              </div>
              <span className="text-slate-500 font-bold text-sm">+</span>
              <div className="p-2 bg-slate-800/80 rounded w-full sm:w-auto">
                <span className="text-slate-400 block text-[10px]">REFERRAL BONUS</span>
                <span className="text-cyan-400 font-bold">Up to +£0.200/hr</span>
              </div>
              <span className="text-slate-500 font-bold text-sm">=</span>
              <div className="p-2 bg-emerald-950/40 border border-emerald-900/60 rounded w-full sm:w-auto">
                <span className="text-slate-400 block text-[10px]">TOTAL SPEED</span>
                <span className="text-emerald-400 font-bold">Net Hourly Yield</span>
              </div>
            </div>
          </div>
        </div>
      ),
      action: { to: '/mine/dashboard', label: 'Check Your Speed' }
    },
    {
      id: 'referrals',
      short: 'Referral Bonus',
      title: '5-Stage Referral Qualification Ladder',
      tag: 'Referrals',
      keywords: 'referral qualified bonus friends stages ladder',
      summary: 'Invite friends to earn permanent hourly capacity bonuses. Referrals qualify through an automated 5-stage verification ladder to ensure platform integrity.',
      details: [
        'Stage 1 (Invited): Friend signs up using your unique referral code or link.',
        'Stage 2 (Registered): Friend verifies email address and gains mining console access.',
        'Stage 3 (Deployed): Friend deploys their first mining hardware unit using BEP-20 BNB.',
        'Stage 4 (Active): Friend has an active miner running its duty cycle.',
        'Stage 5 (Qualified): +£0.020/hr capacity booster is permanently granted to your account.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="space-y-1.5">
            {[
              { step: '1', title: 'Invited', desc: 'Friend joins with your referral link' },
              { step: '2', title: 'Registered', desc: 'Email verified & identity confirmed' },
              { step: '3', title: 'Deployed', desc: 'Deploys first mining hardware rig' },
              { step: '4', title: 'Active', desc: 'Miner begins hourly duty session' },
              { step: '5', title: 'Qualified (+£0.02/hr)', desc: 'Permanent booster active on your account', highlight: true }
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-center gap-2.5 p-2 rounded text-xs ${
                  s.highlight
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                  s.highlight ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300'
                }`}>
                  {s.step}
                </span>
                <span className="font-semibold text-slate-200">{s.title}:</span>
                <span className="text-slate-400 text-[11px]">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      action: { to: '/mine/referrals', label: 'Invite Friends & View Team' }
    },
    {
      id: 'timeline',
      short: 'Timeline & Payout',
      title: 'Authoritative Campaign Timeline & Milestones',
      tag: 'Schedule',
      keywords: 'timeline schedule day 1 day 90 settlement milestones dates',
      summary: 'The campaign follows a transparent 90-day progression from initial launch to automated smart contract distribution on Day 90.',
      details: [
        'Days 1–89 (Live Accrual): Continuous mining, tool deployments, duty maintenance, and live hourly yield accumulation.',
        'Day 90 (Cutoff & Audit): Final mining snapshot is recorded on-chain, verifying total accrued GBP balance.',
        'Settlement (Distribution): Accrued earnings are automatically converted to BNB and disbursed to your registered BEP-20 wallet.',
        'No early exit fees or withdrawal penalties: Every eligible penny mined is disbursed in full.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-2">
              <span className="font-bold text-amber-400">Day 1: Launch</span>
              <span className="font-bold text-cyan-400">Day 1-89: Mining</span>
              <span className="font-bold text-emerald-400">Day 90: Settlement</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="w-[10%] bg-amber-400" />
              <div className="w-[80%] bg-cyan-400" />
              <div className="w-[10%] bg-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5">
              Settlement executes non-custodially directly through the Binance Smart Chain disbursement contract.
            </p>
          </div>
        </div>
      ),
      action: { to: '/mine/dashboard', label: 'View Timeline on Dashboard' }
    },
    {
      id: 'payment',
      short: 'Payment Flow',
      title: 'BEP-20 BNB Payment & Instant Activation',
      tag: 'Blockchain',
      keywords: 'payment bnb bep20 transaction hash activation bsc',
      summary: 'Tool purchases execute directly via Binance Smart Chain with automated on-chain block verification and instant hardware activation.',
      details: [
        'Select Miner: Choose your preferred tier on the Tools page.',
        'Send BNB: Transfer the exact BNB amount calculated via real-time CoinGecko oracle to the campaign deposit address.',
        'Submit Hash: Input the transaction hash for immediate verification.',
        'Instant Activation: The smart contract daemon confirms block finality and activates your equipment within ~15 seconds.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold mx-auto mb-1 flex items-center justify-center">1</span>
              <span className="font-semibold block text-slate-200">Select Rig</span>
              <span className="text-[10px] text-slate-400">Starter to Elite</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold mx-auto mb-1 flex items-center justify-center">2</span>
              <span className="font-semibold block text-slate-200">Send BNB</span>
              <span className="text-[10px] text-slate-400">BEP-20 Transfer</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold mx-auto mb-1 flex items-center justify-center">3</span>
              <span className="font-semibold block text-slate-200">Verify Tx</span>
              <span className="text-[10px] text-slate-400">15s Confirmation</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded border border-emerald-900/50 bg-emerald-950/20">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-mono font-bold mx-auto mb-1 flex items-center justify-center">✓</span>
              <span className="font-semibold block text-emerald-300">Mine Active</span>
              <span className="text-[10px] text-emerald-400">Yield Credited</span>
            </div>
          </div>
        </div>
      ),
      action: { to: '/mine/tools', label: 'Explore Tools Marketplace' }
    },
    {
      id: 'duty',
      short: 'Duty Cycles',
      title: 'Duty Cycles, Maintenance & Continuous Mining',
      tag: 'Operations',
      keywords: 'duty cycles continuous session restart maintenance hours',
      summary: 'Understand the operating mechanics of continuous vs session-based mining rigs to maximize your 24/7 uptime.',
      details: [
        'Continuous Mining (Starter): Runs 24 hours a day, 7 days a week with zero downtime and no restart button required.',
        'Session Duty (Builder, Advanced, Elite): Operates on 24-hour active cycles followed by a 4-hour restart maintenance window.',
        'Simple 1-Click Restart: When a session completes, simply click "Restart Miner" on your dashboard to re-engage mining.',
        'Zero Penalties: Paused rigs do not lose past accrued balances; they simply pause hourly increments until restarted.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
              <span className="text-emerald-400 font-bold font-mono text-xs block mb-1">
                STARTER MINER (24/7 AUTO)
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                100% automated duty cycle. Never stops mining. Ideal for hands-off passive accumulation throughout the 90 days.
              </p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold font-mono text-xs block mb-1">
                BUILDER, ADVANCED, ELITE
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                24-hour mining shifts. Requires a quick free "Restart" button click every day to keep hardware operating at peak efficiency.
              </p>
            </div>
          </div>
        </div>
      ),
      action: { to: '/mine/dashboard', label: 'Inspect Hardware Fleet' }
    },
    {
      id: 'settlement',
      short: 'Settlement & Wallet',
      title: 'Day 90 Automated Settlement & BEP-20 Wallet',
      tag: 'Payouts',
      keywords: 'settlement wallet bnb bep20 address withdrawal day 90',
      summary: 'Ensure your BEP-20 wallet address is correctly configured in your Wallet tab before Day 90 to receive automated settlement without interruption.',
      details: [
        'Wallet Compatibility: Use MetaMask, Trust Wallet, Binance Web3 Wallet, or any wallet supporting Binance Smart Chain.',
        'Accrued Balance vs Cleared: Accrued earnings grow hourly and clear at Day 90. Cleared balances can be withdrawn at any time.',
        'Zero Hidden Fees: You receive 100% of your mined earnings based on verified campaign telemetry.',
        'Permanent Ledger: Full transaction audit records remain permanently inspectable in your Activity tab.'
      ],
      visual: (
        <div className="pse-guide-diagram-box">
          <div className="p-3 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                BNB
              </div>
              <div>
                <span className="font-semibold text-slate-100 block">BEP-20 Disbursement Contract</span>
                <span className="text-[11px] text-slate-400">Direct transfer to your personal non-custodial address</span>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">100% Payout</span>
          </div>
        </div>
      ),
      action: { to: '/mine/wallet', label: 'Configure Payout Wallet' }
    }
  ], []);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.short.toLowerCase().includes(q) ||
      s.keywords.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q)
    );
  }, [SECTIONS, searchQuery]);

  // Active section
  const currentSection = useMemo(() => {
    return SECTIONS.find(s => s.id === activeId) ?? SECTIONS[0];
  }, [SECTIONS, activeId]);

  const currentIndex = SECTIONS.findIndex(s => s.id === activeId);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === SECTIONS.length - 1;

  // Touch gesture handlers for mobile bottom-sheet dismiss
  const onGripDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = e.clientY;
  };

  const onGripMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dy = Math.max(0, e.clientY - dragStart.current);
    setDragY(dy);
  };

  const onGripUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 120) {
      onClose();
    }
    setDragY(0);
  };

  return (
    <div
      className="pse-guide-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={plateRef}
        className="pse-guide-overlay w-full max-w-4xl bg-slate-950 border border-slate-800 sm:rounded-xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-200"
        style={{
          maxHeight: '92dvh',
          height: 'min(820px, 92dvh)',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pse-guide-title"
      >
        {/* Mobile Swipe-Down Grip Indicator */}
        <div
          className="pse-guide-grip sm:hidden flex items-center justify-center py-2 cursor-grab"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
        >
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* TOP BAR: Safe-area-aware Header */}
        <header className="pse-guide-header px-4 sm:px-6 py-3.5 border-b border-slate-800/90 flex items-center justify-between gap-3 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
              <Zap size={15} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {isOnboarding ? 'PSEmine Onboarding Walkthrough' : 'PSEmine Campaign & Operating Guide'}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono block">
                Official Operating Manual · 90-Day Campaign
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Topic {currentIndex + 1} of {SECTIONS.length}
            </span>

            {isOnboarding ? (
              <PseButton variant="secondary" size="sm" onClick={onClose} disabled={finishing}>
                Skip Tour
              </PseButton>
            ) : (
              <button
                type="button"
                className="pse-guide-close-btn p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                onClick={onClose}
                aria-label="Close guide"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* MAIN BODY: Responsive 2-Pane Navigation & Stage */}
        <div className="pse-guide-body-grid flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* LEFT RAIL / MOBILE NAV: Topics List & Search */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-900/40 flex flex-col min-h-0">
            {/* Quick Filter Search */}
            <div className="p-3 border-b border-slate-800/80 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search topics (e.g. tools, bnb, duty)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Direct Jump Topic List */}
            <nav className="pse-guide-nav-scroll flex-1 overflow-x-auto md:overflow-y-auto p-2 flex md:flex-col gap-1.5 scrollbar-thin">
              {filteredSections.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching topics found.
                </div>
              ) : (
                filteredSections.map((s, idx) => {
                  const isActive = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`pse-guide-tab px-3 py-2 rounded-lg text-left transition-all flex items-center justify-between gap-2 shrink-0 md:shrink md:w-full cursor-pointer text-xs ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-bold shadow'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                      }`}
                      onClick={() => setActiveId(s.id)}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-mono text-[10px] ${isActive ? 'text-black/70' : 'text-slate-400'}`}>
                          0{idx + 1}
                        </span>
                        <span className="truncate">{s.short}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded hidden sm:inline ${
                        isActive ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {s.tag}
                      </span>
                    </button>
                  );
                })
              )}
            </nav>
          </div>

          {/* RIGHT PANE: Selected Topic Content, Diagram, Details, & Action */}
          <div
            ref={stageRef}
            className="md:col-span-8 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-4 overscroll-contain"
          >
            <div className="space-y-4">
              {/* Topic Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                    {currentSection.tag}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 font-mono">
                    Topic 0{currentIndex + 1}
                  </span>
                </div>
                <h3 id="pse-guide-title" className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                  {currentSection.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  {currentSection.summary}
                </p>
              </div>

              {/* Bespoke Interactive Diagram */}
              {currentSection.visual}

              {/* Bulleted Technical Facts */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-mono">
                  Key Rules & Specifications
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {currentSection.details.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Direct Action Link for this Topic */}
            {currentSection.action && (
              <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                <Link
                  to={currentSection.action.to}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors border border-slate-700"
                >
                  <span>{currentSection.action.label}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR: Safe-area-aware Footer with Navigation Controls */}
        <footer className="pse-guide-footer px-4 sm:px-6 py-3 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            {currentSection.short} · {currentIndex + 1} of {SECTIONS.length}
          </div>

          <div className="flex items-center gap-2">
            {isOnboarding ? (
              <>
                <PseButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveId(SECTIONS[Math.max(0, currentIndex - 1)].id)}
                  disabled={isFirst}
                >
                  Back
                </PseButton>

                {isLast ? (
                  <PseButton
                    size="sm"
                    onClick={() => void handleCompleteOnboarding()}
                    busy={finishing}
                  >
                    Finish and Open Dashboard
                  </PseButton>
                ) : (
                  <PseButton
                    size="sm"
                    onClick={() => setActiveId(SECTIONS[Math.min(SECTIONS.length - 1, currentIndex + 1)].id)}
                  >
                    Next Topic
                  </PseButton>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  onClick={() => setActiveId(SECTIONS[Math.max(0, currentIndex - 1)].id)}
                  disabled={isFirst}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  onClick={() => setActiveId(SECTIONS[Math.min(SECTIONS.length - 1, currentIndex + 1)].id)}
                  disabled={isLast}
                >
                  Next
                </button>
                <PseButton variant="secondary" size="sm" onClick={onClose}>
                  Close Guide
                </PseButton>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PseGuide;
