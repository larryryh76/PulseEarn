/**
 * Marketplace Intelligence Engine
 * 
 * Phase 9 — Operational Intelligence Architecture
 * 
 * Provides unified operational health monitoring, performance telemetry,
 * economy tracking, user engagement analytics, and integrity audit workflows.
 */

import { safeFetch } from '../../utils/api';
import { auth } from '../../firebase/config';
import {
  MarketplaceOpportunity,
  MarketplaceOperationalOverview,
  MarketplaceIntegrityIssue,
  OpportunityCategory
} from '../../types/marketplace';

export class MarketplaceIntelligenceEngine {
  /**
   * Helper to construct admin authorization headers for backend operational endpoints.
   */
  private static async getAdminHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetches full real-time operational overview from backend API.
   */
  public static async fetchOperationalOverview(): Promise<{
    success: boolean;
    data?: MarketplaceOperationalOverview;
    error?: string;
  }> {
    try {
      const headers = await this.getAdminHeaders();
      const res = await safeFetch('/api/admin/marketplace/intelligence/overview', {
        method: 'GET',
        headers
      });

      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to fetch operational overview' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error fetching operational overview';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Triggers global operational integrity audit and optional auto-repair on tasks,
   * providers, campaigns, and eligibility rules.
   */
  public static async runIntegrityAudit(autoRepair: boolean = true): Promise<{
    success: boolean;
    report?: {
      scannedTasks: number;
      scannedProviders: number;
      issuesFound: MarketplaceIntegrityIssue[];
      repairedCount: number;
      auditTimestamp: string;
    };
    error?: string;
  }> {
    try {
      const headers = await this.getAdminHeaders();
      const res = await safeFetch('/api/admin/marketplace/intelligence/integrity-audit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ autoRepair })
      });

      if (res.success && res.report) {
        return { success: true, report: res.report };
      }
      return { success: false, error: res.error || 'Integrity audit failed' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error executing integrity audit';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Client-side helper: Evaluates operational health & quality score for an individual opportunity.
   */
  public static evaluateOpportunityHealth(opportunity: MarketplaceOpportunity): {
    qualityScore: number; // 0-100
    isHealthy: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let score = 100;

    // Check reward
    if (opportunity.reward.points <= 0) {
      score -= 40;
      warnings.push('Zero or negative points reward');
    }

    // Check expiration
    if (opportunity.expiresAt) {
      const expiry = new Date(opportunity.expiresAt).getTime();
      if (expiry < Date.now()) {
        score -= 50;
        warnings.push('Opportunity has passed its expiration date');
      }
    }

    // Check title/description completeness
    if (!opportunity.title || opportunity.title.length < 5) {
      score -= 20;
      warnings.push('Title is missing or too short');
    }

    // Check completion rate vs abandonment
    const compRate = opportunity.engagement.completionRate || 0;
    if (compRate < 0.1 && opportunity.engagement.totalCompletions > 10) {
      score -= 15;
      warnings.push('Unusually low completion rate (< 10%)');
    }

    return {
      qualityScore: Math.max(0, score),
      isHealthy: score >= 70,
      warnings
    };
  }

  /**
   * Client-side helper: Calculates reward distribution by category across a list of opportunities.
   */
  public static calculateCategoryDistribution(
    opportunities: MarketplaceOpportunity[]
  ): Record<OpportunityCategory | string, number> {
    const distribution: Record<string, number> = {};

    for (const opp of opportunities) {
      const cat = opp.metadata.category || 'custom';
      distribution[cat] = (distribution[cat] || 0) + (opp.reward.points || 0);
    }

    return distribution;
  }
}
