/**
 * RecommendationEngine
 * 
 * Generates personalized recommendation sections for the Marketplace.
 * Implements smart section generation based on user behavior,
 * preferences, and opportunity engagement patterns.
 */

import {
  MarketplaceOpportunity,
  RecommendationSection,
  SectionSource,
  SectionLayout,
  OpportunityCategory,
  MarketplaceAdminConfig,
} from '../../types/marketplace';
import { UserData, Activity, TaskHistory } from '../../types';

// ─── User Profile ─────────────────────────────────────────────────────────────

interface UserProfile {
  completedCategories: Map<OpportunityCategory, number>;
  averageSessionReward: number;
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'elite';
  lastActiveTime: Date;
  streak: number;
  level: number;
  totalEarnings: number;
  completionRate: number;
}

function buildUserProfile(
  userData: UserData | null,
  activities: Activity[],
  history: TaskHistory[]
): UserProfile {
  if (!userData) {
    return {
      completedCategories: new Map(),
      averageSessionReward: 0,
      preferredDifficulty: 'easy',
      lastActiveTime: new Date(),
      streak: 0,
      level: 1,
      totalEarnings: 0,
      completionRate: 0,
    };
  }

  // Calculate category completion counts from history
  const categoryCounts = new Map<OpportunityCategory, number>();
  history.forEach(h => {
    const mappedCategory = mapTaskCategoryToMarketplace(h.category);
    const current = categoryCounts.get(mappedCategory) || 0;
    categoryCounts.set(mappedCategory, current + 1);
  });

  // Calculate average reward from activities
  const rewardActivities = activities.filter(a => a.type.includes('reward') || a.type.includes('task'));
  const totalReward = rewardActivities.reduce((sum, a) => sum + (a.points > 0 ? a.points : 0), 0);
  const avgReward = rewardActivities.length > 0 ? totalReward / rewardActivities.length : 0;

  return {
    completedCategories: categoryCounts,
    averageSessionReward: avgReward,
    preferredDifficulty: userData.level < 5 ? 'easy' : userData.level < 15 ? 'medium' : 'hard',
    lastActiveTime: new Date(),
    streak: userData.streak,
    level: userData.level,
    totalEarnings: userData.stats?.totalEarnings || 0,
    completionRate: userData.stats && userData.stats.tasksCompleted > 0
      ? (userData.stats.tasksCompleted / (userData.stats.tasksCompleted + 1))
      : 0,
  };
}

// ─── Personalization ─────────────────────────────────────────────────────────

/**
 * Generate personalized recommendations based on user profile.
 */
export function getPersonalizedOpportunities(
  allOpportunities: MarketplaceOpportunity[],
  profile: UserProfile,
  limit: number = 20
): MarketplaceOpportunity[] {
  const available = allOpportunities.filter(o => o.status === 'available');
  
  // Score each opportunity for this user
  const scored = available.map(opp => ({
    opportunity: opp,
    score: calculatePersonalizationScore(opp, profile),
  }));

  // Sort by score and return top results
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.opportunity);
}

function calculatePersonalizationScore(
  opp: MarketplaceOpportunity,
  profile: UserProfile
): number {
  let score = opp.computedEligibility?.priorityScore || 0;

  // Category affinity (user has completed this category before)
  const categoryCompletions = profile.completedCategories.get(opp.metadata.category) || 0;
  if (categoryCompletions > 0) {
    score += Math.min(categoryCompletions * 2, 20); // Max 20 points for category affinity
  }

  // Difficulty preference
  if (opp.metadata.difficulty === profile.preferredDifficulty) {
    score += 15;
  }

  // Level appropriateness
  if (opp.metadata.minLevel && opp.metadata.minLevel <= profile.level) {
    score += 10;
  }

  // Reward range (not too easy, not too hard for their level)
  const expectedReward = profile.averageSessionReward * 1.5;
  const rewardRatio = opp.reward.points / expectedReward;
  if (rewardRatio >= 0.5 && rewardRatio <= 2.0) {
    score += 10;
  }

  // Trending bonus
  if (opp.engagement.trending) {
    score += 5;
  }

  // New opportunity bonus (if user likes trying new things)
  if (opp.engagement.isNew && profile.completionRate > 0.7) {
    score += 8;
  }

  // Engagement rate bonus
  if (opp.engagement.completionRate > 0.8) {
    score += 5;
  }

  // Streak bonus for daily opportunities
  if (profile.streak > 0 && opp.metadata.category === 'daily') {
    score += 10;
  }

  return score;
}

