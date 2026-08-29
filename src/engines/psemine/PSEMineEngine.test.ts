// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { PSEMineEngine } from './PSEMineEngine';
import { PSEMineCampaign, PSEMineUser } from '../../types/psemine';

describe('PSEMine Capacity & Accrual Calculations', () => {
  test('computeCapacities calculates correct rates for 0 tools', () => {
    const capacities = PSEMineEngine.computeCapacities({
      starter: 0,
      builder: 0,
      advanced: 0,
      elite: 0
    }, 0);

    expect(capacities.toolCapacityGBPPerHour).toBe(0);
    expect(capacities.referralCapacityGBPPerHour).toBe(0);
    expect(capacities.totalCapacityGBPPerHour).toBe(0);
  });

  test('computeCapacities calculates max stacked tool capacity (£10.60/hr)', () => {
    const capacities = PSEMineEngine.computeCapacities({
      starter: 5,  // 5 * 0.10 = 0.50
      builder: 3,  // 3 * 0.50 = 1.50
      advanced: 3, // 3 * 1.20 = 3.60
      elite: 2     // 2 * 2.50 = 5.00
    }, 0);

    expect(capacities.toolCapacityGBPPerHour).toBe(10.60);
    expect(capacities.referralCapacityGBPPerHour).toBe(0);
    expect(capacities.totalCapacityGBPPerHour).toBe(10.60);
  });

  test('computeCapacities caps tool ownership at limits', () => {
    const capacities = PSEMineEngine.computeCapacities({
      starter: 10, // Max 5 allowed -> 0.50
      builder: 10, // Max 3 allowed -> 1.50
      advanced: 10, // Max 3 allowed -> 3.60
      elite: 10     // Max 2 allowed -> 5.00
    }, 0);

    expect(capacities.toolCapacityGBPPerHour).toBe(10.60);
  });

  test('computeCapacities calculates max referral boost (£1.50/hr for 5 referrals)', () => {
    const capacities = PSEMineEngine.computeCapacities({
      starter: 0,
      builder: 0,
      advanced: 0,
      elite: 0
    }, 5);

    expect(capacities.referralCapacityGBPPerHour).toBe(1.50);
    expect(capacities.totalCapacityGBPPerHour).toBe(1.50);
  });

  test('computeCapacities caps referral count at 5', () => {
    const capacities = PSEMineEngine.computeCapacities({
      starter: 0,
      builder: 0,
      advanced: 0,
      elite: 0
    }, 10); // 10 referrals requested, capped at 5

    expect(capacities.referralCapacityGBPPerHour).toBe(1.50);
    expect(capacities.totalCapacityGBPPerHour).toBe(1.50);
  });

  test('computeCapacities calculates theoretical maximum capacity (£12.10/hr)', () => {
    const capacities = PSEMineEngine.computeCapacities({
      starter: 5,
      builder: 3,
      advanced: 3,
      elite: 2
    }, 5);

    expect(capacities.toolCapacityGBPPerHour).toBe(10.60);
    expect(capacities.referralCapacityGBPPerHour).toBe(1.50);
    expect(capacities.totalCapacityGBPPerHour).toBe(12.10);
  });

  test('calculateLiveAccrued calculates correct accrued earnings over time', () => {
    const nowMs = Date.now();
    const tenHoursAgo = new Date(nowMs - 10 * 3600 * 1000).toISOString();

    const mockUser: Partial<PSEMineUser> = {
      uid: 'user_1',
      status: 'active',
      totalCapacityGBPPerHour: 3.20,
      totalAccruedGBP: 10.00,
      lastAccruedAt: tenHoursAgo
    };

    const live = PSEMineEngine.calculateLiveAccrued(mockUser as PSEMineUser, null, nowMs);
    // 10.00 + (3.20 * 10) = 42.00
    expect(live).toBe(42.00);
  });

  test('calculateLiveAccrued freezes accrual after campaign end', () => {
    const campaignStart = new Date(Date.now() - 100 * 24 * 3600 * 1000); // 100 days ago
    const campaignEnd = new Date(campaignStart.getTime() + 90 * 24 * 3600 * 1000); // Ended 10 days ago

    const mockCampaign: Partial<PSEMineCampaign> = {
      id: 'active_campaign',
      status: 'settling',
      endAt: campaignEnd.toISOString()
    };

    const mockUser: Partial<PSEMineUser> = {
      uid: 'user_1',
      status: 'active',
      totalCapacityGBPPerHour: 10.00,
      totalAccruedGBP: 100.00,
      lastAccruedAt: new Date(campaignEnd.getTime() - 2 * 3600 * 1000).toISOString() // 2 hours before campaign end
    };

    // Current time is 10 days after campaign end
    const live = PSEMineEngine.calculateLiveAccrued(mockUser as PSEMineUser, mockCampaign as PSEMineCampaign, Date.now());

    // Should accrue ONLY 2 hours (up to campaignEnd), NOT 10 days!
    // 100.00 + (10.00 * 2) = 120.00
    expect(live).toBe(120.00);
  });
});
