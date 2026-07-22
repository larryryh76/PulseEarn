/**
 * PulseEarn Earning Marketplace
 * 
 * Rebuilt from first principles as a unified rewards economy marketplace.
 * Combines internal missions, offerwalls, surveys, games, predictions, 
 * and daily check-ins into one seamless discovery platform.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Sparkles,
  Clock,
  Zap,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Trophy,
  Coins,
  X,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import { safeFetch } from '../utils/api';
import { useMarketplace } from '../hooks/useMarketplace';
import {
  MarketplaceOpportunity,
  OpportunityCategory,
  MARKETPLACE_CATEGORIES,
} from '../types/marketplace';
import { cn, requiresProofText } from '../utils';
import toast from 'react-hot-toast';

// Sub-components
import { OpportunityCard, formatEstimatedTime, CategoryIcon, formatCategory } from '../components/marketplace/OpportunityCard';
import { CategoryNavigation } from '../components/marketplace/CategoryNavigation';
import { MarketplaceHero } from '../components/marketplace/MarketplaceHero';

// Utility to validate HTTP/HTTPS scheme for security
const isValidHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Utility to parse estimated time into numeric minutes for accurate sorting
const parseDurationMinutes = (timeInput: string | number | undefined): number => {
  if (typeof timeInput === 'number') return timeInput;
  if (!timeInput) return 0;
  const str = String(timeInput).toLowerCase().trim();
  const matches = str.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return 0;

  const nums = matches.map(Number);
  let baseMinutes = nums[0];
  if (nums.length >= 2 && str.includes('-')) {
    baseMinutes = (nums[0] + nums[1]) / 2;
  }

  if (str.includes('hr') || str.includes('hour')) {
    return baseMinutes * 60;
  }
  if (str.includes('day')) {
    return baseMinutes * 1440;
  }
  return baseMinutes;
};

export const Marketplace: React.FC = () => {
  const { userData } = useAuth();
  const {
    opportunities,
    isLoading,
    refresh,
    openOpportunity,
  } = useMarketplace();

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<string>('reward');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Selected Campaign Detail Modal / Drawer State
  const [selectedCampaign, setSelectedCampaign] = useState<MarketplaceOpportunity | null>(null);
  const [submissionProof, setSubmissionProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feed Synchronization state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize feeds handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const loadToast = toast.loading('Syncing latest campaign inventory...');
    try {
      await refresh();
      toast.success('Marketplace updated successfully!', { id: loadToast });
    } catch (err) {
      toast.error('Could not sync fresh campaigns.', { id: loadToast });
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Launch / View Campaign Handler
  const handleOpenCampaign = useCallback((opp: MarketplaceOpportunity) => {
    setSelectedCampaign(opp);
    setSubmissionProof('');
    // Silently track engagement click in backend
    openOpportunity(opp, true);
  }, [openOpportunity]);

  // Execute External Link Launch
  const handleLaunchExternal = useCallback((opp: MarketplaceOpportunity) => {
    if (opp.action.url) {
      if (!isValidHttpUrl(opp.action.url)) {
        toast.error('Invalid destination URL.');
        return;
      }
      window.open(opp.action.url, '_blank', 'noopener,noreferrer');
      toast.success('Redirecting to campaign destination...');
    } else {
      toast.error('Campaign link is currently unavailable.');
    }
  }, []);

  // Submit Internal Task / Campaign Completion Proof
  const handleSubmitTaskProof = async () => {
    if (!selectedCampaign) return;

    if (selectedCampaign.source !== 'internal') {
      toast.error('Provider opportunities are verified automatically by the offer provider.');
      return;
    }

    // Check if task requires proof text
    const isProofRequired = requiresProofText(selectedCampaign.metadata.verificationType);
    if (isProofRequired && !submissionProof.trim()) {
      toast.error('Please enter completion proof (URL, username, or details).');
      return;
    }

    setIsSubmitting(true);
    const loadToast = toast.loading('Submitting campaign completion...');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: selectedCampaign.id,
          proof: submissionProof.trim() || 'AUTOMATED_VALIDATION'
        })
      });

      if (res.success) {
        toast.success(`Rewards earned! +${selectedCampaign.reward.points} PTS credited.`, { id: loadToast });
        setSelectedCampaign(null);
        setSubmissionProof('');
        refresh();
      } else {
        toast.error(res.message || res.error || 'Could not verify completion. Try again.', { id: loadToast });
      }
    } catch (err) {
      toast.error('Network connection error.', { id: loadToast });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Categorize opportunities for intelligent recommendation sections
  const categorizedOpportunities = useMemo(() => {
    const sorted = [...opportunities].sort((a, b) => b.reward.points - a.reward.points);
    return {
      all: sorted,
      featured: sorted.filter(o => o.metadata.category === 'featured' || o.engagement.trending),
      recommended: sorted.filter(o => o.metadata.category === 'surveys' || o.metadata.category === 'games' || o.source === 'internal').slice(0, 8),
      highestPaying: [...sorted].sort((a, b) => b.reward.points - a.reward.points).slice(0, 8),
      quickWins: [...sorted].sort((a, b) => parseDurationMinutes(a.metadata.estimatedTime) - parseDurationMinutes(b.metadata.estimatedTime)).slice(0, 8),
      trendingGames: sorted.filter(o => o.metadata.category === 'games' || o.metadata.category === 'apps').slice(0, 8),
      surveys: sorted.filter(o => o.metadata.category === 'surveys').slice(0, 8),
      dailyPicks: sorted.filter(o => o.metadata.category === 'daily').slice(0, 8),
      continueLeft: sorted.filter(o => o.status === 'pending' || o.status === 'cooldown').slice(0, 4)
    };
  }, [opportunities]);

  // Search & Filtered Campaigns list
  const filteredCampaigns = useMemo(() => {
    let result = [...opportunities];

    if (selectedCategory !== 'all') {
      result = result.filter(o => o.metadata.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      result = result.filter(o => o.metadata.difficulty === selectedDifficulty);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        (o.providerName && o.providerName.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'reward') {
        return b.reward.points - a.reward.points;
      }
      if (sortBy === 'time') {
        return parseDurationMinutes(a.metadata.estimatedTime) - parseDurationMinutes(b.metadata.estimatedTime);
      }
      if (sortBy === 'newest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [opportunities, selectedCategory, selectedDifficulty, searchQuery, sortBy]);

  const isFilterActive = selectedCategory !== 'all' || searchQuery.trim() !== '' || selectedDifficulty !== 'all';

  return (
    <div className="min-h-screen bg-background text-text-primary pb-24">
      {/* ─── Premium Glassmorphic Navigation Bar ─── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Compass size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-text-tertiary uppercase tracking-widest">PulseEarn</span>
                <span className="text-[9px] font-mono text-emerald-400 font-extrabold tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  REWARDS MARKETPLACE
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5">Earning Marketplace</h1>
            </div>
          </div>

          {/* Ledger Stats HUD */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-surface border border-border px-4 py-2 rounded-2xl shadow-subtle">
              <div>
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Your Rewards</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Coins size={14} className="text-amber-500" />
                  <span className="font-mono text-sm font-black text-white tabular-nums">
                    {userData?.points?.toLocaleString() || '0'}
                  </span>
                  <span className="text-[9px] font-black text-text-tertiary uppercase">PTS</span>
                </div>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Progression</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Trophy size={14} className="text-primary-bright" />
                  <span className="font-mono text-sm font-black text-white">
                    LVL {userData?.xp ? Math.floor(userData.xp / 1000) + 1 : '1'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 rounded-2xl border border-border bg-surface hover:bg-surface-bright hover:border-text-tertiary transition-all active:scale-95 text-text-secondary shadow-subtle shrink-0"
              title="Sync Campaign Inventory"
            >
              <RefreshCw size={15} className={cn(isRefreshing && 'animate-spin text-primary')} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Canvas ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-10">
        
        {/* HERO SECTION (Auto-rotating featured campaign) */}
        {!isFilterActive && categorizedOpportunities.featured.length > 0 && (
          <MarketplaceHero
            opportunities={categorizedOpportunities.featured}
            onStartEarning={handleOpenCampaign}
          />
        )}

        {/* SEARCH, CATEGORIES & FILTERS TOOLBAR */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-3xl border border-border shadow-subtle">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
              <input
                type="text"
                placeholder="Search campaigns, apps, surveys, daily check-ins..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-surface-bright border border-border focus:border-primary outline-none rounded-2xl py-2.5 pl-10 pr-9 text-xs font-medium text-white placeholder:text-text-tertiary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="bg-surface-bright border border-border text-[10px] font-extrabold uppercase tracking-widest text-white px-3 py-2.5 rounded-xl outline-none cursor-pointer focus:border-primary transition-all"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="elite">Elite</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-surface-bright border border-border text-[10px] font-extrabold uppercase tracking-widest text-white px-3 py-2.5 rounded-xl outline-none cursor-pointer focus:border-primary transition-all"
              >
                <option value="reward">Highest Reward</option>
                <option value="time">Fastest Completion</option>
                <option value="newest">Newest Added</option>
              </select>

              {isFilterActive && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedDifficulty('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Activity Category Scrollable Pills */}
          <CategoryNavigation
            categories={[{ id: 'all', label: 'All Categories' }, ...MARKETPLACE_CATEGORIES]}
            activeCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </section>

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Loading Marketplace opportunities...</p>
          </div>
        )}

        {/* ACTIVE FILTER / SEARCH RESULTS VIEW */}
        {!isLoading && isFilterActive && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-primary" />
                Filtered Opportunities ({filteredCampaigns.length})
              </h2>
            </div>

            {filteredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCampaigns.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onOpen={handleOpenCampaign}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-surface/30 rounded-3xl border border-dashed border-border p-8">
                <Search size={32} className="text-text-tertiary mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Matching Campaigns Found</h3>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  Try adjusting your search terms or selecting a different category filter.
                </p>
              </div>
            )}
          </section>
        )}

        {/* DEFAULT INTELLIGENT DISCOVERY HOME (When no filter is active) */}
        {!isLoading && !isFilterActive && (
          <div className="space-y-12">
            
            {/* 1. Continue Where You Left Off */}
            {categorizedOpportunities.continueLeft.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-amber-500" size={18} />
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Continue Where You Left Off</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categorizedOpportunities.continueLeft.map(opp => (
                    <div
                      key={opp.id}
                      onClick={() => handleOpenCampaign(opp)}
                      className="p-4 rounded-2xl bg-surface border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-3">
                        <h4 className="text-xs font-bold text-white truncate">{opp.title}</h4>
                        <p className="text-[10px] text-amber-400 mt-0.5">Verification Pending</p>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-400 shrink-0">
                        +{opp.reward.points} PTS
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Recommended For You */}
            {categorizedOpportunities.recommended.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-primary" size={18} />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">Recommended For You</h2>
                  </div>
                  <button onClick={() => setSelectedCategory('featured')} className="text-xs font-bold text-primary hover:text-white flex items-center gap-1">
                    Explore All <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categorizedOpportunities.recommended.slice(0, 4).map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onOpen={handleOpenCampaign}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 3. Highest Paying Today */}
            {categorizedOpportunities.highestPaying.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="text-emerald-400" size={18} />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">Highest Paying Campaigns</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categorizedOpportunities.highestPaying.slice(0, 4).map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onOpen={handleOpenCampaign}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Fastest Rewards (Quick Wins) */}
            {categorizedOpportunities.quickWins.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="text-amber-400" size={18} />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">Fastest Rewards (Quick Wins)</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categorizedOpportunities.quickWins.slice(0, 4).map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onOpen={handleOpenCampaign}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 5. Trending Games & Mobile Apps */}
            {categorizedOpportunities.trendingGames.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="text-violet-400" size={18} />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">Trending Games & Apps</h2>
                  </div>
                  <button onClick={() => setSelectedCategory('games')} className="text-xs font-bold text-primary hover:text-white flex items-center gap-1">
                    View Games <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categorizedOpportunities.trendingGames.slice(0, 4).map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onOpen={handleOpenCampaign}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 6. Surveys & Daily Check-Ins */}
            {categorizedOpportunities.surveys.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="text-sky-400" size={18} />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">Paid Surveys & Research</h2>
                  </div>
                  <button onClick={() => setSelectedCategory('surveys')} className="text-xs font-bold text-primary hover:text-white flex items-center gap-1">
                    View Surveys <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categorizedOpportunities.surveys.slice(0, 4).map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onOpen={handleOpenCampaign}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 7. All Available Campaigns Grid */}
            <section className="space-y-6 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">All Earning Campaigns</h2>
                  <p className="text-xs text-text-secondary mt-0.5">Browse the complete PulseEarn unified earning inventory</p>
                </div>
                <span className="text-xs font-mono font-bold text-text-tertiary">
                  {opportunities.length} Campaigns Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {opportunities.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onOpen={handleOpenCampaign}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ─── CAMPAIGN DETAIL & ACTION MODAL / SHEET ─── */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
            >
              {/* Header Header Artwork / Icon */}
              <div className="relative h-44 bg-surface-bright border-b border-border flex items-center justify-center overflow-hidden shrink-0">
                {selectedCampaign.metadata.artwork || selectedCampaign.metadata.thumbnail ? (
                  <img
                    src={selectedCampaign.metadata.artwork || selectedCampaign.metadata.thumbnail}
                    alt={selectedCampaign.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-border">
                    <CategoryIcon category={selectedCampaign.metadata.category} size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/30" />

                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-background/80 px-2.5 py-1 rounded border border-border text-primary">
                    {formatCategory(selectedCampaign.metadata.category)}
                  </span>
                  {selectedCampaign.source === 'provider' && selectedCampaign.providerName && (
                    <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-text-tertiary">
                      Powered by {selectedCampaign.providerName}
                    </span>
                  )}
                </div>
              </div>

              {/* Body Details */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                <div>
                  <h3 className="text-xl font-extrabold text-white leading-snug">{selectedCampaign.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed mt-2">{selectedCampaign.description}</p>
                </div>

                {/* Rewards Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-bright border border-border text-center">
                  <div>
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider block">Reward</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">+{selectedCampaign.reward.points.toLocaleString()} PTS</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider block">XP Bonus</span>
                    <span className="text-lg font-black text-amber-400 font-mono">+{selectedCampaign.reward.xp} XP</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider block">Est. Duration</span>
                    <span className="text-xs font-bold text-white mt-1 block">{formatEstimatedTime(selectedCampaign.metadata.estimatedTime)}</span>
                  </div>
                </div>

                {/* Instructions & Requirements */}
                {selectedCampaign.instructions && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Instructions</h4>
                    <p className="text-xs text-text-secondary leading-relaxed bg-background p-3.5 rounded-xl border border-border">
                      {selectedCampaign.instructions}
                    </p>
                  </div>
                )}

                {/* Proof Input for Internal Tasks needing proof */}
                {selectedCampaign.source === 'internal' && requiresProofText(selectedCampaign.metadata.verificationType) && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-white block">
                      Verification Proof / Details
                    </label>
                    <textarea
                      rows={3}
                      value={submissionProof}
                      onChange={e => setSubmissionProof(e.target.value)}
                      placeholder="Enter details, confirmation link, or completion notes..."
                      className="w-full bg-background border border-border focus:border-primary outline-none rounded-xl p-3 text-xs text-white placeholder:text-text-tertiary transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-border bg-surface-bright/50 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border text-text-secondary hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Close
                </button>

                {/* Branch 1: Internal URL opportunity (Visit link) */}
                {selectedCampaign.source === 'internal' && selectedCampaign.action.url && (
                  <button
                    onClick={() => handleLaunchExternal(selectedCampaign)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <span>Open Destination</span>
                    <ExternalLink size={14} />
                  </button>
                )}

                {/* Branch 2: Internal Claim / Submit Proof */}
                {selectedCampaign.source === 'internal' && (
                  <button
                    onClick={handleSubmitTaskProof}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        <span>{requiresProofText(selectedCampaign.metadata.verificationType) ? 'Submit Proof' : 'Claim Rewards'}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Branch 3: Provider opportunity with URL */}
                {selectedCampaign.source === 'provider' && selectedCampaign.action.url && (
                  <button
                    onClick={() => handleLaunchExternal(selectedCampaign)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary-bright transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <span>Open Campaign</span>
                    <ExternalLink size={14} />
                  </button>
                )}

                {/* Branch 4: Provider inline / no-URL opportunity */}
                {selectedCampaign.source === 'provider' && !selectedCampaign.action.url && (
                  <button
                    onClick={() => {
                      openOpportunity(selectedCampaign, true);
                      toast.success(`Started offer with ${selectedCampaign.providerName || 'provider'}. Rewards credit automatically upon completion.`);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary-bright transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <span>Start Provider Offer</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;
