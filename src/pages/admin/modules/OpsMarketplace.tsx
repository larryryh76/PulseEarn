/**
 * OpsMarketplace
 * 
 * Part 4: Admin Architecture - Marketplace Operations Module
 * 
 * Marketplace becomes an orchestration dashboard.
 * Does NOT replace Task Management, Campaign Management, or Provider Management.
 * Instead gives a complete operational overview.
 * 
 * This module shows:
 * - Marketplace Revenue
 * - Marketplace Opportunities
 * - Categories
 * - Provider Health (from /api/admin/marketplace/health)
 * - Top Opportunities
 * - Featured Campaigns
 * - Pending Approvals
 * - Trending Categories
 * - Completion Rates
 * - Recent Marketplace Activity
 * 
 * Everything links into the specialist modules.
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 * PHASE 9: OPERATIONAL INTELLIGENCE
 * 
 * Backend Endpoint: /api/admin/marketplace/health
 * 
 * This endpoint returns real-time operational metrics:
 * - MarketplaceOperationalOverview (from types/marketplace.ts)
 * - ProviderHealthMetrics[] with calculated dynamic tiers
 * - CampaignHealthMetrics for ecosystem health
 * - OpportunityQualityMetrics for inventory quality
 * - EconomyMarketplaceImpact for financial impact
 * - MarketplaceUserBehavior for user engagement
 * - IntegrityIssues[] for detected system problems
 * - ActiveAlerts for operational warnings
 * 
 * Integration: This admin module can be enhanced to fetch and display
 * this health data once the backend endpoint is implemented.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Target,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { safeFetch } from '../../../utils/api';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import { auth } from '../../../firebase/config';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarketplaceStats {
  totalOpportunities: number;
  totalOpportunitiesChange?: number;
  activeOpportunities: number;
  completed: number;
  completedChange?: number;
  completedToday?: number;
  pendingApprovals: number;
  totalRevenue: number;
  revenue: number;
  revenueChange?: number;
  revenueToday?: number;
  revenueThisWeek?: number;
  averageReward: number;
  completionRate: number;
  completionRateChange?: number;
  categoryBreakdown: CategoryStats[];
  providerHealth: ProviderHealth[];
  topOpportunities: OpportunityStats[];
  recentActivity: ActivityItem[];
}

interface CategoryStats {
  id: string;
  label: string;
  count: number;
  revenue: number;
  completionRate: number;
}

interface ProviderHealth {
  id: string;
  name: string;
  status: 'connected' | 'degraded' | 'offline';
  opportunities: number;
  revenue: number;
}

interface OpportunityStats {
  id: string;
  title: string;
  category: string;
  completions: number;
  revenue: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date | string;
  points: number;
}

interface SimulationRequirement {
  label: string;
  met: boolean;
  current: string | number | boolean;
  target: string | number | boolean;
}

interface SimulationItem {
  taskId: string;
  title: string;
  rewardAmount: number;
  category: string;
  eligible: boolean;
  requirements: SimulationRequirement[];
}

interface SimulationData {
  success: boolean;
  targetUser?: {
    userId: string;
    username: string;
    level: number;
    xp: number;
    accountAgeDays: number;
    riskLevel: string;
    emailVerified: boolean;
  };
  simulations?: SimulationItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const OpsMarketplace: React.FC = () => {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  // Administrative Wipe & Rebuild State
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  // Phase 7: Simulation & Progression Audit State
  const [simUserId, setSimUserId] = useState('');
  const [simData, setSimData] = useState<SimulationData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  // Phase 8: Marketplace Composition & Discovery Config State
  const [featuredInput, setFeaturedInput] = useState('');
  const [hiddenInput, setHiddenInput] = useState('');
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [prioritizedInput, setPrioritizedInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchAdminConfig = async () => {
    try {
      const headers = await getAdminHeaders();
      const res = await safeFetch('/api/admin/marketplace/config', { headers });
      if (res.success && res.config) {
        const cfg = res.config;
        setFeaturedInput((cfg.featuredCampaignIds || []).join(', '));
        setHiddenInput((cfg.hiddenCampaignIds || []).join(', '));
        setDisabledCategories(cfg.disabledCategories || []);
        if (cfg.prioritizedCampaigns) {
          setPrioritizedInput(JSON.stringify(cfg.prioritizedCampaigns, null, 2));
        }
      }
    } catch (err) {
      console.warn('[OpsMarketplace] Could not load admin config:', err);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const loadToast = toast.loading("Saving Marketplace Composition Rules...");
    try {
      const featuredCampaignIds = featuredInput.split(',').map(s => s.trim()).filter(Boolean);
      const hiddenCampaignIds = hiddenInput.split(',').map(s => s.trim()).filter(Boolean);
      let prioritizedCampaigns = {};
      if (prioritizedInput.trim()) {
        try {
          prioritizedCampaigns = JSON.parse(prioritizedInput);
        } catch {
          toast.error("Prioritized campaigns must be valid JSON format e.g. {\"task_id\": 20}", { id: loadToast });
          setSavingConfig(false);
          return;
        }
      }

      const headers = await getAdminHeaders();
      const res = await safeFetch('/api/admin/marketplace/config', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          featuredCampaignIds,
          hiddenCampaignIds,
          disabledCategories,
          prioritizedCampaigns,
        })
      });

      if (res.success) {
        toast.success("Marketplace Composition Rules updated live!", { id: loadToast });
      } else {
        toast.error(res.error || "Failed to update config", { id: loadToast });
      }
    } catch (err) {
      console.error("[OpsMarketplace] Error saving marketplace configuration:", err);
      toast.error("Error saving marketplace configuration", { id: loadToast });
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    fetchAdminConfig();
  }, []);

  const getAdminHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    const loadToast = toast.loading("Running global progression audit & sync...");
    try {
      const headers = await getAdminHeaders();
      const res = await safeFetch('/api/admin/progression/audit', {
        method: 'POST',
        headers
      });
      if (res.success) {
        toast.success(res.message || "Global progression audit completed successfully", { id: loadToast });
      } else {
        toast.error(res.error || "Audit failed", { id: loadToast });
      }
    } catch (err) {
      console.error('[OpsMarketplace] Audit error:', err);
      toast.error("Audit error", { id: loadToast });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSimulateEligibility = async () => {
    if (!simUserId.trim()) {
      toast.error("Please enter a Target User ID");
      return;
    }
    setIsSimulating(true);
    const loadToast = toast.loading(`Simulating marketplace eligibility for ${simUserId}...`);
    try {
      const headers = await getAdminHeaders();
      const res = await safeFetch('/api/admin/progression/simulate-eligibility', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: simUserId.trim() })
      });
      if (res.success) {
        setSimData(res);
        toast.success(`Simulation complete for user ${res.targetUser?.username || simUserId}`, { id: loadToast });
      } else {
        toast.error(res.error || "Simulation failed", { id: loadToast });
      }
    } catch (err) {
      console.error('[OpsMarketplace] Simulation error:', err);
      toast.error("Simulation error", { id: loadToast });
    } finally {
      setIsSimulating(false);
    }
  };

  // Fetch marketplace stats
  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const handleWipeAndRebuild = async () => {
    if (wipeConfirmText !== 'DELETE AND REBUILD TASKS') {
      toast.error("Please type the confirmation text exactly.");
      return;
    }
    
    setIsWiping(true);
    const loadToast = toast.loading("Executing full marketplace database wipe & re-seed...");
    try {
      const res = await safeFetch('/api/admin/tasks/wipe-and-rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE AND REBUILD TASKS' })
      });
      
      if (res.success) {
        toast.success(res.message || "Marketplace successfully rebuilt with premium active tasks and providers!", { id: loadToast });
        setShowWipeModal(false);
        setWipeConfirmText('');
        fetchStats();
      } else {
        toast.error(res.error || res.reason || "Wipe failed", { id: loadToast });
      }
    } catch (err) {
      toast.error("System connection error during rebuild", { id: loadToast });
    } finally {
      setIsWiping(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetch(`/api/admin/marketplace/stats?timeframe=${timeframe}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.success) {
        // Convert timestamp strings to Date instances
        const data = res.data;
        if (data.recentActivity) {
          data.recentActivity = data.recentActivity.map((activity: ActivityItem) => ({
            ...activity,
            timestamp: typeof activity.timestamp === 'string' ? new Date(activity.timestamp) : activity.timestamp,
          }));
        }
        setStats(data);
      } else {
        setError(res.error || 'Failed to load marketplace stats');
      }
    } catch {
      setError('Failed to connect to marketplace API');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <MarketplaceSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger/20 bg-danger/10">
          <AlertCircle size={20} className="text-danger" />
          <div>
            <p className="font-medium text-danger">{error}</p>
            <button
              onClick={fetchStats}
              className="text-sm text-danger/80 hover:text-danger flex items-center gap-1 mt-1"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Marketplace Operations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Unified view of all earning opportunities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Wipe & Rebuild Action */}
          <button
            onClick={() => setShowWipeModal(true)}
            className="px-4.5 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-black uppercase tracking-wider hover:bg-danger hover:text-white transition-all shadow-md flex items-center gap-1.5"
          >
            <RefreshCw size={13} className="animate-spin-slow" />
            Wipe & Rebuild
          </button>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border">
            {(['today', 'week', 'month'] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                  timeframe === period
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Opportunities"
          value={stats.totalOpportunities.toLocaleString()}
          change={stats.totalOpportunitiesChange}
          icon={<Target className="text-blue-400" />}
        />
        <StatCard
          title="Completed"
          value={stats.completed.toLocaleString()}
          change={stats.completedChange}
          icon={<CheckCircle2 className="text-emerald-400" />}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          change={stats.revenueChange}
          icon={<DollarSign className="text-amber-400" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${(stats.completionRate * 100).toFixed(1)}%`}
          change={stats.completionRateChange}
          icon={<Activity className="text-purple-400" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Health */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary">Provider Health</h2>
            <a
              href="/admin/offerwalls"
              className="text-xs font-bold text-primary hover:text-primary-bright flex items-center gap-1"
            >
              Manage <ExternalLink size={12} />
            </a>
          </div>
          
          <div className="space-y-3">
            {stats.providerHealth.map(provider => (
              <ProviderRow key={provider.id} provider={provider} />
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-lg font-bold text-text-primary mb-4">Categories</h2>
          
          <div className="space-y-3">
            {stats.categoryBreakdown.slice(0, 6).map(category => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </div>
        </div>
      </div>

      {/* Phase 7: Progression & Marketplace Eligibility Simulation Panel */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Target size={18} className="text-primary" />
              Progression Intelligence & Eligibility Simulator
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Simulate backend eligibility criteria evaluation and trigger global user progression audits
            </p>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw size={13} className={cn(isAuditing && "animate-spin")} />
            Global Progression Audit
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            value={simUserId}
            onChange={(e) => setSimUserId(e.target.value)}
            placeholder="Enter User UID (e.g. user_123 or Firebase UID)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-bright border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSimulateEligibility}
            disabled={isSimulating || !simUserId.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary-bright disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSimulating ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Simulate Eligibility
          </button>
        </div>

        {simData && (
          <div className="mt-4 p-4 rounded-xl bg-surface-bright border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm font-bold text-text-primary">
                  Target User: {simData.targetUser?.username} <span className="text-xs text-text-tertiary">({simData.targetUser?.userId})</span>
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                  <span>Level {simData.targetUser?.level}</span>
                  <span>•</span>
                  <span>{simData.targetUser?.xp} XP</span>
                  <span>•</span>
                  <span>Account Age: {simData.targetUser?.accountAgeDays} days</span>
                  <span>•</span>
                  <span className="capitalize">Risk: {simData.targetUser?.riskLevel}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {simData.simulations?.map((sim: SimulationItem) => (
                <div key={sim.taskId} className="p-3 rounded-lg bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{sim.title}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                        sim.eligible ? "bg-emerald-500/10 text-emerald-400" : "bg-danger/10 text-danger"
                      )}>
                        {sim.eligible ? "Eligible" : "Locked"}
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      Reward: {sim.rewardAmount} PTS • Category: {sim.category}
                    </p>
                  </div>

                  <div className="text-xs space-y-1 sm:text-right">
                    {sim.requirements?.map((req: SimulationRequirement, idx: number) => (
                      <div key={idx} className={cn("flex items-center gap-1.5 sm:justify-end", req.met ? "text-emerald-400" : "text-danger")}>
                        {req.met ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 8: Marketplace Composition & Controls Panel */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Target size={18} className="text-primary" />
              Marketplace Composition & Discovery Controls
            </h2>
            <p className="text-xs text-text-tertiary">
              Feature, hide, prioritize, or disable categories dynamically without changing frontend code.
            </p>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-bright disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            {savingConfig ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Save Composition Rules
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
              Featured Campaign IDs (Comma separated)
            </label>
            <input
              type="text"
              value={featuredInput}
              onChange={e => setFeaturedInput(e.target.value)}
              placeholder="task_101, campaign_daily_bonus, ..."
              className="w-full bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-mono focus:border-primary outline-none"
            />
            <p className="text-[10px] text-text-tertiary mt-1">Campaigns explicitly pinned to Featured Hero and dynamic sections.</p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
              Hidden Campaign IDs (Comma separated)
            </label>
            <input
              type="text"
              value={hiddenInput}
              onChange={e => setHiddenInput(e.target.value)}
              placeholder="task_expired, bad_campaign_id, ..."
              className="w-full bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-mono focus:border-primary outline-none"
            />
            <p className="text-[10px] text-text-tertiary mt-1">Hidden from discovery and dynamic section composition instantly.</p>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-2">
            Category Status Controls (Select categories to DISABLE)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              'featured', 'daily', 'surveys', 'games', 'apps', 'shopping',
              'cashback', 'videos', 'learn', 'community', 'referrals',
              'predictions', 'seasonal', 'sponsored'
            ].map(cat => {
              const isDisabled = disabledCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      setDisabledCategories(disabledCategories.filter(c => c !== cat));
                    } else {
                      setDisabledCategories([...disabledCategories, cat]);
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border text-center",
                    isDisabled
                      ? "bg-danger/10 border-danger/30 text-danger line-through"
                      : "bg-surface-bright border-border text-text-secondary hover:border-primary/40"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
            Prioritized Campaigns JSON (Task ID -&gt; Score Boost)
          </label>
          <textarea
            rows={2}
            value={prioritizedInput}
            onChange={e => setPrioritizedInput(e.target.value)}
            placeholder='{ "task_survey_01": 25, "campaign_crypto_learn": 50 }'
            className="w-full bg-surface-bright border border-border rounded-xl p-2 text-xs text-text-primary font-mono focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Top Opportunities */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Top Opportunities</h2>
          <a
            href="/admin/tasks"
            className="text-xs font-bold text-primary hover:text-primary-bright flex items-center gap-1"
          >
            Manage Tasks <ExternalLink size={12} />
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-text-tertiary border-b border-border">
                <th className="pb-3">Opportunity</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Completions</th>
                <th className="pb-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.topOpportunities.slice(0, 5).map(opp => (
                <tr key={opp.id} className="text-sm">
                  <td className="py-3 font-medium text-text-primary">{opp.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      {opp.category}
                    </span>
                  </td>
                  <td className="py-3 text-text-secondary">{opp.completions.toLocaleString()}</td>
                  <td className="py-3 text-emerald-400 font-bold">${opp.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <h2 className="text-lg font-bold text-text-primary mb-4">Recent Activity</h2>
        
        <div className="space-y-2">
          {stats.recentActivity.slice(0, 8).map(activity => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      </div>

      {/* Wipe & Rebuild Admin Modal */}
      <AnimatePresence>
        {showWipeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isWiping && setShowWipeModal(false)}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface border border-danger/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="p-6 border-b border-border bg-danger/10 flex items-center gap-3">
                <AlertCircle className="text-danger animate-bounce" size={24} />
                <div>
                  <h3 className="text-sm font-black text-danger uppercase tracking-widest">Wipe & Rebuild Database</h3>
                  <p className="text-[10px] text-text-tertiary mt-0.5">CRITICAL SYSTEM MUTATION ACTION</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  This action is permanent and will perform the following operations:
                </p>
                <ul className="list-disc list-inside text-[11px] text-text-tertiary space-y-1.5 pl-1 font-semibold">
                  <li>Purge all custom & active <span className="text-white">tasks</span>, campaigns, and missions</li>
                  <li>Reset all user completion records & <span className="text-white">claims progress</span></li>
                  <li>Clear and initialize all <span className="text-white">offerwall provider entries</span></li>
                  <li>Re-seed database with high-fidelity, active premium tasks</li>
                </ul>

                <div className="pt-2 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">
                    Type confirmation phrase:
                  </label>
                  <p className="text-[11px] font-mono text-danger bg-danger/5 px-2.5 py-1.5 rounded border border-danger/10 font-bold select-all">
                    DELETE AND REBUILD TASKS
                  </p>
                  <input
                    type="text"
                    value={wipeConfirmText}
                    onChange={e => setWipeConfirmText(e.target.value)}
                    disabled={isWiping}
                    placeholder="Type the exact phrase above..."
                    className="w-full bg-surface-bright border border-border rounded-xl px-3.5 py-2.5 text-xs focus:border-danger/50 outline-none transition-all text-white font-medium placeholder:text-text-tertiary"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border bg-surface-bright flex gap-3">
                <button
                  disabled={isWiping}
                  onClick={() => {
                    setShowWipeModal(false);
                    setWipeConfirmText('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:border-text-tertiary transition-all font-bold text-[10px] uppercase tracking-wider text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  disabled={isWiping || wipeConfirmText !== 'DELETE AND REBUILD TASKS'}
                  onClick={handleWipeAndRebuild}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-danger hover:bg-danger/90 disabled:opacity-30 disabled:hover:bg-danger text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg"
                >
                  {isWiping ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirm Action'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon }) => (
  <div className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">{title}</span>
      <div className="w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center">
        {icon}
      </div>
    </div>
    <p className="text-2xl font-black text-text-primary">{value}</p>
    {change !== undefined && (
      <div className={cn(
        'flex items-center gap-1 mt-2 text-[10px] font-bold',
        change >= 0 ? 'text-emerald-400' : 'text-danger'
      )}>
        {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(change)}% vs last period
      </div>
    )}
  </div>
);

const ProviderRow: React.FC<{ provider: ProviderHealth }> = ({ provider }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-bright border border-border hover:border-primary/20 transition-colors">
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-2 h-2 rounded-full',
        provider.status === 'connected' ? 'bg-emerald-400' :
        provider.status === 'degraded' ? 'bg-amber-400' : 'bg-danger'
      )} />
      <div>
        <p className="font-medium text-text-primary text-sm">{provider.name}</p>
        <p className="text-[10px] text-text-tertiary">{provider.opportunities} opportunities</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-emerald-400">${provider.revenue.toLocaleString()}</p>
      <p className="text-[10px] text-text-tertiary capitalize">{provider.status}</p>
    </div>
  </div>
);

const CategoryRow: React.FC<{ category: CategoryStats }> = ({ category }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-text-primary">{category.label}</span>
      <span className="text-xs text-text-secondary">{category.count}</span>
    </div>
    <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${category.completionRate * 100}%` }}
        className="h-full bg-primary rounded-full"
      />
    </div>
  </div>
);

const ActivityRow: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  const timestamp = typeof activity.timestamp === 'string' ? new Date(activity.timestamp) : activity.timestamp;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-bright transition-colors">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        activity.points > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-bright text-text-tertiary'
      )}>
        {activity.points > 0 ? <DollarSign size={14} /> : <Activity size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{activity.description}</p>
        <p className="text-[10px] text-text-tertiary">{formatTime(timestamp)}</p>
      </div>
      <span className={cn(
        'text-sm font-bold',
        activity.points > 0 ? 'text-emerald-400' : 'text-text-tertiary'
      )}>
        {activity.points > 0 ? '+' : ''}{activity.points}
      </span>
    </div>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

const MarketplaceSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="h-8 w-64 bg-surface rounded animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-surface rounded-2xl animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-64 bg-surface rounded-2xl animate-pulse" />
      <div className="h-64 bg-surface rounded-2xl animate-pulse" />
    </div>
  </div>
);

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default OpsMarketplace;
