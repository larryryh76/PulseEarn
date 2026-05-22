import { Timestamp } from 'firebase/firestore';

export type TaskType = 'daily' | 'once' | 'timer' | 'referral' | 'social' | 'prediction' | 'premium' | 'streak' | 'chain';
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'elite';
export type TaskRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type VerificationType = 'automated' | 'manual' | 'proof' | 'timer' | 'activity';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  rewardXp: number;
  type: TaskType;
  difficulty: TaskDifficulty;
  rarity: TaskRarity;
  category: string;
  campaignId?: string;
  minLevel?: number;
  active: boolean;
  cooldown?: number; // in hours
  duration?: number; // for timer tasks, in seconds
  verificationType: VerificationType;
  proofRequirements?: string; // instructions for the user
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  isFeatured?: boolean;
  dailyCap?: number;
  actionUrl?: string; // link to TikTok/YouTube etc.
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  username: string; // for easier admin review
  status: SubmissionStatus;
  proofData?: string; // link to screenshot or username
  adminFeedback?: string;
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rewardPoints: number;
  rewardXp: number;
}

export interface UserTask {
  taskId: string;
  lastCompleted: Timestamp;
  status: 'pending' | 'completed' | 'on_cooldown' | 'rejected';
  submissionId?: string;
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
  totalPrizePool?: number;
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
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'daily_reward' | 'task_reward' | 'referral_bonus' | 'prediction_reward' | 'prediction_stake' | 'admin_adjustment';
  amount: number;
  source: string; // e.g. "Mission: Twitter Follow"
  timestamp: Timestamp;
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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  active: boolean;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'task_completed' | 'reward_claimed' | 'referral_joined' | 'streak_bonus' | 'system' | 'prediction_result' | 'submission_update';
  read: boolean;
  timestamp: Timestamp;
}
