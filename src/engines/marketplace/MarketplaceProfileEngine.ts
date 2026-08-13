/**
 * MarketplaceProfileEngine
 * 
 * Manages user marketplace intelligence profiles.
 * Analyzes progression, trust signals, and completion history to build
 * a personalized profile driving opportunity ranking and eligibility.
 */

import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserData, Activity, TaskHistory } from '../../types';
import {
  MarketplaceUserProfile,
  UserArchetype,
  TrustSignals,
} from '../../types/marketplace';

export class MarketplaceProfileEngine {
  /**
   * Derives user archetype from progression and trust metrics.
   */
  static deriveArchetype(
    userData: UserData | null,
    trustSignals: TrustSignals
  ): UserArchetype {
    if (!userData) return 'new';

    const accountAge = trustSignals.accountAgeDays;
    const completions = trustSignals.tasksCompleted;
    const totalEarnings = trustSignals.totalEarnings;
    const level = userData.level || 1;

    // 1. Power Earner: High volume of completions and high total earnings
    if (completions >= 25 || totalEarnings >= 10000) {
      return 'power_earner';
    }

    // 2. High XP / High Level: Level 10+
    if (level >= 10) {
      return 'high_xp';
    }

    // 3. High Trust: LOW risk, email verified, account age >= 7 days
    if (trustSignals.riskLevel === 'LOW' && trustSignals.emailVerified && accountAge >= 7) {
      return 'high_trust';
    }

    // 4. New User: Account age <= 3 days or under 3 completions
    if (accountAge <= 3 || completions <= 3) {
      return 'new';
    }

    // 5. Returning / Established User
    return 'returning';
  }

  /**
   * Calculates trust signals from UserData and statistics.
   */
  static calculateTrustSignals(
    userData: UserData | null,
    history: TaskHistory[] = [],
    activities: Activity[] = []
  ): TrustSignals {
    if (!userData) {
      return {
        emailVerified: false,
        riskLevel: 'LOW',
        accountAgeDays: 0,
        tasksCompleted: 0,
        totalEarnings: 0,
        predictionsCount: 0,
        referralsCount: 0,
        offerwallCompletedCount: 0,
      };
    }

    const rawCreated = (userData as any).createdAt;
    const createdAt = rawCreated?.toDate ? rawCreated.toDate() : new Date(rawCreated || Date.now());
    const accountAgeDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    const offerwallCount = activities.filter(a => a.type?.includes('offerwall')).length;

    return {
      emailVerified: !!(userData as any).emailVerified,
      riskLevel: userData.riskLevel || 'LOW',
      accountAgeDays,
      tasksCompleted: userData.stats?.tasksCompleted || history.length || 0,
      totalEarnings: userData.stats?.totalEarnings || userData.points || 0,
      predictionsCount: userData.stats?.predictionsCount || 0,
      referralsCount: userData.stats?.referralsCount || 0,
      offerwallCompletedCount: offerwallCount,
    };
  }

  /**
   * Builds or calculates a complete MarketplaceUserProfile.
   */
  static buildProfile(
    userData: UserData | null,
    history: TaskHistory[] = [],
    activities: Activity[] = [],
    existingSaved: string[] = [],
    existingHidden: string[] = [],
    favouriteProviders: string[] = []
  ): MarketplaceUserProfile {
    const userId = userData?.uid || (userData as any)?.id || 'guest';
    const trustSignals = this.calculateTrustSignals(userData, history, activities);
    const archetype = this.deriveArchetype(userData, trustSignals);

    // Calculate category preferences from history
    const preferredCategories: Record<string, number> = {};
    history.forEach(h => {
      const cat = h.category?.toLowerCase() || 'featured';
      preferredCategories[cat] = (preferredCategories[cat] || 0) + 1;
    });

    const completionCount = trustSignals.tasksCompleted;
    const avgReward = completionCount > 0 ? trustSignals.totalEarnings / completionCount : 150;

    return {
      userId,
      archetype,
      preferredCategories,
      favouriteProviders,
      completionRate: completionCount > 0 ? 0.92 : 0,
      averageSessionLength: 12, // minutes
      averageReward: Math.round(avgReward),
      successRate: 0.95,
      activeCampaigns: [],
      completedCampaigns: [],
      hiddenOpportunities: existingHidden,
      savedOpportunities: existingSaved,
      trustSignals,
      updatedAt: new Date(),
    };
  }

  /**
   * Fetches user profile from Firestore or builds a fresh one.
   */
  static async getOrFetchProfile(
    userId: string,
    userData: UserData | null,
    history: TaskHistory[] = [],
    activities: Activity[] = []
  ): Promise<MarketplaceUserProfile> {
    if (!userId || userId === 'guest') {
      return this.buildProfile(userData, history, activities);
    }

    try {
      const docRef = doc(db, 'user_marketplace_profiles', userId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        const baseProfile = this.buildProfile(
          userData,
          history,
          activities,
          data.savedOpportunities || [],
          data.hiddenOpportunities || [],
          data.favouriteProviders || []
        );
        return {
          ...baseProfile,
          savedOpportunities: data.savedOpportunities || [],
          hiddenOpportunities: data.hiddenOpportunities || [],
          favouriteProviders: data.favouriteProviders || [],
          preferredCategories: { ...baseProfile.preferredCategories, ...(data.preferredCategories || {}) },
        };
      }
    } catch (err) {
      console.warn('[MarketplaceProfileEngine] Firestore fetch failed, using derived profile', err);
    }

    return this.buildProfile(userData, history, activities);
  }

  /**
   * Persists updated profile preferences to Firestore.
   */
  static async syncProfilePreferences(
    userId: string,
    updates: Partial<Pick<MarketplaceUserProfile, 'savedOpportunities' | 'hiddenOpportunities' | 'favouriteProviders' | 'preferredCategories'>>
  ): Promise<void> {
    if (!userId || userId === 'guest') return;

    try {
      const docRef = doc(db, 'user_marketplace_profiles', userId);
      await setDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('[MarketplaceProfileEngine] Failed to sync profile preferences to Firestore:', err);
    }
  }
}