// ─── Section Generators ───────────────────────────────────────────────────────

/**
 * Generate "Continue Where You Left Off" section.
 */
export function generateContinueSection(
  allOpportunities: MarketplaceOpportunity[],
  pendingCount: number = 3
): RecommendationSection | null {
  const continueOpps = allOpportunities
    .filter(o => o.status === 'pending' || o.status === 'cooldown')
    .slice(0, pendingCount);

  if (continueOpps.length === 0) return null;

  return {
    id: 'continue',
    title: 'Continue Where You Left Off',
    subtitle: 'Pick up where you started',
    layout: 'row',
    source: 'continue',
    opportunities: continueOpps,
    showProviderBadge: true,
  };
}

/**
 * Generate "Almost Complete" section.
 */
export function generateAlmostCompleteSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const almostComplete = allOpportunities
    .filter(o => o.status === 'pending')
    .slice(0, limit);

  if (almostComplete.length === 0) return null;

  return {
    id: 'almost-complete',
    title: 'Awaiting Review',
    subtitle: 'Rewards pending approval',
    layout: 'grid',
    source: 'almost_complete',
    opportunities: almostComplete,
    showProviderBadge: true,
  };
}

/**
 * Generate "Recommended For You" section.
 */
export function generateRecommendedSection(
  allOpportunities: MarketplaceOpportunity[],
  profile: UserProfile,
  limit: number = 8
): RecommendationSection {
  const recommended = getPersonalizedOpportunities(allOpportunities, profile, limit);

  return {
    id: 'recommended-for-you',
    title: 'Recommended For You',
    subtitle: `Based on your level ${profile.level} profile`,
    layout: 'slider',
    source: 'personalized',
    opportunities: recommended,
    personalizedFor: 'user',
    showProviderBadge: true,
  };
}

/**
 * Generate category-specific sections.
 */
export function generateCategorySections(
  allOpportunities: MarketplaceOpportunity[],
  categories: OpportunityCategory[],
  limitPerCategory: number = 6
): RecommendationSection[] {
  return categories.map(category => {
    const opps = allOpportunities
      .filter(o => o.status === 'available' && o.metadata.category === category)
      .sort((a, b) => b.reward.points - a.reward.points)
      .slice(0, limitPerCategory);

    return {
      id: `category-${category}`,
      title: formatCategoryTitle(category),
      subtitle: getCategorySubtitle(category),
      layout: (opps.length > 3 ? 'slider' : 'grid') as SectionLayout,
      source: 'category' as SectionSource,
      category,
      opportunities: opps,
      viewAllUrl: `/marketplace?category=${category}`,
      maxItems: limitPerCategory,
    };
  }).filter(s => s.opportunities.length > 0);
}

/**
 * Generate featured hero section.
 */
export function generateFeaturedSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 4
): RecommendationSection | null {
  const featured = allOpportunities
    .filter(o => 
      o.status === 'available' && 
      (o.metadata.category === 'featured' || o.engagement.trending)
    )
    .slice(0, limit);

  if (featured.length === 0) return null;

  return {
    id: 'featured',
    title: 'Featured',
    subtitle: 'Hand-picked opportunities',
    layout: 'hero',
    source: 'featured',
    opportunities: featured,
  };
}

/**
 * Generate "Highest Paying" section.
 */
export function generateHighestPayingSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 8
): RecommendationSection {
  const highest = [...allOpportunities]
    .filter(o => o.status === 'available')
    .sort((a, b) => b.reward.points - a.reward.points)
    .slice(0, limit);

  return {
    id: 'highest-paying',
    title: 'Highest Paying',
    subtitle: 'Maximize your earnings',
    layout: 'slider',
    source: 'highest_paying',
    opportunities: highest,
    viewAllUrl: '/marketplace?sort=reward',
  };
}

/**
 * Generate "Quick Wins" section (fastest rewards).
 */
