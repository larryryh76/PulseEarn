import { Timestamp } from 'firebase/firestore';

export type TaskType = 'daily' | 'once' | 'timer' | 'referral' | 'social' | 'prediction' | 'premium' | 'streak' | 'chain' | 'engagement' | 'education' | 'event' | 'telegram' | 'twitter' | 'tiktok' | 'youtube' | 'discord' | 'website' | 'app_install';
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'elite';
export type TaskRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
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

export type SubtaskStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED'
  | 'AVAILABLE'
  | 'STARTED'
  | 'SUBMITTED'
  | 'AWAITING_VERIFICATION'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'CANCELLED';

export type VerificationStatus =
  | 'AVAILABLE'
  | 'STARTED'
  | 'SUBMITTED'
  | 'AWAITING_VERIFICATION'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CLAIMED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';
export type TaskCategory = 'SOCIAL' | 'REFERRAL' | 'EDUCATION' | 'PREDICTION' | 'COMMUNITY' | 'EVENTS' | 'SPONSORED' | 'CUSTOM';
export type SocialPlatform = 'TELEGRAM' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE' | 'DISCORD' | 'WEBSITE' | 'APP_STORE' | 'NONE';

export type ReferralStatus = 'INVITED' | 'REGISTERED' | 'VERIFIED' | 'ACTIVATED' | 'QUALIFIED' | 'REWARDED' | 'FLAGGED' | 'REVERSED';
export type TicketStatus = 'OPEN' | 'PENDING' | 'AWAITING_USER' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory =
  | 'GENERAL'
  | 'ACCOUNT'
  | 'CAMPAIGN'
  | 'VERIFICATION'
  | 'PREDICTION'
  | 'WITHDRAWAL'
  | 'BUG_REPORT'
  | 'FEEDBACK'
  | 'OTHER';

export interface Task {
  id: string;
  providerId?: string;
  providerName?: string;
  campaignId: string | null;
  category?: TaskCategory;
  type: TaskType;
  title: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  proofRequirements?: string;
  proofLabel?: string;
  proofPlaceholder?: string;
  platform?: SocialPlatform;
  actionUrl?: string | null;
  url?: string | null;
  active: boolean;
  rewardAmount: number;
  xpReward: number;
  budget?: number;
  bonusReward?: number;
  referralBonus?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PAUSED' | 'DRAFT';
  visibility?: 'PUBLIC' | 'TIER_RESTRICTED' | 'HIDDEN';
  verificationType: VerificationType;
  cooldownPeriod?: number; // in hours
  cooldownHours?: number; // alias
  maxClaims?: number | null; // null for unlimited
  maxCompletions?: number | null; // alias
  dailyLimit?: number;
  perUserLimit?: number;
  provider?: 'internal' | 'offerwall_x' | 'survey_y' | string;
  totalClaims?: number;
  totalDistributed?: number;
  completionCount?: number;
  conversionRate?: number;
  targetTiers?: string[];
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  expirationDate?: Timestamp | null;
  campaignArtwork?: string | null;
  tags?: string[];
  minLevel?: number;
  regionRestrictions?: string[];
  estimatedTime?: string;
  difficulty?: TaskDifficulty;
  rarity?: TaskRarity;
  priority?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  fraudProtection?: {
    duplicatePrevention: boolean;
    abuseDetection: boolean;
    multiAccountDetection: boolean;
  };
}

export interface TaskClaim {
  id: string;
  userId: string;
  taskId: string;
  campaignId: string | null;
  providerId: string;
  validationState: SubtaskStatus;
  completionState: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  rewardTransactionId: string | null;
  xpGranted: number;
  fraudFlags: string[];
  submittedProof: string | null; // URL to screenshot or proof text
  adminFeedback: string | null;
  reviewedBy: string | null;
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
  metadata?: Record<string, any>;
}

export interface TaskProvider {
  id: string;
  name: string;
  campaignBudget: number;
  totalPaid: number;
  payoutTracking: {
    pending: number;
    completed: number;
  };
  taskCount: number;
  providerStatus: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
  fraudScore: number;
  expirationRules: string | null;
  apiKey?: string;
  contactEmail: string;
  createdAt: Timestamp;
}

