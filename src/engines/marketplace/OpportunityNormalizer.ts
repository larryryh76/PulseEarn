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
import { evaluateTaskStatus } from '../../utils';

// ─── Internal Task → Opportunity ───────────────────────────────────────────────

interface NormalizedTaskInput {
  task: Task;
  campaign?: Campaign;
  userTask?: UserTask;
}

export function normalizeTask(input: NormalizedTaskInput): MarketplaceOpportunity {
  const { task, campaign, userTask } = input;

  // Determine status based on user task state
  const status = getTaskStatus(task, userTask);
  const nextAvailableAt = getNextAvailableTime(task, userTask);

  // Map task category to marketplace category
  const category = mapTaskCategoryToMarketplace(task.category || 'CUSTOM', task.type, task.platform);

  // Build reward object
  const reward = {
    points: task.rewardAmount + (task.bonusReward || 0),
    xp: task.xpReward,
  };

  // Determine launch mode
  const launchMode = determineLaunchMode(task);

  const providerId = campaign?.providerId || (campaign?.provider !== 'internal' ? campaign?.provider : undefined);

  return {
    id: task.id,
    source: 'internal',
    providerId,
    providerName: campaign?.sponsorName || (providerId ? providerId.toUpperCase() : undefined),

    title: task.title,
    description: task.description,
    instructions: task.instructions || task.description,
    requirements: task.proofRequirements || task.proofLabel || task.proofPlaceholder || undefined,

    reward,

    metadata: {
      category,
      difficulty: sanitizeDifficulty(task.difficulty || campaign?.difficulty, estimateDifficulty(task.rewardAmount, task.xpReward)),
      estimatedTime: task.estimatedTime || campaign?.estimatedCompletion || estimateTime(task.type),
      verificationType: mapVerificationType(task.verificationType),
      launchMode,
      artwork: task.campaignArtwork || campaign?.bannerUrl || campaign?.thumbnailUrl || undefined,
      thumbnail: task.campaignArtwork || campaign?.thumbnailUrl || campaign?.bannerUrl || undefined,
      tags: task.tags?.length ? task.tags : (campaign?.tags || []),
      regionRestrictions: task.regionRestrictions?.length ? task.regionRestrictions : undefined,
      minLevel: (task.minLevel && task.minLevel > 1) ? task.minLevel : undefined,
    },

    eligibility: {
      minLevel: (task.minLevel && task.minLevel > 1) ? task.minLevel : 1,
      minXp: (task as any).minXp ?? 0,
      minAccountAgeDays: (task as any).minAccountAgeDays ?? 0,
      minTasksCompleted: (task as any).minTasksCompleted ?? 0,
      minReferrals: (task as any).minReferrals ?? 0,
      regionRestrictions: task.regionRestrictions?.length ? task.regionRestrictions : undefined,
      requiresEmailVerification: Boolean((task as any).requiresEmailVerification),
      cooldownPeriodHours: task.cooldownPeriod ?? (task as any).cooldownHours ?? 0,
      maxUserCompletions: (task as any).perUserLimit ?? (task as any).maxClaimsPerUser ?? (task as any).maxCompletions ?? ((task as any).isRepeatable ? undefined : 1),
      maxCampaignClaims: (campaign as any)?.maxCompletions ?? (campaign as any)?.maxClaimsPerUser ?? task.maxClaims,
      currentCampaignClaims: campaign?.analytics?.completions ?? task.totalClaims ?? 0,
      requiredTrustLevel: (task as any).minTrustLevel || 'LOW',
    },

    engagement: {
      completionRate: task.conversionRate ?? campaign?.analytics?.completionRate ?? 0,
      averageReward: task.rewardAmount,
      totalCompletions: task.totalClaims ?? task.completionCount ?? campaign?.analytics?.completions ?? 0,
      trending: Boolean(campaign?.featured),
      isNew: isNewTask(task.createdAt || campaign?.createdAt),
      expiringSoon: isExpiringSoon(task.endDate || campaign?.endDate),
    },

    status,
    nextAvailableAt,

    action: {
      url: task.actionUrl || task.url || campaign?.sponsorWebsite || undefined,
      actionType: getActionType(task, launchMode),
      trackingId: task.id,
    },

    createdAt: parseTimestamp(task.createdAt),
    updatedAt: parseTimestamp(task.updatedAt),
    expiresAt: parseTimestamp(task.endDate) || parseTimestamp(task.expirationDate),
  };
}

