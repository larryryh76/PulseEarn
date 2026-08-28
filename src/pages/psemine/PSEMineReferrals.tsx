import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  TrendingUp
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

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
    toast.success('Referral link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 text-xs font-semibold mb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Referral Accelerator • Max 5 Qualified</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Referral Capacity Boost Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Expand the mining network. Earn a permanent <strong className="text-emerald-400">+£0.30/hr</strong> for each qualified referral (up to 5 miners / +£1.50/hr).
          </p>
        </div>

        {/* Current Boost Badge */}
        <div className="p-3.5 bg-[#0D131F] border border-slate-800 rounded-2xl flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Referral Boost</div>
            <div className="text-base font-bold text-emerald-400 font-mono">
              +£{currentBoost.toFixed(2)}/hour
            </div>
          </div>
        </div>
      </div>

      {/* 5-Slot Visual Progress */}
      <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>5 Qualified Referral Slots</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each slot adds +£0.30/hr continuous mining capacity once your referral deploys their first tool.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800/40 px-2.5 py-1 rounded-lg">
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
                className={`p-4 rounded-xl border text-center transition-all ${
                  isQualified
                    ? 'bg-[#080C14] border-emerald-500/40 shadow-md shadow-emerald-950/20'
                    : 'bg-[#080C14] border-slate-800/80 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-mono text-slate-400">
                    SLOT {slotNumber}
                  </span>
                  {isQualified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>

                <div className={`text-sm font-bold font-mono my-1 ${isQualified ? 'text-emerald-400' : 'text-slate-500'}`}>
                  +£0.30/hr
                </div>

                <div className="text-[10px] text-slate-400">
                  {isQualified ? 'Active & Earning' : 'Pending Activation'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Code & Share Box */}
      <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white">Your Unique Mining Invite Link</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Share this link with participants. When they sign up and deploy any mining tool, your capacity updates automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 px-4 py-2.5 bg-[#080C14] border border-slate-700 rounded-xl font-mono text-xs text-blue-400 truncate flex items-center">
            {referralLink}
          </div>
          <button
            onClick={copyLink}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shrink-0 transition-all shadow-md shadow-blue-600/20"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Referrals List Table */}
      <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Referred Miners Log ({referrals.length})</span>
          </h3>
        </div>

        {referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Miner ID</th>
                  <th className="pb-3 font-semibold">Registered</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Capacity Addition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="text-slate-300 hover:bg-slate-900/40">
                    <td className="py-3 text-white font-bold">
                      {ref.refereeId.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ref.status === 'qualified'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-700/40'
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-emerald-400">
                      {ref.status === 'qualified' ? `+£${(ref.capacityContributionGBPPerHour ?? 0.30).toFixed(2)}/hr` : '£0.00/hr (Pending Deployment)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No referred miners yet. Share your invite link to unlock up to +£1.50/hour in capacity boost.
          </div>
        )}
      </div>

    </div>
  );
};
