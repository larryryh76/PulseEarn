import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Pickaxe, 
  Cpu, 
  ArrowRight, 
  Wallet, 
  Coins, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';

export const PSEMineLanding: React.FC = () => {
  const { campaignDaysRemaining } = usePSEMine();
  const { currentUser } = useAuth();

  const toolList = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

  const faqs = [
    {
      q: 'What is PSEmine and how does it relate to PulseEarn?',
      a: 'PSEmine is a specialized, 90-day campaign node inside PulseEarn. Instead of completing micro-tasks for PTS points, participants deploy mining capacity tools to accrue continuous balance calculated in Great British Pounds (GBP £).'
    },
    {
      q: 'Do I need physical hardware or GPU mining equipment to participate?',
      a: 'No physical hardware or electricity is needed. PSEmine utilizes cloud capacity allocation nodes that run continuously on our server infrastructure once verified on BNB Smart Chain.'
    },
    {
      q: 'How are tool purchases paid and verified?',
      a: 'Tools are priced in fixed GBP (£3, £10, £50, £200) and settled in BNB over BNB Smart Chain (BSC). Each checkout generates an authoritative 10-minute price quote. Once 2 blockchain confirmations are verified, your capacity is immediately activated.'
    },
    {
      q: 'What is the maximum capacity I can accumulate?',
      a: 'By maxing out all tool tiers (5 Starter, 3 Builder, 3 Advanced, 2 Elite), you reach £10.60/hr. Adding 5 qualified referrals (+£0.30/hr each) brings your total capacity to the hard mathematical cap of £12.10/hr.'
    },
    {
      q: 'How does the 90-Day Campaign Settlement and Payout work?',
      a: 'Throughout the 90 days, your earnings accrue continuously in GBP (£). Prior to the final settlement cutoff, miners lock their destination BNB Smart Chain wallet. Accrued balances are reviewed and disbursed in crypto (BNB/USDT_BSC) at the conclusion of the campaign.'
    }
  ];

  return (
    <div className="space-y-24 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 lg:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Glow effect background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="text-center space-y-6 max-w-3xl mx-auto relative z-10">
          
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>90-DAY GENESIS MINING CAMPAIGN • BNB SMART CHAIN</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Deploy Computational Mining Capacity in{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              GBP (£)
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-normal">
            Stack dedicated cloud mining tools, earn up to <strong className="text-cyan-300">£12.10/hour</strong> in continuous accrual, and settle in crypto at the conclusion of our 90-day campaign.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all group"
            >
              <span>{currentUser ? "Launch Mining Dashboard" : "Start Mining Today"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/mine/tools"
              className="w-full sm:w-auto px-7 py-4 rounded-xl font-bold text-sm bg-slate-900/90 hover:bg-slate-800 border border-cyan-900/50 hover:border-cyan-500/50 text-gray-200 flex items-center justify-center space-x-2 transition-all"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Explore Mining Tools</span>
            </Link>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8">
            <div className="p-4 bg-[#0c1324] border border-cyan-900/40 rounded-2xl">
              <div className="text-xs text-gray-400 font-medium">Accounting Currency</div>
              <div className="text-xl font-extrabold text-white font-mono mt-0.5">GBP (£)</div>
            </div>
            <div className="p-4 bg-[#0c1324] border border-cyan-900/40 rounded-2xl">
              <div className="text-xs text-gray-400 font-medium">Max Tool Capacity</div>
              <div className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">£10.60/hr</div>
            </div>
            <div className="p-4 bg-[#0c1324] border border-cyan-900/40 rounded-2xl">
              <div className="text-xs text-gray-400 font-medium">Referral Boost</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">+£1.50/hr</div>
            </div>
            <div className="p-4 bg-[#0c1324] border border-cyan-900/40 rounded-2xl">
              <div className="text-xs text-gray-400 font-medium">Campaign Window</div>
              <div className="text-xl font-extrabold text-white font-mono mt-0.5">{campaignDaysRemaining} Days Left</div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Operational Protocol
          </h2>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            How PSEmine Mining Works in 4 Steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Create & Connect',
              desc: 'Sign in to your PulseEarn account and link your BNB Smart Chain (BSC) Web3 wallet in one click.',
              icon: Wallet
            },
            {
              step: '02',
              title: 'Deploy Mining Tools',
              desc: 'Select from 4 locked hardware-tier simulations priced in GBP and settled seamlessly via BNB.',
              icon: Cpu
            },
            {
              step: '03',
              title: 'Continuous Accrual',
              desc: 'Your active node automatically accumulates GBP balance 24/7 with second-by-second precision.',
              icon: TrendingUp
            },
            {
              step: '04',
              title: '90-Day Settlement',
              desc: 'At campaign conclusion, your accrued balance is disbursed in verified crypto to your payout wallet.',
              icon: Coins
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="relative p-6 bg-[#0a1020] border border-cyan-950/80 rounded-2xl hover:border-cyan-500/40 transition-all group"
              >
                <div className="text-3xl font-black text-cyan-950 group-hover:text-cyan-900/80 transition-colors font-mono mb-4">
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. MINING TOOLS MARKETPLACE PREVIEW */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Computational Tiers
            </h2>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              4 Locked Mining Hardware Tiers
            </p>
          </div>
          <Link
            to="/mine/tools"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>Open Full Marketplace</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {toolList.map((tool) => (
            <div 
              key={tool.id}
              className="p-6 bg-[#0b1224] border border-cyan-900/40 rounded-2xl flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-950/30 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/40">
                    Tier {tool.tier}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Max: {tool.maxPerUser} Units
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-white">{tool.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tool.description}</p>
                </div>

                <div className="p-3 bg-[#080d19] border border-slate-800 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Purchase Price:</span>
                    <span className="font-extrabold text-white font-mono">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Mining Rate:</span>
                    <span className="font-extrabold text-cyan-400 font-mono">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-gray-400">90-Day Output:</span>
                    <span className="font-bold text-emerald-400 font-mono">£{(tool.hourlyRateGBP * 24 * 90).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Link
                to="/mine/tools"
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-cyan-600 text-cyan-200 hover:text-white rounded-xl text-xs font-bold text-center transition-colors"
              >
                Deploy Miner
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MINING CAPACITY ENGINE EXPLAINER */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 lg:p-12 bg-gradient-to-br from-[#0c1428] to-[#070b16] border border-cyan-900/50 rounded-3xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Mathematical Economics
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Capacity Stacking Architecture
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                PSEmine replaces arbitrary tokens with a deterministic capacity model. Every purchased tool grants an immutable, hourly rate addition that stacks additively.
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>5x Starter (£0.50/hr) + 3x Builder (£1.50/hr) + 3x Advanced (£3.60/hr) + 2x Elite (£5.00/hr)</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Maximum Tool Capacity Hard Limit: <strong>£10.60/hour</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Maximum Theoretical Rate with 5 Referrals: <strong>£12.10/hour</strong></span>
                </div>
              </div>
            </div>

            {/* Capacity Stacking Visual Box */}
            <div className="p-6 bg-[#080d1a] border border-cyan-800/40 rounded-2xl space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between text-gray-400 border-b border-slate-800 pb-2">
                <span>COMPONENT</span>
                <span>MAX CONTRIBUTION</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-gray-300">Mining Tools Base</span>
                <span className="text-cyan-400 font-bold">£10.60 / hr</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-gray-300">Qualified Referrals (5x)</span>
                <span className="text-emerald-400 font-bold">+£1.50 / hr</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm">
                <span className="font-bold text-white">Peak Rate Limit</span>
                <span className="font-black text-cyan-300">£12.10 / hr</span>
              </div>
              <div className="p-3 bg-cyan-950/40 border border-cyan-700/30 rounded-lg text-[11px] text-cyan-300 text-center">
                Continuous 24/7 campaign accounting in GBP (£)
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. REFERRAL BONUSES */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Ecosystem Growth
          </h2>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            5 Qualified Referrals • +£1.50/hr Maximum Boost
          </p>
          <p className="text-xs text-gray-400 max-w-xl mx-auto">
            Invite fellow miners to participate. For each qualified referral who deploys at least one tool, you unlock a permanent +£0.30/hr capacity boost (capped at 5 referrals).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((slot) => (
            <div 
              key={slot}
              className="p-5 bg-[#0a1122] border border-cyan-900/40 rounded-2xl text-center space-y-2 hover:border-cyan-500/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center mx-auto">
                {slot}
              </div>
              <div className="text-sm font-bold text-white">Referral {slot}</div>
              <div className="text-xs font-mono font-bold text-emerald-400">+£0.30/hr</div>
              <p className="text-[10px] text-gray-400">Requires verified tool deployment</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CAMPAIGN TIMELINE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Campaign Roadmap
          </h2>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            90-Day Execution Timeline
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#0c1324] border border-cyan-900/40 rounded-2xl space-y-2">
            <span className="text-xs font-mono font-bold text-cyan-400">PHASE 1 • DAYS 1-87</span>
            <h3 className="text-lg font-bold text-white">Active Mining & Capacity Stacking</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Miners deploy and stack tools, invite verified referrals, and continuously accrue GBP balance 24/7.
            </p>
          </div>

          <div className="p-6 bg-[#0c1324] border border-amber-900/40 rounded-2xl space-y-2">
            <span className="text-xs font-mono font-bold text-amber-400">PHASE 2 • DAYS 88-90</span>
            <h3 className="text-lg font-bold text-white">Wallet Lock & Settlement Prep</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Payout wallet modifications are locked. Backend audits finalize user accrued balances against ledger timestamps.
            </p>
          </div>

          <div className="p-6 bg-[#0c1324] border border-emerald-900/40 rounded-2xl space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400">PHASE 3 • DAY 90+</span>
            <h3 className="text-lg font-bold text-white">Crypto Payouts & Archival</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Approved crypto payouts (BNB/USDT_BSC) are disbursed. Campaign transitions to immutable historical archive.
            </p>
          </div>
        </div>
      </section>

      {/* 7. WALLET & PAYOUT STANDARDS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Web3 & Custody Standards
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              BNB Smart Chain Integration
            </h2>
            <p className="text-xs text-gray-300 mt-2">
              All transactions occur directly on the BNB Smart Chain (Chain ID 56). Tool purchases are non-custodial and validated via blockchain receipts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="text-gray-400">Primary Payment Asset</div>
              <div className="text-white font-bold text-sm mt-1">BNB (BEP-20)</div>
            </div>
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="text-gray-400">Settlement Currency</div>
              <div className="text-cyan-300 font-bold text-sm mt-1">BNB / USDT (BSC)</div>
            </div>
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="text-gray-400">Confirmations Required</div>
              <div className="text-emerald-400 font-bold text-sm mt-1">2 BSC Blocks (~6s)</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Frequently Asked Questions
          </h2>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            Everything You Need to Know
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 bg-[#090e1d] border border-cyan-900/30 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-gray-300 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FINAL CALL TO ACTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 lg:p-14 bg-gradient-to-b from-[#0e172e] to-[#070b16] border border-cyan-500/30 rounded-3xl space-y-6 shadow-2xl shadow-cyan-950/40">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center mx-auto text-cyan-300">
            <Pickaxe className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Deploy Your Mining Nodes?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
              Join the 90-day Genesis campaign today. Connect your BSC wallet and unlock up to £12.10/hour in continuous capacity.
            </p>
          </div>

          <Link
            to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
            className="inline-flex px-9 py-4 rounded-xl font-extrabold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 items-center space-x-2 transition-all"
          >
            <span>{currentUser ? "Go to Live Mining Dashboard" : "Create Account & Start Mining"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
};
