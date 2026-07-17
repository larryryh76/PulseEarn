/**
 * OpportunityNormalizer
 * 
 * Transforms internal tasks and external provider offers into the unified
 * MarketplaceOpportunity format. This is the bridge between PulseEarn's
 * existing data models and the new unified marketplace experience.
 */

import {
  MarketplaceOpportunity,
  OpportunityCategory,
  OpportunityDifficulty,
  OpportunityStatus,
  VerificationType,
  LaunchMode,
} from '../../types/marketplace';
import { Task, UserTask, Campaign, TaskCategory, TaskType, SocialPlatform } from '../../types';

// ─── Internal Task → Opportunity ───────────────────────────────────────────────

interface NormalizedTaskInput {
  task: Task;
  campaign?: Campaign;
  userTask?: UserTask;
}

export function normalizeTask(input: NormalizedTaskInput): MarketplaceOpportunity {
  const { task, userTask } = input;

  // Determine status based on user task state
  const status = getTaskStatus(task, userTask);
  const nextAvailableAt = getNextAvailableTime(task, userTask);

  // Map task category to marketplace category
  const category = mapTaskCategoryToMarketplace(task.category, task.type, task.platform);

  // Build reward object
  const reward = {
    points: task.rewardAmount + (task.bonusReward || 0),
    xp: task.xpReward,
  };

  // Determine launch mode
  const launchMode = determineLaunchMode(task);

  return {
    id: task.id,
    source: 'internal',
    providerId: undefined,
    providerName: undefined,

    title: task.title,
    description: task.description,
    instructions: task.instructions,
    requirements: task.proofRequirements,

    reward,

    metadata: {
      category,
      difficulty: estimateDifficulty(task.rewardAmount, task.xpReward),
      estimatedTime: task.estimatedTime || estimateTime(task.type),
      verificationType: mapVerificationType(task.verificationType),
      launchMode,
      artwork: task.campaignArtwork || undefined,
      thumbnail: task.campaignArtwork || undefined,
      tags: task.tags || [],
      regionRestrictions: task.regionRestrictions?.length ? task.regionRestrictions : undefined,
      minLevel: task.minLevel > 1 ? task.minLevel : undefined,
    },

    engagement: {
      completionRate: task.conversionRate || 0,
      averageReward: task.rewardAmount,
      totalCompletions: task.totalClaims || 0,
      trending: false,
      isNew: isNewTask(task.createdAt),
      expiringSoon: isExpiringSoon(task.endDate),
    },

    status,
    nextAvailableAt,

    action: {
      url: task.actionUrl || undefined,
      actionType: getActionType(task, launchMode),
      trackingId: task.id,
    },

    createdAt: task.createdAt?.toDate(),
    updatedAt: task.updatedAt?.toDate(),
    expiresAt: task.endDate?.toDate() || task.expirationDate?.toDate(),
  };
}

// ─── Provider Offer → Opportunity ──────────────────────────────────────────────

interface NormalizedProviderOfferInput {
  offerId: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string;
  rewardAmount: number;
  xpReward?: number;
  estimatedTime?: string;
  thumbnail?: string;
  category?: string;
  status?: OpportunityStatus;
  actionUrl?: string;
  offerName?: string;
}

