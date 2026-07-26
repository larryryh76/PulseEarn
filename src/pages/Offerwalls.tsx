import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, CheckCircle2, Clock, Shield,
  RefreshCw, Zap, Award, ExternalLink,
  ChevronDown, ChevronRight, AlertCircle, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { safeFetch } from '../utils/api';
import { validateExternalUrl } from '../utils/security';
import { cn } from '../utils';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  name: string;
  logo?: string;
  status?: string;
  description?: string;
  affiliateId: string;
  callbackUrl: string;
  minimumReward: number;
  maximumReward: number;
  rewardMultiplier: number;
  launchUrl: string | null;
  embeddable: boolean;
}

interface Reward {
  id: string;
  providerId: string;
  providerName: string;
  offerName: string;
  userPoints: number;
  status: string;
  createdAt: { seconds: number } | null;
}

// ─── Provider Card ────────────────────────────────────────────────────────────

const ProviderCard: React.FC<{
  provider: Provider;
  userRewardCount: number;
  expanded: boolean;
  onToggle: () => void;
  onLaunch: (provider: Provider) => void;
}> = ({ provider, userRewardCount, expanded, onToggle, onLaunch }) => {
  const description = provider.description || `Complete tasks & earn up to ${provider.maximumReward?.toLocaleString() || 10000} PTS.`;
  const iconLetter = provider.name ? provider.name[0].toUpperCase() : 'P';

  return (
    <motion.div
      layout
      className="border border-border bg-surface rounded-2xl overflow-hidden hover:border-border-bright transition-all"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
            {provider.logo ? (
              <img src={provider.logo} alt={provider.name} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-lg font-black text-primary">{iconLetter}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-text-primary">{provider.name}</h3>
              {provider.status && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-primary/8 border border-primary/15 text-primary">
                  {provider.status}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-tertiary mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Quick stats */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[11px] font-bold text-success">
              Up to {provider.maximumReward.toLocaleString()} PTS
            </span>
            {userRewardCount > 0 && (
              <span className="text-[9px] text-text-tertiary">{userRewardCount} completed</span>
            )}
          </div>
          {expanded ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronRight size={16} className="text-text-tertiary" />}
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5 space-y-4">
              {/* Reward info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface-bright border border-border text-center">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-1">Min Reward</p>
                  <p className="text-[13px] font-bold text-text-primary tabular-nums">{provider.minimumReward.toLocaleString()}</p>
                  <p className="text-[9px] text-text-tertiary">PTS</p>
                </div>
                <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-1">Max Reward</p>
                  <p className="text-[13px] font-bold text-success tabular-nums">{provider.maximumReward.toLocaleString()}</p>
                  <p className="text-[9px] text-text-tertiary">PTS</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-1">Multiplier</p>
                  <p className="text-[13px] font-bold text-primary tabular-nums">{provider.rewardMultiplier}×</p>
                  <p className="text-[9px] text-text-tertiary">Boost</p>
                </div>
              </div>

              {/* Info row */}
              <div className="flex flex-wrap gap-3 text-[10px] text-text-tertiary">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-success" />
                  Instant reward delivery
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield size={11} className="text-primary" />
                  Fraud-protected
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={11} className="text-warning" />
                  XP awarded on completion
                </div>
              </div>

              {/* CTA — opens the offer wall inside the app (in-site) */}
              <button
                onClick={() => onLaunch(provider)}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:bg-primary-bright disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20"
              >
                Open {provider.name} Offers
                <ChevronRight size={13} />
              </button>
              <p className="text-[9px] text-text-tertiary text-center">
                Surveys and offers open right here inside PulseEarn. Rewards are automatically credited to your wallet upon verified completion.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Reward History Row ───────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'text-success bg-success/8 border-success/15',
  PENDING: 'text-warning bg-warning/8 border-warning/15',
  REJECTED: 'text-danger bg-danger/8 border-danger/15',
  REVERSED: 'text-text-tertiary bg-surface-bright border-border',
};

const RewardRow: React.FC<{ reward: Reward }> = ({ reward }) => {
  const ts = reward.createdAt?.seconds
    ? new Date(reward.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-surface-bright border border-border flex items-center justify-center shrink-0">
          <Globe size={13} className="text-text-tertiary" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-text-primary truncate">{reward.offerName}</p>
          <p className="text-[10px] text-text-tertiary">{reward.providerName} · {ts}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[12px] font-bold text-success tabular-nums">+{reward.userPoints.toLocaleString()}</span>
        <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border', STATUS_STYLE[reward.status] || 'text-text-tertiary bg-surface-bright border-border')}>
          {reward.status}
        </span>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="flex flex-col items-center justify-center py-14 space-y-3 border border-dashed border-border rounded-2xl">
    <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary">
      {icon}
    </div>
    <div className="text-center space-y-1">
      <p className="text-[13px] font-bold text-text-primary">{title}</p>
      <p className="text-[11px] text-text-tertiary max-w-xs">{body}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const Offerwalls: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'earn' | 'history'>('earn');
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  const userPoints = userData?.points ?? 0;

  // Opens the provider's offers. Generates the authenticated launcher URL securely on-click.
  const handleLaunch = useCallback(async (provider: Provider) => {
    if (!currentUser) {
      toast.error('Please log in to open offers');
      return;
    }
    const resolveToast = toast.loading(`Generating secure session for ${provider.name}...`);

    // For non-embeddable providers (e.g. TimeWall): open a blank window synchronously
    // to preserve user activation, then navigate it once the async token/fetch resolves.
    let newWindow: Window | null = null;
    if (!provider.embeddable) {
      newWindow = window.open('', '_blank', 'noopener,noreferrer');
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch(`/api/offerwall/providers/${provider.id}/launch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success && res.launchUrl) {
        const val = validateExternalUrl(res.launchUrl);
        if (!val.valid || !val.url) {
          if (newWindow && !newWindow.closed) newWindow.close();
          toast.error(val.error || `Invalid URL for ${provider.name}`, { id: resolveToast });
          return;
        }
        toast.dismiss(resolveToast);
        if (res.embeddable) {
          setActiveProvider({ ...provider, launchUrl: val.url, embeddable: true });
        } else {
          if (newWindow && !newWindow.closed) {
            newWindow.location.href = val.url;
          } else {
            window.open(val.url, '_blank', 'noopener,noreferrer');
          }
        }
      } else {
        // Close the blank window if launch failed
        if (newWindow && !newWindow.closed) {
          newWindow.close();
        }
        toast.error(res.message || 'Failed to generate secure launch URL', { id: resolveToast });
      }
    } catch {
      // Close the blank window if an error occurred
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
      toast.error('Failed to communicate with authorization server', { id: resolveToast });
    }
  }, [currentUser]);
  
  const loadProviders = useCallback(async () => {
    if (!currentUser) return;
    setProvidersLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/user-providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) setProviders(res.providers || []);
    } finally {
      setProvidersLoading(false);
    }
  }, [currentUser]);

  const loadRewards = useCallback(async () => {
    if (!currentUser) return;
    setRewardsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/my-rewards?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) setRewards(res.rewards || []);
    } finally {
      setRewardsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProviders();
    loadRewards();
  }, [loadProviders, loadRewards]);

  const totalEarned = rewards.filter(r => r.status === 'APPROVED').reduce((a, r) => a + r.userPoints, 0);
  const rewardCountByProvider: Record<string, number> = {};
  rewards.forEach(r => {
    rewardCountByProvider[r.providerId] = (rewardCountByProvider[r.providerId] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-background pt-24 pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">

        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Globe size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Earn Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Offerwalls</h1>
          <p className="text-sm text-text-tertiary">
            Complete surveys, install apps, and watch videos to earn points instantly. All rewards are automatically verified and credited.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-border bg-surface space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">Balance</p>
            <p className="text-xl font-bold text-text-primary tabular-nums">{userPoints.toLocaleString()}</p>
            <p className="text-[9px] text-text-tertiary">PTS</p>
          </div>
          <div className="p-4 rounded-2xl border border-success/15 bg-success/5 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">From Offerwalls</p>
            <p className="text-xl font-bold text-success tabular-nums">+{totalEarned.toLocaleString()}</p>
            <p className="text-[9px] text-text-tertiary">PTS earned</p>
          </div>
          <div className="p-4 rounded-2xl border border-primary/15 bg-primary/5 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">Providers</p>
            <p className="text-xl font-bold text-primary tabular-nums">{providers.length}</p>
            <p className="text-[9px] text-text-tertiary">available</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="p-5 rounded-2xl border border-border bg-surface">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-4">How Rewards Work</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Globe size={15} />, step: '1', title: 'Open an Offerwall', body: 'Choose a provider and browse available offers.' },
              { icon: <CheckCircle2 size={15} />, step: '2', title: 'Complete an Offer', body: 'Follow the provider\'s instructions to qualify.' },
              { icon: <Zap size={15} />, step: '3', title: 'Get Rewarded', body: 'Points are instantly credited to your wallet.' },
            ].map(item => (
              <div key={item.step} className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {item.icon}
                </div>
                <p className="text-[11px] font-bold text-text-primary">{item.title}</p>
                <p className="text-[10px] text-text-tertiary leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('earn')}
            className={cn(
              'px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all',
              tab === 'earn' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-bright'
            )}
          >
            Earn
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all',
              tab === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-bright'
            )}
          >
            History
            {rewards.length > 0 && (
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md font-bold', tab === 'history' ? 'bg-white/20' : 'bg-primary/10 text-primary border border-primary/20')}>
                {rewards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { loadProviders(); loadRewards(); }}
            className="ml-auto p-2.5 rounded-xl border border-border text-text-tertiary hover:bg-surface-bright hover:text-text-primary transition-all"
          >
            <RefreshCw size={14} className={providersLoading || rewardsLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'earn' && (
            <motion.div
              key="earn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {providersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : providers.length === 0 ? (
                <EmptyState
                  icon={<Globe size={20} />}
                  title="No offerwalls available"
                  body="No offerwall providers are currently enabled. Check back later."
                />
              ) : (
                providers.map(p => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    userRewardCount={rewardCountByProvider[p.id] || 0}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    onLaunch={handleLaunch}
                  />
                ))
              )}

              {/* Notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-bright">
                <AlertCircle size={14} className="text-text-tertiary shrink-0 mt-0.5" />
                <p className="text-[10px] text-text-tertiary leading-relaxed">
                  Rewards are delivered by third-party providers. PulseEarn verifies every callback signature before crediting points. Fraudulent completions are automatically detected and blocked. Do not use VPNs or attempt to manipulate offer flows — violations may result in account suspension.
                </p>
              </div>
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {rewardsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : rewards.length === 0 ? (
                <EmptyState
                  icon={<Clock size={20} />}
                  title="No rewards yet"
                  body="Complete your first offer to see your reward history here."
                />
              ) : (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                  {/* Summary */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Reward History</p>
                    <div className="flex items-center gap-2">
                      <Award size={13} className="text-success" />
                      <span className="text-[11px] font-bold text-success">+{totalEarned.toLocaleString()} PTS earned</span>
                    </div>
                  </div>
                  {rewards.map(r => (
                    <RewardRow key={r.id} reward={r} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* In-site offerwall viewer — offers load directly inside PulseEarn */}
      <AnimatePresence>
        {activeProvider && activeProvider.launchUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={15} className="text-primary shrink-0" />
                <span className="text-[13px] font-bold text-text-primary truncate">{activeProvider.name} Offers</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeProvider.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-bright transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  New Tab <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setActiveProvider(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-bright transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  Close <X size={12} />
                </button>
              </div>
            </div>
            <iframe
              title={`${activeProvider.name} Offerwall`}
              src={activeProvider.launchUrl}
              className="flex-1 w-full border-0 bg-white"
              allow="fullscreen; clipboard-write"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Offerwalls;
