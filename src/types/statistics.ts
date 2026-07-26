/**
 * User Statistics Types
 * 
 * PHASE 15.5 - Single Source of Truth
 * 
 * All Dashboard, Marketplace, Profile, History pages read from ONE source.
 * No independent calculations. No duplicated logic.
 */

// ─── User Statistics ───────────────────────────────────────────────────────────

export interface UserStatistics {
  userId: string;
  
  // Points & Economy
  totalPointsEarned: number;
  currentPoints: number;
  currentTier: string;
  
  // Experience & Progression
  totalXP: number;
  currentLevel: number;
  nextLevelXP: number;
  xpProgress: number; // 0-100
  
  // Completions
  tasksCompleted: number;
  opportunitiesCompleted: number;
  surveysCompleted: number;
  gamesCompleted: number;
  installsCompleted: number;
  
  // Rewards Breakdown
  referralRewards: number;
  predictionRewards: number;
  dailyBonuses: number;
  seasonalRewards: number;
  
  // Streaks & Achievements
  currentStreak: number;
  longestStreak: number;
  achievementsUnlocked: number;
  
  // Engagement
  lastActivityAt: Date;
  totalSessions: number;
  averageSessionDuration: number; // seconds
  
  // Status
  accountStatus: 'active' | 'suspended' | 'banned' | 'inactive';
  lastUpdated: Date;
}

// ─── Transaction History ──────────────────────────────────────────────────────

export type TransactionType = 
  | 'task_completion'
  | 'opportunity_completion'
  | 'survey_completion'
  | 'game_completion'
  | 'install_completion'
  | 'referral_reward'
  | 'prediction_reward'
  | 'daily_bonus'
  | 'seasonal_reward'
  | 'achievement_reward'
  | 'streak_bonus'
  | 'manual_adjustment'
  | 'withdrawal'
  | 'refund';

export interface PointTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  xpAwarded: number;
  source?: string;  // opportunity ID, task ID, etc.
  sourceType?: string; // 'opportunity', 'task', 'achievement', etc.
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

// ─── Activity Feed ─────────────────────────────────────────────────────────────

export type ActivityType = 
  | 'opportunity_started'
  | 'opportunity_completed'
  | 'opportunity_verified'
  | 'points_earned'
  | 'level_up'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'friend_invited'
  | 'referral_completed'
  | 'prediction_result';

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  points?: number;
  xp?: number;
  icon?: string;
  relatedId?: string;  // opportunity ID, achievement ID, etc.
  createdAt: Date;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType = 
  | 'points_earned'
  | 'achievement_unlocked'
  | 'level_up'
  | 'opportunity_available'
  | 'campaign_ending'
  | 'promotion'
  | 'system';

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}

// ─── User Profile Snapshot ────────────────────────────────────────────────────

export interface UserProfileSnapshot {
  userId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  region?: string;
  timezone?: string;
  joinedAt: Date;
  statistics: UserStatistics;
  achievements: Achievement[];
  recentActivity: UserActivity[];
}

// ─── Achievement ──────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ─── Leaderboard Entry ────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar?: string;
  points: number;
  level: number;
  xp: number;
  completions: number;
  lastActivityAt: Date;
}

// ─── Statistics Snapshot ──────────────────────────────────────────────────────

export interface StatisticsSnapshot {
  timestamp: Date;
  userCount: number;
  activeSessions: number;
  totalPointsDistributed: number;
  averagePointsPerUser: number;
  totalXPAwarded: number;
  averageLevelAcrossUsers: number;
  totalOpportunitiesCompleted: number;
  topUsers: LeaderboardEntry[];
}
