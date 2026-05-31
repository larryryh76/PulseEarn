import { TaskClaim, UserData } from '../../types';

export class TaskSecuritySystem {
  /**
   * Performs advanced fraud detection on a task claim
   */
  static analyzeClaim(claim: TaskClaim, userData: UserData): string[] {
    const flags: string[] = [];

    // 1. Velocity Check: Too many claims in short time
    if (userData.actionsInLastMinute && userData.actionsInLastMinute > 10) {
      flags.push('VELOCITY_VIOLATION_L1');
    }

    // 2. Proof Analysis: Check for duplicate proof across users
    // (Note: In a real app, this would query a proof hash database)
    if (claim.submittedProof && claim.submittedProof.length < 5) {
      flags.push('PROOF_TOO_SHORT');
    }

    // 3. User Reputation
    if (userData.segment === 'suspicious') {
      flags.push('HIGH_RISK_USER');
    }

    // 4. Time-to-complete (Speed hack check)
    const taskTime = claim.resolvedAt && claim.createdAt
      ? claim.resolvedAt.toDate().getTime() - claim.createdAt.toDate().getTime()
      : 0;

    // If it's a manual task and it was "completed" in < 5 seconds, it's suspicious
    if (taskTime > 0 && taskTime < 5000) {
      flags.push('RAPID_COMPLETION');
    }

    return flags;
  }
}
