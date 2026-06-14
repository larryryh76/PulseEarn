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
    referralBonusPoints: number;
    referralBonusXP: number;
    predictionWinMultiplier: number; // e.g. 2.0
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
    dailyLoginXP: 100,
    referralBonusPoints: 500,
    referralBonusXP: 250,
    predictionWinMultiplier: 2.0,
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
        this.cache = snap.data() as EconomyConfig;
      } else {
        // Initialize with defaults if missing
        console.warn('[EconomyConfig] Config doc missing, initializing with defaults');
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
      console.log('[EconomyConfig] Global economy configuration updated');
    } catch (err) {
      console.error('[EconomyConfig] Update failed:', err);
      throw err;
    }
  }
}
