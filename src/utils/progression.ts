/**
 * Progression logic for PulseEarn
 * Level 1: 0-100 XP
 * Level 2: 100-250 XP (+150)
 * Level 3: 250-450 XP (+200)
 * Linear scaling with a base of 100 and 50 increment per level
 */

/**
 * Exponential Progression Model (x3 Multiplier)
 * Level 1: 0 - 999 XP
 * Level 2: 1,000 XP
 * Level 3: 3,000 XP
 * Level 4: 9,000 XP
 */
export const calculateLevel = (xp: number, baseLevelXp: number = 1000): number => {
  if (xp < baseLevelXp) return 1;
  // level = floor(log_multiplier(xp / base)) + 2
  const level = Math.floor(Math.log(xp / baseLevelXp) / Math.log(3)) + 2;
  return level;
};

export const getXpForLevel = (level: number, baseLevelXp: number = 1000): number => {
  if (level <= 1) return 0;
  return baseLevelXp * Math.pow(3, level - 2);
};

export const getXpProgress = (xp: number, baseLevelXp: number = 1000) => {
  const level = calculateLevel(xp, baseLevelXp);
  const currentLevelThreshold = getXpForLevel(level, baseLevelXp);
  const nextLevelThreshold = getXpForLevel(level + 1, baseLevelXp);

  const xpInLevel = xp - currentLevelThreshold;
  const xpNeededForNext = nextLevelThreshold - currentLevelThreshold;

  const progress = (xpInLevel / xpNeededForNext) * 100;

  return {
    level,
    currentLevelXp: xpInLevel,
    requiredXp: xpNeededForNext,
    nextLevelXp: nextLevelThreshold,
    progress: Math.min(Math.floor(progress), 100)
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
