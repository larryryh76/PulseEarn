/**
 * VerificationEngine
 *
 * Phase 5 — Verification & Completion Architecture
 * Centralized, standardized verification engine for the PulseEarn platform.
 *
 * Authoritative pipeline:
 * Provider -> Campaign -> Opportunity -> Completion Attempt -> Verification Engine -> Fraud Analysis -> Completion Decision
 */

import { auth } from '../../firebase/config';
import { safeFetch } from '../../utils/api';
import { VerificationType, VerificationStatus } from '../../types';
import { OpportunityStatus } from '../../types/marketplace';

export interface VerificationSubmissionResult {
  success: boolean;
  claimId?: string;
  automated?: boolean;
  status?: string;
  error?: string;
  message?: string;
}

export interface VerificationReviewResult {
  success: boolean;
  claimId?: string;
  status?: string;
  error?: string;
  message?: string;
}

export interface VerificationStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalSubmissions: number;
  fraudBlockedCount: number;
}

export class VerificationEngine {
  /**
   * Check if a verification type requires written/screenshot proof submission.
   */
  static isProofRequired(verificationType?: VerificationType | string): boolean {
    if (!verificationType) return false;
    const norm = verificationType.toLowerCase();
    return ['manual', 'proof', 'screenshot', 'admin_approval'].includes(norm);
  }

  /**
   * Normalize any status string into a standard upper-case VerificationStatus.
   */
  static normalizeState(status?: string): VerificationStatus {
    if (!status) return 'AVAILABLE';
    const upper = status.toUpperCase();
    switch (upper) {
      case 'AVAILABLE': return 'AVAILABLE';
      case 'STARTED':
      case 'IN_PROGRESS': return 'STARTED';
      case 'SUBMITTED': return 'SUBMITTED';
      case 'PENDING':
      case 'AWAITING_VERIFICATION': return 'AWAITING_VERIFICATION';
      case 'VERIFIED': return 'VERIFIED';
      case 'APPROVED':
      case 'COMPLETED': return 'COMPLETED';
      case 'CLAIMED': return 'CLAIMED';
      case 'REJECTED': return 'REJECTED';
      case 'EXPIRED': return 'EXPIRED';
      case 'CANCELLED': return 'CANCELLED';
      default: return 'AVAILABLE';
    }
  }

  /**
   * Convert VerificationStatus to lowercase OpportunityStatus for marketplace display.
   */
  static toOpportunityStatus(verificationState?: string): OpportunityStatus {
    const norm = this.normalizeState(verificationState);
    switch (norm) {
      case 'AVAILABLE': return 'available';
      case 'STARTED': return 'started';
      case 'SUBMITTED': return 'submitted';
      case 'AWAITING_VERIFICATION': return 'pending';
      case 'VERIFIED':
      case 'COMPLETED': return 'completed';
      case 'CLAIMED': return 'claimed';
      case 'REJECTED': return 'rejected';
      case 'EXPIRED': return 'expired';
      case 'CANCELLED': return 'cancelled';
      default: return 'available';
    }
  }

  /**
   * Submit a completion attempt for an opportunity.
   * Delegates to server-authoritative /api/tasks/submit endpoint which runs
   * fraud analysis and verification checks before authorization.
   */
  static async submitCompletionAttempt(
    taskId: string,
    proof?: string
  ): Promise<VerificationSubmissionResult> {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          taskId,
          proof: proof ? proof.trim() : undefined
        })
      });

      if (res.success) {
        return {
          success: true,
          claimId: res.claimId,
          automated: res.automated,
          status: res.automated ? 'VERIFIED' : 'AWAITING_VERIFICATION'
        };
      }

      return {
        success: false,
        error: res.error || res.message || 'SUBMISSION_FAILED'
      };
    } catch (err: any) {
      console.error("[VerificationEngine] Submit Attempt Error:", err);
      return {
        success: false,
        error: err.message || 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * Admin review and decision for a pending claim.
   * Calls server-authoritative /api/admin/claims/review endpoint.
   */
  static async reviewClaim(
    claimId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string
  ): Promise<VerificationReviewResult> {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/admin/claims/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          claimId,
          action,
          rejectionReason: rejectionReason || ''
        })
      });

      if (res.success) {
        return {
          success: true,
          claimId: res.claimId,
          status: res.status
        };
      }

      return {
        success: false,
        error: res.error || res.message || 'REVIEW_FAILED'
      };
    } catch (err: any) {
      console.error("[VerificationEngine] Review Claim Error:", err);
      return {
        success: false,
        error: err.message || 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * Fetch verification statistics for administrative monitoring.
   */
  static async getVerificationStats(): Promise<VerificationStats | null> {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/admin/claims/stats', {
        headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {}
      });

      if (res.success && res.stats) {
        return res.stats as VerificationStats;
      }
      return null;
    } catch (err) {
      console.error("[VerificationEngine] Fetch Stats Error:", err);
      return null;
    }
  }
}
