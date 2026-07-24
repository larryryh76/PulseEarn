/**
 * PulseEarn Marketplace Types
 * 
 * Unified types for the Marketplace ecosystem.
 * All opportunities (internal and external) conform to these interfaces.
 */

// ─── Core Types ────────────────────────────────────────────────────────────────

export type OpportunityCategory =
  | 'featured'
  | 'daily'
  | 'surveys'
  | 'games'
  | 'apps'
  | 'shopping'
  | 'cashback'
  | 'videos'
  | 'learn'
  | 'community'
  | 'referrals'
  | 'predictions'
  | 'seasonal'
  | 'sponsored';

export type OpportunityDifficulty = 'easy' | 'medium' | 'hard' | 'elite';

export type OpportunityStatus =
  | 'available'
  | 'started'
  | 'submitted'
  | 'pending'
  | 'awaiting_verification'
  | 'verified'
  | 'completed'
  | 'claimed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'cooldown'
  | 'locked';

export type OpportunitySource = 'internal' | 'provider';

export type VerificationType =
  | 'automated'
  | 'manual'
  | 'proof'
  | 'screenshot'
  | 'timer'
  | 'activity'
  | 'wallet_activity'
  | 'link'
  | 'api'
  | 'referral'
  | 'prediction'
  | 'external_callback'
  | 'offerwall'
  | 'admin_approval';

export type LaunchMode = 'redirect' | 'embed' | 'inline';

// ─── Reward Structure ─────────────────────────────────────────────────────────

export interface OpportunityReward {
  points: number;
  xp: number;
  bonusPoints?: number;
  streakBonus?: number;
}

// ─── Engagement Metrics ────────────────────────────────────────────────────────

export interface EngagementMetrics {
  completionRate: number;
  averageReward: number;
  totalCompletions: number;
  trending: boolean;
  isNew: boolean;
  expiringSoon?: boolean;
  almostComplete?: boolean;
}

// ─── Eligibility & Progression Types ─────────────────────────────────────────

export interface OpportunityEligibilityCriteria {
  minLevel?: number;
  minXp?: number;
  minAccountAgeDays?: number;
  minReferrals?: number;
  minTasksCompleted?: number;
  regionRestrictions?: string[];
  providerAvailabilityRequired?: boolean;
  requiresEmailVerification?: boolean;
  maxUserCompletions?: number;
  cooldownPeriodHours?: number;
  maxCampaignClaims?: number;
  currentCampaignClaims?: number;
  requiredTrustLevel?: 'LOW' | 'MEDIUM' | 'STABLE';
}

export interface OpportunityEligibilityResult {
  eligible: boolean;
  visibility: 'visible' | 'hidden' | 'locked';
  priorityScore: number;
  reasons: string[];
  requirements: {
    label: string;
    met: boolean;
    current: string | number | boolean;
    target: string | number | boolean;
  }[];
}

export type UserArchetype =
  | 'new'
  | 'returning'
  | 'high_xp'
  | 'high_trust'
  | 'inactive'
  | 'power_earner';

export interface TrustSignals {
  emailVerified: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  accountAgeDays: number;
  tasksCompleted: number;
  totalEarnings: number;
  predictionsCount: number;
  referralsCount: number;
  offerwallCompletedCount: number;
}

export interface MarketplaceUserProfile {
  userId: string;
  archetype: UserArchetype;
  preferredCategories: Record<string, number>;
  favouriteProviders: string[];
  completionRate: number;
  averageSessionLength: number;
  averageReward: number;
  successRate: number;
  activeCampaigns: string[];
  completedCampaigns: string[];
  hiddenOpportunities: string[];
  savedOpportunities: string[];
  trustSignals: TrustSignals;
  updatedAt?: Date;
}

// ─── Opportunity Interface ────────────────────────────────────────────────────

export interface MarketplaceOpportunity {
  // Identity
  id: string;
  source: OpportunitySource;
  providerId?: string;
  providerName?: string;
  
  // Content
  title: string;
  description: string;
  instructions: string;
  requirements?: string;
  
  // Rewards
  reward: OpportunityReward;
  
  // Metadata
  metadata: {
    category: OpportunityCategory;
    difficulty: OpportunityDifficulty;
    estimatedTime: string;
    verificationType: VerificationType;
    launchMode: LaunchMode;
    artwork?: string;
    thumbnail?: string;
    tags: string[];
    regionRestrictions?: string[];
    minLevel?: number;
  };

  // Explicit Eligibility Rules
  eligibility?: OpportunityEligibilityCriteria;
  computedEligibility?: OpportunityEligibilityResult;
  
