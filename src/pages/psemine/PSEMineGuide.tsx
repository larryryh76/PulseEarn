import React from 'react';
import { 
  BookOpen, 
  Layers, 
  Coins, 
  Users, 
  Clock, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const PSEMineGuide: React.FC = () => {
  return (
    <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 md:space-y-10 transition-colors">
      
      {/* ── TITLE ──────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E599]/10 border border-[#00E599]/25 text-[#00E599] text-xs font-bold uppercase tracking-wider">
          <BookOpen size={14} />
          <span>Campaign Information</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
          PSEmine Campaign Guide
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto">
          Complete guide to the 90-day PSEmine cloud mining campaign, tool tiers, and settlement process.
        </p>
      </motion.div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="space-y-5 text-xs sm:text-sm text-text-secondary leading-relaxed">
        
        {/* Section 1: Campaign Overview */}
        <div className="p-6 sm:p-7 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-3 shadow-subtle">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] shrink-0">
              <Clock size={16} />
            </div>
            <span>1. Campaign Overview</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            PSEmine is a 90-day mining campaign within PulseEarn. It allows participants to build hourly earning capacity denominated in Great British Pounds (GBP £). Earnings accumulate continuously throughout the 90 days and are disbursed in cryptocurrency at the end of the campaign.
          </p>
        </div>

        {/* Section 2: Mining Tools & Tiers */}
        <div className="p-6 sm:p-7 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 shadow-subtle">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] shrink-0">
              <Layers size={16} />
            </div>
            <span>2. Mining Tools & Pricing</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Participants can purchase across 4 tiers of mining tools. Each tier has a fixed price in GBP, an hourly mining rate, and an ownership cap:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-4 bg-surface-bright/50 border border-border rounded-xl md:rounded-2xl space-y-1.5">
              <div className="text-text-primary font-bold">Tier 1: Starter Miner</div>
              <div className="text-[#00E599] font-mono font-bold tabular-nums">£3.00 • +£0.10/hour (Max: 5 Units)</div>
              <div className="text-text-tertiary text-[11px]">Max Tier Output: £0.50/hr</div>
            </div>
            <div className="p-4 bg-surface-bright/50 border border-border rounded-xl md:rounded-2xl space-y-1.5">
              <div className="text-text-primary font-bold">Tier 2: Builder Miner</div>
              <div className="text-[#00E599] font-mono font-bold tabular-nums">£10.00 • +£0.50/hour (Max: 3 Units)</div>
              <div className="text-text-tertiary text-[11px]">Max Tier Output: £1.50/hr</div>
            </div>
            <div className="p-4 bg-surface-bright/50 border border-border rounded-xl md:rounded-2xl space-y-1.5">
              <div className="text-text-primary font-bold">Tier 3: Advanced Miner</div>
              <div className="text-[#00E599] font-mono font-bold tabular-nums">£50.00 • +£1.20/hour (Max: 3 Units)</div>
              <div className="text-text-tertiary text-[11px]">Max Tier Output: £3.60/hr</div>
            </div>
            <div className="p-4 bg-surface-bright/50 border border-border rounded-xl md:rounded-2xl space-y-1.5">
              <div className="text-text-primary font-bold">Tier 4: Elite Miner</div>
              <div className="text-[#00E599] font-mono font-bold tabular-nums">£200.00 • +£2.50/hour (Max: 2 Units)</div>
              <div className="text-text-tertiary text-[11px]">Max Tier Output: £5.00/hr</div>
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            Total tool capacity limit across all tiers: <strong className="text-text-primary font-bold">£10.60/hour</strong>.
          </p>
        </div>

        {/* Section 3: Referral Boost */}
        <div className="p-6 sm:p-7 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 shadow-subtle">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] shrink-0">
              <Users size={16} />
            </div>
            <span>3. Referral Boost</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Increase your hourly capacity beyond tool limits by inviting friends:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-text-secondary">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-[#00E599] shrink-0 mt-0.5" />
              <span><strong className="text-text-primary">+£0.30/hr</strong> for each qualified referral who purchases at least one tool.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-[#00E599] shrink-0 mt-0.5" />
              <span>Maximum of <strong className="text-text-primary">5 qualified referrals</strong> (+£1.50/hr boost cap).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-[#00E599] shrink-0 mt-0.5" />
              <span>Peak achievable rate with all tools and 5 referrals: <strong className="text-text-primary font-mono">£12.10/hour</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Section 4: Settlement */}
        <div className="p-6 sm:p-7 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-3 shadow-subtle">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] shrink-0">
              <Coins size={16} />
            </div>
            <span>4. Settlement & Disbursement</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            All user balances accrue in GBP (£) throughout the campaign. On Day 90, finalized balances are disbursed to your configured BNB Smart Chain address (BEP-20) in crypto.
          </p>
        </div>

      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <div className="text-center pt-4">
        <Link
          to="/mine/dashboard"
          className="psemine-btn-primary py-3.5 px-8 text-xs inline-flex items-center gap-2"
        >
          <span>Return to Mining Overview</span>
          <ArrowRight size={16} />
        </Link>
      </div>

    </div>
  );
};
