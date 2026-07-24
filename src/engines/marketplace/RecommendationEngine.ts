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
 * Generate "New Surveys" section.
 */
export function generateNewSurveysSection(
  allOpportunities: MarketplaceOpportunity[],
  limit: number = 6
): RecommendationSection | null {
  const surveys = allOpportunities
    .filter(o => o.status === 'available' && o.metadata.category === 'surveys' && o.engagement.isNew)
    .slice(0, limit);

  if (surveys.length === 0) return null;

  return {
    id: 'new-surveys',
    title: 'New Surveys',
    subtitle: 'Fresh opportunities added',
    layout: surveys.length > 3 ? 'slider' : 'grid',
    source: 'new_today',
    opportunities: surveys,
  };
}

// ─── Complete Section Assembly ─────────────────────────────────────────────────

/**
 * Generate all personalized sections for a user.
 */
export function generateAllSections(
  allOpportunities: MarketplaceOpportunity[],
  userData: UserData | null,
  activities: Activity[],
  history: TaskHistory[]
): RecommendationSection[] {
  const profile = buildUserProfile(userData, activities, history);
  const sections: RecommendationSection[] = [];

  // 1. Featured Hero
  const featured = generateFeaturedSection(allOpportunities, 4);
  if (featured) sections.push(featured);

  // 2. Continue Where You Left Off (if applicable)
  const continueSection = generateContinueSection(allOpportunities, 3);
  if (continueSection) sections.push(continueSection);

  // 3. Almost Complete (if applicable)
  const almostComplete = generateAlmostCompleteSection(allOpportunities, 6);
  if (almostComplete) sections.push(almostComplete);

  // 4. Recommended For You
  const recommended = generateRecommendedSection(allOpportunities, profile, 8);
  sections.push(recommended);

  // 5. Highest Paying
  sections.push(generateHighestPayingSection(allOpportunities, 8));

  // 6. Quick Wins
  sections.push(generateQuickWinsSection(allOpportunities, 8));

  // 7. Trending Games (if user engages with games)
  const gamesCount = profile.completedCategories.get('games') || 0;
  if (gamesCount > 0) {
    const trendingGames = generateTrendingGamesSection(allOpportunities, 6);
    if (trendingGames) sections.push(trendingGames);
  }

  // 8. Category Sections
  const popularCategories: OpportunityCategory[] = ['daily', 'surveys', 'apps'];
  const categorySections = generateCategorySections(allOpportunities, popularCategories, 6);
  sections.push(...categorySections);

  // 9. Expiring Soon (if any)
  const expiringSoon = generateExpiringSoonSection(allOpportunities, 6);
  if (expiringSoon) sections.push(expiringSoon);

  // 10. New Surveys (if any)
  const newSurveys = generateNewSurveysSection(allOpportunities, 6);
  if (newSurveys) sections.push(newSurveys);

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
