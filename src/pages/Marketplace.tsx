/**
 * PulseEarn Marketplace
 * 
 * The premium unified earning ecosystem of PulseEarn.
 * All opportunities (internal and external) presented as one seamless fintech experience.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
  Play,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMarketplace } from '../hooks/useMarketplace';
import {
  OpportunityCard,
  MarketplacePageSkeleton,
  Section,
  CategoryTabs,
  ViewModeToggle,
  SearchBar,
  FilterPanel,
  SortDropdown,
  ActiveFilterTags,
  MarketplaceHero,
} from '../components/marketplace';
import {
  MarketplaceOpportunity,
  OpportunityCategory,
  MARKETPLACE_CATEGORIES,
} from '../types/marketplace';
import { cn } from '../utils';
import toast from 'react-hot-toast';

// ─── Main Component ────────────────────────────────────────────────────────────

const Marketplace: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    sections,
    opportunities,
    providers,
    trending,
    byCategory,
    searchResults,
    isLoading,
    isLoadingProviders,
    error,
    refresh,
    openOpportunity,
    activeFilters,
    setFilters,
    clearFilters,
    selectedCategory,
    setSelectedCategory,
    viewMode,
    setViewMode,
  } = useMarketplace();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('reward');
  const [showRefresh, setShowRefresh] = useState(false);

  // Sandboxed embed experience state
  const [activeEmbedOpportunity, setActiveEmbedOpportunity] = useState<MarketplaceOpportunity | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Refetch providers periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser && !isLoadingProviders) {
        refresh().catch(console.error);
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [currentUser, isLoadingProviders, refresh]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setShowRefresh(true);
    try {
      await refresh();
      toast.success('Marketplace refreshed');
    } catch (err) {
      toast.error('Failed to refresh');
    } finally {
      setShowRefresh(false);
    }
  }, [refresh]);

  // Handle opportunity open
  const handleOpenOpportunity = useCallback((opp: MarketplaceOpportunity) => {
    if (opp.source === 'provider' && opp.action.url) {
      // Launch inside the premium inside-app Sandbox
      setActiveEmbedOpportunity(opp);
      setIframeLoading(true);
      // Track click in backend, skipping browser redirect popup
      openOpportunity(opp, true);
    } else if (opp.action.actionType === 'claim') {
      // Handle internal claim
      toast(`Starting: ${opp.title}`, { icon: '🚀' });
      openOpportunity(opp);
    }
  }, [openOpportunity]);

  // Filter opportunities by selected category
  const getDisplayOpportunities = useCallback(() => {
    if (selectedCategory === 'all') {
      if (searchQuery) {
        return searchResults({
          query: searchQuery,
          filters: activeFilters,
          sortBy: sortBy as 'reward' | 'time' | 'difficulty' | 'popularity' | 'newest',
        });
      }
      return opportunities;
    }

    return byCategory(selectedCategory);
  }, [selectedCategory, searchQuery, activeFilters, sortBy, opportunities, byCategory, searchResults]);

  // Category tabs data
  const categoryTabs = [
    { id: 'all', label: 'All' },
    ...MARKETPLACE_CATEGORIES.map(cat => ({
      id: cat.id,
      label: cat.label,
    })),
  ];

  // Sort options
  const sortOptions = [
    { value: 'reward', label: 'Highest Reward' },
    { value: 'time', label: 'Fastest' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'newest', label: 'Newest' },
  ];

  // Provider connection status
  const connectedProviders = providers.filter(p => p.connectionStatus === 'connected');
  const offlineProviders = providers.filter(p => p.connectionStatus === 'offline');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <MarketplacePageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Compass size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black text-text-primary tracking-tight">Marketplace</h1>
                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                  {opportunities.length} Premium Nodes Active
                </p>
              </div>
            </div>

            {/* Provider Status */}
            <div className="flex items-center gap-2">
              {connectedProviders.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                  <Wifi size={10} className="text-emerald-400" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                    {connectedProviders.length} connected
                  </span>
                </div>
              )}
              {offlineProviders.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-sm">
                  <WifiOff size={10} className="text-amber-400" />
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                    {offlineProviders.length} offline
                  </span>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={showRefresh}
                className="p-2 rounded-xl border border-border bg-surface hover:border-primary/45 hover:shadow-lg transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={cn('text-text-secondary', showRefresh && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search opportunities..."
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <FilterPanel
                filters={activeFilters}
                onFiltersChange={setFilters}
                onClear={clearFilters}
              />
              <SortDropdown
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
              />
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          </div>

          {/* Active Filters */}
          <ActiveFilterTags
            filters={activeFilters}
            onRemove={(key, value) => {
              if (value) {
                const current = activeFilters[key as keyof typeof activeFilters] as string[] | undefined;
                if (current) {
                  setFilters({
                    ...activeFilters,
                    [key]: current.filter(v => v !== value),
                  });
                }
              } else {
                setFilters({ ...activeFilters, [key]: undefined });
              }
            }}
            className="mt-3"
          />

          {/* Category Tabs */}
          <div className="mt-4">
            <CategoryTabs
              categories={categoryTabs}
              activeCategory={selectedCategory}
              onCategoryChange={(id) => setSelectedCategory(id as OpportunityCategory | 'all')}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border border-danger/20 bg-danger/10 flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-danger shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-danger">{error}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                Some external offers may not be available
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-lg bg-danger/20 text-danger text-xs font-bold hover:bg-danger/30 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading Providers */}
        {isLoadingProviders && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl border border-border bg-surface flex items-center gap-3 shadow-md"
          >
            <RefreshCw size={16} className="text-primary animate-spin" />
            <p className="text-sm text-text-secondary font-medium">Loading premium provider databases...</p>
          </motion.div>
        )}

        {/* Sections View (Includes rotating MarketplaceHero visual anchor) */}
        {viewMode === 'sections' && !searchQuery && selectedCategory === 'all' && (
          <div className="space-y-10">
            {/* Visual Anchor rotating carousel */}
            <MarketplaceHero
              opportunities={opportunities}
              onStartEarning={handleOpenOpportunity}
              className="mb-8"
            />

            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Section
                  section={section}
                  onOpenOpportunity={handleOpenOpportunity}
                />
              </motion.div>
            ))}

            {sections.length === 0 && !isLoading && (
              <EmptyState
                title="No opportunities yet"
                description="Check back soon for new ways to earn"
              />
            )}
          </div>
        )}

        {/* Grid/List View */}
        {(viewMode === 'grid' || viewMode === 'list' || searchQuery || selectedCategory !== 'all') && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {selectedCategory === 'all' ? 'All Opportunities' : formatCategory(selectedCategory)}
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {getDisplayOpportunities().length} opportunities located
                </p>
              </div>
            </div>

            {/* Results Grid */}
            {getDisplayOpportunities().length > 0 ? (
              <div
                className={cn(
                  viewMode === 'list'
                    ? 'space-y-4'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                )}
              >
                {getDisplayOpportunities().map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    variant={viewMode === 'list' ? 'row' : 'default'}
                    onOpen={handleOpenOpportunity}
                    showProviderBadge={viewMode !== 'list'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No results found"
                description={
                  searchQuery
                    ? 'Try different search terms or filters'
                    : 'No opportunities in this category yet'
                }
              />
            )}
          </div>
        )}

        {/* Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            icon={<Zap className="text-amber-400" />}
            label="Highest Reward"
            value={`+${Math.max(...opportunities.map(o => o.reward.points), 0).toLocaleString()} PTS`}
          />
          <StatCard
            icon={<TrendingUp className="text-emerald-400" />}
            label="Trending"
            value={trending.length.toString()}
          />
          <StatCard
            icon={<CheckCircle2 className="text-blue-400" />}
            label="New Today"
            value={opportunities.filter(o => o.engagement.isNew).length.toString()}
          />
          <StatCard
            icon={<Clock className="text-purple-400" />}
            label="Expiring Soon"
            value={opportunities.filter(o => o.engagement.expiringSoon).length.toString()}
          />
        </motion.div>
      </div>

      {/* ─── Premium Sandboxed Experience Viewer Overlay (Modal) ─── */}
      <AnimatePresence>
        {activeEmbedOpportunity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#07070B]/98 backdrop-blur-xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-surface/90 backdrop-blur-md">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/35 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                  <Play size={18} className="text-primary fill-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white truncate max-w-xs md:max-w-md tracking-tight">
                    {activeEmbedOpportunity.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-tertiary">
                      Verified Sandbox Frame
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary-bright">
                      Powered by {activeEmbedOpportunity.providerName || 'PulseEarn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Control Bar Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <ShieldCheck size={12} className="shrink-0" />
                  <span>Tracking Secure</span>
                </div>

                {/* Reload button */}
                <button
                  onClick={() => {
                    setIframeLoading(true);
                    const iframe = document.getElementById('marketplace-embed-iframe') as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                  }}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white hover:border-white/20"
                  title="Reload sandbox container"
                >
                  <RefreshCw size={14} />
                </button>

                {/* Direct redirect fallback */}
                {activeEmbedOpportunity.action.url && (
                  <a
                    href={activeEmbedOpportunity.action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white hover:border-white/20"
                    title="Open in external browser window"
                  >
                    <ArrowUpRight size={14} />
                  </a>
                )}

                {/* Secure Close Trigger */}
                <button
                  onClick={() => {
                    setActiveEmbedOpportunity(null);
                    setIframeLoading(true);
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  Terminate Sandbox
                </button>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            <div className="bg-primary/5 border-b border-primary/20 px-6 py-3 flex items-center justify-between text-[11px] text-text-secondary font-medium">
              <div className="flex items-center gap-2 min-w-0">
                <Info size={14} className="text-primary-bright shrink-0" />
                <span className="truncate">Keep this session active. PulseEarn is actively listening to completing logs to post credits instantly.</span>
              </div>
              <span className="hidden md:inline text-[10px] text-text-tertiary font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Shield v2.4 Active
              </span>
            </div>

            {/* Main Sandbox Frame Container */}
            <div className="flex-1 relative bg-[#09090D] overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 space-y-4">
                  <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Bridging Earning Network Sandbox...</p>
                    <p className="text-[10px] text-text-tertiary mt-1.5 font-bold uppercase tracking-wider">Establishing secure frame tunnel for tracking payload</p>
                  </div>
                </div>
              )}

              {activeEmbedOpportunity.action.url ? (
                <iframe
                  id="marketplace-embed-iframe"
                  src={activeEmbedOpportunity.action.url}
                  className="w-full h-full border-0"
                  onLoad={() => setIframeLoading(false)}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  title={activeEmbedOpportunity.title}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <AlertCircle size={48} className="text-amber-500" />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Payload Url Unassigned</h4>
                    <p className="text-xs text-text-tertiary mt-1">This opportunity is unavailable for embedding.</p>
                  </div>
                  <button
                    onClick={() => setActiveEmbedOpportunity(null)}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="p-5 rounded-[20px] border border-border bg-surface shadow-sm">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">
        {label}
      </span>
    </div>
    <p className="text-lg font-black text-text-primary tracking-tight">{value}</p>
  </div>
);

// ─── Empty State ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="text-center py-20 bg-surface/5 rounded-[24px] border border-dashed border-border">
    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
      <Sparkles size={24} className="text-text-tertiary" />
    </div>
    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-1">{title}</h3>
    <p className="text-xs text-text-tertiary font-semibold">{description}</p>
  </div>
);

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default Marketplace;
