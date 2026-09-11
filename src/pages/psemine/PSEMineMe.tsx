import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  ShieldCheck, 
  Wallet, 
  Users, 
  BookOpen, 
  History, 
  HelpCircle, 
  LogOut, 
  Copy, 
  Check, 
  ChevronRight, 
  ArrowLeft,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

export const PSEMineMe: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const { 
    pseUser, 
    connectedWallet, 
    disconnectWallet, 
    campaignDaysRemaining, 
    liveAccruedGBP 
  } = usePSEMine();
  const navigate = useNavigate();

  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const referralCode = userData?.referralCode || currentUser?.uid?.slice(0, 8).toUpperCase() || 'MINER';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}&redirect=/mine/dashboard`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    toast.success('Address copied');
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Logout failed');
    }
  };

  const totalHardwareUnits = pseUser?.toolOwnershipCounts 
    ? Object.values(pseUser.toolOwnershipCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 md:space-y-8 transition-colors">
      
      {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
              PSEmine Account
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Account & Settings
          </h1>
          <p className="text-xs md:text-sm text-text-secondary">
            Manage your mining identity, connected wallets, and settlement preferences.
          </p>
        </div>

        <Link
          to="/mine/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-bright border border-border rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-all shadow-subtle shrink-0"
        >
          <ArrowLeft size={14} />
          <span>Mining Overview</span>
        </Link>
      </motion.div>

      {/* ── PROFILE OVERVIEW CARD ───────────────────────────────────────── */}
      <div className="p-6 md:p-7 bg-surface border border-border rounded-2xl md:rounded-3xl shadow-subtle relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] font-bold text-xl shrink-0 font-mono">
              {currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : <User size={24} />}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-text-primary text-base md:text-lg">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Miner'}
                </span>
                <span className="psemine-badge-emerald">
                  PSEmine 90D
                </span>
              </div>
              <p className="text-xs text-text-secondary font-mono">
                {currentUser?.email}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-text-tertiary pt-0.5">
                <span className="inline-flex items-center text-[#00E599] font-medium">
                  <ShieldCheck size={14} className="mr-1" />
                  Authenticated
                </span>
                <span>•</span>
                <span className="font-mono">UID: {currentUser?.uid ? `${currentUser.uid.slice(0, 8)}...` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
            <div className="text-xs text-text-tertiary font-medium">Estimated Earnings</div>
            <div className="text-2xl md:text-3xl font-black text-text-primary font-mono tabular-nums tracking-tight mt-0.5">
              £{liveAccruedGBP.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#00E599] font-mono font-bold mt-0.5">
              +£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hour rate
            </div>
          </div>

        </div>
      </div>

      {/* ── QUICK METRICS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 md:p-5 bg-surface border border-border rounded-xl md:rounded-2xl">
          <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Active Tools</div>
          <div className="text-lg md:text-xl font-bold text-text-primary font-mono tabular-nums mt-1">
            {totalHardwareUnits} <span className="text-xs text-text-tertiary font-normal">Tools</span>
          </div>
          <Link to="/mine/tools" className="text-[10px] text-[#00E599] hover:underline font-bold uppercase tracking-wider mt-2 inline-block">
            View Tools →
          </Link>
        </div>

        <div className="p-4 md:p-5 bg-surface border border-border rounded-xl md:rounded-2xl">
          <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Tool Rate</div>
          <div className="text-lg md:text-xl font-bold text-[#00E599] font-mono tabular-nums mt-1">
            £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}<span className="text-xs text-text-tertiary font-normal">/hr</span>
          </div>
          <span className="text-[10px] text-text-tertiary mt-2 inline-block">Cap: £10.60/hr</span>
        </div>

        <div className="p-4 md:p-5 bg-surface border border-border rounded-xl md:rounded-2xl">
          <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Referral Boost</div>
          <div className="text-lg md:text-xl font-bold text-[#00E599] font-mono tabular-nums mt-1">
            +£{(pseUser?.referralCapacityGBPPerHour || 0).toFixed(2)}<span className="text-xs text-text-tertiary font-normal">/hr</span>
          </div>
          <span className="text-[10px] text-text-tertiary mt-2 inline-block">{pseUser?.qualifiedReferralsCount || 0}/5 Qualified</span>
        </div>

        <div className="p-4 md:p-5 bg-surface border border-border rounded-xl md:rounded-2xl">
          <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Campaign Window</div>
          <div className="text-lg md:text-xl font-bold text-text-primary font-mono tabular-nums mt-1">
            {campaignDaysRemaining} <span className="text-xs text-text-tertiary font-normal">Days</span>
          </div>
          <span className="text-[10px] text-text-tertiary mt-2 inline-block">90-Day Campaign</span>
        </div>
      </div>

      {/* ── WALLET CONFIGURATIONS SECTION ───────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary px-1">
          Wallets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Connected Wallet */}
          <div className="p-5 md:p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 flex flex-col justify-between shadow-subtle">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599]">
                    <Wallet size={16} />
                  </div>
                  <span className="font-bold text-text-primary text-sm">Payment Wallet</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-surface-bright text-text-secondary border border-border">
                  BNB Smart Chain
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Used to authorize BNB payments when purchasing mining tools.
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              {connectedWallet ? (
                <>
                  <span className="font-mono text-text-primary">
                    {`${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyAddress(connectedWallet)}
                      className="text-text-tertiary hover:text-text-primary p-1 transition-colors"
                      title="Copy Address"
                    >
                      {copiedWallet ? <Check size={14} className="text-[#00E599]" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={disconnectWallet}
                      className="text-danger hover:opacity-80 font-bold text-[11px] transition-opacity"
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-text-tertiary">Not Connected</span>
                  <Link to="/mine/wallet" className="text-[#00E599] hover:underline font-bold">
                    Connect Wallet →
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 2. Payout Wallet */}
          <div className="p-5 md:p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 flex flex-col justify-between shadow-subtle">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599]">
                    <Lock size={16} />
                  </div>
                  <span className="font-bold text-text-primary text-sm">Payout Settlement Address</span>
                </div>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                  pseUser?.payoutWallet 
                    ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20" 
                    : "bg-warning/10 text-warning border-warning/20"
                )}>
                  {pseUser?.payoutWallet ? 'Configured' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Destination address where finalized campaign earnings will be disbursed.
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              {pseUser?.payoutWallet ? (
                <>
                  <span className="font-mono text-[#00E599] font-bold">
                    {`${pseUser.payoutWallet.slice(0, 6)}...${pseUser.payoutWallet.slice(-4)}`}
                  </span>
                  <Link to="/mine/wallet" className="text-[#00E599] hover:underline font-bold text-[11px]">
                    Change Address →
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-warning text-[11px] font-medium">Payout address not set</span>
                  <Link to="/mine/wallet" className="text-[#00E599] hover:underline font-bold text-[11px]">
                    Configure Payout →
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── REFERRAL PROGRAM CARD ───────────────────────────────────────── */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#00E599]" />
              <h3 className="font-bold text-text-primary text-sm md:text-base">Referral Boost</h3>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Earn +£0.30/hr per qualified friend up to 5 referrals (+£1.50/hr permanent boost).
            </p>
          </div>

          <Link
            to="/mine/referrals"
            className="text-xs font-bold text-[#00E599] hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            <span>View Referrals</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="p-3.5 bg-surface-bright/50 border border-border rounded-xl flex items-center justify-between gap-2">
          <div className="font-mono text-xs text-text-primary truncate max-w-[240px] sm:max-w-md">
            {referralLink}
          </div>
          <button
            onClick={copyReferral}
            className="psemine-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
          >
            {copiedRef ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedRef ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── QUICK NAVIGATION LINKS ──────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl md:rounded-3xl divide-y divide-border text-xs overflow-hidden shadow-subtle">
        
        <Link
          to="/mine/guide"
          className="p-4 flex items-center justify-between hover:bg-surface-bright/60 transition-colors"
        >
          <div className="flex items-center gap-3 text-text-primary font-medium">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 flex items-center justify-center text-[#00E599]">
              <BookOpen size={16} />
            </div>
            <span>Campaign Guide & FAQ</span>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </Link>

        <Link
          to="/mine/activity"
          className="p-4 flex items-center justify-between hover:bg-surface-bright/60 transition-colors"
        >
          <div className="flex items-center gap-3 text-text-primary font-medium">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 flex items-center justify-center text-[#00E599]">
              <History size={16} />
            </div>
            <span>Activity Ledger</span>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </Link>

        <Link
          to="/mine/guide"
          className="p-4 flex items-center justify-between hover:bg-surface-bright/60 transition-colors"
        >
          <div className="flex items-center gap-3 text-text-primary font-medium">
            <div className="w-8 h-8 rounded-lg bg-[#00E599]/10 flex items-center justify-center text-[#00E599]">
              <HelpCircle size={16} />
            </div>
            <span>Campaign FAQ & Troubleshooting</span>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </Link>

      </div>

      {/* ── LOGOUT ACTION ───────────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-surface hover:bg-danger/10 border border-border hover:border-danger/30 rounded-xl md:rounded-2xl text-text-secondary hover:text-danger text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-subtle"
        >
          <LogOut size={16} className="text-danger" />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
};
