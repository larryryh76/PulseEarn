
export const ECONOMY_RULES = {
  REWARDS: {
    DAILY_LIMIT: 5000,
    MAX_SINGLE_REWARD: 2000,
    COOLDOWN_TASK_MS: 3600000, // 1 hour
    COOLDOWN_DAILY_MS: 86400000, // 24 hours
  },
  PAYOUTS: {
    MIN_THRESHOLD: 10000,
    MAX_WEEKLY_VOLUME: 100000,
  },
  XP: {
    LVL_MULTIPLIER: 1000,
    MAX_XP_PER_DAY: 500,
  },
  FRAUD: {
    VELOCITY_THRESHOLD: 10000, // Points in 1 hour
    MAX_ACCOUNTS_PER_IP: 3,
    RISK_SCORE_THRESHOLD: 75,
  }
};

export class EconomyAuthority {
  static validateAction(type: string, data: any, userData: any): { valid: boolean; error?: string } {
    // 1. Transactional Velocity Check
    if (data.amount > ECONOMY_RULES.REWARDS.MAX_SINGLE_REWARD) {
      return { valid: false, error: "REWARD_CAP_EXCEEDED" };
    }

    // 2. Cooldown Enforcement (if applicable)
    if (type === 'daily_reward') {
      const lastReward = userData.lastRewardDate?.toDate() || new Date(0);
      const now = new Date();
      if (now.getTime() - lastReward.getTime() < ECONOMY_RULES.REWARDS.COOLDOWN_DAILY_MS) {
        return { valid: false, error: "COOLDOWN_ACTIVE" };
      }
    }

    // 3. User State Validation
    if (userData.status === 'restricted' || userData.status === 'frozen') {
      return { valid: false, error: "ACCOUNT_RESTRICTED" };
    }

    return { valid: true };
  }

  static calculateRiskScore(request: any, userData: any): number {
    let score = 0;

    // Logic for risk scoring
    if (request.amount > 5000) score += 40;
    if (userData.level < 2 && request.amount > 1000) score += 30;

    return score;
  }
}
