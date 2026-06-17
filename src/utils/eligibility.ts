import { UserData } from '../types';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  requirements: {
    label: string;
    met: boolean;
    current: any;
    target: any;
  }[];
}

/**
 * Calculates whether a user is currently eligible to request a withdrawal.
 * Requirements:
 * - Account age >= 3 days
 * - Level >= 2
 * - Tasks Completed >= 5
 * - Points >= 10,000
 * - No High Risk flags
 */
export function getWithdrawalEligibility(userData: UserData | null): EligibilityResult {
  if (!userData) return { eligible: false, requirements: [] };

  const createdAt = userData.createdAt?.toDate() || new Date();
  const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const requirements = [
    {
      label: 'Minimum Balance (10,000 PTS)',
      met: (userData.points || 0) >= 10000,
      current: userData.points || 0,
      target: 10000
    },
    {
      label: 'Experience Level (LVL 2+)',
      met: (userData.level || 1) >= 2,
      current: userData.level || 1,
      target: 2
    },
    {
      label: 'Task Participation (5+ Tasks)',
      met: (userData.stats?.tasksCompleted || 0) >= 5,
      current: userData.stats?.tasksCompleted || 0,
      target: 5
    },
    {
      label: 'Account Seniority (3 Days)',
      met: accountAgeDays >= 3,
      current: accountAgeDays,
      target: 3
    },
    {
       label: 'Account Integrity',
       met: userData.riskLevel !== 'HIGH',
       current: userData.riskLevel || 'LOW',
       target: 'STABLE'
    }
  ];

  const eligible = requirements.every(r => r.met);
  const firstUnmet = requirements.find(r => !r.met);

  return {
    eligible,
    reason: eligible ? undefined : firstUnmet?.label,
    requirements
  };
}