export function generateQuickWinsSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 8
): RecommendationSection {
  const quick = [...allOpportunities]
    .filter(o => o.status === 'available')
    .sort((a, b) => {
      const timeA = parseTimeToMinutes(a.metadata.estimatedTime);
      const timeB = parseTimeToMinutes(b.metadata.estimatedTime);
      return timeA - timeB;
    })
    .slice(0, limit);

  return {
    id: 'quick-wins',
    title: 'Quick Wins',
    subtitle: 'Earn points in minutes',
    layout: 'slider',
    source: 'fastest',
    opportunities: quick,
  };
}

/**
 * Generate "Trending Games" section.
 */
export function generateTrendingGamesSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const games = allOpportunities
    .filter(o => o.status === 'available' && o.metadata.category === 'games')
    .sort((a, b) => {
      if (a.engagement.trending && !b.engagement.trending) return -1;
      if (b.engagement.trending && !a.engagement.trending) return 1;
      return b.engagement.totalCompletions - a.engagement.totalCompletions;
    })
    .slice(0, limit);

  if (games.length === 0) return null;

  return {
    id: 'trending-games',
    title: 'Trending Games',
    subtitle: 'Most popular right now',
    layout: games.length > 3 ? 'slider' : 'grid',
    source: 'trending',
    opportunities: games,
  };
}

/**
 * Generate "Expiring Soon" section.
 */
export function generateExpiringSoonSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const expiring = allOpportunities
    .filter(o => o.status === 'available' && o.engagement.expiringSoon)
    .slice(0, limit);

  if (expiring.length === 0) return null;

  return {
    id: 'expiring-soon',
    title: 'Ending Soon',
    subtitle: 'Limited time opportunities',
    layout: 'slider',
    source: 'expiring_soon',
    opportunities: expiring,
  };
}

/**
 * Generate "Daily Opportunities" section.
 */
export function generateDailySection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 8
): RecommendationSection | null {
  const daily = allOpportunities
    .filter(o => o.status === 'available' && (o.metadata.category === 'daily' || o.id.includes('daily')))
    .slice(0, limit);

  if (daily.length === 0) return null;

  return {
    id: 'daily',
    title: 'Daily Opportunities',
    subtitle: 'Earn consistently every 24 hours',
    layout: 'slider',
    source: 'daily',
    category: 'daily',
    opportunities: daily,
  };
}

/**
 * Generate "Limited-Time Campaigns" section.
 */
export function generateLimitedCampaignsSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const campaigns = allOpportunities
    .filter(o => o.status === 'available' && (o.metadata.category === 'seasonal' || o.engagement.expiringSoon || o.eligibility?.maxCampaignClaims))
    .slice(0, limit);

  if (campaigns.length === 0) return null;

  return {
    id: 'limited-campaigns',
    title: 'Limited-Time Campaigns',
    subtitle: 'Exclusive rewards before capacity runs out',
    layout: 'hero',
    source: 'limited_campaigns',
    category: 'seasonal',
    opportunities: campaigns,
  };
}

/**
 * Generate "New Opportunities" section.
 */
export function generateNewOpportunitiesSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 8
): RecommendationSection | null {
  const newOpps = allOpportunities
    .filter(o => o.status === 'available' && o.engagement.isNew)
    .slice(0, limit);

  if (newOpps.length === 0) return null;

  return {
    id: 'new-today',
    title: 'New Opportunities',
    subtitle: 'Freshly added earning tasks',
    layout: 'grid',
    source: 'new_today',
    opportunities: newOpps,
  };
}

/**
 * Generate "Trending Opportunities" section.
 */
export function generateTrendingSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 8
): RecommendationSection | null {
  const trending = allOpportunities
    .filter(o => o.status === 'available' && o.engagement.trending)
    .slice(0, limit);

  if (trending.length === 0) return null;

  return {
    id: 'trending',
    title: 'Trending Opportunities',
    subtitle: 'Highest activity right now',
    layout: 'slider',
    source: 'trending',
    opportunities: trending,
  };
}

/**
 * Generate "Referral Opportunities" section.
 */
