import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Store, ShieldCheck,
  RefreshCw, AlertCircle, ArrowUpRight, Lock, Sparkles, Compass, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTaskContext } from '../contexts/TaskContext';
import { safeFetch } from '../utils/api';
import toast from 'react-hot-toast';
import { cn } from '../utils';

// ─── Provider Interface (Earning Channel) ────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  logo?: string;
  status?: 'active' | 'degraded' | 'maintenance' | 'offline' | string;
  enabled?: boolean;
  apiEndpoint?: string;
  callbackUrl?: string;
  rewardMultiplier?: number;
  userSharePct?: number;
  platformSharePct?: number;
  priority?: number;
  description?: string;
  affiliateId?: string;
  minimumReward?: number;
  maximumReward?: number;
  launchUrl?: string | null;
  embeddable?: boolean;
}

export const Marketplace: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const { userTasks, tasks } = useTaskContext();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Progression Tier Strategy ──────────────────────────────────────────────
  const progressionTier = useMemo(() => {
    const level = userData?.level || 1;
    const completedCount = userData?.stats?.tasksCompleted || 0;
    if (level >= 10 || completedCount >= 25) {
      return { name: 'Pro Earner', level, badge: 'Elite Tier', color: 'text-primary bg-primary/10 border-primary/20' };
    }
    if (level >= 3 || completedCount >= 5) {
      return { name: 'Verified Earner', level, badge: 'Tier 2', color: 'text-success bg-success/10 border-success/20' };
    }
    return { name: 'Starter Earner', level, badge: 'Tier 1', color: 'text-text-secondary bg-surface-bright border-border' };
  }, [userData]);

  // ─── Active Continuity Journey ──────────────────────────────────────────────
  const activeTasks = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const result = [];

    for (const ut of Object.values(userTasks)) {
      if (ut.status === 'in_progress' || ut.status === 'pending') {
        const matchingTask = taskMap.get(ut.taskId);
        result.push({
          id: ut.taskId,
          title: matchingTask?.title || 'Active Opportunity',
          reward: matchingTask?.rewardAmount ?? 100,
          status: ut.status,
        });
        if (result.length >= 3) break;
      }
    }

    return result;
  }, [userTasks, tasks]);

  // ─── Fetch Enabled Providers from Backend (Firestore Source of Truth) ──────
  const fetchProviders = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/user-providers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (res.success && Array.isArray(res.providers)) {
        setProviders(res.providers);
      } else {
        setProviders([]);
      }
    } catch (err: any) {
      console.error('[Marketplace] Failed to fetch providers:', err);
      setError('Unable to load Marketplace providers at this time.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchProviders();
    }
  }, [currentUser, fetchProviders]);

  // ─── Launch Provider ────────────────────────────────────────────────────────
  const handleLaunchProvider = async (provider: Provider) => {
    if (provider.status === 'offline' || provider.status === 'maintenance') {
      toast.error(`${provider.name} is currently undergoing maintenance.`);
      return;
    }

    setLaunchingId(provider.id);

    try {
      let url = provider.launchUrl;

      if (!url && currentUser) {
        const idToken = await currentUser.getIdToken();
        const res = await safeFetch(`/api/offerwall/providers/${provider.id}/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (res.success && res.launchUrl) {
          url = res.launchUrl;
        }
      }

      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            toast.error(`Invalid link protocol (${parsed.protocol}) for ${provider.name}.`);
            return;
          }
          window.open(parsed.href, '_blank', 'noopener,noreferrer');
          toast.success(`Opening ${provider.name}...`);
        } catch {
          toast.error(`Invalid launch URL for ${provider.name}.`);
        }
      } else {
        toast.error(`Unable to launch ${provider.name}. Please check provider configuration.`);
      }
    } catch (err: any) {
      console.error('[Marketplace] Launch error:', err);
      toast.error(`Failed to launch ${provider.name}.`);
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 py-8 md:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ─── Marketplace Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
              <Sparkles size={11} />
              PulseEarn Ecosystem
            </span>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border', progressionTier.color)}>
              {progressionTier.name} ({progressionTier.badge})
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            Marketplace
          </h1>
          <p className="text-xs text-text-tertiary mt-1">
            Discover verified earning opportunities and tailored channels in one unified digital ecosystem.
          </p>
        </div>

        <button
          onClick={fetchProviders}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-bright text-xs font-semibold text-text-secondary transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-text-tertiary'} />
          <span>Refresh Opportunities</span>
        </button>
      </div>

      {/* ─── Continuity & Journey Banner ──────────────────────────────────── */}
      {activeTasks.length > 0 && (
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Compass size={15} />
              <span>Continue Your Earning Journey</span>
            </div>
            <span className="text-[10px] font-mono text-text-tertiary">{activeTasks.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeTasks.map(t => (
              <div key={t.id} className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-text-primary truncate">{t.title}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{t.status.replace('_', ' ')}</p>
                </div>
                <span className="text-xs font-bold text-success shrink-0">+{t.reward} PTS</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Loading State ────────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-border bg-surface/50 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-bright" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-surface-bright rounded w-2/3" />
                  <div className="h-3 bg-surface-bright rounded w-1/3" />
                </div>
              </div>
              <div className="h-12 bg-surface-bright rounded-xl" />
              <div className="h-9 bg-surface-bright rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Error State ──────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-6 rounded-2xl border border-danger/20 bg-danger/5 flex items-center gap-4 text-danger text-xs font-medium">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Empty State ──────────────────────────────────────────────────── */}
      {!loading && !error && providers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border bg-surface/40 backdrop-blur-sm rounded-3xl p-10 md:p-16 text-center space-y-6 max-w-2xl mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Store size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-text-primary">
              No active earning channels currently available.
            </h2>
            <p className="text-xs text-text-tertiary leading-relaxed max-w-md mx-auto">
              Earning channels and opportunity gateways are refreshed continuously. Please check back shortly for new opportunities.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-text-tertiary">
            <ShieldCheck size={14} className="text-primary" />
            <span>Verified & Protected by PulseEarn</span>
          </div>
        </motion.div>
      )}

      {/* ─── Provider Grid ────────────────────────────────────────────────── */}
      {!loading && !error && providers.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-primary" />
              Active Earning Channels ({providers.length})
            </span>
            <span className="text-[11px] text-text-tertiary">
              Live Verified Opportunities
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map(provider => {
              const initial = provider.name ? provider.name[0].toUpperCase() : 'P';
              const multiplierText = provider.rewardMultiplier
                ? `${provider.rewardMultiplier}x Multiplier`
                : '1.0x Multiplier';
              const userShareText = provider.userSharePct
                ? `${Math.round(provider.userSharePct * 100)}% User Share`
                : '85% Share';
              const isOffline = provider.status === 'offline' || provider.status === 'maintenance';

              return (
                <motion.div
                  key={provider.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -2 }}
                  className="border border-border bg-surface hover:border-border-bright rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-sm hover:shadow-md"
                >
                  {/* Top section */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                          {provider.logo ? (
                            <img src={provider.logo} alt={provider.name} className="w-8 h-8 object-contain" />
                          ) : (
                            <span className="text-lg font-black text-primary">{initial}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-text-primary tracking-tight">
                            {provider.name}
                          </h3>
                          <span className="text-[10px] font-mono text-text-tertiary">
                            ID: {provider.id}
                          </span>
                        </div>
                      </div>

                      {/* Status pill */}
                      <span className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        provider.status === 'active' || !provider.status
                          ? 'bg-success/10 border-success/20 text-success'
                          : provider.status === 'degraded'
                          ? 'bg-warning/10 border-warning/20 text-warning'
                          : 'bg-danger/10 border-danger/20 text-danger'
                      )}>
                        {provider.status || 'Active'}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">
                      {provider.description || 'Verified offer and survey provider connected to the PulseEarn reward engine.'}
                    </p>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-surface-bright border border-border">
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Yield Rate</p>
                        <p className="text-xs font-bold text-text-primary mt-0.5">{multiplierText}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface-bright border border-border">
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Payout Split</p>
                        <p className="text-xs font-bold text-primary mt-0.5">{userShareText}</p>
                      </div>
                    </div>

                    {/* Launch button */}
                    <button
                      onClick={() => handleLaunchProvider(provider)}
                      disabled={launchingId === provider.id || isOffline}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm',
                        isOffline
                          ? 'bg-surface-bright border border-border text-text-tertiary cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-hover text-white'
                      )}
                    >
                      {launchingId === provider.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : isOffline ? (
                        <>
                          <Lock size={14} />
                          <span>Under Maintenance</span>
                        </>
                      ) : (
                        <>
                          <span>Launch {provider.name}</span>
                          <ArrowUpRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default Marketplace;
