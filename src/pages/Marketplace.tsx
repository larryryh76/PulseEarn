import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Flame, Clock, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTaskContext } from '../contexts/TaskContext';
import { safeFetch } from '../utils/api';
import { validateExternalUrl } from '../utils/security';
import toast from 'react-hot-toast';

import {
  MarketplaceOpportunity,
  OpportunityCategory,
  OpportunityDifficulty,
} from '../types/marketplace';

import {
  initializeMarketplace,
  updateUserContext,
  updateProviderInventory,
  search,
  getMarketplaceState,
} from '../engines/marketplace/MarketplaceEngine';

import {
  generateAllSections,
} from '../engines/marketplace/RecommendationEngine';

// Import Modular Marketplace UI Components
import { MarketplaceHeader } from '../components/marketplace/MarketplaceHeader';
import { MarketplaceCategories } from '../components/marketplace/MarketplaceCategories';
import { MarketplaceHostedOfferwalls, HostedProvider } from '../components/marketplace/MarketplaceHostedOfferwalls';
import { MarketplaceOpportunityCard } from '../components/marketplace/MarketplaceOpportunityCard';
import { MarketplaceCampaignCard } from '../components/marketplace/MarketplaceCampaignCard';
import { MarketplaceFilters, SecondaryFilter } from '../components/marketplace/MarketplaceFilters';
import { MarketplaceEmptyState, MarketplaceErrorState, MarketplaceSkeleton } from '../components/marketplace/MarketplaceStates';
import { MarketplaceOpportunityDrawer } from '../components/marketplace/MarketplaceOpportunityDrawer';
import { CampaignDetailDrawer } from '../components/marketplace/CampaignDetailDrawer';

