import React, { useEffect, useState, useCallback } from 'react';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { usePsemineWallet } from '../../contexts/PsemineWalletContext';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import { BNBPaymentCheckout } from '../../components/mine/BNBPaymentCheckout';
import { PsemineTool, PsemineToolOwnership, PsemineMiningSession, PsemineActivity, PsemineNotification } from '../../types/psemine';
import {
  Wallet,
  Cpu,
  Activity,
  UsersRound,
  RefreshCw,
  ShoppingBag,
  Zap,
  TrendingUp,
  Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineDashboard: React.FC = () => {
  const { currentUser, psemineProfile } = usePsemineAuth();
  const { isConnected, address, connectWallet, disconnectWallet } = usePsemineWallet();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    campaign: unknown;
    ownedTools: PsemineToolOwnership[];
    session: PsemineMiningSession | null;
    referrals: { qualifiedCount: number; bonusRateGbpPerHour: number };
    recentActivity: PsemineActivity[];
    notifications: PsemineNotification[];
  }>({
    campaign: null,
    ownedTools: [],
    session: null,
    referrals: { qualifiedCount: 0, bonusRateGbpPerHour: 0 },
    recentActivity: [],
    notifications: [],
  });

  const [availableTools, setAvailableTools] = useState<PsemineTool[]>([]);
  const [selectedToolToBuy, setSelectedToolToBuy] = useState<PsemineTool | null>(null);
  const [liveOutput, setLiveOutput] = useState<number>(0);

  const fetchDashboard = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await (window as any).psemineAuthToken?.();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [dashRes, toolsRes] = await Promise.all([
        fetch('/api/psemine/dashboard', { headers }),
        fetch('/api/psemine/tools', { headers }),
      ]);

      const dashData = await dashRes.json();
      const toolsData = await toolsRes.json();

      if (dashRes.ok && dashData.success) {
        setDashboardData({
          campaign: dashData.campaign,
          ownedTools: dashData.ownedTools || [],
          session: dashData.session || null,
          referrals: dashData.referrals || { qualifiedCount: 0, bonusRateGbpPerHour: 0 },
          recentActivity: dashData.recentActivity || [],
          notifications: dashData.notifications || [],
        });

        if (dashData.session) {
          setLiveOutput(dashData.session.accumulatedOutputGbp || 0);
        }
      } else if (!dashRes.ok || !dashData.success) {
        toast.error(dashData.message || dashData.error || 'Failed to fetch dashboard state.');
      }

      if (toolsRes.ok && toolsData.success) {
        setAvailableTools(toolsData.tools || []);
      } else if (!toolsRes.ok || !toolsData.success) {
        toast.error(toolsData.message || toolsData.error || 'Failed to fetch tools catalog.');
      }
    } catch (err: unknown) {
      console.error('[PSEmine Dashboard] Error loading data:', err);
      toast.error('Unable to fetch live PSEmine data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time smooth local output interpolation ticker
  useEffect(() => {
    const session = dashboardData.session;
    if (!session || session.state !== 'active' || !session.totalMiningRateGbpPerHour) return;

    const interval = setInterval(() => {
      const lastCalculatedMs = session.lastCalculatedAt ? Date.parse(session.lastCalculatedAt) : Date.now();
      const elapsedSeconds = Math.max(0, (Date.now() - lastCalculatedMs) / 1000);
      const generated = elapsedSeconds * (session.totalMiningRateGbpPerHour / 3600);
      setLiveOutput(Number((session.accumulatedOutputGbp + generated).toFixed(4)));
    }, 1000);

    return () => clearInterval(interval);
  }, [dashboardData.session]);

  const handleCheckoutSuccess = () => {
    setSelectedToolToBuy(null);
    fetchDashboard();
  };

  return (
    <PsemineLayout>
      <div className="space-y-8 py-2">
        {/* Welcome Header Banner */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Cpu size={14} />
                <span>Genesis Mining Campaign Phase 1</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Command Center: {psemineProfile?.username || currentUser?.email?.split('@')[0]}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
                Backend-authoritative mining workspace. Track active tool entitlements, live output calculations, and verified BSC Web3 settlement.
              </p>
            </div>

            {/* Wallet Connection Button */}
            <div className="shrink-0">
              <button
                onClick={isConnected ? disconnectWallet : connectWallet}
                className="w-full sm:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-3 transition-all"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Wallet size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">
                    {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect Web3 Wallet'}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {isConnected ? 'BNB Smart Chain Active' : 'Required for BNB Payment'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Mining Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mining Output */}
          <div className="bg-[#12121A] border border-emerald-500/30 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Accumulated Output</span>
              <Zap size={16} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">
              £{liveOutput.toFixed(4)} <span className="text-xs text-zinc-400 font-sans">GBP</span>
            </p>
            <p className="text-[10px] text-emerald-400 font-medium">Server-Authoritative Output</p>
          </div>

          {/* Mining Rate */}
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Combined Mining Rate</span>
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              £{(dashboardData.session?.totalMiningRateGbpPerHour || 0).toFixed(2)} <span className="text-xs text-zinc-400 font-sans">/ hr</span>
            </p>
            <p className="text-[10px] text-zinc-400">
              Base £{(dashboardData.session?.baseMiningRateGbpPerHour || 0).toFixed(2)} + Ref Bonus £{(dashboardData.session?.referralBonusGbpPerHour || 0).toFixed(2)}
            </p>
          </div>

          {/* Active Tools */}
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Owned Tools</span>
              <Cpu size={16} className="text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {dashboardData.ownedTools.length} <span className="text-xs text-zinc-400 font-normal">Active Tool{dashboardData.ownedTools.length === 1 ? '' : 's'}</span>
            </p>
            <p className="text-[10px] text-zinc-400">Genesis Campaign Entitlements</p>
          </div>

          {/* Qualified Referrals */}
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Qualified Referrals</span>
              <UsersRound size={16} className="text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {dashboardData.referrals.qualifiedCount} <span className="text-xs text-zinc-400 font-normal">/ 5 Max</span>
            </p>
            <p className="text-[10px] text-cyan-400">
              +£{(dashboardData.referrals.bonusRateGbpPerHour).toFixed(2)}/hr Mining Bonus
            </p>
          </div>
        </div>

        {/* Owned Tools Inventory Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <Cpu size={18} className="text-emerald-400" />
              <span>Your Mining Tool Inventory</span>
            </h2>
            <button
              onClick={fetchDashboard}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sync State</span>
            </button>
          </div>

          {dashboardData.ownedTools.length === 0 ? (
            <div className="bg-[#12121A] border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <ShoppingBag size={22} />
              </div>
              <h3 className="text-sm font-bold text-white">No Active Mining Tools</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                You do not own any Genesis mining tools yet. Acquire a tool from the catalog below to initialize your backend mining session and begin earning hourly output.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.ownedTools.map((tool) => (
                <div key={tool.id} className="bg-[#12121A] border border-white/10 rounded-2xl p-5 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {tool.toolId}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Mining Yield</p>
                    <p className="text-lg font-bold text-white font-mono">£{tool.miningRateGbpPerHour.toFixed(2)} <span className="text-xs font-sans text-zinc-400">/ hr</span></p>
                  </div>
                  <div className="pt-2 border-t border-white/5 text-[10px] text-zinc-500 flex justify-between">
                    <span>Acquired: {new Date(tool.acquiredAt).toLocaleDateString()}</span>
                    <span className="text-emerald-400 font-bold">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canonical Tools Purchase Section */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag size={18} className="text-emerald-400" />
            <span>Genesis Mining Tools Catalog</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availableTools.map((tool) => {
              const ownedCount = dashboardData.ownedTools.filter((t) => t.toolId === tool.id).length;
              const isMaxed = ownedCount >= tool.maxCopiesPerUser;

              return (
                <div key={tool.id} className="bg-[#12121A] border border-white/10 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between gap-5 transition-all shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                        {tool.tier}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        {ownedCount} / {tool.maxCopiesPerUser} Owned
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">{tool.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{tool.description}</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Price:</span>
                        <span className="font-bold text-white">£{tool.priceGbp} GBP</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Hourly Rate:</span>
                        <span className="font-bold text-emerald-400">£{tool.miningRateGbpPerHour.toFixed(2)} / hr</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedToolToBuy(tool)}
                    disabled={isMaxed}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isMaxed
                        ? 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    <span>{isMaxed ? 'Max Copies Reached' : 'Acquire Tool'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              <span>Verified Activity History</span>
            </h3>

            {dashboardData.recentActivity.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No verified activity records yet.</p>
            ) : (
              <div className="space-y-2.5">
                {dashboardData.recentActivity.map((act) => (
                  <div key={act.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{act.title || act.type}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Verified'}
                      </span>
                    </div>
                    {act.description && <p className="text-xs text-zinc-400">{act.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bell size={16} className="text-emerald-400" />
              <span>System Notifications</span>
            </h3>

            {dashboardData.notifications.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No notifications at this time.</p>
            ) : (
              <div className="space-y-2.5">
                {dashboardData.notifications.map((notif) => (
                  <div key={notif.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{notif.title}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{notif.type}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BNB Payment Checkout Modal */}
      {selectedToolToBuy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <BNBPaymentCheckout
            tool={selectedToolToBuy}
            onSuccess={handleCheckoutSuccess}
            onCancel={() => setSelectedToolToBuy(null)}
          />
        </div>
      )}
    </PsemineLayout>
  );
};

export default PsemineDashboard;
