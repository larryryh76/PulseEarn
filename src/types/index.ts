import { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  type: 'daily' | 'once' | 'timer' | 'referral';
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
  lastRewardDate?: Timestamp;
  createdAt: Timestamp;
}
