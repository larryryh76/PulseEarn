import { db } from '../../firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface EconomyConfig {
  rewards: {
    dailyLoginPoints: number;
    dailyLoginXP: number;
    welcomeBonusPoints: number;
    welcomeBonusXP: number;
    referralBonusPointsReferee: number;  // Bonus for new user (referee)
    referralBonusPointsReferrer: number; // Bonus for who referred them (referrer)
    referralBonusXP: number;             // Shared XP for both
    predictionWinMultiplier: number; // e.g. 2.0
    minPredictionStake: number;
    maxPredictionStake: number;
    predictionXP: {
      win: number;
      loss: number;
    };
  };
  thresholds: {
    minWithdrawalPoints: number;
    predictionUnlockLevel: number;
    xpPerLevel: number;
  };
  security: {
    maxSingleReward: number;
    dailyRewardCap: number;
  };
  updatedAt?: Timestamp;
}

const DEFAULT_CONFIG: EconomyConfig = {
  rewards: {
    dailyLoginPoints: 50,
    dailyLoginXP: 20,
    welcomeBonusPoints: 30,
    welcomeBonusXP: 50,
    referralBonusPointsReferee: 30,   // New user gets 30 PTS when referred
    referralBonusPointsReferrer: 50,  // Referrer gets 50 PTS
    referralBonusXP: 100,             // Both get 100 XP
    predictionWinMultiplier: 2.0,
    minPredictionStake: 10,
    maxPredictionStake: 10000,
    predictionXP: {
      win: 250,
      loss: 50
    }
  },
  thresholds: {
    minWithdrawalPoints: 10000,
    predictionUnlockLevel: 5,
    xpPerLevel: 1000
  },
  security: {
    maxSingleReward: 5000,
    dailyRewardCap: 5000
  }
};

export class EconomyConfigEngine {
  private static CONFIG_DOC_ID = 'global_v1';
  private static cache: EconomyConfig | null = null;
  private static lastFetch: number = 0;
  private static CACHE_TTL = 300000; // 5 minutes

  /**
   * Fetch current economy configuration.
   * Uses memory caching to prevent redundant Firestore reads.
   */
  static async getConfig(): Promise<EconomyConfig> {
    const now = Date.now();
    if (this.cache && (now - this.lastFetch < this.CACHE_TTL)) {
      return this.cache;
    }

    try {
      const docRef = doc(db, 'system_config', this.CONFIG_DOC_ID);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        // Always merge defaults so any missing keys get the canonical value
        const data = (snap.data() as any) || {};
        this.cache = { ...DEFAULT_CONFIG, ...data };

        // Historically the Python API had a fallback of 500 for referralBonusPointsReferrer
        // (before the fix). Auto-detect and auto-correct on read. This prevents old seed
        // data from leaking into clients; the next write will use the correct value.
        const storedReferralPts = data.rewards?.referralBonusPointsReferrer;
        if (storedReferralPts === 500 && this.cache) {
          this.cache.rewards.referralBonusPointsReferrer = DEFAULT_CONFIG.rewards.referralBonusPointsReferrer;
          await this.updateConfig({ rewards: this.cache.rewards });
        }
      } else {
        // Initialize with canonical defaults
        await this.updateConfig(DEFAULT_CONFIG);
        this.cache = DEFAULT_CONFIG;
      }

      this.lastFetch = now;
      return this.cache!;
    } catch (err) {
      console.error('[EconomyConfig] Failed to fetch config:', err);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Update global economy configuration.
   */
  static async updateConfig(newConfig: Partial<EconomyConfig>): Promise<void> {
    try {
      const docRef = doc(db, 'system_config', this.CONFIG_DOC_ID);
      await setDoc(docRef, {
        ...newConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });

      this.cache = null; // Invalidate cache
      if (import.meta.env.DEV) console.log('[EconomyConfig] Global economy configuration updated');
    } catch (err) {
      console.error('[EconomyConfig] Update failed:', err);
      throw err;
    }
  }
}
