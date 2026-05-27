import { Timestamp } from 'firebase/firestore';

export type TaskType = 'daily' | 'once' | 'timer' | 'referral' | 'social' | 'prediction' | 'premium' | 'streak' | 'chain';
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'elite';
export type TaskRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type VerificationType = 'automated' | 'manual' | 'proof' | 'timer' | 'activity' | 'link';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
export type TaskCategory = 'SOCIAL' | 'LEARN' | 'ECOSYSTEM' | 'GAMING' | 'SPONSORED' | 'DAILY';
export type SocialPlatform = 'TELEGRAM' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE' | 'DISCORD' | 'WEBSITE' | 'APP_STORE';

export interface Task {
  id: string;
  providerId: string;
  providerName: string;
  campaignId: string | null;
  category: TaskCategory;
  title: string;
  description: string;
  instructions: string;
  platform: SocialPlatform | 'NONE';
  actionUrl: string | null;
  rewardAmount: number;
  xpReward: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PAUSED';
  visibility: 'PUBLIC' | 'TIER_RESTRICTED' | 'HIDDEN';
  verificationType: VerificationType;
  cooldownPeriod: number; // in hours
  maxClaims: number | null; // null for unlimited
  totalClaims: number;
  expirationDate: Timestamp | null;
  campaignArtwork: string | null;
  tags: string[];
  minLevel: number;
  estimatedTime: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskClaim {
  id: string;
  userId: string;
  taskId: string;
  providerId: string;
  validationState: SubmissionStatus;
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
  apiKey?: string; // For future integrations
  contactEmail: string;
  createdAt: Timestamp;
}

export interface UserTask {
  taskId: string;
  lastCompleted: Timestamp | null;
  status: 'available' | 'pending' | 'completed' | 'on_cooldown' | 'rejected';
  submissionId?: string;
  totalCompletions: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  bannerUrl: string;
  active: boolean;
  startDate: Timestamp;
  endDate: Timestamp;
  featured: boolean;
  taskIds: string[];
  totalPrizePool: number;
  remainingPool: number;
  participantsCount: number;
}

export interface Activity {
  id: string;
  type: string;
  points: number;
  description: string;
  timestamp: Timestamp;
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
  stats?: {
    tasksCompleted: number;
    referralsCount: number;
    predictionsCount: number;
  };
  preferences?: {
    notifications: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    privacyMode: boolean;
    preferredCategories: string[];
  };
  status?: 'active' | 'restricted' | 'frozen';
  execution_lock?: boolean;
  execution_lock_at?: Timestamp | null;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'daily_reward' | 'task_reward' | 'referral_bonus' | 'prediction_reward' | 'prediction_stake' | 'admin_adjustment' | 'prediction_entry' | 'AI_SYSTEM_CORRECTION' | 'withdrawal_debit';
  amount: number;
  source: string;
  timestamp: Timestamp;
  claimId: string;
  description?: string;
  metadata?: Record<string, any>;
  engineVersion?: string;
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
  type: 'task_completed' | 'reward_claimed' | 'referral_joined' | 'streak_bonus' | 'system' | 'prediction_result' | 'submission_update';
  read: boolean;
  timestamp: Timestamp;
}