export function generateReferralsSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const refs = allOpportunities
    .filter(o => o.status === 'available' && (o.metadata.category === 'referrals' || o.metadata.verificationType === 'referral'))
    .slice(0, limit);

  if (refs.length === 0) return null;

  return {
    id: 'referrals',
    title: 'Referral Opportunities',
    subtitle: 'Invite friends and scale passive earnings',
    layout: 'grid',
    source: 'referrals',
    category: 'referrals',
    opportunities: refs,
  };
}

/**
 * Generate "Learn & Earn" section.
 */
export function generateLearnSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const learn = allOpportunities
    .filter(o => o.status === 'available' && o.metadata.category === 'learn')
    .slice(0, limit);

  if (learn.length === 0) return null;

  return {
    id: 'learn',
    title: 'Learn & Earn',
    subtitle: 'Expand knowledge and claim instant rewards',
    layout: 'slider',
    source: 'learn',
    category: 'learn',
    opportunities: learn,
  };
}

/**
 * Generate "Offerwalls" section.
 */
export function generateOfferwallsSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 8
): RecommendationSection | null {
  const offerwalls = allOpportunities
    .filter(o => o.source === 'provider' || o.metadata.verificationType === 'offerwall')
    .slice(0, limit);

  if (offerwalls.length === 0) return null;

  return {
    id: 'offerwall-providers',
    title: 'Partner Offerwalls',
    subtitle: 'Discover high-volume provider tasks',
    layout: 'grid',
    source: 'offerwall_providers',
    opportunities: offerwalls,
  };
}

/**
 * Generate "Predictions" section.
 */
export function generatePredictionsSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const pred = allOpportunities
    .filter(o => o.status === 'available' && (o.metadata.category === 'predictions' || o.metadata.verificationType === 'prediction'))
    .slice(0, limit);

  if (pred.length === 0) return null;

  return {
    id: 'predictions',
    title: 'Predictions',
    subtitle: 'Forecast market outcomes and claim prizes',
    layout: 'slider',
    source: 'predictions',
    category: 'predictions',
    opportunities: pred,
  };
}

/**
 * Generate "Community Campaigns" section.
 */
export function generateCommunitySection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const community = allOpportunities
    .filter(o => o.status === 'available' && o.metadata.category === 'community')
    .slice(0, limit);

  if (community.length === 0) return null;

  return {
    id: 'community',
    title: 'Community Campaigns',
    subtitle: 'Engage with the ecosystem',
    layout: 'grid',
    source: 'community',
    category: 'community',
    opportunities: community,
  };
}

// ─── Complete Section Assembly ─────────────────────────────────────────────────

/**
 * Generate all personalized dynamic sections for a user, respecting Admin controls.
 */
