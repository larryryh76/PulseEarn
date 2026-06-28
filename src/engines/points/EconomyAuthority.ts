
export const ECONOMY_RULES = {
  REWARDS: {
    DAILY_LIMIT: 5000,
    MAX_SINGLE_REWARD: 5000,
    COOLDOWN_TASK_MS: 3600000, // 1 hour
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
  static validateAction(_type: string, data: any, userData: any): { valid: boolean; error?: string } {
    // 1. Transactional Velocity Check
    // Note: In strict production mode, PointTransactionEngine should pass the config to validateAction
    // for now we use hardcoded bounds as a safety fallback if config isn't passed.
    if (data.amount > ECONOMY_RULES.REWARDS.MAX_SINGLE_REWARD) {
      return { valid: false, error: "REWARD_CAP_EXCEEDED" };
    }

    // 2. Cooldown Enforcement (Note: daily_reward uses calendar-day reset in PointTransactionEngine)

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
