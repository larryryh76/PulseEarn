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
  ExternalLink, 
  LogOut, 
  Copy, 
  Check, 
  ChevronRight, 
  ArrowLeft,
  Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
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
  const referralLink = `${window.location.origin}/mine?ref=${referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    toast.success('Referral link copied to clipboard');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-12">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Account & Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your mining identity, connected wallets, security, and settlement preferences.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>PulseEarn Main</span>
        </Link>
      </div>

      {/* Profile Overview Card (Binance / Modern Fintech Style) */}
      <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl relative overflow-hidden shadow-xl shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold text-xl">
              {currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : <User className="w-7 h-7" />}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-base">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Genesis Miner'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-400 border border-blue-800/50">
                  PSEmine 90D
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {currentUser?.email}
              </p>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-0.5">
                <span className="inline-flex items-center text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Authenticated Node
                </span>
                <span>•</span>
                <span>UID: {currentUser?.uid ? `${currentUser.uid.slice(0, 8)}...` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Accrued Mining Earnings</div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight mt-0.5">
              £{liveAccruedGBP.toFixed(4)}
            </div>
            <div className="text-[11px] text-blue-400 font-mono font-medium">
              +£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hr
            </div>
          </div>

        </div>
      </div>

      {/* Quick Mining Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-medium">Active Hardware</div>
          <div className="text-lg font-bold text-white font-mono mt-1">
            {totalHardwareUnits} <span className="text-xs text-slate-400 font-normal">Units</span>
          </div>
          <Link to="/mine/tools" className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold mt-1 inline-block">
            Manage hardware →
          </Link>
        </div>

        <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-medium">Base Hardware Rate</div>
          <div className="text-lg font-bold text-blue-400 font-mono mt-1">
            £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}<span className="text-xs text-slate-400 font-normal">/hr</span>
          </div>
          <span className="text-[10px] text-slate-400">Max £10.60/hr</span>
        </div>

        <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-medium">Referral Boost</div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
            +£{(pseUser?.referralCapacityGBPPerHour || 0).toFixed(2)}<span className="text-xs text-slate-400 font-normal">/hr</span>
          </div>
          <span className="text-[10px] text-slate-400">{pseUser?.qualifiedReferralsCount || 0}/5 Qualified</span>
        </div>

        <div className="p-4 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-medium">Campaign Window</div>
          <div className="text-lg font-bold text-white font-mono mt-1">
            {campaignDaysRemaining} <span className="text-xs text-slate-400 font-normal">Days Left</span>
          </div>
          <span className="text-[10px] text-slate-400">90-Day Genesis</span>
        </div>
      </div>

      {/* Wallet Configurations Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 px-1">
          Wallet Architectures
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Payment Wallet */}
          <div className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white text-sm">Payment Wallet</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  BNB Smart Chain
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Used to authorize BNB Smart Chain transactions when acquiring hardware nodes.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              {connectedWallet ? (
                <>
                  <span className="font-mono text-slate-200">
                    {`${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyAddress(connectedWallet)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy Address"
                    >
                      {copiedWallet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={disconnectWallet}
                      className="text-rose-400 hover:text-rose-300 font-medium text-[11px]"
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-slate-400">Not Connected</span>
                  <Link to="/mine/wallet" className="text-blue-400 hover:text-blue-300 font-semibold">
                    Connect Wallet →
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 2. Payout Wallet */}
          <div className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-white text-sm">Payout Settlement Wallet</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  pseUser?.payoutWallet 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' 
                    : 'bg-amber-950/80 text-amber-400 border border-amber-700/50'
                }`}>
                  {pseUser?.payoutWallet ? 'Configured' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Destination address where finalized GBP mining earnings are disbursed upon 90-day settlement.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              {pseUser?.payoutWallet ? (
                <>
                  <span className="font-mono text-cyan-300">
                    {`${pseUser.payoutWallet.slice(0, 6)}...${pseUser.payoutWallet.slice(-4)}`}
                  </span>
                  <Link to="/mine/wallet" className="text-blue-400 hover:text-blue-300 font-semibold text-[11px]">
                    Change Address →
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-amber-400 text-[11px] font-medium">Payout address not set</span>
                  <Link to="/mine/wallet" className="text-blue-400 hover:text-blue-300 font-semibold text-[11px]">
                    Configure Payout →
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Referral Program Card */}
      <div className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">Referral Capacity Accelerator</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Earn +£0.30/hr per qualified miner up to 5 referrals (+£1.50/hr permanent boost).
            </p>
          </div>

          <Link
            to="/mine/referrals"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>View Network</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2">
          <div className="font-mono text-xs text-slate-300 truncate max-w-[240px] sm:max-w-md">
            {referralLink}
          </div>
          <button
            onClick={copyReferral}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
          >
            {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRef ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="p-2 bg-[#0D131F] border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 text-xs">
        
        <Link
          to="/mine/guide"
          className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 rounded-xl transition-colors"
        >
          <div className="flex items-center space-x-3 text-slate-200">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="font-medium">PSEmine Campaign Guide & Economics</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/mine/activity"
          className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 rounded-xl transition-colors"
        >
          <div className="flex items-center space-x-3 text-slate-200">
            <History className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">Immutable Activity & Audit Ledger</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/support"
          className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 rounded-xl transition-colors"
        >
          <div className="flex items-center space-x-3 text-slate-200">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span className="font-medium">Customer Support & Help Center</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </Link>

      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 rounded-xl text-slate-300 hover:text-rose-300 text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Sign Out of Account</span>
        </button>
      </div>

    </div>
  );
};
