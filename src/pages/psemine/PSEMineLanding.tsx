import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  ShieldCheck,
  Zap,
  Cpu,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import { PSEMineLogo } from '../../components/psemine/PSEMineLogo';
import { cn } from '../../utils';

export const PSEMineLanding: React.FC = () => {
  const { campaignDaysRemaining, liveAccruedGBP, pseUser } = usePSEMine();
  const { currentUser } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toolList = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

  const faqs = [
    {
      q: 'What is the PSEmine Campaign?',
      a: 'PSEmine is an official 90-day cloud mining campaign integrated into the PulseEarn ecosystem. Participants activate cloud mining tools to build a fixed hourly earning capacity denominated in Great British Pounds (GBP £).'
    },
    {
      q: 'Do I need physical mining rigs or hardware?',
      a: 'No. All mining capacity operates 100% in the cloud. You do not incur electricity expenses, hardware wear, or maintenance requirements. Your hourly capacity accrues continuously 24/7 once activated.'
    },
    {
      q: 'How are tool purchases paid for?',
      a: 'Mining tools are priced in fixed GBP (£3, £10, £50, £200) to protect against crypto rate fluctuations during the campaign. Purchases are executed with live BNB on the BNB Smart Chain (BEP-20).'
    },
    {
      q: 'What is the peak achievable hourly mining rate?',
      a: 'Across all 4 tool tiers, you can accumulate up to £10.60/hour in base capacity. By activating all 5 referral boost slots (+£0.30/hr each), your peak achievable rate reaches £12.10/hour.'
    },
    {
      q: 'When and how are accumulated earnings disbursed?',
      a: 'Estimated earnings accrue continuously every second throughout the 90-day campaign window. At day 90, the campaign transitions to settlement, and finalized balances are disbursed to your configured BNB Smart Chain address.'
    },
    {
      q: 'Can I change my payout wallet address during the campaign?',
      a: 'Yes. You can configure and update your BEP-20 settlement address at any time from your Wallet dashboard before the final settlement phase begins.'
    }
  ];

  return (
    <div className="pt-8 md:pt-14 pb-28 space-y-16 md:space-y-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors">
      
      {/* ── 1. HERO SECTION ─────────────────────────────────────────────── */}
      <section className="py-6 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Headline & Messaging */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E599]/10 border border-[#00E599]/25 text-[#00E599] text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E599] animate-ping" />
              <span>90-Day Web3 Cloud Mining Campaign</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-text-primary leading-[1.1]">
                Build Your Mining <span className="text-[#00E599]">Capacity.</span>
              </h1>
              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
                Activate cloud mining tools, lock in fixed GBP hourly output rates, and earn 24/7 with non-custodial BNB Smart Chain settlement.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <Link
                to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
                className="psemine-btn-primary py-3.5 px-8 flex items-center justify-center gap-2 text-xs font-bold"
              >
                <span>{currentUser ? "Open Mining Console" : "Enter PSEmine"}</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/mine/tools"
                className="psemine-btn-secondary py-3.5 px-7 flex items-center justify-center gap-2 text-xs font-bold"
              >
                <Layers size={16} className="text-[#00E599]" />
                <span>Explore Tools</span>
              </Link>
            </div>

            {/* Key Trust Checkmarks */}
            <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-secondary">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#00E599]" />
                <span className="font-medium">Fixed GBP Rate Accounting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#00E599]" />
                <span className="font-medium">24/7 Continuous Accrual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#00E599]" />
                <span className="font-medium">BEP-20 Settlement</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Craft Web3 Campaign Visual Preview */}
          <div className="lg:col-span-5">
            <div className="relative">
              {/* Subtle ambient accent glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00E599]/20 to-[#00B4D8]/20 rounded-3xl blur-xl opacity-60 -z-10" />

              <div className="bg-[#0D1420] border border-white/10 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl text-white">
                
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div className="flex items-center gap-2.5">
                    <PSEMineLogo size={26} showWordmark={false} />
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-tertiary">Campaign Node</span>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>BNB Smart Chain</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E599]" />
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1 bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/30 rounded-full text-xs font-mono font-bold tabular-nums">
                    {campaignDaysRemaining}d remaining
                  </div>
                </div>

                {/* Accrual Card Simulator / Live View */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/8 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span className="uppercase text-[10px] font-bold tracking-wider">Estimated Campaign Earnings</span>
                    <span className="text-[#00E599] font-mono text-[11px] font-bold">24/7 Active</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white tabular-nums">
                    £{(liveAccruedGBP || 0).toFixed(2)}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/8 text-[11px]">
                    <span className="text-text-tertiary">Hourly Output</span>
                    <span className="text-[#00E599] font-bold font-mono">
                      +£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hr
                    </span>
                  </div>
                </div>

                {/* Capacity Tiers Matrix Preview */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-text-tertiary font-bold uppercase tracking-wider">
                    <span>Tool Capacity Spectrum</span>
                    <span className="text-white">£0.10 — £2.50/hr</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {toolList.map((tool) => (
                      <div key={tool.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <div className="text-[9px] font-bold text-text-tertiary uppercase">T{tool.tier}</div>
                        <div className="text-xs font-bold font-mono text-white mt-0.5">£{tool.purchasePriceGBP}</div>
                        <div className="text-[10px] font-bold text-[#00E599] font-mono">+£{tool.hourlyRateGBP}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fast Action */}
                <Link
                  to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
                  className="w-full py-3 bg-[#00E599] hover:bg-[#00D08A] text-[#070A0F] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                >
                  <span>Launch Mining Dashboard</span>
                  <ArrowRight size={14} />
                </Link>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. CAMPAIGN CONCEPT ─────────────────────────────────────────── */}
      <section className="p-8 md:p-10 bg-surface border border-border rounded-3xl space-y-6">
        <div className="max-w-3xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#00E599]">The Campaign Concept</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Cloud Mining Mechanics Built for Certainty
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            PSEmine removes the complexity, hardware overhead, and unpredictable gas costs of traditional mining. Over a dedicated 90-day event window, users deploy cloud mining tools with guaranteed hourly GBP yield rates, verified on-chain at completion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-surface-bright/50 border border-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
            <h3 className="text-sm font-bold text-text-primary">90-Day Fixed Window</h3>
            <p className="text-xs text-text-secondary">Strictly time-bounded campaign period ensuring transparent settlement.</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-bright/50 border border-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20 flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-sm font-bold text-text-primary">GBP Rate Protection</h3>
            <p className="text-xs text-text-secondary">Fixed GBP hourly accruals protect your earnings from token market volatility.</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-bright/50 border border-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20 flex items-center justify-center font-bold">
              <Cpu size={16} />
            </div>
            <h3 className="text-sm font-bold text-text-primary">Zero Hardware Setup</h3>
            <p className="text-xs text-text-secondary">100% cloud-hosted capacity nodes running non-stop without physical rigs.</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-bright/50 border border-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20 flex items-center justify-center font-bold">
              <Zap size={16} />
            </div>
            <h3 className="text-sm font-bold text-text-primary">BEP-20 Payout</h3>
            <p className="text-xs text-text-secondary">Direct settlement to your non-custodial BNB Smart Chain address.</p>
          </div>
        </div>
      </section>

      {/* ── 3. FOUR SPECIALIZED TOOL TIERS ──────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#00E599]">Mining Tools</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Four Specialized Capacity Tiers
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Acquire any combination of tools within allowed limits to scale your hourly rate.
            </p>
          </div>

          <Link
            to="/mine/tools"
            className="text-xs font-bold text-[#00E599] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View Full Specifications</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {toolList.map((tool) => (
            <div
              key={tool.id}
              className="psemine-card flex flex-col justify-between space-y-5 group hover:border-[#00E599]/30"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-surface-bright border border-border text-text-secondary">
                    Tier {tool.tier}
                  </span>
                  <span className="text-xs text-text-tertiary font-mono">
                    Max: {tool.maxPerUser}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-text-primary group-hover:text-[#00E599] transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="p-3.5 bg-surface-bright/50 border border-border rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary">Price:</span>
                    <span className="font-bold text-text-primary font-mono text-sm">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary">Hourly Yield:</span>
                    <span className="font-bold text-[#00E599] font-mono">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-border">
                    <span className="text-text-tertiary">Max Tier Output:</span>
                    <span className="font-mono text-text-primary font-semibold">
                      £{(tool.hourlyRateGBP * tool.maxPerUser).toFixed(2)}/hr
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/mine/tools"
                className="w-full py-2.5 bg-surface-bright hover:bg-[#00E599] hover:text-[#070A0F] text-text-primary rounded-xl text-xs font-bold text-center border border-border transition-all"
              >
                Inspect Tool
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. HOW CAPACITY CONVERTS TO EARNINGS ─────────────────────────── */}
      <section className="p-8 md:p-10 bg-surface border border-border rounded-3xl space-y-6">
        <div className="max-w-3xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#00E599]">Transparent Progression</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            How Mining Capacity Works
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Your earnings grow predictably across three core mechanics throughout the campaign.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-surface-bright/40 border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/25 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-text-primary">Tool Deployment</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Acquiring mining tools immediately adds permanent base hourly capacity (up to £10.60/hr across all tiers).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-bright/40 border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/25 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-text-primary">Referral Capacity Boost</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Invite friends using your referral code. Each qualified friend adds +£0.30/hr up to 5 slots (+£1.50/hr total boost).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-bright/40 border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/25 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-text-primary">Settlement & Payout</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              On day 90, cumulative balances are converted and disbursed directly to your connected BNB Smart Chain wallet address.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. CAMPAIGN NUMBERS & METRICS ────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-surface border border-border rounded-2xl text-center space-y-1">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Duration</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono">90 Days</div>
          <div className="text-[11px] text-[#00E599] font-medium">{campaignDaysRemaining}d remaining</div>
        </div>

        <div className="p-5 bg-surface border border-border rounded-2xl text-center space-y-1">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Tool Tiers</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono">4 Tiers</div>
          <div className="text-[11px] text-text-secondary">£3.00 to £200.00</div>
        </div>

        <div className="p-5 bg-surface border border-border rounded-2xl text-center space-y-1">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Base Capacity</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#00E599] font-mono">£10.60/hr</div>
          <div className="text-[11px] text-text-secondary">Maximum tool output</div>
        </div>

        <div className="p-5 bg-surface border border-border rounded-2xl text-center space-y-1">
          <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Peak Rate</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono">£12.10/hr</div>
          <div className="text-[11px] text-[#00E599]">Tools + 5 Referrals</div>
        </div>
      </section>

      {/* ── 6. FAQ SECTION ──────────────────────────────────────────────── */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#00E599]">Frequently Asked Questions</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Everything You Need to Know
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Clear, transparent answers about the campaign mechanics, tools, and payouts.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className="bg-surface border border-border rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-sm font-bold text-text-primary flex items-center gap-2.5">
                    <HelpCircle size={16} className="text-[#00E599] shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-text-tertiary transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-border/50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. FINAL HIGH-CONVERSION CTA ─────────────────────────────────── */}
      <section className="p-8 sm:p-10 bg-gradient-to-br from-[#0D1420] to-[#080C14] border border-[#00E599]/20 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#00E599]/10 text-[#00E599] text-[10px] font-bold uppercase tracking-wider border border-[#00E599]/25">
            <span>Event In Progress</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to Build Your Hourly Mining Rate?
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl">
            Join the 90-day campaign today. Establish your capacity nodes and start accruing GBP value around the clock.
          </p>
        </div>

        <Link
          to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
          className="psemine-btn-primary py-4 px-9 text-xs font-bold shrink-0 flex items-center gap-2 shadow-lg shadow-[#00E599]/25"
        >
          <span>{currentUser ? "Open Mining Console" : "Join PSEmine"}</span>
          <ArrowRight size={16} />
        </Link>
      </section>

    </div>
  );
};

export default PSEMineLanding;
