/**
 * useMarketplace Hook
 * 
 * Unified hook for accessing the PulseEarn Marketplace.
 * Integrates with TaskContext for internal tasks and
 * provides access to provider offers.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MarketplaceOpportunity,
  RecommendationSection,
  DiscoveryFilters,
  OpportunityCategory,
  ProviderInventory,
  SearchOptions,
} from '../types/marketplace';
import { useAuth } from '../contexts/AuthContext';
import { useTaskContext } from '../contexts/TaskContext';
import { safeFetch } from '../utils/api';
import {
  initializeMarketplace,
  updateUserContext,
  updateProviderInventory,
  search,
  getAllOpportunities,
  getByCategory,
  getFeatured,
  getTrending,
  resetMarketplace,
} from '../engines/marketplace/MarketplaceEngine';
import {
  generateAllSections,
} from '../engines/marketplace/RecommendationEngine';
import { normalizeProviderOffer } from '../engines/marketplace/OpportunityNormalizer';

// ─── Provider Curated Details ──────────────────────────────────────────────────

const PROVIDER_INFO: Record<string, { description: string; category: OpportunityCategory; icon: string }> = {
  lootably: {
    description: 'Complete surveys, watch videos, and install apps to earn points.',
    category: 'surveys',
    icon: 'L',
  },
  bitlabs: {
    description: 'Earn from premium survey panels with some of the highest payouts.',
    category: 'surveys',
    icon: 'B',
  },
  cpxresearch: {
    description: 'Access thousands of daily surveys from top research companies.',
    category: 'surveys',
    icon: 'C',
  },
  adgem: {
    description: 'Install apps, complete in-app actions, and trial offers.',
    category: 'apps',
    icon: 'A',
  },
  offertoro: {
    description: 'A wide catalog of offers including gaming, apps, and subscriptions.',
    category: 'featured',
    icon: 'O',
  },
  timewall: {
    description: 'Earn by watching videos and completing short time-based offers.',
    category: 'videos',
    icon: 'T',
  },
};

// ─── Hook Interface ────────────────────────────────────────────────────────────

export interface UseMarketplaceReturn {
  // State
  sections: RecommendationSection[];
  opportunities: MarketplaceOpportunity[];
  providers: ProviderInventory[];
  
  // Filtered views
  featured: MarketplaceOpportunity[];
  trending: MarketplaceOpportunity[];
  byCategory: (category: OpportunityCategory) => MarketplaceOpportunity[];
  
  // Search
  searchResults: (options: SearchOptions) => MarketplaceOpportunity[];
  
  // Loading states
  isLoading: boolean;
  isLoadingProviders: boolean;
  error?: string;
  
  // Actions
  refresh: () => Promise<void>;
  openOpportunity: (opportunity: MarketplaceOpportunity) => void;
  
  // Filters
  activeFilters: DiscoveryFilters;
  setFilters: (filters: DiscoveryFilters) => void;
  clearFilters: () => void;
  
  // Category
  selectedCategory: OpportunityCategory | 'all';
  setSelectedCategory: (category: OpportunityCategory | 'all') => void;
  
  // View mode
  viewMode: 'sections' | 'grid' | 'list';
  setViewMode: (mode: 'sections' | 'grid' | 'list') => void;
}

export function useMarketplace(): UseMarketplaceReturn {
  const { userData, currentUser } = useAuth();
  const { tasks, campaigns, userTasks, activities, taskHistory, loading: tasksLoading } = useTaskContext();

  // State
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [providers, setProviders] = useState<ProviderInventory[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [error, setError] = useState<string | undefined>();
  
  // Filters & View
  const [activeFilters, setActiveFilters] = useState<DiscoveryFilters>({});
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'sections' | 'grid' | 'list'>('sections');

  // Derived opportunities
  const [allOpportunities, setAllOpportunities] = useState<MarketplaceOpportunity[]>([]);
  
  // Initialize marketplace with tasks
  useEffect(() => {
    if (tasksLoading || !currentUser) return;
    
    initializeMarketplace(tasks, campaigns, userTasks);
    setAllOpportunities(getAllOpportunities());
    
    // Generate sections with user profile
    const generatedSections = generateAllSections(
      getAllOpportunities(),
      userData,
      activities,
      taskHistory
    );
    setSections(generatedSections);
  }, [tasks, campaigns, userTasks, currentUser, tasksLoading]);

  // Update when user context changes
  useEffect(() => {
    if (!currentUser) return;
    
    updateUserContext(tasks, campaigns, userTasks);
    setAllOpportunities(getAllOpportunities());
  }, [userTasks, tasksLoading]);

  // Fetch provider inventory
  const fetchProviderInventory = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoadingProviders(true);
    setError(undefined);

    try {
      // Correct user-facing public endpoint (safeguarded against 403 Forbidden)
      const res = await safeFetch('/api/offerwall/user-providers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.success && res.providers) {
        const providerList: ProviderInventory[] = res.providers.map((p: any) => {
          const offers = p.offers || [];

          // Evolve to high-level curated portal opportunities if individual offers aren't populated (hosted model)
          const opportunities = offers.length > 0
            ? offers.map((offer: any) =>
                normalizeProviderOffer({
                  offerId: offer.id || offer.offerId,
                  providerId: p.id,
                  providerName: p.name,
                  title: offer.title || offer.name,
                  description: offer.description || '',
                  rewardAmount: offer.points || offer.reward || 0,
                  xpReward: offer.xp || 10,
                  estimatedTime: offer.time || offer.estimatedTime,
                  thumbnail: offer.thumbnail || offer.image,
                  category: offer.category,
                  actionUrl: offer.url || offer.actionUrl,
                })
              )
            : [
                normalizeProviderOffer({
                  offerId: 'portal',
                  providerId: p.id,
                  providerName: p.name,
                  title: `${p.name} Offers`,
                  description: PROVIDER_INFO[p.id]?.description || `Complete custom tasks, offers, or surveys with ${p.name}.`,
                  rewardAmount: p.maximumReward || 5000,
                  xpReward: 120,
                  estimatedTime: '5-30 mins',
                  thumbnail: undefined,
                  category: PROVIDER_INFO[p.id]?.category || 'featured',
                  actionUrl: p.launchUrl || undefined,
                })
              ];

          // Ensure inline embed support translates to `'embed'` launchMode if the provider is embeddable
          opportunities.forEach((opp: MarketplaceOpportunity) => {
            if (p.embeddable) {
              opp.metadata.launchMode = 'embed';
            }
          });

          return {
            providerId: p.id,
            providerName: p.name,
            opportunities,
            lastSyncedAt: new Date(),
            connectionStatus: 'connected' as const,
          };
        });

        setProviders(providerList);
        
        // Update marketplace engine with provider data
        providerList.forEach(p => updateProviderInventory(p));
        
        // Refresh opportunities after provider update
        setAllOpportunities(getAllOpportunities());
        
        // Regenerate sections with provider opportunities
        const generatedSections = generateAllSections(
          getAllOpportunities(),
          userData,
          activities,
          taskHistory
        );
        setSections(generatedSections);
      }
    } catch (err: any) {
      console.error('[useMarketplace] Failed to fetch providers:', err);
      setError('Failed to load external offers');
    } finally {
      setIsLoadingProviders(false);
    }
  }, [currentUser, userData, activities, taskHistory]);

  // Fetch providers on mount
  useEffect(() => {
    if (currentUser) {
      fetchProviderInventory();
    }
  }, [currentUser, fetchProviderInventory]);

  // Derived values
  const featured = useMemo(() => getFeatured(), [allOpportunities]);
  const trending = useMemo(() => getTrending(), [allOpportunities]);
  
  const byCategory = useCallback(
    (category: OpportunityCategory) => getByCategory(category),
    [allOpportunities]
  );

  const searchResults = useCallback(
    (options: SearchOptions) => search(options),
    [allOpportunities]
  );

  // Actions
  const refresh = useCallback(async () => {
    updateUserContext(tasks, campaigns, userTasks);
    await fetchProviderInventory();
  }, [tasks, campaigns, userTasks, fetchProviderInventory]);

  const openOpportunity = useCallback(async (opportunity: MarketplaceOpportunity) => {
    if (opportunity.source === 'provider' && opportunity.action.url) {
      // Track the click before opening
      try {
        await safeFetch('/api/offerwall/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: opportunity.providerId,
            offerId: opportunity.action.trackingId,
            userId: currentUser?.uid,
          }),
        });
      } catch (e) {
        // Non-critical, don't block opening
      }
      
      // Let standard links open in a new tab if NOT embed launchMode
      if (opportunity.metadata.launchMode !== 'embed') {
        window.open(opportunity.action.url, '_blank');
      }
    } else if (opportunity.action.actionType === 'claim') {
      // Handle internal claim flow
      console.log('Claim opportunity:', opportunity.id);
    }
  }, [currentUser]);

  // Filter actions
  const setFilters = useCallback((filters: DiscoveryFilters) => {
    setActiveFilters(filters);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
    setSelectedCategory('all');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't reset on unmount - keep state for quick navigation
    };
  }, []);

  return {
    // State
    sections,
    opportunities: allOpportunities,
    providers,
    
    // Filtered views
    featured,
    trending,
    byCategory,
    searchResults,
    
    // Loading states
    isLoading: tasksLoading,
    isLoadingProviders,
    error,
    
    // Actions
    refresh,
    openOpportunity,
    
    // Filters
    activeFilters,
    setFilters,
    clearFilters,
    
    // Category
    selectedCategory,
    setSelectedCategory,
    
    // View mode
    viewMode,
    setViewMode,
  };
}

// ─── Cleanup on Logout ────────────────────────────────────────────────────────

export function useMarketplaceCleanup() {
  useEffect(() => {
    // This can be called on logout to reset marketplace state
    resetMarketplace();
  }, []);
}
