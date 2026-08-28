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
      a: 'PSEmine is a specialized 90-day Genesis computational node within the PulseEarn ecosystem. Rather than completing sporadic micro-tasks, participants deploy continuous cloud mining capacity tools to accrue real-time balances in British Pounds (GBP £).'
    },
    {
      q: 'Do I need physical mining hardware or electricity?',
      a: 'No physical hardware or GPU rigs are required. Mining capacity is hosted on dedicated server nodes and activates immediately once verified on BNB Smart Chain.'
    },
    {
      q: 'How are tool purchases paid and verified?',
      a: 'Tools are priced in fixed GBP (£3, £10, £50, £200) and settled in BNB on BNB Smart Chain (BEP-20). Each checkout locks a 10-minute real-time exchange quote. Purchases activate upon 2 blockchain confirmations.'
    },
    {
      q: 'What is the maximum achievable mining capacity?',
      a: 'Deploying the maximum permitted units across all 4 tiers (5 Starter, 3 Builder, 3 Advanced, 2 Elite) yields £10.60/hour. Adding 5 qualified referrals (+£0.30/hour each) reaches the hard mathematical ceiling of £12.10/hour.'
    },
    {
      q: 'How does the 90-Day Campaign Settlement work?',
      a: 'Your mining earnings accumulate 24/7 strictly in GBP (£) with zero mid-campaign volatility. At Day 90, finalized balances are disbursed in crypto (BNB / USDT) to your configured BSC payout address.'
    }
  ];

  return (
    <div className="space-y-20 pb-24 md:pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 lg:pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-6 max-w-3xl mx-auto relative z-10">
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/40 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>90-DAY GENESIS MINING CAMPAIGN • BNB SMART CHAIN</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Deploy Continuous Mining Capacity in{' '}
            <span className="text-blue-400">
              GBP (£)
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Acquire cloud mining hardware units, earn up to <strong className="text-white font-mono">£12.10/hour</strong> in continuous balance accrual, and receive settlement at the end of the 90-day Genesis campaign.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all group"
            >
              <span>{currentUser ? "Launch Mining Dashboard" : "Start Mining"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/mine/tools"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-[#0D131F] hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center space-x-2 transition-all"
            >
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Explore Hardware</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left">
            <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
              <div className="text-[11px] text-slate-400 font-medium">Accounting Currency</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">GBP (£)</div>
            </div>
            <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
              <div className="text-[11px] text-slate-400 font-medium">Max Hardware Output</div>
              <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">£10.60/hr</div>
            </div>
            <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
              <div className="text-[11px] text-slate-400 font-medium">Referral Accelerator</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">+£1.50/hr</div>
            </div>
            <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
              <div className="text-[11px] text-slate-400 font-medium">Campaign Window</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{campaignDaysRemaining} Days Left</div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Operational Protocol
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How PSEmine Mining Operates
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Connect Wallet',
              desc: 'Link your BNB Smart Chain Web3 wallet to authorize hardware acquisitions.',
              icon: Wallet
            },
            {
              step: '02',
              title: 'Deploy Hardware',
              desc: 'Select from 4 hardware tiers priced in fixed GBP and settled via BNB.',
              icon: Cpu
            },
            {
              step: '03',
              title: 'Continuous Accrual',
              desc: 'Your node generates GBP earnings 24/7 with deterministic hourly rates.',
              icon: TrendingUp
            },
            {
              step: '04',
              title: '90-Day Settlement',
              desc: 'Finalized campaign earnings are disbursed in crypto to your BSC payout wallet.',
              icon: Coins
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono font-bold text-slate-600">{item.step}</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. HARDWARE MARKETPLACE PREVIEW */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Hardware Tiers
            </h2>
            <p className="text-2xl font-bold text-white tracking-tight">
              4 Locked Mining Hardware Tiers
            </p>
          </div>
          <Link
            to="/mine/tools"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>View Full Marketplace</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {toolList.map((tool) => (
            <div 
              key={tool.id}
              className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Tier {tool.tier}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Max: {tool.maxPerUser} Units
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{tool.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tool.description}</p>
                </div>

                <div className="p-3 bg-[#080C14] border border-slate-800/80 rounded-xl space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Price:</span>
                    <span className="font-bold text-white">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hourly Rate:</span>
                    <span className="font-bold text-emerald-400">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                </div>
              </div>

              <Link
                to="/mine/tools"
                className="mt-4 w-full py-2 bg-slate-900 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-xs font-bold text-center border border-slate-800 hover:border-blue-500 transition-colors"
              >
                Deploy Miner
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CAPACITY ARCHITECTURE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-6 sm:p-8 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Mathematical Economics
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Capacity Stacking Architecture
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                PSEmine replaces token speculation with deterministic capacity limits. Every hardware unit adds an immutable hourly rate that stacks additively.
              </p>

              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>5x Starter (£0.50/hr) + 3x Builder (£1.50/hr) + 3x Advanced (£3.60/hr) + 2x Elite (£5.00/hr)</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Maximum Hardware Capacity Limit: <strong>£10.60/hour</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Peak Rate with 5 Referrals: <strong>£12.10/hour</strong></span>
                </div>
              </div>
            </div>

            {/* Capacity Stacking Table */}
            <div className="p-5 bg-[#080C14] border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>COMPONENT</span>
                <span>MAX CONTRIBUTION</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-slate-300 font-sans">Hardware Tools Base</span>
                <span className="text-blue-400 font-bold">£10.60 / hr</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-slate-300 font-sans">Qualified Referrals (5x)</span>
                <span className="text-emerald-400 font-bold">+£1.50 / hr</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                <span className="font-bold text-white font-sans">Combined Peak Rate</span>
                <span className="font-bold text-white">£12.10 / hr</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Frequently Asked Questions
          </h2>
          <p className="text-2xl font-bold text-white tracking-tight">
            Key Campaign Details
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="p-8 sm:p-10 bg-[#0D131F] border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <Pickaxe className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ready to Deploy Mining Hardware?
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Join the 90-day Genesis campaign. Link your BSC wallet and begin continuous hourly capacity accrual.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
              className="inline-flex px-8 py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 items-center space-x-2 transition-all"
            >
              <span>{currentUser ? "Open Mining Dashboard" : "Create Account & Start Mining"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
