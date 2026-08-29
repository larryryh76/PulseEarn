import React from 'react';
import { 
  BookOpen, 
  Cpu, 
  Coins, 
  Users, 
  Clock, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PSEMineGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10 pb-24 md:pb-12">
      
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/40 text-blue-400 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>OFFICIAL CAMPAIGN CONSTITUTION</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          PSEmine 90-Day Campaign Guide
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          The definitive architectural and economic specifications for the 90-day PSEmine cloud mining node campaign.
        </p>
      </div>

      {/* Main Constitution Content */}
      <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        
        {/* Section 1: Campaign Overview */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-2">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>1. Campaign Overview & Nature of PSEmine</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            PSEmine is a temporary, 90-day high-performance cloud capacity campaign running within the PulseEarn ecosystem. It introduces a deterministic, hourly computational capacity model that accrues continuously in Great British Pounds (GBP £) and settles in cryptocurrency at the conclusion of the 90-day Genesis period.
          </p>
        </div>

        {/* Section 2: Locked Hardware Tiers */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>2. Mining Hardware Tiers & Pricing</span>
          </h2>
          <p className="text-xs text-slate-400">
            All miners participate through 4 locked computational tiers. Each tier has an unalterable price in GBP (£), an hourly mining rate, and an ownership cap per user:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#05070E] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 1: Starter Miner</div>
              <div className="text-blue-400 font-semibold">£3.00 • +£0.10/hour (Max: 5 Units)</div>
              <div className="text-slate-400 text-[11px]">Max Tier Output: £0.50/hr</div>
            </div>
            <div className="p-3 bg-[#05070E] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 2: Builder Miner</div>
              <div className="text-blue-400 font-semibold">£10.00 • +£0.50/hour (Max: 3 Units)</div>
              <div className="text-slate-400 text-[11px]">Max Tier Output: £1.50/hr</div>
            </div>
            <div className="p-3 bg-[#05070E] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 3: Advanced Miner</div>
              <div className="text-blue-400 font-semibold">£50.00 • +£1.20/hour (Max: 3 Units)</div>
              <div className="text-slate-400 text-[11px]">Max Tier Output: £3.60/hr</div>
            </div>
            <div className="p-3 bg-[#05070E] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 4: Elite Miner</div>
              <div className="text-blue-400 font-semibold">£200.00 • +£2.50/hour (Max: 2 Units)</div>
              <div className="text-slate-400 text-[11px]">Max Tier Output: £5.00/hr</div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Total Hardware Capacity Cap: <strong className="text-white">£10.60/hour</strong>.
          </p>
        </div>

        {/* Section 3: Referral Network Economics */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>3. Referral Boost Architecture</span>
          </h2>
          <p className="text-xs text-slate-400">
            Miners can scale their hourly capacity beyond the hardware limit by inviting other verified users:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>+£0.30/hr</strong> per qualified referral who deploys at least one tool.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Hard limit of <strong>5 qualified referrals</strong> (+£1.50/hr maximum boost).</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Maximum theoretical rate combining all tools and 5 referrals: <strong>£12.10/hour</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Section 4: Settlement and Archival */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-2">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Coins className="w-4 h-4 text-blue-400" />
            <span>4. 90-Day Settlement & Archival Protocol</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All user balances accrue strictly in GBP (£) throughout the campaign. On Day 88, payout destination addresses are permanently locked. On Day 90, finalized balances are disbursed in crypto (BNB or USDT over BNB Smart Chain) to verified payout wallets.
          </p>
        </div>

      </div>

      {/* CTA */}
      <div className="text-center pt-2">
        <Link
          to="/mine/dashboard"
          className="inline-flex px-6 py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 items-center space-x-2 transition-all"
        >
          <span>Return to Mining Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
};
