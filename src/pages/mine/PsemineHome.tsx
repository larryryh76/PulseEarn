import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from '../../components/mine/PsemineLogo';
import { ArrowRight, Binary, ShieldCheck, Waypoints, Activity, ChevronRight } from 'lucide-react';

export const PsemineHome: React.FC = () => {
  const { currentUser, psemineProfile } = usePsemineAuth();
  const navigate = useNavigate();
  const enter = () => {
    if (!currentUser) return navigate('/mine/login');
    if (!currentUser.emailVerified) return navigate('/mine/verify-email');
    navigate(psemineProfile?.hasCompletedGuide ? '/mine/dashboard' : '/mine/guide');
  };

  return (
    <div className="psemine-surface min-h-screen overflow-hidden font-sans selection:bg-[#f0aa3e]/30">
      <div className="psemine-grid pointer-events-none fixed inset-0 opacity-60" />
      <header className="relative z-10 border-b border-white/10 bg-[#080b10]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/mine"><PsemineLogo size="md" /></Link>
          <div className="flex items-center gap-3">
            {!currentUser && <Link to="/mine/login" className="psemine-button-secondary rounded-xl px-4 py-2.5 text-xs font-bold">Sign in</Link>}
            <button onClick={enter} className="psemine-button-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider">
              {currentUser ? 'Open command center' : 'Join PSEmine'} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="psemine-kicker mb-6 flex items-center gap-2"><Binary size={14} /> SHA infrastructure / genesis protocol</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.06em] text-[#f4f7f2] sm:text-7xl lg:text-8xl">Mine with a system built for <span className="text-[#f0aa3e]">proof.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#9ca8ac] sm:text-lg">PSEmine is a dedicated SHA mining economy for structured campaigns, measurable output, and a clear path from tool ownership to verified activity.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={enter} className="psemine-button-primary flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[.12em]">Enter the genesis campaign <ArrowRight size={17} /></button>
              <Link to="/mine/guide" className="psemine-button-secondary flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold">Read the protocol <ChevronRight size={17} /></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#758287]"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#8fc9a7]" /> Isolated PSEmine state</span><span className="flex items-center gap-2"><Activity size={15} className="text-[#f0aa3e]" /> Backend-authoritative</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="psemine-panel relative overflow-hidden rounded-[2rem] p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="psemine-kicker">Genesis / 90 days</p><p className="mt-2 text-lg font-bold">SHA mining command</p></div><div className="rounded-full border border-[#8fc9a7]/30 bg-[#8fc9a7]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#8fc9a7]">Ready</div></div>
              <div className="grid grid-cols-2 gap-3 py-5"><div className="rounded-2xl bg-white/[.04] p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#758287]">Campaign</p><p className="mt-2 text-xl font-black text-[#f4f7f2]">90 days</p></div><div className="rounded-2xl bg-white/[.04] p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#758287]">Settlement</p><p className="mt-2 text-xl font-black text-[#f4f7f2]">On-chain</p></div></div>
              <div className="rounded-2xl border border-[#f0aa3e]/20 bg-[#f0aa3e]/[.06] p-5"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-bold text-[#9ca8ac]">Protocol state</span><span className="font-mono text-xs text-[#f0aa3e]">SHA-256</span></div><div className="flex items-end gap-1.5">{[22,38,30,54,42,68,48,84,61,92,74,100].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-[#f0aa3e]" style={{ height: `${height}px`, opacity: .25 + index / 18 }} />)}</div></div>
              <div className="mt-4 flex items-center gap-3 text-xs text-[#9ca8ac]"><Waypoints size={16} className="text-[#8fc9a7]" /> Built for transparent progression, not simulated balances.</div>
            </div>
          </div>
        </section>

        <section className="mt-24 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
          {[['01', 'Own the tool', 'Choose a Genesis tool tier configured by the protocol.'], ['02', 'Activate the lane', 'Campaign eligibility and mining state stay backend-controlled.'], ['03', 'Track the output', 'Every important action becomes a traceable activity record.']].map(([number, title, body]) => <div key={number} className="psemine-panel rounded-2xl p-5"><span className="font-mono text-xs text-[#f0aa3e]">{number}</span><h2 className="mt-7 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#8b989b]">{body}</p></div>)}
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/10 px-5 py-7 text-center text-xs text-[#687478] sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row"><PsemineLogo size="sm" /><span>© {new Date().getFullYear()} PSEmine. A separate PulseEarn ecosystem.</span></div></footer>
    </div>
  );
};
export default PsemineHome;
