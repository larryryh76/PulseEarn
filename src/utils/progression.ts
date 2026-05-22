/**
 * Progression logic for PulseEarn
 * Level 1: 0-100 XP
 * Level 2: 100-250 XP (+150)
 * Level 3: 250-450 XP (+200)
 * Linear scaling with a base of 100 and 50 increment per level
 */

export const calculateLevel = (xp: number): number => {
  let level = 1;
  let requiredXp = 100;
  let cumulativeXp = 0;

  while (xp >= cumulativeXp + requiredXp) {
    cumulativeXp += requiredXp;
    level++;
    requiredXp += 50;
  }

  return level;
};

export const getXpForNextLevel = (level: number): number => {
  return 100 + (level - 1) * 50;
};

export const getXpProgress = (xp: number) => {
  let level = 1;
  let requiredXp = 100;
  let cumulativeXp = 0;

  while (xp >= cumulativeXp + requiredXp) {
    cumulativeXp += requiredXp;
    level++;
    requiredXp += 50;
  }

  const currentLevelXp = xp - cumulativeXp;
  const progress = (currentLevelXp / requiredXp) * 100;

  return {
    level,
    currentLevelXp,
    requiredXp,
    progress
  };
};

export const getTierColor = (tier: string) => {
  switch (tier?.toLowerCase()) {
    case 'bronze': return 'text-orange-400';
    case 'silver': return 'text-slate-300';
    case 'gold': return 'text-yellow-400';
    case 'elite': return 'text-purple-400';
    default: return 'text-primary';
  }
};

export const getTierGlow = (tier: string) => {
  switch (tier?.toLowerCase()) {
    case 'bronze': return 'shadow-[0_0_15px_rgba(251,146,60,0.2)]';
    case 'silver': return 'shadow-[0_0_15px_rgba(203,213,225,0.2)]';
    case 'gold': return 'shadow-[0_0_15px_rgba(250,204,21,0.2)]';
    case 'elite': return 'shadow-[0_0_15px_rgba(192,132,252,0.2)]';
    default: return 'shadow-none';
  }
};
