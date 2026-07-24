/**
 * MarketplaceEligibilityEngine
 * 
 * Server-authoritative and client-runnable eligibility evaluator.
 * Determines whether a user qualifies for a Marketplace Opportunity,
 * provides detailed requirement breakdowns, visibility rules, and priority scoring.
 */

import { UserData, UserTask } from '../../types';
import {
  MarketplaceOpportunity,
  OpportunityEligibilityCriteria,
  OpportunityEligibilityResult,
  MarketplaceUserProfile,
} from '../../types/marketplace';

export class MarketplaceEligibilityEngine {
  /**
   * Evaluates eligibility and calculates priority score for an opportunity.
   */
  static evaluate(
    opportunity: MarketplaceOpportunity,
    userData: UserData | null,
    userTask?: UserTask,
    profile?: MarketplaceUserProfile,
    userRegion: string = 'GLOBAL'
  ): OpportunityEligibilityResult {
    // Hidden check from user preferences
    if (profile?.hiddenOpportunities?.includes(opportunity.id)) {
      return {
        eligible: false,
        visibility: 'hidden',
        priorityScore: -1,
        reasons: ['Hidden by user preferences'],
        requirements: [],
      };
    }

    if (!userData) {
      return {
        eligible: false,
        visibility: 'locked',
        priorityScore: 0,
        reasons: ['Authentication required'],
        requirements: [
          {
            label: 'Account Login Required',
            met: false,
            current: 'Guest',
            target: 'Authenticated User',
          },
        ],
      };
    }

    const criteria: OpportunityEligibilityCriteria = opportunity.eligibility || {
      minLevel: opportunity.metadata.minLevel || 1,
      regionRestrictions: opportunity.metadata.regionRestrictions,
    };

    const requirements: OpportunityEligibilityResult['requirements'] = [];
    const reasons: string[] = [];

    // 1. Minimum Level Check
    const minLevel = criteria.minLevel || opportunity.metadata.minLevel || 1;
    const userLevel = userData.level || 1;
    const levelMet = userLevel >= minLevel;
    requirements.push({
      label: `Minimum Experience Level (LVL ${minLevel}+)`,
      met: levelMet,
      current: userLevel,
      target: minLevel,
    });
    if (!levelMet) reasons.push(`Requires Level ${minLevel}`);

    // 2. Minimum XP Check
    if (criteria.minXp) {
      const userXp = userData.xp || 0;
      const xpMet = userXp >= criteria.minXp;
      requirements.push({
        label: `Minimum Total XP (${criteria.minXp.toLocaleString()} XP)`,
        met: xpMet,
        current: userXp,
        target: criteria.minXp,
      });
      if (!xpMet) reasons.push(`Requires ${criteria.minXp} XP`);
    }

    // 3. Account Age Check
    if (criteria.minAccountAgeDays) {
      const rawCreated = (userData as any).createdAt;
      const createdAt = rawCreated?.toDate ? rawCreated.toDate() : new Date(rawCreated || Date.now());
      const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const ageMet = accountAgeDays >= criteria.minAccountAgeDays;
      requirements.push({
        label: `Account Seniority (${criteria.minAccountAgeDays} Days)`,
        met: ageMet,
        current: accountAgeDays,
        target: criteria.minAccountAgeDays,
      });
      if (!ageMet) reasons.push(`Account must be at least ${criteria.minAccountAgeDays} days old`);
    }

    // 4. Task Participation Count
    if (criteria.minTasksCompleted) {
      const tasksCompleted = userData.stats?.tasksCompleted || 0;
      const tasksMet = tasksCompleted >= criteria.minTasksCompleted;
      requirements.push({
        label: `Task Participation (${criteria.minTasksCompleted}+ Completed)`,
        met: tasksMet,
        current: tasksCompleted,
        target: criteria.minTasksCompleted,
      });
      if (!tasksMet) reasons.push(`Requires ${criteria.minTasksCompleted} completed tasks`);
    }

    // 5. Referrals Count
    if (criteria.minReferrals) {
      const referrals = userData.stats?.referralsCount || 0;
      const refMet = referrals >= criteria.minReferrals;
      requirements.push({
        label: `Community Referrals (${criteria.minReferrals}+ Friends)`,
        met: refMet,
        current: referrals,
        target: criteria.minReferrals,
      });
      if (!refMet) reasons.push(`Requires ${criteria.minReferrals} successful referrals`);
    }

    // 6. Email Verification Check
    if (criteria.requiresEmailVerification) {
      const emailVerified = !!(userData as any).emailVerified;
      requirements.push({
        label: 'Verified Email Address',
        met: emailVerified,
        current: emailVerified ? 'Verified' : 'Unverified',
        target: 'Verified',
      });
      if (!emailVerified) reasons.push('Email verification required');
    }

    // 7. Account Trust / Integrity Check
    if (criteria.requiredTrustLevel) {
      const riskLevel = userData.riskLevel || 'LOW';
      const isHighRisk = riskLevel === 'HIGH';
      const trustMet = !isHighRisk;
      requirements.push({
        label: 'Account Integrity Standard',
        met: trustMet,
        current: riskLevel,
        target: 'STABLE',
      });
      if (!trustMet) reasons.push('Account integrity flag present');
    }

    // 8. Region Restrictions Check
    if (criteria.regionRestrictions && criteria.regionRestrictions.length > 0) {
      const isGlobal = criteria.regionRestrictions.includes('GLOBAL') || criteria.regionRestrictions.includes('ALL');
      const inRegion = isGlobal || criteria.regionRestrictions.includes(userRegion);
      requirements.push({
        label: `Geographic Availability (${criteria.regionRestrictions.join(', ')})`,
        met: inRegion,
        current: userRegion,
        target: criteria.regionRestrictions.join(', '),
      });
      if (!inRegion) reasons.push('Opportunity not available in your region');
    }

    // 9. Previous Completion / Cooldown
    if (userTask) {
      if (userTask.status === 'completed' && criteria.maxUserCompletions === 1) {
        requirements.push({
          label: 'One-time Completion',
          met: false,
          current: 'Completed',
          target: 'Available',
        });
        reasons.push('Already completed');
      } else if (userTask.status === 'on_cooldown' || userTask.status === 'cooldown') {
        requirements.push({
          label: 'Cooldown Expiration',
          met: false,
          current: 'On Cooldown',
          target: 'Available',
        });
        reasons.push('Currently on cooldown');
      }
    }

    // 10. Campaign Claims Limit
    if (criteria.maxCampaignClaims && criteria.currentCampaignClaims !== undefined) {
      const claimsAvailable = criteria.currentCampaignClaims < criteria.maxCampaignClaims;
      requirements.push({
        label: 'Campaign Availability Cap',
        met: claimsAvailable,
        current: `${criteria.currentCampaignClaims}/${criteria.maxCampaignClaims}`,
        target: criteria.maxCampaignClaims,
      });
      if (!claimsAvailable) reasons.push('Campaign max claims reached');
    }

    const eligible = requirements.every(r => r.met);
    const visibility = eligible ? 'visible' : (reasons.includes('Hidden by user preferences') ? 'hidden' : 'locked');

    // Priority Scoring Algorithm
    let priorityScore = calculatePriorityScore(opportunity, userData, profile, eligible);

    return {
      eligible,
      visibility,
      priorityScore,
      reasons,
      requirements,
    };
  }
}

