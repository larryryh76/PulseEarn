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
  openOpportunity: (opportunity: MarketplaceOpportunity, skipRedirect?: boolean) => void;
  
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
      const res = await safeFetch('/api/offerwall/providers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.success && res.providers) {
        const providerList: ProviderInventory[] = res.providers.map((p: any) => ({
          providerId: p.id,
          providerName: p.name,
          opportunities: (p.offers || []).map((offer: any) =>
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
          ),
          lastSyncedAt: new Date(),
          connectionStatus: p.enabled ? 'connected' : 'offline',
        }));

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

  const openOpportunity = useCallback(async (opportunity: MarketplaceOpportunity, skipRedirect = false) => {
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
      
      if (!skipRedirect) {
        // Open the provider URL
        window.open(opportunity.action.url, '_blank');
      }
    } else if (opportunity.action.actionType === 'claim') {
      // Handle internal claim flow
      // This would trigger the claim modal or claim action
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
