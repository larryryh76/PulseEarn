import React, { useState } from 'react';
import { Activity, Bell, Settings2, UsersRound, Copy, Check, ShieldCheck, Mail, User, Lock, ExternalLink } from 'lucide-react';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import { usePsemineRecords } from '../../hooks/usePsemineRecords';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { usePsemineWallet } from '../../contexts/PsemineWalletContext';
import toast from 'react-hot-toast';

type Module = 'activity' | 'referrals' | 'account' | 'notifications';

const config: Record<Module, { title: string; eyebrow: string; description: string; icon: React.ElementType }> = {
  activity: { title: 'Activity Ledger', eyebrow: 'PSEmine Operations', description: 'Chronological feed of verified payment confirmations, tool purchases, and output events.', icon: Activity },
  referrals: { title: 'Referral Hub', eyebrow: 'Ecosystem Mining Network', description: 'Qualified referrals earn +£0.30/hr per referral (up to 5 max = +£1.50/hr bonus rate).', icon: UsersRound },
  account: { title: 'Account Settings', eyebrow: 'Identity & Security', description: 'Manage your PSEmine account credentials, email verification, and security controls.', icon: Settings2 },
  notifications: { title: 'System Notices', eyebrow: 'Protocol Alerts', description: 'Real-time protocol, payment, campaign, and security updates.', icon: Bell },
};

interface PsemineModuleRecord {
  id?: string;
  title?: string;
  type?: string;
  status?: string;
  description?: string;
  message?: string;
  createdAt?: { toDate?: () => Date } | string;
}

export default function PsemineModulePage({ module }: { module: Module }) {
  const item = config[module];
  const Icon = item.icon;
  const { currentUser, psemineProfile } = usePsemineAuth();
  const { address, isConnected } = usePsemineWallet();

  const collectionName = module === 'activity' ? 'psemine_activities' : module === 'referrals' ? 'psemine_referrals' : module === 'notifications' ? 'psemine_notifications' : 'psemine_profiles';
  const { records, loading, error } = usePsemineRecords(collectionName);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/mine/signup?ref=${currentUser?.uid || 'miner'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PsemineLayout>
      <div className="mx-auto max-w-4xl py-6 space-y-8">
        {/* Module Header */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <Icon size={16} />
            <span>{item.eyebrow}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{item.title}</h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">{item.description}</p>
        </div>

        {/* Module Specific Body Content */}
        {module === 'referrals' && (
          <div className="space-y-6">
            {/* Referral Link Box */}
            <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Your Personal Referral Link</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Canonical bonus: <strong className="text-emerald-400">+£0.30/hr</strong> per qualified referral (referee must purchase 1+ tool). Max 5 referrals (+£1.50/hr max bonus).
              </p>
            </div>
          </div>
        )}

        {module === 'account' && (
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-emerald-400" />
              <span>Identity Profile</span>
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-medium">Username</span>
                <p className="text-white font-bold text-sm">{psemineProfile?.username || 'Miner'}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-medium">Email Address</span>
                <p className="text-white font-bold text-sm">{currentUser?.email || 'unverified'}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-medium">Email Status</span>
                <p className={`font-bold text-sm ${currentUser?.emailVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {currentUser?.emailVerified ? 'Verified' : 'Pending Verification'}
                </p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-medium">Connected Web3 Wallet</span>
                <p className="text-white font-mono text-xs truncate">
                  {isConnected ? address : 'No Wallet Connected'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Records View */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Verified Server Data</span>
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500">Synchronizing records with backend...</div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-red-400">Unable to load module data records.</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">No records found for this section yet.</div>
          ) : (
            <div className="space-y-2.5">
              {(records as PsemineModuleRecord[]).slice(0, 10).map((rec, i) => (
                <div key={rec.id || i} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{rec.title || rec.type || 'Record Entry'}</p>
                    {rec.description && <p className="text-zinc-400 text-[11px] mt-0.5">{rec.description}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {typeof rec.createdAt === 'object' && rec.createdAt?.toDate ? rec.createdAt.toDate().toLocaleDateString() : 'Verified'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PsemineLayout>
  );
}

export function PsemineNotificationsPage() { return <PsemineModulePage module="notifications" />; }