/**
 * Calculates priority score for opportunity ordering based on intelligence & user profile.
 */
function calculatePriorityScore(
  opportunity: MarketplaceOpportunity,
  userData: UserData,
  profile?: MarketplaceUserProfile,
  eligible: boolean = true
): number {
  if (!eligible) return 5; // Base score for locked items so they sit at the bottom

  let score = 50; // Base score for eligible items

  // Level affinity bonus
  const userLevel = userData.level || 1;
  score += Math.min(userLevel, 10);

  // 1. Reward Weight
  const points = opportunity.reward.points || 0;
  score += Math.min(Math.floor(points / 200), 25); // Up to +25 for high reward

  // 2. Favorite Provider Bonus
  if (opportunity.providerId && profile?.favouriteProviders?.includes(opportunity.providerId)) {
    score += 20;
  }

  // 3. Category Preference Alignment
  if (profile?.preferredCategories) {
    const categoryWeight = profile.preferredCategories[opportunity.metadata.category] || 0;
    score += Math.min(categoryWeight * 5, 20); // Up to +20 for category affinity
  }

  // 4. Saved Opportunity Bonus
  if (profile?.savedOpportunities?.includes(opportunity.id)) {
    score += 30;
  }

  // 5. Archetype Alignment
  if (profile?.archetype) {
    switch (profile.archetype) {
      case 'new':
        if (opportunity.metadata.category === 'daily' || opportunity.metadata.difficulty === 'easy') {
          score += 25;
        }
        break;
      case 'power_earner':
        if (opportunity.reward.points >= 1000 || opportunity.metadata.difficulty === 'hard') {
          score += 25;
        }
        break;
      case 'high_xp':
        if (opportunity.reward.xp >= 100) {
          score += 20;
        }
        break;
      case 'high_trust':
        if (opportunity.source === 'provider' || opportunity.reward.points >= 500) {
          score += 15;
        }
        break;
      case 'returning':
        if (opportunity.engagement.trending || opportunity.engagement.isNew) {
          score += 20;
        }
        break;
    }
  }

  // 6. Trending & New Bonuses
  if (opportunity.engagement.trending) score += 10;
  if (opportunity.engagement.isNew) score += 10;

  return Math.min(score, 100);
}