export function normalizeCampaign(campaign: Campaign, userTask?: UserTask): MarketplaceOpportunity {
  const isAvailable = campaign.active && (campaign.status === 'ACTIVE' || campaign.status === 'PUBLISHED');
  const status: OpportunityStatus = !isAvailable ? 'locked' : (userTask?.status === 'completed' ? 'completed' : 'available');

  const category = mapTaskCategoryToMarketplace(campaign.category, campaign.type, 'CUSTOM' as SocialPlatform);
  const reward = {
    points: campaign.pointsReward || (campaign.totalPrizePool > 0 ? Math.floor(campaign.totalPrizePool / Math.max(1, campaign.participantsCount || 1)) : 100),
    xp: campaign.xpReward || 50,
  };

  const providerId = campaign.providerId || (campaign.provider !== 'internal' ? campaign.provider : undefined);

  return {
    id: campaign.id,
    source: 'internal',
    providerId,
    providerName: campaign.sponsorName || (providerId ? providerId.toUpperCase() : 'PulseEarn'),

    title: campaign.name,
    description: campaign.description,
    instructions: campaign.description,
    requirements: undefined,

    reward,

    metadata: {
      category,
      difficulty: sanitizeDifficulty(campaign.difficulty, 'medium'),
      estimatedTime: campaign.estimatedCompletion || '10 min',
      verificationType: 'automated',
      launchMode: campaign.sponsorWebsite ? 'redirect' : 'inline',
      artwork: campaign.bannerUrl || campaign.thumbnailUrl || campaign.artworkUrl,
      thumbnail: campaign.thumbnailUrl || campaign.bannerUrl || campaign.artworkUrl,
      tags: campaign.tags || [],
    },

    engagement: {
      completionRate: campaign.analytics?.completionRate || 0,
      averageReward: reward.points,
      totalCompletions: campaign.participantsCount || 0,
      trending: Boolean(campaign.featured),
      isNew: isNewTask(campaign.createdAt),
      expiringSoon: isExpiringSoon(campaign.endDate),
    },

    status,

    action: {
      url: campaign.sponsorWebsite || undefined,
      actionType: campaign.sponsorWebsite ? 'url' : 'claim',
      trackingId: campaign.id,
    },

    createdAt: parseTimestamp(campaign.createdAt),
    updatedAt: parseTimestamp(campaign.updatedAt),
    expiresAt: parseTimestamp(campaign.endDate),
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

  const points = rewardAmount >= 1000001 ? 100000 : rewardAmount;
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
      points,
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

/**
 * Generate rich, native, individual MarketplaceOpportunities for Type B Embedded Inventory Providers.
 * Users can browse these offers natively inside PulseEarn.
 */
export function generateEmbeddedOffersForProvider(p: {
  id: string;
  name: string;
  launchUrl: string;
  logo?: string;
  logoUrl?: string;
}): MarketplaceOpportunity[] {
  const providerId = p.id.toLowerCase();
  const providerName = p.name;
  const launchUrl = p.launchUrl;
  const logo = p.logo || p.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${providerId}`;

  // Curated list of high-quality native offers for each Type B provider
  const templates: Record<string, Array<{
    title: string;
    description: string;
    instructions: string;
    points: number;
    xp: number;
    estimatedTime: string;
    difficulty: OpportunityDifficulty;
    category: OpportunityCategory;
    offerType: string;
    sponsored?: boolean;
    isNew?: boolean;
    featured?: boolean;
    limitedTime?: boolean;
    devices: string[];
    countries?: string[];
    artwork?: string;
  }>> = {
    cpxresearch: [
      {
        title: "High Yield Consumer Electronics Survey",
        description: "Share your opinions on recent consumer electronics and smart home trends.",
        instructions: "Complete the 10-minute survey with truthful answers to earn your reward.",
        points: 850,
        xp: 85,
        estimatedTime: "10 min",
        difficulty: "easy",
        category: "surveys",
        offerType: "Survey",
        sponsored: true,
        isNew: true,
        devices: ["All"],
        artwork: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=150&auto=format&fit=crop&q=60"
      },
      {
        title: "Quick Brand Opinion Poll",
        description: "A fast 5-minute brand awareness poll from CPX Research.",
        instructions: "Answer all questions to completion to claim your reward instantly.",
        points: 350,
        xp: 35,
        estimatedTime: "5 min",
        difficulty: "easy",
        category: "surveys",
        offerType: "Survey",
        devices: ["All"],
        artwork: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150&auto=format&fit=crop&q=60"
      },
      {
        title: "Global Market Trends Panel",
        description: "Engage in an in-depth survey about global retail and economic trends.",
        instructions: "Complete all sections. High-quality answers are verified within minutes.",
        points: 1200,
        xp: 120,
        estimatedTime: "15 min",
        difficulty: "medium",
        category: "surveys",
        offerType: "Survey",
        featured: true,
        devices: ["All"],
        artwork: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=60"
      }
    ],
    bitlabs: [
      {
        title: "BitLabs Daily General Survey",
        description: "Take our daily general survey covering lifestyle, travel, and shopping preferences.",
        instructions: "Complete the questionnaire to earn points instantly.",
        points: 600,
        xp: 60,
        estimatedTime: "8 min",
        difficulty: "easy",
        category: "surveys",
        offerType: "Survey",
        isNew: true,
        devices: ["All"],
        artwork: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&auto=format&fit=crop&q=60"
      },
      {
        title: "Cyberpunk Arena: Elite Conquest",
        description: "Download Cyberpunk Arena, complete the tutorial and win 5 PvP battles.",
        instructions: "New players only. Download via BitLabs link, play PvP, and win 5 matches.",
        points: 7500,
        xp: 750,
        estimatedTime: "30+ min",
        difficulty: "hard",
        category: "games",
        offerType: "Game",
        featured: true,
        devices: ["Android"],
        artwork: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=60"
      }
    ],
    adgem: [
      {
        title: "Rise of Kingdoms: Reach City Hall 15",
        description: "Conquer and build your kingdom! Install and upgrade your City Hall to level 15.",
        instructions: "Must be a new install. Complete City Hall level 15 within 21 days of downloading.",
        points: 18500,
        xp: 1850,
        estimatedTime: "30+ min",
        difficulty: "elite",
        category: "games",
        offerType: "Game",
        sponsored: true,
        limitedTime: true,
        devices: ["iOS", "Android"],
        artwork: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=60"
      },
      {
        title: "TikTok: Install & Create Account",
        description: "Join the world's leading short-form video community.",
        instructions: "Download, install the TikTok app, and register a new free account.",
        points: 500,
        xp: 50,
        estimatedTime: "5 min",
        difficulty: "easy",
        category: "apps",
        offerType: "App Install",
        isNew: true,
        devices: ["iOS", "Android"],
        artwork: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60"
      }
    ],
    lootably: [
      {
        title: "Lootably Stream: Watch 3 Premium Ads",
        description: "Watch short video ads on Lootably's video streaming channel.",
        instructions: "Watch 3 complete premium video ads. Points are credited instantly.",
        points: 150,
        xp: 15,
        estimatedTime: "5 min",
        difficulty: "easy",
        category: "videos",
        offerType: "Video",
        devices: ["All"],
        artwork: "https://images.unsplash.com/photo-1611162616305-c6a53ef737eb?w=150&auto=format&fit=crop&q=60"
      },
      {
        title: "Solitaire Grand Harvest: Reach Crop 10",
        description: "Play Solitaire Grand Harvest and harvest up to Crop level 10.",
        instructions: "Must be a first-time user. Play and harvest crop level 10 within 14 days.",
        points: 2800,
        xp: 280,
        estimatedTime: "15-30 min",
        difficulty: "medium",
        category: "games",
        offerType: "Game",
        devices: ["iOS", "Android"],
        artwork: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=150&auto=format&fit=crop&q=60"
      }
    ],
    offertoro: [
      {
        title: "RAID: Shadow Legends - Summon 2 Sacred Shards",
        description: "Immerse yourself in a dark fantasy RPG. Summon 2 Sacred Shards.",
        instructions: "New players only. Download RAID via link, progress, and summon 2 Sacred Shards.",
        points: 32000,
        xp: 3200,
        estimatedTime: "30+ min",
        difficulty: "elite",
        category: "games",
        offerType: "Game",
        sponsored: true,
        featured: true,
        devices: ["Desktop", "iOS", "Android"],
        artwork: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150&auto=format&fit=crop&q=60"
      },
      {
        title: "Crypto.com: Register & Deposit",
        description: "Install Crypto.com App, complete KYC, and make your first fiat deposit.",
        instructions: "Register a free account, complete identity verification, and make any fiat deposit.",
        points: 15000,
        xp: 1500,
        estimatedTime: "15-30 min",
        difficulty: "hard",
        category: "apps",
        offerType: "Finance",
        limitedTime: true,
        devices: ["iOS", "Android"],
        artwork: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=150&auto=format&fit=crop&q=60"
      }
    ]
  };

  const selectedTemplates = templates[providerId] || [
    {
      title: `${providerName} Premium Task`,
      description: `Complete a high-yield survey or app offer inside ${providerName}.`,
      instructions: `Click 'Start Opportunity' to securely connect to ${providerName} and complete this offer.`,
      points: 1200,
      xp: 120,
      estimatedTime: "10 min",
      difficulty: "medium" as OpportunityDifficulty,
      category: "featured" as OpportunityCategory,
      offerType: "Offer",
      devices: ["All"],
      artwork: `https://api.dicebear.com/7.x/shapes/svg?seed=${providerId}_offer`
    }
  ];

  return selectedTemplates.map((t, index) => {
    // Artwork Priority Resolution:
    // 1. Provider campaign artwork (t.artwork)
    // 2. Provider thumbnail (logo)
    // 3. Provider logo with branded background
    // 4. Premium PulseEarn fallback artwork
    const providerLogoBrandedBg = logo;
    const finalArtwork = t.artwork || providerLogoBrandedBg || `https://api.dicebear.com/7.x/identicon/svg?seed=${providerId}`;

    return {
      id: `provider_${providerId}_offer_${index}`,
      source: 'provider' as const,
      providerId: p.id,
      providerName: p.name,
      title: t.title,
      description: t.description,
      instructions: t.instructions,
      reward: {
        points: t.points,
        xp: t.xp,
      },
      metadata: {
        category: t.category,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime,
        verificationType: 'external_callback' as const,
        launchMode: 'redirect' as const,
        artwork: finalArtwork,
        thumbnail: logo,
        tags: ['offerwall', providerId, t.offerType.toLowerCase()],
        // Custom fields for rendering native cards
        offerType: t.offerType,
        devices: t.devices,
        countries: t.countries || ["GLOBAL"],
        sponsored: t.sponsored,
        isNew: t.isNew,
        featured: t.featured,
        limitedTime: t.limitedTime,
      },
      engagement: {
        completionRate: 0,
        averageReward: t.points,
        totalCompletions: 0,
        trending: !!t.featured || !!t.sponsored,
        isNew: !!t.isNew,
        expiringSoon: !!t.limitedTime,
      },
      status: 'available' as const,
      action: {
        url: launchUrl,
        actionType: 'url' as const,
        trackingId: `${providerId}_offer_${index}`
      }
    };
  });
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

function getTaskStatus(task: Task, userTask?: UserTask): OpportunityStatus {
  if (!userTask) return 'available';
  const res = evaluateTaskStatus(task, userTask);
  return res.status as OpportunityStatus;
}

function getNextAvailableTime(task: Task, userTask?: UserTask): Date | undefined {
  if (!userTask) return undefined;
  const res = evaluateTaskStatus(task, userTask);
  return res.nextAvailable;
}

// ─── Category Mapping ─────────────────────────────────────────────────────────

function mapTaskCategoryToMarketplace(
  category: TaskCategory,
  type: TaskType,
  platform?: SocialPlatform
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
  if (!type) return 'automated';
  const norm = type.toLowerCase();
  switch (norm) {
    case 'automated':
    case 'instant': return 'automated';
    case 'manual': return 'manual';
    case 'proof': return 'proof';
    case 'screenshot': return 'screenshot';
    case 'timer': return 'timer';
    case 'activity': return 'activity';
    case 'wallet_activity': return 'wallet_activity';
    case 'link': return 'link';
    case 'api': return 'api';
    case 'referral': return 'referral';
    case 'prediction': return 'prediction';
    case 'external_callback': return 'external_callback';
    case 'offerwall': return 'offerwall';
    case 'admin_approval': return 'admin_approval';
    default:
      return 'automated';
  }
}

// ─── Launch Mode ──────────────────────────────────────────────────────────────

function determineLaunchMode(task: Task): LaunchMode {
  if (task.actionUrl || task.url) {
    // If it's a deep link or app install, use redirect
    if (task.type === 'app_install' || task.type === 'website') {
      return 'redirect';
    }
    return 'redirect';
  }
  return 'inline';
}

function getActionType(task: Task, launchMode: LaunchMode) {
  if (launchMode === 'redirect' && (task.actionUrl || task.url)) {
    return 'url';
  }
  return 'claim';
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

const ALLOWED_DIFFICULTIES: OpportunityDifficulty[] = ['easy', 'medium', 'hard', 'elite'];

function sanitizeDifficulty(val: any, fallback: OpportunityDifficulty = 'medium'): OpportunityDifficulty {
  if (typeof val === 'string' && (ALLOWED_DIFFICULTIES as string[]).includes(val.toLowerCase())) {
    return val.toLowerCase() as OpportunityDifficulty;
  }
  return fallback;
}

function parseTimestamp(ts: any): Date | undefined {
  if (!ts && ts !== 0) return undefined;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'string') {
    const parsed = new Date(ts);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return undefined;
}

function isNewTask(createdAt: any): boolean {
  const created = parseTimestamp(createdAt);
  if (!created) return false;
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return created > threeDaysAgo;
}

function isExpiringSoon(endDate: any): boolean {
  const end = parseTimestamp(endDate);
  if (!end) return false;
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

  const taskOpportunities = tasks
    .filter(t => t.active)
    .map(task => {
      const campaign = task.campaignId ? campaignMap.get(task.campaignId) : undefined;
      const userTask = userTasks[task.id];

      return normalizeTask({ task, campaign, userTask });
    });

  // Include standalone active campaigns that do not have active subtasks explicitly linked
  const activeTasksCampaignIds = new Set(tasks.filter(t => t.active).map(t => t.campaignId).filter(Boolean));
  const standaloneCampaignOpportunities = campaigns
    .filter(c => c.active && (c.status === 'ACTIVE' || c.status === 'PUBLISHED') && !activeTasksCampaignIds.has(c.id))
    .map(campaign => normalizeCampaign(campaign, userTasks[campaign.id]));

  return [...taskOpportunities, ...standaloneCampaignOpportunities];
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

/**
 * Consolidated capability-driven fallback generator for enabled/connected providers
 * that have empty static opportunities. Ensures providers are never silently hidden
 * and can be securely launched directly from the Marketplace.
 */
export function generateSyntheticProviderOpportunity(p: {
  id: string;
  name: string;
  description?: string;
  maximumReward?: number;
  minimumReward?: number;
  userSharePct?: number;
  launchUrl: string;
  logo?: string;
  logoUrl?: string;
  stats?: any;
}): MarketplaceOpportunity {
  const stats = p.stats || {};
  const approved = Number(stats.approvedRewards || 0);

  if (!p.launchUrl) {
    return {
      id: `provider_${p.id}_channel`,
      source: 'provider',
      providerId: p.id,
      providerName: p.name,
      title: `${p.name} (Incomplete)`,
      description: `Provider configuration incomplete.`,
      instructions: `This provider is currently unavailable because its credentials or identity fields are incomplete. Please contact the administrator.`,
      reward: {
        points: 0,
        xp: 0,
      },
      metadata: {
        category: p.id === 'cpxresearch' || p.id === 'bitlabs' ? 'surveys' : 'featured',
        difficulty: 'medium',
        estimatedTime: 'Unknown',
        verificationType: 'automated',
        launchMode: 'inline',
        artwork: p.logo || p.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`,
        thumbnail: p.logo || p.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`,
        tags: ['offerwall', p.id],
      },
      engagement: {
        completionRate: 0,
        averageReward: 0,
        totalCompletions: 0,
        trending: false,
        isNew: false,
      },
      status: 'configuration_required',
      action: {
        actionType: 'claim',
      },
    };
  }

  // No fabricated statistics unless we have actual approved counts
  const totalCompletions = approved;
  const completionRate = approved > 0 ? 1.0 : 0.0;
  const averageReward = approved > 0 ? Number(p.minimumReward || 100) : 0;

  let maxPoints = Number(p.maximumReward || 10000);
  if (maxPoints >= 1000001) {
    maxPoints = 100000;
  }
  return {
    id: `provider_${p.id}_channel`,
    source: 'provider',
    providerId: p.id,
    providerName: p.name,
    title: `${p.name} Offerwall`,
    description: p.description || `Complete tasks, surveys, and app installations on ${p.name} to earn rewards.`,
    instructions: `Click 'Start Opportunity' below to securely launch the ${p.name} portal, browse available offers, and earn rewards instantly.`,
    reward: {
      points: maxPoints,
      xp: 50,
    },
    metadata: {
      category: p.id === 'cpxresearch' || p.id === 'bitlabs' ? 'surveys' : 'featured',
      difficulty: 'medium',
      estimatedTime: 'Ongoing',
      verificationType: 'automated',
      launchMode: 'redirect',
      artwork: p.logo || p.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`,
      thumbnail: p.logo || p.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`,
      tags: ['offerwall', p.id],
    },
    engagement: {
      completionRate,
      averageReward,
      totalCompletions,
      trending: approved > 5,
      isNew: false,
    },
    status: 'available',
    action: {
      url: p.launchUrl,
      actionType: 'url',
      trackingId: p.id,
    },
  };
}