export const Marketplace: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const { userTasks, tasks, campaigns, activities, taskHistory } = useTaskContext();

  const [rawProviders, setRawProviders] = useState<HostedProvider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [engineVersion, setEngineVersion] = useState<number>(0);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [selectedSecondaryFilter, setSelectedSecondaryFilter] = useState<SecondaryFilter>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<OpportunityDifficulty | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'reward' | 'time' | 'difficulty' | 'newest'>('recommended');

  // Selected Item Drawers
  const [selectedOpportunity, setSelectedOpportunity] = useState<MarketplaceOpportunity | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketplaceOpportunity | null>(null);

  // User balance in points
  const userBalancePoints = userData?.points ?? 0;

  // Sync Engine State on context update
  useEffect(() => {
    if (tasks.length > 0 || campaigns.length > 0) {
      initializeMarketplace(tasks, campaigns, userTasks);
      updateUserContext(tasks, campaigns, userTasks, userData);
      setEngineVersion((v) => v + 1);
    }
  }, [tasks, campaigns, userTasks, userData]);

  // Fetch Providers & Inventory from Backend
  const fetchProvidersAndOpportunities = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await currentUser.getIdToken();

      const [resProviders, resOpps] = await Promise.all([
        safeFetch('/api/offerwall/user-providers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }),
        safeFetch('/api/offerwall/opportunities', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }),
      ]);

      const directOpps: MarketplaceOpportunity[] =
        resOpps.success && Array.isArray(resOpps.opportunities) ? resOpps.opportunities : [];

      if (resProviders.success && Array.isArray(resProviders.providers)) {
        setRawProviders(resProviders.providers);

        // Update Marketplace Engine Inventory for each provider
        const currentEngineState = getMarketplaceState();
        resProviders.providers.forEach((p: HostedProvider & { offers?: MarketplaceOpportunity[] }) => {
          const match = currentEngineState.providers.find((inv) => inv.providerId === p.id);
          const providerDirectOpps = directOpps.filter((o) => o.providerId === p.id);
          const embeddedOpps = p.offers && p.offers.length > 0 ? p.offers : match?.opportunities || [];
          const combinedOpps = [...providerDirectOpps, ...embeddedOpps];

          updateProviderInventory({
            providerId: p.id,
            providerName: p.name,
            opportunities: combinedOpps,
            lastSyncedAt: new Date(),
            connectionStatus:
              p.status === 'degraded'
                ? 'degraded'
                : p.status === 'offline' || p.status === 'maintenance'
                ? 'offline'
                : 'connected',
          });
        });

        // Also register direct opportunities whose providers might not be listed
        const knownProviderIds = new Set(resProviders.providers.map((p: HostedProvider) => p.id));
        const orphanOpps = directOpps.filter((o) => o.providerId && !knownProviderIds.has(o.providerId));
        if (orphanOpps.length > 0) {
          const orphanMap = new Map<string, MarketplaceOpportunity[]>();
          orphanOpps.forEach((o) => {
            if (!o.providerId) return;
            const existing = orphanMap.get(o.providerId) || [];
            existing.push(o);
            orphanMap.set(o.providerId, existing);
          });
          orphanMap.forEach((opps, pId) => {
            updateProviderInventory({
              providerId: pId,
              providerName: opps[0]?.providerName || pId.toUpperCase(),
              opportunities: opps,
              lastSyncedAt: new Date(),
              connectionStatus: 'connected',
            });
          });
        }

        setEngineVersion((v) => v + 1);
      } else {
        setRawProviders([]);
        if (!resProviders.success) {
          setError(resProviders.error || 'Unable to load provider list.');
        }
      }
    } catch (err) {
      console.error('[Marketplace] Error fetching provider inventory:', err);
      setError('Unable to load earning opportunities at this time.');
      setRawProviders([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchProvidersAndOpportunities();
    }
  }, [currentUser, fetchProvidersAndOpportunities]);

  // Launch Hosted Offerwall Provider
  const handleLaunchProvider = async (provider: HostedProvider) => {
    if (provider.status === 'offline' || provider.status === 'maintenance') {
      toast.error(`${provider.name} is currently undergoing maintenance.`);
      return;
    }

    let targetWindow: Window | null = null;
    if (currentUser) {
      targetWindow = window.open('about:blank', '_blank');
    }

    try {
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const res = await safeFetch(`/api/offerwall/providers/${provider.id}/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (res.success && res.launchUrl) {
          const val = validateExternalUrl(res.launchUrl);
          if (!val.valid || !val.url) {
            if (targetWindow) targetWindow.close();
            toast.error(val.error || `Invalid launch URL for ${provider.name}.`);
            return;
          }

          if (targetWindow) {
            targetWindow.opener = null;
            targetWindow.location.href = val.url;
          } else {
            window.open(val.url, '_blank', 'noopener,noreferrer');
          }
          toast.success(`Launching ${provider.name}...`);
          return;
        }
      }

      if (targetWindow) targetWindow.close();
      toast.error(`Unable to launch ${provider.name}. Please try again later.`);
    } catch (err) {
      if (targetWindow) targetWindow.close();
      console.error('[Marketplace] Provider launch error:', err);
      toast.error(`Failed to launch ${provider.name}.`);
    }
  };

  // Handle Opportunity Action
  const handleOpportunityAction = (opp: MarketplaceOpportunity) => {
    if (opp.action.url) {
      const val = validateExternalUrl(opp.action.url);
      if (!val.valid || !val.url) {
        toast.error(val.error || 'Invalid action URL for this opportunity.');
        return;
      }
      window.open(val.url, '_blank', 'noopener,noreferrer');
      toast.success(`Launching ${opp.title}...`);
    } else if (opp.providerId) {
      const match = rawProviders.find((p) => p.id === opp.providerId);
      if (match) {
        handleLaunchProvider(match);
      } else {
        toast.error(`Provider channel for ${opp.title} is currently unavailable.`);
      }
    } else if (opp.action.actionType === 'claim' || opp.action.actionType === 'complete') {
      toast(`Claim submitted for ${opp.title}. Verifying completion...`, { icon: 'ℹ️' });
    } else {
      toast.error(`Unable to launch ${opp.title}. No valid target configured.`);
    }
  };

  // Reset Filters
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSecondaryFilter('all');
    setSelectedDifficulty('all');
    setSelectedProvider('all');
    setSortBy('recommended');
  }, []);

  // Derive Engine Opportunities
  const { opportunities: engineOpportunities } = getMarketplaceState();

  // Active Categories Present in Inventory
  const activeCategoriesInInventory = useMemo(() => {
    const cats = new Set<OpportunityCategory>();
    engineOpportunities.forEach((opp) => {
      if (opp.metadata.category) {
        cats.add(opp.metadata.category);
      }
    });
    return Array.from(cats);
  }, [engineOpportunities, engineVersion]);

  // Available Providers for Filter Dropdown
  const availableProviders = useMemo(() => {
    const pMap = new Map<string, string>();
    engineOpportunities.forEach((opp) => {
      if (opp.providerId && opp.providerName) {
        pMap.set(opp.providerId, opp.providerName);
      }
    });
    return Array.from(pMap.entries()).map(([id, name]) => ({ id, name }));
  }, [engineOpportunities, engineVersion]);

  // Dynamic Search & Filter Results
  const searchResults = useMemo(() => {
    let list = search({
      query: searchQuery,
      filters: {
        categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        difficulty: selectedDifficulty !== 'all' ? [selectedDifficulty] : undefined,
        providers: selectedProvider !== 'all' ? [selectedProvider] : undefined,
      },
      sortBy: sortBy === 'recommended' ? 'recommendation_score' : sortBy,
      limit: 150,
    });

    // Secondary Filters
    if (selectedSecondaryFilter === 'highest_reward') {
      list = [...list].sort((a, b) => b.reward.points - a.reward.points);
    } else if (selectedSecondaryFilter === 'quick_earn') {
      list = list.filter((opp) => {
        const timeStr = opp.metadata.estimatedTime?.toLowerCase() || '';
        const mins = parseInt(timeStr) || 10;
        return mins <= 5 || timeStr.includes('1 min') || timeStr.includes('2 min') || timeStr.includes('3 min') || timeStr.includes('5 min');
      });
    } else if (selectedSecondaryFilter === 'new') {
      list = list.filter((opp) => opp.engagement?.isNew || opp.source === 'provider');
    } else if (selectedSecondaryFilter === 'mobile') {
      list = list.filter((opp) => {
        if (opp.metadata.category === 'apps') return true;
        return opp.metadata.tags?.some((t) => {
          const lower = t.toLowerCase();
          return lower.includes('mobile') || lower.includes('app') || lower.includes('android') || lower.includes('ios');
        });
      });
    } else if (selectedSecondaryFilter === 'desktop') {
      list = list.filter((opp) => {
        const isMobileOnly = opp.metadata.tags?.some((t) => {
          const lower = t.toLowerCase();
          return lower.includes('mobile only') || lower.includes('ios only') || lower.includes('android only');
        });
        if (isMobileOnly) return false;
        return true;
      });
    } else if (selectedSecondaryFilter === 'available_now') {
      list = list.filter((opp) => opp.status === 'available');
    } else if (selectedSecondaryFilter === 'ending_soon') {
      list = list.filter((opp) => opp.engagement?.expiringSoon || opp.metadata.category === 'limited');
    }

    return list;
  }, [searchQuery, selectedCategory, selectedSecondaryFilter, selectedDifficulty, selectedProvider, sortBy, engineOpportunities, engineVersion]);

  // Section Recommendations for Default View
  const dynamicSections = useMemo(() => {
    return generateAllSections(engineOpportunities, userData, activities, taskHistory);
  }, [engineOpportunities, userData, activities, taskHistory, engineVersion]);

  // Attached Tasks for Selected Campaign
  const attachedCampaignTasks = useMemo(() => {
    if (!selectedCampaign) return [];
    const matchingTasks = tasks.filter((t) => t.campaignId === selectedCampaign.id);
    const matchingTaskIds = new Set(matchingTasks.map((t) => t.id));
    return engineOpportunities.filter((opp) => matchingTaskIds.has(opp.id));
  }, [selectedCampaign, tasks, engineOpportunities]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'all' ||
    selectedSecondaryFilter !== 'all' ||
    selectedDifficulty !== 'all' ||
    selectedProvider !== 'all';

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 pt-24 pb-20 md:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <MarketplaceHeader
        pointsBalance={userBalancePoints}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={fetchProvidersAndOpportunities}
        isRefreshing={loading}
      />

      {/* Error Banner */}
      {error && <MarketplaceErrorState message={error} onRetry={fetchProvidersAndOpportunities} />}

      {/* Loading Skeleton */}
      {loading && engineOpportunities.length === 0 ? (
        <MarketplaceSkeleton />
      ) : (
        <>
          {/* Category Navigation System */}
          <MarketplaceCategories
            activeCategoriesInInventory={activeCategoriesInInventory}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Model A: Hosted Offerwalls Section (Dedicated integrated section) */}
          {selectedCategory === 'all' && !hasActiveFilters && rawProviders.length > 0 && (
            <MarketplaceHostedOfferwalls providers={rawProviders} onLaunch={handleLaunchProvider} />
          )}

          {/* Filters & Sorting Controls */}
          <MarketplaceFilters
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={setSelectedDifficulty}
            selectedSecondaryFilter={selectedSecondaryFilter}
            onSelectSecondaryFilter={setSelectedSecondaryFilter}
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            availableProviders={availableProviders}
            sortBy={sortBy}
            onSelectSortBy={setSortBy}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />

          {/* Opportunity Grid Section */}
          {engineOpportunities.length === 0 ? (
            <MarketplaceEmptyState onResetFilters={handleResetFilters} onRefresh={fetchProvidersAndOpportunities} />
          ) : hasActiveFilters ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Filter size={13} className="text-primary" />
                  <span>Matching Opportunities ({searchResults.length})</span>
                </h2>
              </div>

              {searchResults.length === 0 ? (
                <MarketplaceEmptyState onResetFilters={handleResetFilters} onRefresh={fetchProvidersAndOpportunities} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {searchResults.map((opp) =>
                    opp.metadata.category === 'campaigns' ? (
                      <MarketplaceCampaignCard
                        key={opp.id}
                        campaignOpportunity={opp}
                        onSelect={() => setSelectedCampaign(opp)}
                      />
                    ) : (
                      <MarketplaceOpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        userTaskStatus={userTasks[opp.id]?.status}
                        onSelect={() => setSelectedOpportunity(opp)}
                      />
                    )
                  )}
                </div>
              )}
            </section>
          ) : (
            /* Categorized Sections View */
            <div className="space-y-8">
              {dynamicSections.map((section) => (
                <section key={section.id} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
                        {section.id === 'featured' && <Sparkles size={15} className="text-primary" />}
                        {section.id === 'personalized-for-you' && <Flame size={15} className="text-warning" />}
                        {section.id === 'daily' && <Clock size={15} className="text-success" />}
                        {section.id === 'highest-paying' && <Trophy size={15} className="text-primary" />}
                        <span>{section.title}</span>
                      </h2>
                      {section.subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{section.subtitle}</p>}
                    </div>
                    <span className="text-[10px] font-mono text-text-tertiary uppercase">
                      {section.opportunities.length} Available
                    </span>
                  </div>

                  {section.opportunities.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-border/60 bg-surface/50 text-center">
                      <p className="text-xs text-text-tertiary">No opportunities currently listed in this section.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {section.opportunities.map((opp) =>
                        opp.metadata.category === 'campaigns' ? (
                          <MarketplaceCampaignCard
                            key={opp.id}
                            campaignOpportunity={opp}
                            onSelect={() => setSelectedCampaign(opp)}
                          />
                        ) : (
                          <MarketplaceOpportunityCard
                            key={opp.id}
                            opportunity={opp}
                            userTaskStatus={userTasks[opp.id]?.status}
                            onSelect={() => setSelectedOpportunity(opp)}
                          />
                        )
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Opportunity Detail Drawer */}
      <AnimatePresence>
        {selectedOpportunity && (
          <MarketplaceOpportunityDrawer
            opportunity={selectedOpportunity}
            userTaskStatus={userTasks[selectedOpportunity.id]?.status}
            onClose={() => setSelectedOpportunity(null)}
            onAction={() => handleOpportunityAction(selectedOpportunity)}
          />
        )}
      </AnimatePresence>

      {/* Model D: Campaign Detail Drawer */}
      <AnimatePresence>
        {selectedCampaign && (
          <CampaignDetailDrawer
            campaignOpportunity={selectedCampaign}
            attachedTasks={attachedCampaignTasks}
            userTasks={userTasks}
            onClose={() => setSelectedCampaign(null)}
            onSelectTask={(task) => setSelectedOpportunity(task)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;