  // Engagement
  engagement: EngagementMetrics;
  
  // State
  status: OpportunityStatus;
  nextAvailableAt?: Date;
  
  // Actions
  action: {
    url?: string;
    actionType: 'url' | 'claim' | 'complete' | 'navigate';
    trackingId?: string;
  };
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

// ─── Recommendation Sections ──────────────────────────────────────────────────

export type SectionLayout = 'hero' | 'featured' | 'grid' | 'slider' | 'row' | 'list';

export type SectionSource =
  | 'featured'
  | 'trending'
  | 'personalized'
  | 'continue'
  | 'category'
  | 'history'
  | 'almost_complete'
  | 'expiring_soon'
  | 'new_today'
  | 'highest_paying'
  | 'fastest'
  | 'daily'
  | 'seasonal'
  | 'referrals'
  | 'learn'
  | 'offerwall_providers'
  | 'predictions'
  | 'community'
  | 'limited_campaigns';

export interface RecommendationSection {
  id: string;
  title: string;
  subtitle?: string;
  layout: SectionLayout;
  source: SectionSource;
  category?: OpportunityCategory;
  opportunities: MarketplaceOpportunity[];
  viewAllUrl?: string;
  
  // Personalization
  personalizedFor?: string;
  
  // Display
  showProviderBadge?: boolean;
  maxItems?: number;
}

// ─── Operational Intelligence Types (Phase 9) ─────────────────────────────────

export interface ProviderHealthMetrics {
  providerId: string;
  providerName: string;
  connectionStatus:
    | 'connected'
    | 'degraded'
    | 'offline'
    | 'disabled'
    | 'callback_failure'
    | 'invalid_credentials'
    | 'waiting_first_callback';
  uptimePercentage: number;
  apiAvailability: number;
  callbackSuccessCount: number;
  callbackFailureCount: number;
  callbackSuccessRate: number;
  averageCallbackLatencyMs: number;
  syncFailuresCount: number;
  lastSyncAt: string | null;
  autoDisabledReason?: string;
}

export interface CampaignHealthMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  inactiveCampaigns: number;
  scheduledCampaigns: number;
  expiredCampaigns: number;
  overallCompletionRate: number;
  overallAbandonmentRate: number;
  totalClaims: number;
  uniqueParticipants: number;
  avgClaimsPerCampaign: number;
}

export interface OpportunityQualityMetrics {
  totalOpportunities: number;
  visibleCount: number;
  lockedCount: number;
  hiddenCount: number;
  averageCompletionRate: number;
  averageVerificationRate: number;
  averageRejectionRate: number;
  averageCompletionTimeMinutes: number;
  rewardEfficiency: number; // points per minute
}

export interface EconomyMarketplaceImpact {
  totalPointsIssued: number;
  pendingLiabilitiesPoints: number;
  providerRevenueUsd: number;
  platformRevenueUsd: number;
  outstandingRewardsCount: number;
  averageRewardPoints: number;
  rewardDistributionByCategory: Record<string, number>;
}

export interface MarketplaceUserBehavior {
  activeEarners24h: number;
  returningEarners7d: number;
  avgOpportunitiesViewedPerUser: number;
  avgOpportunitiesCompletedPerUser: number;
  avgRewardEarnedPerUser: number;
  topPreferredCategory: string;
  topPreferredProvider: string;
}

export interface MarketplaceIntegrityIssue {
  type:
    | 'stale_opportunity'
    | 'expired_active_task'
    | 'broken_campaign_ref'
    | 'provider_inconsistency'
    | 'reward_inconsistency'
    | 'duplicate_opportunity'
    | 'invalid_eligibility'
    | 'sync_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityId: string;
  entityTitle?: string;
  description: string;
  autoFixable: boolean;
  detectedAt: string;
}

export interface MarketplaceOperationalOverview {
  generatedAt: string;
  healthScore: number; // 0 - 100
  providers: ProviderHealthMetrics[];
  campaigns: CampaignHealthMetrics;
  opportunities: OpportunityQualityMetrics;
  economy: EconomyMarketplaceImpact;
  userBehavior: MarketplaceUserBehavior;
  integrityIssues: MarketplaceIntegrityIssue[];
  activeAlerts: {
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    message: string;
    timestamp: string;
  }[];
}

// ─── Admin Marketplace Composition Config ─────────────────────────────────────

