import { Timestamp } from 'firebase/firestore';

export type TaskType = 'daily' | 'once' | 'timer' | 'referral' | 'social' | 'prediction' | 'premium' | 'streak' | 'chain' | 'engagement' | 'education' | 'event' | 'telegram' | 'twitter' | 'tiktok' | 'youtube' | 'discord' | 'website' | 'app_install';
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'elite';
export type TaskRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type VerificationType = 'automated' | 'manual' | 'proof' | 'timer' | 'activity' | 'link' | 'api' | 'referral' | 'prediction';
export type SubtaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
export type TaskCategory = 'SOCIAL' | 'REFERRAL' | 'EDUCATION' | 'PREDICTION' | 'COMMUNITY' | 'EVENTS' | 'SPONSORED' | 'CUSTOM';
export type SocialPlatform = 'TELEGRAM' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE' | 'DISCORD' | 'WEBSITE' | 'APP_STORE' | 'NONE';

export type ReferralStatus = 'INVITED' | 'REGISTERED' | 'VERIFIED' | 'ACTIVATED' | 'REWARDED' | 'FLAGGED' | 'REVERSED';
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
  providerId: string;
  providerName: string;
  campaignId: string | null;
  category: TaskCategory;
  type: TaskType;
  title: string;
  subtitle?: string;
  description: string;
  instructions: string;
  proofRequirements?: string;
  platform: SocialPlatform;
  actionUrl: string | null;
  active: boolean;
  rewardAmount: number;
  xpReward: number;
  budget?: number;
  bonusReward?: number;
  referralBonus?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PAUSED' | 'DRAFT';
  visibility: 'PUBLIC' | 'TIER_RESTRICTED' | 'HIDDEN';
  verificationType: VerificationType;
  cooldownPeriod: number; // in hours
  maxClaims: number | null; // null for unlimited
  dailyLimit?: number;
  perUserLimit?: number;
  totalClaims: number;
  totalDistributed?: number;
  completionCount?: number;
  conversionRate?: number;
  targetTiers?: string[];
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  expirationDate: Timestamp | null;
  campaignArtwork: string | null;
  tags: string[];
  minLevel: number;
  regionRestrictions: string[];
  estimatedTime: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  fraudProtection: {
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
  status: 'available' | 'pending' | 'completed' | 'on_cooldown' | 'rejected';
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
  budget?: number;
  totalPrizePool: number;
  remainingPool: number;
  pointsReward?: number;
  xpReward: number;
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
  streak: number;
  totalEarnedToday: number;
  xp: number;
  level: number;
  lastRewardDate?: Timestamp;
  createdAt: Timestamp;
  role: 'admin' | 'user';
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
  segment?: 'new' | 'active' | 'power' | 'inactive' | 'suspicious';
  onboardingCompleted?: boolean;
  fingerprint?: string;
  lastSeen?: Timestamp;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  fraudFlags?: string[];
  stats?: {
    tasksCompleted: number;
    referralsCount: number;
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
  type: 'daily_reward' | 'task_reward' | 'referral_bonus' | 'prediction_reward' | 'prediction_stake' | 'admin_adjustment' | 'prediction_entry' | 'AI_SYSTEM_CORRECTION' | 'withdrawal_debit' | 'referral_reversal' | 'penalty' | 'welcome_bonus' | 'withdrawal_finalized';
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
  rewardTransactionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  fraudFlags: string[];
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  adminNotes?: string;
  createdAt: Timestamp;
  processedAt?: Timestamp | null;
  paidAt?: Timestamp | null;
  transactionHash?: string;
}

export type SystemTaskTrigger =
  | 'referral_completed'
  | 'prediction_submitted'
  | 'prediction_completed'
  | 'campaign_task_completed'
  | 'daily_login'
  | 'level_up'
  | 'profile_updated';

export type SystemTaskCategory = 'WELCOME' | 'REFERRAL' | 'PREDICTION' | 'CAMPAIGN' | 'STREAK' | 'LEVEL';

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
