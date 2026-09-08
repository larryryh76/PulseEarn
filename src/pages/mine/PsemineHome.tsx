import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from '../../components/mine/PsemineLogo';
import {
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Users,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const PsemineHome: React.FC = () => {
  const { currentUser, psemineProfile } = usePsemineAuth();
  const navigate = useNavigate();

  // Active FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Referral Calculator state
  const [calcRefNum, setCalcRefNum] = useState<number>(3);
  const baseRate = 1.20; // Pro rate £1.20/hr
  const refBonus = calcRefNum * 0.30;
  const totalRate = baseRate + refBonus;
  const dailyOutput = totalRate * 24;

  const enter = () => {
    if (!currentUser) return navigate('/mine/login');
    if (!currentUser.emailVerified) return navigate('/mine/verify-email');
    navigate(psemineProfile?.hasCompletedGuide ? '/mine/dashboard' : '/mine/guide');
  };

  const tools = [
    { tier: 'Starter', price: '£3', rate: '£0.10/hr', limit: '5 copies max', border: 'border-emerald-500/20', accent: 'text-emerald-400' },
    { tier: 'Growth', price: '£10', rate: '£0.50/hr', limit: '3 copies max', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
    { tier: 'Pro', price: '£50', rate: '£1.20/hr', limit: '3 copies max', border: 'border-emerald-500/40', accent: 'text-emerald-400', popular: true },
    { tier: 'Elite', price: '£200', rate: '£2.50/hr', limit: '2 copies max', border: 'border-emerald-500/50', accent: 'text-emerald-400' },
  ];

  const faqs = [
    { q: 'What is PSEmine?', a: 'PSEmine is the dedicated Web3 mining and earning platform within the PulseEarn ecosystem. It allows users to acquire structured Genesis mining tools and earn predictable hourly output.' },
    { q: 'How does Genesis Mining work?', a: 'You select an active tool tier, lock a live BNB payment quote verified on the BNB Smart Chain (BSC), and acquire backend-confirmed tool entitlements that accrue hourly output during the 90-day Genesis campaign.' },
    { q: 'How do referral bonuses work?', a: 'Each qualified referral boosts your total mining rate by +£0.30/hr, up to a maximum of 5 qualified referrals (+£1.50/hr total bonus). Maximum achievable mining rate is £12.10/hr.' },
    { q: 'How are payments verified?', a: 'All payments are verified on-chain via transaction hashes on the BNB Smart Chain. Tool ownership and mining entitlements are granted strictly after backend payment confirmation.' },
    { q: 'When can I withdraw my accrued mining output?', a: 'Output accrues continuously to your PSEmine account. Eligible balances can be withdrawn directly to your connected Web3 wallet upon reaching the backend threshold.' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans selection:bg-emerald-500/30">
      {/* Background Pulse Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header / Ecosystem Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/mine">
              <PsemineLogo size="md" />
            </Link>
            <div className="hidden md:flex items-center gap-1 text-xs text-zinc-400 font-medium border-l border-white/10 pl-6">
              <span>Part of the</span>
              <span className="text-white font-bold tracking-wide">PulseEarn Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!currentUser ? (
              <>
                <Link to="/mine/login" className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-xs font-bold text-white transition-all">
                  Sign In
                </Link>
                <button onClick={enter} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  Start Mining <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <button onClick={enter} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                Command Center <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-20">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Messaging */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles size={14} />
              <span>Genesis Campaign Phase 1 Active</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Transparent Web3 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Mining Infrastructure
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
              Acquire verified mining tools, earn structured hourly output, and scale your yield with qualified referrals on the BNB Smart Chain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={enter}
                className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]"
              >
                <span>Enter Genesis Campaign</span>
                <ArrowRight size={16} />
              </button>
              <Link
                to="/mine/guide"
                className="px-6 py-3.5 rounded-xl bg-[#12121A] hover:bg-[#1A1A24] border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>Read Mining Guide</span>
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs">
              <div>
                <p className="text-zinc-500 font-medium">Network</p>
                <p className="text-white font-bold mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> BSC (BNB)
                </p>
              </div>
              <div>
                <p className="text-zinc-500 font-medium">Campaign Duration</p>
                <p className="text-white font-bold mt-0.5">90 Days</p>
              </div>
              <div>
                <p className="text-zinc-500 font-medium">Max Referral Bonus</p>
                <p className="text-emerald-400 font-bold mt-0.5">+£1.50 / hr</p>
              </div>
            </div>
          </div>

          {/* Right Hero Product Visual Preview */}
          <div className="lg:col-span-5">
            <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Preview Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Mining Workspace</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                  GENESIS-PROD
                </span>
              </div>

              {/* Live Preview Metrics */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="bg-[#1A1A24] border border-white/5 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Current Mining Rate</span>
                  <div className="text-xl font-extrabold text-white mt-1">£2.70 <span className="text-xs font-normal text-zinc-400">/hr</span></div>
                  <span className="text-[10px] text-emerald-400 font-medium mt-1 block">Includes +£1.50/hr Ref Bonus</span>
                </div>
                <div className="bg-[#1A1A24] border border-white/5 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Owned Tools</span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">2 <span className="text-xs font-normal text-zinc-400">Active</span></div>
                  <span className="text-[10px] text-zinc-400 font-medium mt-1 block">Pro + Growth Tiers</span>
                </div>
              </div>

              {/* Active Tool List Widget */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      PRO
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Pro Mining Tool</p>
                      <p className="text-[10px] text-zinc-400">Yield: £1.20/hr • 1x Owned</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                    Mining
                  </span>
                </div>
              </div>

              {/* Verified Status Banner */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">BNB Smart Chain Verification</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> Confirmed
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-16 border-t border-white/10 bg-[#0A0A0F]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">How PSEmine Mining Works</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">A backend-authoritative 5-step entitlement architecture built for transparency.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: '01', title: 'Create Identity', desc: 'Register your PSEmine account and verify your email.' },
              { step: '02', title: 'Choose Tool Tier', desc: 'Select from Starter, Growth, Pro, or Elite tiers.' },
              { step: '03', title: 'Lock BNB Quote', desc: 'Lock live price in BNB Smart Chain (BSC) BNB.' },
              { step: '04', title: 'Verify On-Chain', desc: 'Backend confirms tx hash and issues tool entitlement.' },
              { step: '05', title: 'Accrue Output', desc: 'Collect hourly output and withdraw when eligible.' },
            ].map((s, idx) => (
              <div key={idx} className="bg-[#12121A] border border-white/10 rounded-2xl p-5 relative">
                <span className="text-emerald-400 font-mono text-xs font-bold">{s.step}</span>
                <h3 className="text-sm font-bold text-white mt-3">{s.title}</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CANONICAL MINING TOOL TIERS */}
      <section className="py-16 border-t border-white/10 bg-[#0D0D14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Genesis Tool Tiers</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">Canonical tool tiers backed by backend entitlement verification.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tools.map((t, i) => (
              <div key={i} className={`bg-[#12121A] border ${t.border} rounded-2xl p-6 relative flex flex-col justify-between hover:border-emerald-500/60 transition-all`}>
                {t.popular && (
                  <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-extrabold text-white uppercase tracking-wider">{t.tier}</span>
                    <span className={`text-xs font-bold ${t.accent}`}>{t.limit}</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{t.price}</div>
                  <div className="text-sm font-bold text-emerald-400 mb-6">{t.rate} yield</div>

                  <ul className="space-y-2.5 text-xs text-zinc-400 border-t border-white/10 pt-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Genesis Campaign Duration
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" /> On-chain BSC Verification
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Hourly Output Accrual
                    </li>
                  </ul>
                </div>

                <button
                  onClick={enter}
                  className="w-full mt-6 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition-all text-center"
                >
                  Acquire Tool
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REFERRAL CALCULATOR & SYSTEM */}
      <section className="py-16 border-t border-white/10 bg-[#0A0A0F]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold mb-4">
                <Users size={14} /> Qualified Referral Mining Boost
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Boost Yield with Referrals
              </h2>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Earn <strong className="text-emerald-400">+£0.30/hr</strong> for each qualified referral up to a maximum of 5 referrals (<strong className="text-emerald-400">+£1.50/hr total bonus</strong>).
              </p>

              <div className="mt-6 space-y-3 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Qualification requirement: Referee must purchase at least 1 tool</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Maximum combined mining output rate: <strong>£12.10/hr</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Box */}
            <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Referral Yield Calculator</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-400">Qualified Referrals</span>
                    <span className="text-emerald-400">{calcRefNum} / 5 Max</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={calcRefNum}
                    onChange={(e) => setCalcRefNum(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-white/10 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
                  <div className="bg-[#1A1A24] p-3 rounded-xl">
                    <span className="text-zinc-500 block">Pro Base Rate</span>
                    <span className="text-white font-bold text-base">£1.20 / hr</span>
                  </div>
                  <div className="bg-[#1A1A24] p-3 rounded-xl">
                    <span className="text-zinc-500 block">Referral Bonus</span>
                    <span className="text-emerald-400 font-bold text-base">+£{refBonus.toFixed(2)} / hr</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-medium">Estimated Combined Rate</span>
                    <div className="text-2xl font-black text-white">£{totalRate.toFixed(2)} <span className="text-xs text-zinc-400 font-normal">/hr</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 font-medium">Daily Output</span>
                    <div className="text-lg font-extrabold text-emerald-400">~£{dailyOutput.toFixed(2)} / day</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 border-t border-white/10 bg-[#0D0D14]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">Clear answers grounded in actual backend implementation.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-[#12121A] border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-5 py-4 font-bold text-sm text-white flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <span>{faq.q}</span>
                  <span className="text-emerald-400 text-lg font-bold">{openFaq === idx ? '−' : '+'}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-xs text-zinc-400 border-t border-white/5 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LANDING CTA */}
      <section className="py-16 border-t border-white/10 bg-[#0A0A0F] text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Ready to Start Mining?</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-md mx-auto">
            Create your account to participate in the Genesis mining campaign.
          </p>
          <div className="mt-6">
            <button
              onClick={enter}
              className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]"
            >
              Create Account & Enter Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 bg-[#08080C] text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <PsemineLogo size="sm" />
          <div>© {new Date().getFullYear()} PSEmine. All rights reserved. Member of the PulseEarn ecosystem.</div>
        </div>
      </footer>
    </div>
  );
};

export default PsemineHome;
