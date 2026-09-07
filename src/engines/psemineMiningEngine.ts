import { PsemineTool, PsemineCampaign } from '../types/psemine';

export const GENESIS_CAMPAIGN: PsemineCampaign = {
  id: 'genesis-90-day',
  name: '90-Day Genesis Mining Campaign',
  type: 'genesis',
  status: 'active',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  durationDays: 90,
  description: 'The inaugural 90-day Genesis mining campaign establishing initial hash generation and tool distribution.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const GENESIS_TOOLS: PsemineTool[] = [
  {
    id: 'starter',
    name: 'Starter Rig',
    tier: 'starter',
    priceGbp: 3,
    miningRateGbpPerHour: 0.10,
    maxCopiesPerUser: 5,
    campaignId: 'genesis-90-day',
    isActive: true,
    description: 'Entry-level Genesis node designed for initial hash rate generation.',
  },
  {
    id: 'growth',
    name: 'Growth Rig',
    tier: 'growth',
    priceGbp: 10,
    miningRateGbpPerHour: 0.50,
    maxCopiesPerUser: 3,
    campaignId: 'genesis-90-day',
    isActive: true,
    description: 'Mid-tier node engineered for optimized steady-state mining performance.',
  },
  {
    id: 'pro',
    name: 'Pro Rig',
    tier: 'pro',
    priceGbp: 50,
    miningRateGbpPerHour: 1.20,
    maxCopiesPerUser: 3,
    campaignId: 'genesis-90-day',
    isActive: true,
    description: 'High-throughput enterprise mining cluster for professional output.',
  },
  {
    id: 'elite',
    name: 'Elite Rig',
    tier: 'elite',
    priceGbp: 200,
    miningRateGbpPerHour: 2.50,
    maxCopiesPerUser: 2,
    campaignId: 'genesis-90-day',
    isActive: true,
    description: 'Maximum capacity Genesis tier delivering high-rate block processing.',
  },
];

export interface CalculateMiningRateParams {
  ownedTools: Array<{ toolId: string; status: string; miningRateGbpPerHour: number }>;
  qualifiedReferralsCount: number;
}

export interface CalculateMiningRateResult {
  baseMiningRateGbpPerHour: number;
  referralBonusGbpPerHour: number;
  totalMiningRateGbpPerHour: number;
  qualifiedReferralsCount: number;
  activeToolsCount: number;
}

export function calculateMiningRate(params: CalculateMiningRateParams): CalculateMiningRateResult {
  const activeTools = params.ownedTools.filter((t) => t.status === 'active');
  const baseRate = activeTools.reduce((acc, tool) => acc + (tool.miningRateGbpPerHour || 0), 0);

  const safeRef = Math.min(Math.max(0, params.qualifiedReferralsCount || 0), 5);
  const referralBonus = safeRef * 0.30;

  const totalRate = Math.min(baseRate + referralBonus, 12.10);

  return {
    baseMiningRateGbpPerHour: Number(baseRate.toFixed(2)),
    referralBonusGbpPerHour: Number(referralBonus.toFixed(2)),
    totalMiningRateGbpPerHour: Number(totalRate.toFixed(2)),
    qualifiedReferralsCount: safeRef,
    activeToolsCount: activeTools.length,
  };
}

export function calculateAccumulatedOutput(
  startTimestampMs: number,
  currentTimestampMs: number,
  rateGbpPerHour: number
): number {
  if (currentTimestampMs <= startTimestampMs || rateGbpPerHour <= 0) return 0;
  const elapsedHours = (currentTimestampMs - startTimestampMs) / (1000 * 60 * 60);
  const output = elapsedHours * rateGbpPerHour;
  return Number(output.toFixed(4));
}
