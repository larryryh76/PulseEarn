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

export interface LevelTier {
  title: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  glow: string;
  badge?: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  { title: 'Explorer', minLevel: 1, maxLevel: 4, color: 'text-slate-400', glow: 'shadow-[0_0_15px_rgba(148,163,184,0.2)]' },
  { title: 'Contributor', minLevel: 5, maxLevel: 9, color: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.2)]' },
  { title: 'Pathfinder', minLevel: 10, maxLevel: 19, color: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.2)]' },
  { title: 'Strategist', minLevel: 20, maxLevel: 34, color: 'text-indigo-400', glow: 'shadow-[0_0_15px_rgba(129,140,248,0.2)]' },
  { title: 'Elite Member', minLevel: 35, maxLevel: 49, color: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.2)]' },
  { title: 'Pulse Legend', minLevel: 50, maxLevel: 999, color: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' },
];

export const getLevelTier = (level: number): LevelTier => {
  return LEVEL_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) || LEVEL_TIERS[0];
};

export const getTierColor = (level: number) => {
  return getLevelTier(level).color;
};

export const getTierGlow = (level: number) => {
  return getLevelTier(level).glow;
};

export const getTierTitle = (level: number) => {
  return getLevelTier(level).title;
};
