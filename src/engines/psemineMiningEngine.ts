import { PsemineMiningSession, PsemineToolOwnership } from '../types/psemine';

/**
 * Pure calculations used to render backend snapshots. This module deliberately
 * contains no product prices, campaign dates, ownership writes, or client-side
 * timestamps. Economic configuration and state must come from trusted backend
 * documents or a privileged service.
 */
export interface CalculateMiningRateParams {
  ownedTools: Pick<PsemineToolOwnership, 'status' | 'miningRateGbpPerHour'>[];
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
  const activeTools = params.ownedTools.filter((tool) => tool.status === 'active');
  const baseRate = activeTools.reduce((sum, tool) => sum + Math.max(0, tool.miningRateGbpPerHour), 0);
  const qualifiedReferralsCount = Math.min(Math.max(0, Math.floor(params.qualifiedReferralsCount)), 5);
  const referralBonus = qualifiedReferralsCount * 0.3;

  return {
    baseMiningRateGbpPerHour: Number(baseRate.toFixed(2)),
    referralBonusGbpPerHour: Number(referralBonus.toFixed(2)),
    totalMiningRateGbpPerHour: Number(Math.min(baseRate + referralBonus, 12.1).toFixed(2)),
    qualifiedReferralsCount,
    activeToolsCount: activeTools.length,
  };
}

export function calculateAccumulatedOutput(
  session: Pick<PsemineMiningSession, 'state' | 'startedAt' | 'expiresAt' | 'totalMiningRateGbpPerHour' | 'accumulatedOutputGbp'>,
  nowMs: number,
): number {
  if (session.state !== 'active') return Number(Math.max(0, session.accumulatedOutputGbp).toFixed(4));

  const startMs = Date.parse(session.startedAt);
  const expiryMs = Date.parse(session.expiresAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(expiryMs) || nowMs <= startMs) return 0;

  const boundedNow = Math.min(nowMs, expiryMs);
  const elapsedHours = (boundedNow - startMs) / 3_600_000;
  const generated = elapsedHours * Math.max(0, session.totalMiningRateGbpPerHour);
  return Number(Math.max(0, session.accumulatedOutputGbp + generated).toFixed(4));
}

export function canTransitionMiningState(from: PsemineMiningSession['state'], to: PsemineMiningSession['state']): boolean {
  const transitions: Record<PsemineMiningSession['state'], PsemineMiningSession['state'][]> = {
    inactive: ['active'],
    active: ['paused', 'completed', 'expired'],
    paused: ['active', 'completed', 'expired'],
    completed: [],
    expired: [],
  };
  return transitions[from].includes(to);
}
