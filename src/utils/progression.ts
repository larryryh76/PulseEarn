/**
 * Progression logic for PulseEarn
 * Level 1: 0-100 XP
 * Level 2: 100-250 XP (+150)
 * Level 3: 250-450 XP (+200)
 * Linear scaling with a base of 100 and 50 increment per level
 */

/**
 * Linear Progression Model
 * To remain synchronized with the Ops XP Engine, we use a fixed interval per level.
 * Default: 1000 XP per level.
 */
export const calculateLevel = (xp: number, xpPerLevel: number = 1000): number => {
  if (xp <= 0) return 1;
  return Math.floor(xp / xpPerLevel) + 1;
};

export const getXpForNextLevel = (_level: number, xpPerLevel: number = 1000): number => {
  return xpPerLevel;
};

export const getXpProgress = (xp: number, xpPerLevel: number = 1000) => {
  const level = calculateLevel(xp, xpPerLevel);
  const cumulativeXpForCurrentLevel = (level - 1) * xpPerLevel;
  const currentLevelXp = xp - cumulativeXpForCurrentLevel;

  const progress = (currentLevelXp / xpPerLevel) * 100;

  return {
    level,
    currentLevelXp,
    requiredXp: xpPerLevel,
    nextLevelXp: level * xpPerLevel,
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