export interface MarketplaceAdminConfig {
  featuredCampaignIds?: string[];
  hiddenCampaignIds?: string[];
  prioritizedCampaigns?: Record<string, number>; // taskId/campaignId -> bonus score
  disabledCategories?: OpportunityCategory[];
  enabledCategories?: OpportunityCategory[];
  sectionOrder?: (SectionSource | string)[];
  sectionTitles?: Record<string, { title?: string; subtitle?: string }>;
  updatedAt?: Date | string;
}

// ─── Discovery & Search ──────────────────────────────────────────────────────

export interface DiscoveryFilters {
  categories?: OpportunityCategory[];
  difficulty?: OpportunityDifficulty[];
  minReward?: number;
  maxReward?: number;
  maxTime?: string;
  verificationTypes?: VerificationType[];
  sources?: OpportunitySource[];
  providers?: string[];
  status?: OpportunityStatus[];
  featuredOnly?: boolean;
  recommendedOnly?: boolean;
}

export interface SearchOptions {
  query: string;
  filters?: DiscoveryFilters;
  sortBy?: 'reward' | 'time' | 'difficulty' | 'popularity' | 'newest' | 'recommendation_score' | 'recommended' | 'expiring_soon';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ─── Provider Inventory ───────────────────────────────────────────────────────

export interface ProviderInventory {
  providerId: string;
  providerName: string;
  opportunities: MarketplaceOpportunity[];
  lastSyncedAt: Date;
  connectionStatus: 'connected' | 'degraded' | 'offline';
  errorMessage?: string;
}

// ─── Marketplace State ────────────────────────────────────────────────────────

export interface MarketplaceState {
  sections: RecommendationSection[];
  allOpportunities: MarketplaceOpportunity[];
  featured: MarketplaceOpportunity[];
  trending: MarketplaceOpportunity[];
  
  // User-specific
  continueOpportunities: MarketplaceOpportunity[];
  almostComplete: MarketplaceOpportunity[];
  completedToday: MarketplaceOpportunity[];
  
  // Provider states
  providers: ProviderInventory[];
  
  // Filters & Search
  activeFilters: DiscoveryFilters;
  searchQuery: string;
  
  // Loading states
  isLoading: boolean;
  isLoadingProviders: boolean;
  error?: string;
}

// ─── Category Configuration ────────────────────────────────────────────────────

export interface CategoryConfig {
  id: OpportunityCategory;
  label: string;
  icon: string;
  gradient: [string, string];
  description?: string;
  color?: string;
}

export const MARKETPLACE_CATEGORIES: CategoryConfig[] = [
  { id: 'featured', label: 'Featured', icon: 'Sparkles', gradient: ['#3B82F6', '#8B5CF6'], color: '#3B82F6' },
  { id: 'daily', label: 'Daily', icon: 'Flame', gradient: ['#EF4444', '#F97316'], color: '#EF4444' },
  { id: 'surveys', label: 'Surveys', icon: 'BarChart3', gradient: ['#10B981', '#3B82F6'], color: '#10B981' },
  { id: 'games', label: 'Games', icon: 'Trophy', gradient: ['#F59E0B', '#EF4444'], color: '#F59E0B' },
  { id: 'apps', label: 'Apps', icon: 'Smartphone', gradient: ['#6366F1', '#3B82F6'], color: '#6366F1' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag', gradient: ['#F59E0B', '#F97316'], color: '#F59E0B' },
  { id: 'cashback', label: 'Cashback', icon: 'CreditCard', gradient: ['#06B6D4', '#10B981'], color: '#06B6D4' },
  { id: 'videos', label: 'Videos', icon: 'Play', gradient: ['#EC4899', '#8B5CF6'], color: '#EC4899' },
  { id: 'learn', label: 'Learn', icon: 'GraduationCap', gradient: ['#84CC16', '#10B981'], color: '#84CC16' },
  { id: 'community', label: 'Community', icon: 'Users', gradient: ['#06B6D4', '#3B82F6'], color: '#06B6D4' },
  { id: 'referrals', label: 'Referrals', icon: 'UserPlus', gradient: ['#EC4899', '#F43F5E'], color: '#EC4899' },
  { id: 'predictions', label: 'Predictions', icon: 'TrendingUp', gradient: ['#8B5CF6', '#06B6D4'], color: '#8B5CF6' },
  { id: 'seasonal', label: 'Seasonal', icon: 'Gift', gradient: ['#EC4899', '#F97316'], color: '#EC4899' },
  { id: 'sponsored', label: 'Sponsored', icon: 'Star', gradient: ['#3B82F6', '#06B6D4'], color: '#3B82F6' },
];

// ─── Difficulty Configuration ──────────────────────────────────────────────────

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  hard: { label: 'Hard', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  elite: { label: 'Elite', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
} as const;
