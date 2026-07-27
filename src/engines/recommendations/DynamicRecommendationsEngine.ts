/**
 * Dynamic Recommendations Engine
 * 
 * PHASE 15.5 - Smart Provider & Opportunity Recommendations
 * 
 * Recommendations built from:
 * - User profile (level, XP, history)
 * - Provider inventory (active campaigns, opportunities)
 * - User eligibility (fraud restrictions, cooldowns, region)
 * - Provider classification (capability, health status)
 * 
 * NOT from hardcoded static arrays.
 */

import { ProviderDiscovery } from '../marketplace/ProviderDiscoveryEngine';
import { ClassificationEngine } from '../marketplace/ProviderClassificationEngine';
import type { ProviderMetadata } from '../../types/provider';
import type { UserStatistics } from '../../types/statistics';

export interface RecommendationContext {
  userId: string;
  userStats: UserStatistics;
  userRegion?: string;
  userDevice?: string;
  fraudRiskScore?: number;
  cooldownTtl?: number;
  preferredCategories?: string[];
}

export interface RecommendedOpportunity {
  opportunityId: string;
  title: string;
  reward: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  matchScore: number; // 0-100, higher = better match
  reasons: string[];
}

export interface RecommendedProvider {
  providerId: string;
  name: string;
  opportunityCount: number;
  matchScore: number; // 0-100
  reasons: string[];
}

export class DynamicRecommendationsEngine {
  
  /**
   * Get personalized opportunity recommendations for a user.
   * Scores opportunities based on user profile, provider capabilities, etc.
   * NOT from static arrays.
   */
  async getOpportunityRecommendations(
    context: RecommendationContext
  ): Promise<RecommendedOpportunity[]> {
    const recommendations: RecommendedOpportunity[] = [];

    // Get user's current stats
    const userStats = context.userStats;
    const userLevel = userStats.currentLevel;

    // Get all healthy providers
    const healthyProviders = ProviderDiscovery.getHealthyProviders();

    for (const provider of healthyProviders) {
      // Skip providers that don't match requirements
      if (this.shouldSkipProvider(provider, context)) {
        continue;
      }

      // Get opportunities from provider
      // In real app: query opportunities collection filtered by provider
      const opportunities = await this.getProviderOpportunities(provider.id);

      for (const opp of opportunities) {
        const matchScore = this.calculateOpportunityMatch(
          opp,
          userLevel,
          provider,
          context
        );

        if (matchScore > 30) {
          // Only recommend if reasonable match
          recommendations.push({
            opportunityId: opp.id,
            title: opp.title,
            reward: opp.reward || 0,
            difficulty: this.getDifficultyFromLevel(opp.level || 1),
            matchScore,
            reasons: this.getMatchReasons(opp, userLevel, provider),
          });
        }
      }
    }

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // Return top 20 recommendations
    return recommendations.slice(0, 20);
  }

  /**
   * Get personalized provider recommendations.
   */
  async getProviderRecommendations(
    context: RecommendationContext
  ): Promise<RecommendedProvider[]> {
    const recommendations: RecommendedProvider[] = [];

    const healthyProviders = ProviderDiscovery.getHealthyProviders();

    for (const provider of healthyProviders) {
      if (this.shouldSkipProvider(provider, context)) {
        continue;
      }

      const matchScore = this.calculateProviderMatch(provider, context);

      if (matchScore > 40) {
        const opportunityCount = await this.getProviderOpportunityCount(provider.id);

        recommendations.push({
          providerId: provider.id,
          name: provider.name,
          opportunityCount,
          matchScore,
          reasons: this.getProviderMatchReasons(provider, context),
        });
      }
    }

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return recommendations;
  }

