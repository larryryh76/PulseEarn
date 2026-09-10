import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

/** Render referral progress, earning boosts, and the miner's shareable invite link. */
export const PSEMineReferrals: React.FC = () => {
  const { pseUser, referrals } = usePSEMine();
  const { currentUser, userData } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = userData?.referralCode || currentUser?.uid?.slice(0, 8).toUpperCase() || 'PSEMINE';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}&redirect=/mine/dashboard`;

  const qualifiedCount = pseUser?.qualifiedReferralsCount || 0;
  const currentBoost = pseUser?.referralCapacityGBPPerHour || 0;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 md:space-y-8 transition-colors">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
              Referral Boost · Max 5 Slots
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Referral Boost
          </h1>
          <p className="text-xs md:text-sm text-text-secondary">
            Earn an additional <strong className="text-success font-bold">+£0.30/hr</strong> for each invited friend who purchases a tool (up to 5 referrals / +£1.50/hr).
          </p>
        </div>

        {/* Current Boost Badge */}
        <div className="p-4 bg-surface border border-border rounded-2xl flex items-center gap-4 shrink-0 shadow-subtle">
          <div className="w-10 h-10 rounded-xl bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Active Referral Boost</div>
            <div className="text-base font-bold text-[#00E599] font-mono tabular-nums mt-0.5">
              +£{currentBoost.toFixed(2)}/hour
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 5-SLOT VISUAL PROGRESS ──────────────────────────────────────── */}
      <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-5 shadow-subtle">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm md:text-base font-bold text-text-primary">
              Referral Boost Slots
            </h2>
            <p className="text-xs text-text-secondary">
              Each slot adds +£0.30/hr hourly capacity once your referral purchases their first tool.
            </p>
          </div>
          <span className="psemine-badge-emerald font-mono">
            {qualifiedCount} / 5 Qualified
          </span>
        </div>

        {/* 5 Slots Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((slotNumber) => {
            const isQualified = slotNumber <= qualifiedCount;
            return (
              <div
                key={slotNumber}
                className={cn(
                  "p-4 rounded-xl md:rounded-2xl border text-center transition-all",
                  isQualified
                    ? "bg-[#00E599]/5 border-[#00E599]/30 shadow-sm"
                    : "bg-surface-bright/40 border-border opacity-70"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-mono text-text-tertiary uppercase tracking-wider">
                    Slot {slotNumber}
                  </span>
                  {isQualified ? (
                    <CheckCircle2 size={14} className="text-[#00E599]" />
                  ) : (
                    <Clock size={14} className="text-text-tertiary" />
                  )}
                </div>

                <div className={cn(
                  "text-sm font-bold font-mono tabular-nums my-1",
                  isQualified ? "text-[#00E599]" : "text-text-tertiary"
                )}>
                  +£0.30/hr
                </div>

                <div className="text-[10px] text-text-tertiary">
                  {isQualified ? 'Active' : 'Available'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── INVITE CODE & SHARE BOX ─────────────────────────────────────── */}
      <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 shadow-subtle">
        <div>
          <h3 className="text-sm md:text-base font-bold text-text-primary">Your Referral Link</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Share this link with friends. When they create an account and buy any tool, your boost activates automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 px-4 py-3 bg-surface-bright border border-border rounded-xl font-mono text-xs text-text-primary truncate flex items-center">
            {referralLink}
          </div>
          <button
            onClick={copyLink}
            className="psemine-btn-primary px-6 py-3 text-xs flex items-center justify-center gap-2 shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* ── REFERRALS LIST TABLE ────────────────────────────────────────── */}
      <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 shadow-subtle">
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-bold text-text-primary flex items-center gap-2">
            <Users size={16} className="text-[#00E599]" />
            <span>Referrals ({referrals.length})</span>
          </h3>
        </div>

        {referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-text-tertiary uppercase font-bold text-[10px] border-b border-border tracking-wider">
                <tr>
                  <th className="pb-3 font-bold">User ID</th>
                  <th className="pb-3 font-bold">Date</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Boost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="text-text-secondary hover:bg-surface-bright/50 transition-colors">
                    <td className="py-3 text-text-primary font-mono font-bold">
                      {ref.refereeId.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-text-tertiary font-mono">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        ref.status === 'qualified'
                          ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20"
                          : "bg-surface-bright text-text-tertiary border-border"
                      )}>
                        {ref.status === 'qualified' ? 'Qualified' : 'Pending Purchase'}
                      </span>
                    </td>
                    <td className="py-3 font-bold font-mono text-[#00E599] tabular-nums">
                      {ref.status === 'qualified' ? `+£${(ref.capacityContributionGBPPerHour ?? 0.30).toFixed(2)}/hr` : '£0.00/hr'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-text-tertiary">
            No referrals yet. Share your referral link to earn up to +£1.50/hour in capacity boost.
          </div>
        )}
      </div>

    </div>
  );
};