export interface UserTask {
  taskId: string;
  lastCompleted: Timestamp | null;
  completedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  status: 'available' | 'pending' | 'completed' | 'on_cooldown' | 'rejected' | string;
  subtaskId?: string;
  totalCompletions: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  type: TaskType;
  bannerUrl: string;
  thumbnailUrl?: string;
  artworkUrl?: string;
  sponsorName?: string;
  sponsorLogoUrl?: string;
  sponsorWebsite?: string;
  sponsorReferenceId?: string;
  providerId?: string;
  provider: 'internal' | 'offerwall_x' | 'survey_y' | string;
  budget?: number;
  totalPrizePool: number;
  remainingPool: number;
  rewardPool?: number;
  pointsReward?: number;
  xpReward: number;
  xpMultiplier?: number;
  priority?: number;
  estimatedCompletion?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'elite' | string;
  tags?: string[];
  active: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'ARCHIVED' | 'DRAFT' | 'PUBLISHED' | 'EXPIRED';
  visibility: 'PUBLIC' | 'PRIVATE' | 'TIER_RESTRICTED' | 'HIDDEN';
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  scheduledLaunchDate?: Timestamp | null;
  autoExpiration: boolean;
  featured: boolean;
  taskIds: string[];
  participantsCount: number;
  maxParticipants?: number;
  maxClaimsPerUser?: number;
  // Prediction specific fields
  predictionAsset?: string;
  predictionQuestion?: string;
  predictionTargetPrice?: number;
  predictionSymbol?: string;
  predictionType?: 'UP_DOWN' | 'TARGET' | 'RANGE';
  validationSettings: {
    manualReview: boolean;
    screenshotRequired: boolean;
    linkRequired: boolean;
    referralRequired: boolean;
    predictionRequired: boolean;
    apiValidation: boolean;
  };
  analytics?: {
    completions: number;
    completionRate: number;
    validationRate: number;
    rejectionRate: number;
    rewardDistributed: number;
    activeUsers: number;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Activity {
  id: string;
  userId: string;
  type:
    | 'reward_received'
    | 'referral_activated'
    | 'streak_updated'
    | 'prediction_settled'
    | 'task_approved'
    | 'reward_reversed'
    | 'moderation_notice'
    | 'level_achieved'
    | 'prediction_placed'
    | 'prediction_won'
    | 'prediction_lost'
    | 'task_completed'
    | 'mission_completed'
    | 'campaign_joined'
    | 'campaign_completed'
    | 'withdrawal_requested'
    | 'withdrawal_approved'
    | 'withdrawal_completed'
    | 'admin_reward_adjustment'
    | 'streak_milestone_reached'
    | 'referral_registered'
    | 'referral_reward_earned'
    | 'xp_milestone_reached'
    | 'support_ticket_created'
    | 'support_ticket_updated'
    | 'support_ticket_resolved';
  points: number;
  description: string;
  timestamp: Timestamp;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface UserData {
  uid: string;
  email: string | null;
  username: string;
  points: number;
  referralCode: string;
  referredBy: string | null;
  referralDocId?: string; // Document ID of the referral record (if user was referred)
  streak: number;
  totalEarnedToday: number;
  xp: number;
  level: number;
  lastRewardDate?: Timestamp;
  createdAt: Timestamp;
  role: 'admin' | 'moderator' | 'user';
  isBanned?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  lastActionTimestamp?: Timestamp;
  actionsInLastMinute?: number;
  earnedInLastHour?: number;
  lastHourReset?: Timestamp;
  walletAddress?: string;
  totalWithdrawn?: number;
  avatarUrl?: string;
  isRoot?: boolean;
  segment?: 'new' | 'active' | 'power' | 'inactive' | 'suspicious';
  onboardingCompleted?: boolean;
  fingerprint?: string;
  lastSeen?: Timestamp;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  fraudFlags?: string[];
  stats?: {
    tasksCompleted: number;
    referralsCount: number;           // Number of people user has referred (referrer count)
    referralsReceived?: number;       // Number of times user was referred to (referee count)
    predictionsCount: number;
    totalWins?: number;
    predictionRewards?: number;
    totalEarnings: number;
    weeklyEarnings: number;
  };
  preferences?: {
    notifications: boolean;
    rewardAlerts: boolean;
    marketing: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    privacyMode: boolean;
    preferredCategories: string[];
  };
  status?: 'active' | 'restricted' | 'frozen';
  productAccess?: {
    pulseearn: boolean;
    psemine: boolean;
  };
  execution_lock?: boolean;
  execution_lock_at?: Timestamp | null;
  security?: {
    lastLogin: Timestamp;
    activeSessions: number;
    recoveryEmailSet: boolean;
    suspiciousFlags: string[];
  };
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  source: string; // source system name
  timestamp: Timestamp;
  claimId: string;
  description?: string;
  status: 'COMPLETED' | 'PENDING' | 'REVERSED' | 'FAILED';
  referenceId?: string; // ID of the related object (Task, Prediction, etc.)
  processedAt: Timestamp;
  auditTrail: string[];
  metadata?: Record<string, any>;
  engineVersion?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeUsername: string;
  status: ReferralStatus;
  rewarded?: boolean;
  refereeBonusPoints?: number;  // Amount referee received
  referrerBonusPoints?: number; // Amount referrer received
  rewardTransactionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  qualifiedAt?: Timestamp;      // When referee received bonus
  fraudFlags?: string[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  email: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  assignedAdminId?: string;
  lastReplyAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  closedAt?: Timestamp;
  lastMessagePreview?: string;
  metadata?: Record<string, any>;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'USER' | 'ADMIN' | 'SYSTEM';
  senderName: string;
  text: string;
  attachments?: SupportAttachment[];
  createdAt: Timestamp;
}

export interface SupportAttachment {
  id: string;
  ticketId: string;
  storageUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Timestamp;
}

export interface SystemSettings {
  dailyPointsCap: number;
  maintenanceMode: boolean;
  announcement?: string;
  minWithdrawal?: number;
  ecoBotConfig?: {
    autoRotateFeatured: boolean;
    streakReminders: boolean;
    inflationTarget: number;
  };
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'task_completed' | 'reward_claimed' | 'referral_joined' | 'streak_bonus' | 'system' | 'prediction_result' | 'subtask_update' | 'moderation_notice' | 'payout_processed';
  read: boolean;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface TaskHistory {
  id: string;
  userId: string;
  taskId: string;
  campaignId: string | null;
  campaignName: string;
  taskTitle: string;
  category: TaskCategory;
  rewardAmount: number;
  xpReward: number;
  completedAt: Timestamp;
  resolvedAt: Timestamp;
  verificationType: VerificationType;
  transactionReference: string;
  claimId: string;
  status: 'COMPLETED' | 'REJECTED';
  metadata?: Record<string, any>;
}

export interface PredictionRecord {
  id: string;
  userId: string;
  taskId: string; // Prediction tasks are tasks
  assetId: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  entryPrice: number;
  exitPrice?: number;
  stakeAmount: number;
  rewardAmount?: number;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELED' | 'DISPUTED' | 'FAILED_SETTLEMENT';
  transactionReference: string;
  settlementReference?: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  auditTrail: string[];
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  username: string;
  amountPoints: number;
  amountUSD: number;
  walletAddress: string;
  network: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'FAILED';
  adminNotes?: string;
  createdAt: Timestamp;
  processedAt?: Timestamp | null;
  paidAt?: Timestamp | null;
  transactionHash?: string;
}

// ─── Offerwall Types ──────────────────────────────────────────────────────────

export type OfferwallProviderSlug = string;

export type OfferwallCallbackStatus =
  | 'PENDING'
  | 'VALIDATED'
  | 'DUPLICATE'
  | 'INVALID_SIGNATURE'
  | 'FRAUD_BLOCKED'
  | 'REWARD_ISSUED'
  | 'REWARD_FAILED'
  | 'REVERSED';

export type OfferwallRewardStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVERSED';

export interface OfferwallProvider {
  id: string;                    // slug e.g. 'lootably'
  name: string;                  // Display name e.g. 'Lootably'
  internalName?: string;         // Internal identifier
  logo?: string;                 // Provider logo image
  logoUrl?: string;              // Alias for logo URL
  description?: string;          // Summary of provider offers/capabilities
  status?: 'active' | 'inactive' | 'maintenance';
  enabled: boolean;
  priority?: number;             // Sorting priority order
  launchMethod?: 'iframe' | 'redirect' | 'sdk' | 'api';
  launchUrl?: string;            // Resolved launch URL
  integrationUrl?: string;       // Dynamic launch URL template
  apiEndpoint?: string;          // API endpoint URL
  // Credentials
  affiliateId: string;
  apiKey: string;
  secret: string;
  callbackUrl: string;
  webhookUrl: string;
  // Economy
  rewardMultiplier: number;      // e.g. 1.0
  userSharePct: number;          // e.g. 0.85 (85%)
  platformSharePct: number;      // e.g. 0.15
  minimumReward: number;         // in points
  maximumReward: number;         // in points
  // Fraud
  fraudRules: {
    maxRewardsPerUserPerDay: number;
    maxRewardAmountPerDay: number;
    minTimeBetweenRewardsSec: number;
    blockVPN: boolean;
    blockDuplicateIp: boolean;
  };
  // Stats (live aggregates)
  stats?: {
    connectionStatus: 'connected' | 'degraded' | 'disconnected' | 'offline';
    apiStatus: 'ok' | 'error' | 'unknown';
    webhookStatus: 'ok' | 'error' | 'unknown';
    callbackStatus: 'ok' | 'error' | 'unknown';
    lastSuccessfulSync: Timestamp | null;
    lastFailedSync: Timestamp | null;
    lastCallback?: Timestamp | null;
    pendingRewards: number;
    approvedRewards: number;
    rejectedRewards: number;
    pendingCallbacks: number;
    failedCallbacks: number;
    duplicateCallbackAttempts: number;
    fraudAlerts: number;
    revenueToday: number;
    revenueThisWeek: number;
    revenueThisMonth: number;
    lifetimeRevenue: number;
    // Withdrawal forecasting
    currentProviderBalance: number;
    minimumPayout: number;
    remainingUntilPayout: number;
    estimatedPayoutDate: Timestamp | null;
    expectedPlatformRevenue: number;
    outstandingUserLiability: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OfferwallCallback {
  id: string;
  providerId: OfferwallProviderSlug;
  providerName: string;
  // Raw payload
  userId: string;
  offerId: string;
  offerName: string;
  rawAmount: number;            // Provider's currency unit
  pointsAwarded: number;        // After multiplier
  userPoints: number;           // User's share
  platformPoints: number;       // Platform share
  // Validation
  status: OfferwallCallbackStatus;
  signatureValid: boolean;
  isDuplicate: boolean;
  fraudBlocked: boolean;
  fraudFlags: string[];
  // Transaction reference
  transactionId: string | null;
  // Provider metadata
  providerTransactionId: string;
  providerUserId: string;
  ipAddress: string;
  userAgent: string;
  // Audit
  receivedAt: Timestamp;
  processedAt: Timestamp | null;
  auditTrail: string[];
  rawPayload: Record<string, any>;
}

export interface OfferwallReward {
  id: string;
  userId: string;
  callbackId: string;
  providerId: OfferwallProviderSlug;
  providerName: string;
  offerId: string;
  offerName: string;
  pointsAwarded: number;
  userPoints: number;
  platformPoints: number;
  status: OfferwallRewardStatus;
  transactionId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: Record<string, any>;
}

export interface OfferwallEvent {
  id: string;
  providerId: OfferwallProviderSlug;
  eventType: 'callback_received' | 'callback_validated' | 'callback_duplicate' | 'callback_invalid' | 'reward_issued' | 'fraud_blocked' | 'provider_config_updated' | 'provider_enabled' | 'provider_disabled';
  severity: 'info' | 'warning' | 'error';
  message: string;
  callbackId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Timestamp;
}

// ─── Revenue Analytics ────────────────────────────────────────────────────────
export interface OfferwallRevenueSnapshot {
  date: string; // ISO date
  providerId: OfferwallProviderSlug;
  grossRevenue: number;         // total points value
  userRewards: number;          // paid to users
  platformRevenue: number;      // kept by platform
  platformProfit: number;       // platformRevenue - costs
  pendingLiabilities: number;
  callbackCount: number;
  validCallbacks: number;
  duplicates: number;
  fraudBlocked: number;
  conversionRate: number;       // validated / total callbacks
  rejectionRate: number;
  fraudRate: number;
}

// Update Transaction type to include offerwall_reward
export type TransactionType =
  | 'daily_reward'
  | 'task_reward'
  | 'referral_bonus'
  | 'referral_reward'
  | 'prediction_reward'
  | 'prediction_stake'
  | 'admin_adjustment'
  | 'manual_adjustment'
  | 'prediction_entry'
  | 'AI_SYSTEM_CORRECTION'
  | 'withdrawal_debit'
  | 'withdrawal_debit_reversal'
  | 'refund'
  | 'rollback'
  | 'referral_reversal'
  | 'penalty'
  | 'welcome_bonus'
  | 'withdrawal_finalized'
  | 'mission_reward'
  | 'offerwall_reward'
  | 'cashback_reward';

export type SystemTaskTrigger =
  | 'referral_completed'
  | 'prediction_submitted'
  | 'prediction_completed'
  | 'campaign_task_completed'
  | 'daily_login'
  | 'level_up'
  | 'profile_updated';

export type SystemTaskCategory = 'WELCOME' | 'REFERRAL' | 'PREDICTION' | 'CAMPAIGN' | 'STREAK' | 'LEVEL' | 'DAILY';

export interface SystemTaskDefinition {
  id: string;
  title: string;
  description: string;
  trigger: SystemTaskTrigger;
  category: SystemTaskCategory;
  conditionField: string; // e.g. 'stats.referralsCount' or 'level'
  targetValue: number;
  rewardPoints: number;
  rewardXp: number;
  active: boolean;
  repeatable: boolean;
  period: 'ONCE' | 'DAILY' | 'WEEKLY';
  priority: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserSystemTask {
  id: string; // Unique ID (often userId_systemTaskId)
  userId: string;
  systemTaskId: string;
  category: SystemTaskCategory;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED';
  progress: number;
  target: number;
  unlockedAt: Timestamp;
  completedAt?: Timestamp | null;
  claimedAt?: Timestamp | null;
  transactionReference?: string | null;
}