export function generateAllSections(
  allOpportunities: MarketplaceOpportunity[],
  userData: UserData | null,
  activities: Activity[],
  history: TaskHistory[],
  adminConfig?: MarketplaceAdminConfig
): RecommendationSection[] {
  // 1. Filter opportunities based on Admin hidden list & disabled categories
  const hiddenIds = new Set(adminConfig?.hiddenCampaignIds || []);
  const disabledCats = new Set(adminConfig?.disabledCategories || []);
  const featuredIds = new Set(adminConfig?.featuredCampaignIds || []);
  const priorityMap = adminConfig?.prioritizedCampaigns || {};

  let activeOpportunities = allOpportunities.filter(o => {
    if (hiddenIds.has(o.id)) return false;
    if (disabledCats.has(o.metadata.category)) return false;
    return true;
  });

  // 2. Apply admin priority boosts & featured markings
  if (featuredIds.size > 0 || Object.keys(priorityMap).length > 0) {
    activeOpportunities = activeOpportunities.map(o => {
      const bonusPriority = priorityMap[o.id] || 0;
      const isFeatured = featuredIds.has(o.id);
      if (bonusPriority === 0 && !isFeatured) return o;

      const currentScore = o.computedEligibility?.priorityScore || 50;
      return {
        ...o,
        engagement: {
          ...o.engagement,
          trending: isFeatured || o.engagement.trending,
        },
        computedEligibility: o.computedEligibility
          ? {
              ...o.computedEligibility,
              priorityScore: currentScore + bonusPriority + (isFeatured ? 50 : 0),
            }
          : undefined,
      };
    });
  }

  const profile = buildUserProfile(userData, activities, history);

  // 3. Section Map of Generators
  const sectionMap: Record<string, () => RecommendationSection | null> = {
    featured: () => generateFeaturedSection(activeOpportunities, 4),
    personalized: () => generateRecommendedSection(activeOpportunities, profile, 8),
    continue: () => generateContinueSection(activeOpportunities, 3),
    daily: () => generateDailySection(activeOpportunities, 8),
    seasonal: () => generateLimitedCampaignsSection(activeOpportunities, 6),
    limited_campaigns: () => generateLimitedCampaignsSection(activeOpportunities, 6),
    new_today: () => generateNewOpportunitiesSection(activeOpportunities, 8),
    trending: () => generateTrendingSection(activeOpportunities, 8),
    highest_paying: () => generateHighestPayingSection(activeOpportunities, 8),
    fastest: () => generateQuickWinsSection(activeOpportunities, 8),
    expiring_soon: () => generateExpiringSoonSection(activeOpportunities, 6),
    referrals: () => generateReferralsSection(activeOpportunities, 6),
    learn: () => generateLearnSection(activeOpportunities, 6),
    offerwall_providers: () => generateOfferwallsSection(activeOpportunities, 8),
    predictions: () => generatePredictionsSection(activeOpportunities, 6),
    community: () => generateCommunitySection(activeOpportunities, 6),
  };

  // 4. Determine Section Order (Use admin sectionOrder if provided, else standard order)
  const defaultOrder = [
    'featured',
    'personalized',
    'continue',
    'daily',
    'seasonal',
    'new_today',
    'trending',
    'highest_paying',
    'fastest',
    'expiring_soon',
    'referrals',
    'learn',
    'offerwall_providers',
    'predictions',
    'community',
  ];

  const order = adminConfig?.sectionOrder && adminConfig.sectionOrder.length > 0
    ? adminConfig.sectionOrder
    : defaultOrder;

  const sections: RecommendationSection[] = [];
  const processedKeys = new Set<string>();

  for (const key of order) {
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    const generator = sectionMap[key];
    if (generator) {
      const section = generator();
      if (section && section.opportunities.length > 0) {
        // Apply admin section title/subtitle overrides if specified
        if (adminConfig?.sectionTitles && adminConfig.sectionTitles[key]) {
          const override = adminConfig.sectionTitles[key];
          if (override.title) section.title = override.title;
          if (override.subtitle) section.subtitle = override.subtitle;
        }
        sections.push(section);
      }
    }
  }

  return sections;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatCategoryTitle(category: OpportunityCategory): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategorySubtitle(category: OpportunityCategory): string {
  const subtitles: Record<OpportunityCategory, string> = {
    featured: 'Discover top opportunities',
    daily: 'Earn every day',
    surveys: 'Share your opinion',
    games: 'Play and earn',
    apps: 'Download and try',
    shopping: 'Shop and save',
    cashback: 'Get money back',
    videos: 'Watch and earn',
    learn: 'Learn and earn',
    community: 'Join the community',
    referrals: 'Invite friends',
    predictions: 'Predict and win',
    seasonal: 'Limited time offers',
    sponsored: 'Partner opportunities',
  };
  return subtitles[category] || `Browse ${formatCategoryTitle(category)}`;
}

function parseTimeToMinutes(time: string): number {
  if (time.includes('Daily')) return 1;
  if (time.includes('Ongoing')) return 999;
  
  const match = time.match(/(\d+)/);
  if (!match) return 15;
  
  const num = parseInt(match[1], 10);
  if (time.includes('hour') || time.includes('h')) return num * 60;
  return num;
}

function mapTaskCategoryToMarketplace(category: string): OpportunityCategory {
  switch (category) {
    case 'SURVEY':
      return 'surveys';
    case 'PREDICTION':
      return 'predictions';
    case 'REFERRAL':
      return 'referrals';
    case 'SOCIAL':
    case 'COMMUNITY':
      return 'community';
    case 'EDUCATION':
      return 'learn';
    case 'EVENTS':
      return 'seasonal';
    case 'SPONSORED':
      return 'sponsored';
    case 'DAILY':
      return 'daily';
    case 'CUSTOM':
      return 'featured';
    default:
      return 'featured';
  }
}