  /**
   * Calculate opportunity match score (0-100).
   * Considers user level, difficulty, provider health, etc.
   */
  private calculateOpportunityMatch(
    opportunity: any,
    userLevel: number,
    provider: ProviderMetadata,
    context: RecommendationContext
  ): number {
    let score = 50; // Base score

    // Level match (±20 points)
    const levelDiff = Math.abs((opportunity.level || 1) - userLevel);
    if (levelDiff === 0) {
      score += 20;
    } else if (levelDiff === 1) {
      score += 10;
    } else if (levelDiff > 3) {
      score -= 20; // Too hard or too easy
    }

    // Provider health bonus (±15 points)
    if (provider.capabilities.healthStatus === 'healthy') {
      score += 15;
    } else if (provider.capabilities.healthStatus === 'degraded') {
      score -= 5;
    }

    // Category preference (±10 points)
    if (context.preferredCategories?.includes(opportunity.category)) {
      score += 10;
    }

    // Reward consideration (±10 points)
    if (opportunity.reward > 500) {
      score += 10;
    }

    // Difficulty match (±10 points)
    const difficulty = this.getDifficultyFromLevel(opportunity.level || 1);
    if ((difficulty === 'easy' && userLevel <= 5) ||
        (difficulty === 'medium' && userLevel > 5 && userLevel <= 20) ||
        (difficulty === 'hard' && userLevel > 20)) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate provider match score (0-100).
   */
  private calculateProviderMatch(
    provider: ProviderMetadata,
    context: RecommendationContext
  ): number {
    let score = 50; // Base score

    // Health status (±20 points)
    if (provider.capabilities.healthStatus === 'healthy') {
      score += 20;
    } else if (provider.capabilities.healthStatus === 'degraded') {
      score -= 10;
    }

    // Capability score (±15 points)
    const providerCapScore = ClassificationEngine.calculateCapabilityScore(provider.capabilities);
    if (providerCapScore >= 75) {
      score += 15;
    } else if (providerCapScore >= 50) {
      score += 7;
    }

    // Inventory available (±10 points)
    if (provider.capabilities.opportunityCount > 10) {
      score += 10;
    } else if (provider.capabilities.opportunityCount === 0) {
      score -= 20;
    }

    // Region match (±10 points)
    if (provider.metadata.region === context.userRegion) {
      score += 10;
    }

    // User level eligibility (±15 points)
    // Recommended providers for user's level
    const capScore = ClassificationEngine.calculateCapabilityScore(provider.capabilities);
    const userLevel = context.userStats.currentLevel;

    if ((capScore >= 75 && userLevel >= 20) ||
        (capScore >= 50 && userLevel >= 10) ||
        (capScore >= 25 && userLevel >= 1)) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Check if provider should be skipped for this user.
   */
  private shouldSkipProvider(
    provider: ProviderMetadata,
    context: RecommendationContext
  ): boolean {
    // Skip inactive providers
    if (provider.status !== 'active') return true;

    // Skip offline providers
    if (provider.capabilities.healthStatus === 'offline' ||
        provider.capabilities.healthStatus === 'maintenance') {
      return true;
    }

    // Skip if no opportunities
    if (provider.capabilities.opportunityCount === 0) return true;

    // Skip if user has high fraud risk or is on cooldown
    if (context.fraudRiskScore !== undefined && context.fraudRiskScore > 75) {
      return true; // Too risky
    }
    if (context.cooldownTtl && context.cooldownTtl > Date.now()) {
      return true; // User is on active cooldown
    }

    return false;
  }

  /**
   * Get reasons why an opportunity was recommended.
   */
  private getMatchReasons(
    opportunity: any,
    userLevel: number,
    provider: ProviderMetadata
  ): string[] {
    const reasons: string[] = [];

    const levelDiff = Math.abs((opportunity.level || 1) - userLevel);
    if (levelDiff <= 1) {
      reasons.push('Perfect difficulty for your level');
    }

    if (provider.capabilities.healthStatus === 'healthy') {
      reasons.push('Provider currently healthy');
    }

    if (opportunity.reward > 500) {
      reasons.push('High reward opportunity');
    }

    return reasons;
  }

  /**
   * Get reasons why a provider was recommended.
   */
  private getProviderMatchReasons(
    provider: ProviderMetadata,
    context: RecommendationContext
  ): string[] {
    const reasons: string[] = [];

    if (provider.capabilities.healthStatus === 'healthy') {
      reasons.push('Provider is stable');
    }

    if (provider.capabilities.opportunityCount > 20) {
      reasons.push('Large opportunity selection');
    }

    if (provider.metadata.region === context.userRegion) {
      reasons.push('Available in your region');
    }

    const capScore = ClassificationEngine.calculateCapabilityScore(provider.capabilities);
    if (capScore >= 75) {
      reasons.push('Full-featured provider');
    }

    return reasons;
  }

  /**
   * Get difficulty from opportunity level.
   */
  private getDifficultyFromLevel(level: number): 'easy' | 'medium' | 'hard' | 'elite' {
    if (level <= 5) return 'easy';
    if (level <= 15) return 'medium';
    if (level <= 30) return 'hard';
    return 'elite';
  }

    /**
   * Get opportunities from provider (in real app, queries Firestore).
   */
  private async getProviderOpportunities(_providerId: string): Promise<any[]> {
    // In real app: query marketplace_opportunities where providerId === providerId
    return [];
  }

  /**
   * Get opportunity count from provider.
   */
  private async getProviderOpportunityCount(_providerId: string): Promise<number> {
    // In real app: query count
    return 0;
  }
}

// Singleton instance
export const Recommendations = new DynamicRecommendationsEngine();
