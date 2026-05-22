import { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  rewardXp: number;
  type: 'daily' | 'once' | 'timer' | 'referral' | 'social' | 'prediction' | 'premium';
  tier: 'bronze' | 'silver' | 'gold' | 'elite';
  category: string;
  minLevel?: number;
  active: boolean;
  cooldown?: number; // in hours
  duration?: number; // for timer tasks, in seconds
  createdAt: Timestamp;
}

export interface UserTask {
  taskId: string;
  lastCompleted: Timestamp;
  status: 'pending' | 'completed' | 'on_cooldown';
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
  minWithdrawal?: number; // for future
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
  type: 'task_completed' | 'reward_claimed' | 'referral_joined' | 'streak_bonus' | 'system' | 'prediction_result';
  read: boolean;
  timestamp: Timestamp;
}