export function normalizeProviderOffer(
  input: NormalizedProviderOfferInput
): MarketplaceOpportunity {
  const {
    offerId,
    providerId,
    providerName,
    title,
    description,
    rewardAmount,
    xpReward = 10,
    estimatedTime,
    thumbnail,
    category,
    status = 'available',
    actionUrl,
    offerName,
  } = input;

  // Map provider category to marketplace category
  const marketplaceCategory = mapProviderCategoryToMarketplace(category || '');

  return {
    id: `provider_${providerId}_${offerId}`,
    source: 'provider',
    providerId,
    providerName,

    title: title || offerName || 'Offer',
    description: description || '',
    instructions: '',
    requirements: '',

    reward: {
      points: rewardAmount,
      xp: xpReward,
    },

    metadata: {
      category: marketplaceCategory,
      difficulty: estimateDifficulty(rewardAmount, xpReward),
      estimatedTime: estimatedTime || estimateTimeFromReward(rewardAmount),
      verificationType: 'automated',
      launchMode: actionUrl ? 'redirect' : 'inline',
      artwork: thumbnail,
      thumbnail,
      tags: [],
    },

    engagement: {
      completionRate: 0,
      averageReward: rewardAmount,
      totalCompletions: 0,
      trending: false,
      isNew: false,
    },

    status,

    action: {
      url: actionUrl,
      actionType: actionUrl ? 'url' : 'claim',
      trackingId: offerId,
    },
  };
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

function getTaskStatus(task: Task, userTask?: UserTask): OpportunityStatus {
  if (!userTask) return 'available';

  switch (userTask.status) {
    case 'completed':
      if (task.cooldownPeriod === 0) return 'completed';
      return 'available'; // Cooldown elapsed
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'on_cooldown':
      return 'cooldown';
    default:
      return 'available';
  }
}

function getNextAvailableTime(task: Task, userTask?: UserTask): Date | undefined {
  if (!userTask || userTask.status !== 'on_cooldown') return undefined;
  
  const lastCompleted = userTask.lastCompleted?.toDate();
  if (!lastCompleted) return undefined;

  const cooldownMs = task.cooldownPeriod * 60 * 60 * 1000;
  return new Date(lastCompleted.getTime() + cooldownMs);
}

// ─── Category Mapping ─────────────────────────────────────────────────────────

function mapTaskCategoryToMarketplace(
  category: TaskCategory,
  type: TaskType,
  platform: SocialPlatform
): OpportunityCategory {
  // Map by category first
  switch (category) {
    case 'SOCIAL':
      switch (platform) {
        case 'TWITTER': return 'community';
        case 'TELEGRAM': return 'community';
        case 'DISCORD': return 'community';
        case 'YOUTUBE': return 'videos';
        case 'TIKTOK': return 'videos';
        default: return 'community';
      }
    case 'PREDICTION':
      return 'predictions';
    case 'REFERRAL':
      return 'referrals';
    case 'EDUCATION':
      return 'learn';
    case 'EVENTS':
      return 'seasonal';
    case 'SPONSORED':
      return 'sponsored';
    case 'CUSTOM':
      return 'featured';
    default:
      break;
  }

  // Map by type
  switch (type) {
    case 'daily':
    case 'streak':
      return 'daily';
    case 'once':
      return 'featured';
    case 'timer':
      return 'videos';
    case 'social':
      return 'community';
    case 'referral':
      return 'referrals';
    case 'prediction':
      return 'predictions';
    case 'engagement':
      return 'community';
    case 'education':
      return 'learn';
    case 'event':
      return 'seasonal';
    case 'telegram':
    case 'twitter':
    case 'tiktok':
    case 'youtube':
    case 'discord':
      return 'community';
    case 'website':
      return 'apps';
    case 'app_install':
      return 'apps';
    case 'premium':
      return 'featured';
    case 'chain':
      return 'seasonal';
    default:
      return 'featured';
  }
}

function mapProviderCategoryToMarketplace(providerCategory: string): OpportunityCategory {
  const cat = providerCategory.toLowerCase();
  
  if (cat.includes('survey') || cat.includes('poll')) return 'surveys';
  if (cat.includes('game') || cat.includes('play')) return 'games';
  if (cat.includes('app') || cat.includes('install') || cat.includes('download')) return 'apps';
  if (cat.includes('shop') || cat.includes('purchase')) return 'shopping';
  if (cat.includes('cash') || cat.includes('cashback')) return 'cashback';
  if (cat.includes('video') || cat.includes('watch')) return 'videos';
  if (cat.includes('learn') || cat.includes('quiz')) return 'learn';
  if (cat.includes('refer') || cat.includes('invite')) return 'referrals';
  if (cat.includes('predict') || cat.includes('bet')) return 'predictions';
  
  return 'featured';
}

// ─── Difficulty Estimation ────────────────────────────────────────────────────

function estimateDifficulty(points: number, xp: number): OpportunityDifficulty {
  const total = points + xp * 2;
  
  if (total < 100) return 'easy';
  if (total < 500) return 'medium';
  if (total < 2000) return 'hard';
  return 'elite';
}

function estimateTime(type: TaskType): string {
  switch (type) {
    case 'daily':
    case 'streak':
      return 'Daily';
    case 'timer':
      return '5-10 min';
    case 'referral':
      return 'Ongoing';
    case 'prediction':
      return '4-24 hours';
    case 'app_install':
      return '5 min';
    default:
      return '10 min';
  }
}

function estimateTimeFromReward(amount: number): string {
  if (amount < 50) return '1-2 min';
  if (amount < 200) return '5 min';
  if (amount < 500) return '10 min';
  if (amount < 1000) return '15-30 min';
  return '30+ min';
}

// ─── Verification Type Mapping ────────────────────────────────────────────────

function mapVerificationType(type: string): VerificationType {
  switch (type) {
    case 'automated': return 'automated';
    case 'manual': return 'manual';
    case 'proof': return 'proof';
    case 'timer': return 'timer';
    case 'activity': return 'activity';
    case 'link': return 'link';
    case 'api': return 'api';
    case 'referral': return 'referral';
    case 'prediction': return 'prediction';
    default:
      return 'automated';
  }
}

// ─── Launch Mode ──────────────────────────────────────────────────────────────

function determineLaunchMode(task: Task): LaunchMode {
  if (task.actionUrl) {
    // If it's a deep link or app install, use redirect
    if (task.type === 'app_install' || task.type === 'website') {
      return 'redirect';
    }
    return 'redirect';
  }
  return 'inline';
}

function getActionType(task: Task, launchMode: LaunchMode) {
  if (launchMode === 'redirect' && task.actionUrl) {
    return 'url';
  }
  return 'claim';
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function isNewTask(createdAt: any): boolean {
  if (!createdAt) return false;
  const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return created > threeDaysAgo;
}

function isExpiringSoon(endDate: any): boolean {
  if (!endDate) return false;
  const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return end < threeDaysFromNow && end > new Date();
}

// ─── Batch Normalization ─────────────────────────────────────────────────────

export function normalizeTaskBatch(
  tasks: Task[],
  campaigns: Campaign[],
  userTasks: Record<string, UserTask>
): MarketplaceOpportunity[] {
  const campaignMap = new Map(campaigns.map(c => [c.id, c]));

  return tasks
    .filter(t => t.active)
    .map(task => {
      const campaign = task.campaignId ? campaignMap.get(task.campaignId) : undefined;
      const userTask = userTasks[task.id];

      return normalizeTask({ task, campaign, userTask });
    });
}

// ─── Merge Internal + Provider ─────────────────────────────────────────────────

export function mergeOpportunities(
  internal: MarketplaceOpportunity[],
  external: MarketplaceOpportunity[]
): MarketplaceOpportunity[] {
  // Sort by reward (highest first), then by engagement
  const all = [...internal, ...external];
  
  return all.sort((a, b) => {
    // Featured always first
    if (a.metadata.category === 'featured' && b.metadata.category !== 'featured') return -1;
    if (b.metadata.category === 'featured' && a.metadata.category !== 'featured') return 1;

    // Then by reward
    const rewardDiff = b.reward.points - a.reward.points;
    if (rewardDiff !== 0) return rewardDiff;

    // Then by trending
    if (a.engagement.trending && !b.engagement.trending) return -1;
    if (b.engagement.trending && !a.engagement.trending) return 1;

    // Then by new
    if (a.engagement.isNew && !b.engagement.isNew) return -1;
    if (b.engagement.isNew && !a.engagement.isNew) return 1;

    return 0;
  });
}
