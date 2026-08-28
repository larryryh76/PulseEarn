import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Play, 
  Pause, 
  RefreshCw, 
  Lock,
  Coins,
  Cpu,
  FileText,
  Terminal,
  X
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';

export const AdminPSEMine: React.FC = () => {
  const { campaign, isCampaignArchived, refreshData } = usePSEMine();
  const { currentUser, userData } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'payouts' | 'shutdown'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMiners: 0,
    totalMiners: 0,
    toolsSold: 0,
    totalCapacityGBPPerHour: 0,
    totalAccruedLiabilityGBP: 0,
    totalBNBCollected: 0,
    qualifiedReferrals: 0,
    campaignStatus: 'active'
  });

  // Settlement & Payout Asset Configuration
  const [payoutConfig] = useState({
    payoutAsset: 'USDT_BSC',
    tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955', // USDT BEP-20
    chainName: 'BNB Smart Chain',
    gbpToUsdtRate: 1.28
  });

  // Kill Switch Modal State
  const [isKillSwitchOpen, setIsKillSwitchOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [shutdownReason, setShutdownReason] = useState('90-Day Genesis Campaign Completed & Settled');
  const [isExecutingShutdown, setIsExecutingShutdown] = useState(false);

  const isSuperAdmin = userData?.isRoot === true || userData?.role === 'admin';

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const res = await fetch('/api/admin/mine/overview', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching admin mine data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const handleCampaignAction = async (action: 'pause' | 'resume' | 'settle') => {
    if (!currentUser) return;
    if (!window.confirm(`Are you sure you want to execute campaign action '${action}'?`)) return;

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/mine/campaign/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action,
          reason: `Admin triggered ${action}`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Campaign action '${action}' executed successfully!`);
        await refreshData();
        await fetchAdminData();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Execution error');
    }
  };

  // Protected Super Admin Kill Switch Trigger
  const handleExecuteKillSwitch = async () => {
    if (!currentUser || !isSuperAdmin) {
      toast.error('Super Admin authorization required');
      return;
    }

    if (typedConfirmation.trim() !== 'TERMINATE-PSEMINE-ACTIVE') {
      toast.error('Confirmation phrase does not match exactly: TERMINATE-PSEMINE-ACTIVE');
      return;
    }

    setIsExecutingShutdown(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/mine/campaign/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action: 'shutdown',
          reason: shutdownReason.trim() || 'Super Admin Kill Switch Executed'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('KILL SWITCH EXECUTED: PSEmine public campaign terminated & archived.');
        setIsKillSwitchOpen(false);
        await refreshData();
        await fetchAdminData();
      } else {
        toast.error(data.error || 'Kill switch execution failed');
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Kill switch error');
    } finally {
      setIsExecutingShutdown(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              PSEmine Admin Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-red-950/80 text-red-400 border border-red-800/60">
              Super Admin Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative campaign lifecycle management, settlement payout queue, and emergency kill switch.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2.5 bg-[#0D131F] hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-1">
        {[
          { id: 'overview', label: 'Protocol Overview', icon: FileText },
          { id: 'tools', label: 'Tools Config', icon: Cpu },
          { id: 'payouts', label: 'Settlement & Payouts', icon: Coins },
          { id: 'shutdown', label: 'Kill Switch & Archival', icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#0D131F] border border-slate-800 rounded-2xl">
              <div className="text-xs text-slate-400 font-mono">Active Miners</div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {stats.activeMiners} <span className="text-xs text-slate-500 font-sans">/ {stats.totalMiners}</span>
              </div>
            </div>

            <div className="p-5 bg-[#0D131F] border border-slate-800 rounded-2xl">
              <div className="text-xs text-slate-400 font-mono">Hardware Tools Sold</div>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                {stats.toolsSold} Units
              </div>
            </div>

            <div className="p-5 bg-[#0D131F] border border-slate-800 rounded-2xl">
              <div className="text-xs text-slate-400 font-mono">Total Hourly Capacity</div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                £{stats.totalCapacityGBPPerHour.toFixed(2)}/hr
              </div>
            </div>

            <div className="p-5 bg-[#0D131F] border border-slate-800 rounded-2xl">
              <div className="text-xs text-slate-400 font-mono">Accrued Liability</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                £{stats.totalAccruedLiabilityGBP.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick Lifecycle Actions */}
          <div className="p-6 bg-[#0D131F] border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Campaign Lifecycle Operations</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {campaign?.status === 'paused' ? (
                <button
                  onClick={() => handleCampaignAction('resume')}
                  className="p-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Campaign</span>
                </button>
              ) : (
                <button
                  onClick={() => handleCampaignAction('pause')}
                  disabled={isCampaignArchived}
                  className="p-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Mining Accrual</span>
                </button>
              )}

              <button
                onClick={() => handleCampaignAction('settle')}
                disabled={isCampaignArchived}
                className="p-3 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>Trigger 90-Day Settlement</span>
              </button>

              <button
                onClick={() => setIsKillSwitchOpen(true)}
                className="p-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Super Admin Kill Switch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOOLS CONFIG */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#0D131F] border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase">Locked 4-Tier Hardware Specifications</h2>
              <p className="text-xs text-slate-400 mt-0.5">Hardware terms purchased by users retain their agreed rate per record version.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(LOCKED_PSEMINE_TOOLS).map((tool) => (
              <div key={tool.id} className="p-5 bg-[#0D131F] border border-slate-800 rounded-2xl space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">{tool.name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-[10px]">
                    Tier {tool.tier} • v{tool.version}
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fixed GBP Price:</span>
                    <span className="font-bold text-white">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hourly Output:</span>
                    <span className="font-bold text-emerald-400">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max User Ownership:</span>
                    <span className="text-white">{tool.maxPerUser} units max</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENT & PAYOUT QUEUE */}
      {activeTab === 'payouts' && (
        <div className="space-y-5">
          {/* Payout Asset Config Banner */}
          <div className="p-6 bg-[#0D131F] border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase">Settlement Asset Configuration</h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure the crypto payout asset used during campaign settlement.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px]">Crypto Asset</div>
                <div className="text-sm font-bold text-cyan-400">{payoutConfig.payoutAsset}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px]">Chain Network</div>
                <div className="text-sm font-bold text-white">{payoutConfig.chainName}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px]">GBP to USDT Rate</div>
                <div className="text-sm font-bold text-emerald-400">1 GBP = ${payoutConfig.gbpToUsdtRate}</div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-[#0D131F] border border-slate-800 rounded-2xl text-center space-y-2">
            <Coins className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400 font-mono">
              Campaign in Active Phase. Payout queue will populate automatically upon Day 90 Settlement trigger.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KILL SWITCH & ARCHIVAL */}
      {activeTab === 'shutdown' && (
        <div className="p-6 bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-4 text-xs">
          <div className="flex items-center space-x-2 text-rose-400 font-bold">
            <ShieldAlert size={20} />
            <span className="text-base">Emergency Super Admin Kill Switch</span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Executing the Kill Switch terminates the public PSEmine campaign. Public routes (`/mine`, `/mine/dashboard`) redirect cleanly to standard PulseEarn, public mining APIs block requests, and mining accrual halts. <strong>All historical transaction and financial data remain permanently preserved in Firestore for compliance.</strong>
          </p>

          <button
            onClick={() => setIsKillSwitchOpen(true)}
            className="py-3 px-6 bg-rose-700 hover:bg-rose-600 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all"
          >
            Open Kill Switch Termination Console
          </button>
        </div>
      )}

      {/* SUPER ADMIN KILL SWITCH MODAL */}
      {isKillSwitchOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#0D131F] border border-rose-600/50 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-rose-400 font-bold">
                <ShieldAlert size={22} />
                <span className="text-base font-mono uppercase">Super Admin Kill Switch</span>
              </div>
              <button
                onClick={() => setIsKillSwitchOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-200 space-y-1">
                <div className="font-bold uppercase tracking-wider text-[10px]">Warning: Irreversible Action</div>
                <div>Public PSEmine navigation & APIs will be immediately disabled. Historical records will be retained for audit purposes.</div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Reason for Termination</label>
                <input
                  type="text"
                  value={shutdownReason}
                  onChange={(e) => setShutdownReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">
                  Type Confirmation Phrase: <strong className="text-rose-400">TERMINATE-PSEMINE-ACTIVE</strong>
                </label>
                <input
                  type="text"
                  placeholder="TERMINATE-PSEMINE-ACTIVE"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono uppercase tracking-widest placeholder:normal-case placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setIsKillSwitchOpen(false)}
                className="w-1/3 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs font-bold rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteKillSwitch}
                disabled={isExecutingShutdown || typedConfirmation.trim() !== 'TERMINATE-PSEMINE-ACTIVE'}
                className="flex-1 py-3 bg-rose-700 hover:bg-rose-600 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
              >
                {isExecutingShutdown ? 'Terminating...' : 'Execute Campaign Shutdown'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
