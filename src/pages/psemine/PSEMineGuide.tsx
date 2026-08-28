import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>OFFICIAL CAMPAIGN CONSTITUTION</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          PSEmine 90-Day Campaign Guide
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          The definitive architectural and economic specifications for the 90-day PSEmine cloud mining node campaign.
        </p>
      </div>

      {/* Main Constitution Content */}
      <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
        
        {/* Section 1: Campaign Overview */}
        <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>1. Campaign Overview & Nature of PSEmine</span>
          </h2>
          <p>
            PSEmine is a temporary, 90-day high-performance cloud capacity campaign running within the PulseEarn ecosystem. It introduces a deterministic, hourly computational capacity model that accrues continuously in Great British Pounds (GBP £) and settles in cryptocurrency at the conclusion of the 90-day Genesis period.
          </p>
        </div>

        {/* Section 2: Locked Hardware Tiers */}
        <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>2. Mining Hardware Tiers & Pricing</span>
          </h2>
          <p>
            All miners participate through 4 locked computational tiers. Each tier has an unalterable price in GBP (£), an hourly mining rate, and an ownership cap per user:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-[#080d19] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 1: Starter Miner</div>
              <div className="text-cyan-400 font-semibold">£3.00 • +£0.10/hour (Max: 5 Units)</div>
              <div className="text-gray-400 text-[11px]">Max Tier Output: £0.50/hr</div>
            </div>
            <div className="p-3.5 bg-[#080d19] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 2: Builder Miner</div>
              <div className="text-cyan-400 font-semibold">£10.00 • +£0.50/hour (Max: 3 Units)</div>
              <div className="text-gray-400 text-[11px]">Max Tier Output: £1.50/hr</div>
            </div>
            <div className="p-3.5 bg-[#080d19] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 3: Advanced Miner</div>
              <div className="text-cyan-400 font-semibold">£50.00 • +£1.20/hour (Max: 3 Units)</div>
              <div className="text-gray-400 text-[11px]">Max Tier Output: £3.60/hr</div>
            </div>
            <div className="p-3.5 bg-[#080d19] border border-slate-800 rounded-xl space-y-1">
              <div className="text-white font-bold">Tier 4: Elite Miner</div>
              <div className="text-cyan-400 font-semibold">£200.00 • +£2.50/hour (Max: 2 Units)</div>
              <div className="text-gray-400 text-[11px]">Max Tier Output: £5.00/hr</div>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Total Hardware Capacity Cap: <strong>£10.60/hour</strong>.
          </p>
        </div>

        {/* Section 3: Referral Network Economics */}
        <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>3. Referral Boost Architecture</span>
          </h2>
          <p>
            Miners can scale their hourly capacity beyond the hardware limit by inviting other verified users:
          </p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>+£0.30/hr</strong> per qualified referral who deploys at least one tool.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Hard limit of <strong>5 qualified referrals</strong> (+£1.50/hr maximum boost).</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Maximum theoretical rate across all tools + referrals: <strong>£12.10/hour</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Section 4: Settlement & Payout */}
        <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-cyan-400" />
            <span>4. 90-Day Settlement & Crypto Payouts</span>
          </h2>
          <p>
            Throughout the campaign, earnings accrue second-by-second in GBP. At campaign day 90:
          </p>
          <ul className="space-y-1.5 text-xs text-gray-300">
            <li>• Payout wallet destinations are locked against alteration.</li>
            <li>• Final balances are verified against backend audit records.</li>
            <li>• Approved balances are disbursed in cryptocurrency (BNB or USDT_BSC) to miners' linked wallets.</li>
          </ul>
        </div>

        {/* Section 5: Protocol Governance & Archival */}
        <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>5. Protocol Governance & Archival Kill Switch</span>
          </h2>
          <p>
            Upon settlement completion, the campaign transitions into an immutable read-only archived state. The historical records, transaction hashes, and earnings ledgers remain perpetually accessible for audit and tax reconciliation.
          </p>
        </div>

      </div>

      {/* CTA Button */}
      <div className="text-center pt-4">
        <Link
          to="/mine/dashboard"
          className="inline-flex px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold items-center space-x-2 shadow-xl shadow-cyan-500/20"
        >
          <span>Return to Live Operations</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
};
