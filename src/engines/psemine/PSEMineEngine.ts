import { 
  doc, 
  getDoc, 
  getDocFromServer, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  PSEMineCampaign, 
  PSEMineUser, 
  PSEMineReferral, 
  PSEMineActivity, 
  PSEToolTierId,
  LOCKED_PSEMINE_TOOLS,
  PSEMINE_CONSTANTS
} from '../../types/psemine';
import {
  pseFailureMessage,
  pseTransportFailureMessage,
  logPseDiagnostic,
} from './pseErrors';

export class PSEMineEngine {
  private static CAMPAIGN_DOC_ID = 'active_campaign';

  /**
   * Calculates live accrued earnings for display or server settlement.
   * Authoritative formula: Tool Capacity + Qualified Referral Capacity * Eligible Time
   */
  public static calculateLiveAccrued(
    user: PSEMineUser, 
    campaign: PSEMineCampaign | null,
    targetTimestampMs: number = Date.now()
  ): number {
    if (!user || user.totalCapacityGBPPerHour <= 0 || !user.lastAccruedAt) {
      return user ? user.totalAccruedGBP : 0;
    }

    if (user.status !== 'active') {
      return user.totalAccruedGBP;
    }

    if (campaign && (campaign.status === 'paused' || campaign.status === 'payout' || campaign.miningEnabled === false)) {
      return user.totalAccruedGBP;
    }

    if (campaign && (campaign.status === 'closed' || campaign.status === 'archived' || campaign.status === 'settling')) {
      // If campaign ended, accrual stops at campaign endAt
      const campaignEndMs = new Date(campaign.endAt).getTime();
      const effectiveEndMs = Math.min(targetTimestampMs, campaignEndMs);
      const lastAccruedMs = new Date(user.lastAccruedAt).getTime();
      
      if (effectiveEndMs <= lastAccruedMs) {
        return user.totalAccruedGBP;
      }
      
      const elapsedHours = (effectiveEndMs - lastAccruedMs) / (1000 * 60 * 60);
      return user.totalAccruedGBP + (user.totalCapacityGBPPerHour * elapsedHours);
    }

    const lastAccruedMs = new Date(user.lastAccruedAt).getTime();
    if (targetTimestampMs <= lastAccruedMs) {
      return user.totalAccruedGBP;
    }

    const elapsedHours = (targetTimestampMs - lastAccruedMs) / (1000 * 60 * 60);
    const addedAccrual = user.totalCapacityGBPPerHour * elapsedHours;
    return Number((user.totalAccruedGBP + addedAccrual).toFixed(6));
  }

  /**
   * Calculates total capacities based on owned tools and qualified referrals
   */
  public static computeCapacities(
    toolCounts: Record<PSEToolTierId, number>,
    qualifiedReferralsCount: number
  ): {
    toolCapacityGBPPerHour: number;
    referralCapacityGBPPerHour: number;
    totalCapacityGBPPerHour: number;
  } {
    let toolCapacity = 0;
    
    // Sum all tool rates
    (Object.keys(LOCKED_PSEMINE_TOOLS) as PSEToolTierId[]).forEach((tier) => {
      const count = Math.min(toolCounts[tier] || 0, LOCKED_PSEMINE_TOOLS[tier].maxPerUser);
      toolCapacity += count * LOCKED_PSEMINE_TOOLS[tier].hourlyRateGBP;
    });

    // Tool capacity capped at £10.60/hr
    toolCapacity = Math.min(toolCapacity, PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR);

    // Referral bonus: +£0.30/hr per qualified referral, capped at 5 (£1.50/hr)
    const validReferrals = Math.min(Math.max(0, qualifiedReferralsCount), PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS);
    const referralCapacity = validReferrals * PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

    // Total theoretical maximum: £12.10/hr
    const totalCapacity = Number((toolCapacity + referralCapacity).toFixed(2));

    return {
      toolCapacityGBPPerHour: Number(toolCapacity.toFixed(2)),
      referralCapacityGBPPerHour: Number(referralCapacity.toFixed(2)),
      totalCapacityGBPPerHour: Math.min(totalCapacity, PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)
    };
  }

  /**
   * Fetches active campaign document from Firestore or authoritative backend endpoint
   */
  public static async getOrCreateActiveCampaign(): Promise<PSEMineCampaign | null> {
    // READ ORDER IS LOAD-BEARING. The Firestore document is the authoritative
    // record for an ENTITLED miner, but firestore.rules scope `psemine_campaigns`
    // to hasPSEMineAccess(uid): for a signed-out visitor or a PulseEarn-only
    // account this read is DENIED and REJECTS. Previously that rejection escaped
    // the one shared try block, so the public backend projection below was never
    // fetched and the caller received null — which the public landing rendered as
    // "Scheduled / Day 0" even while the campaign was genuinely active. The two
    // lookups are now independent: denial of the restricted document degrades to
    // the backend's public projection instead of to no campaign at all.
    try {
      const campaignRef = doc(db, 'psemine_campaigns', this.CAMPAIGN_DOC_ID);
      const snap = await getDocFromServer(campaignRef);

      if (snap.exists()) {
        return snap.data() as PSEMineCampaign;
      }
    } catch (e) {
      // Expected for a caller without PSEmine access. Not an error state: the
      // public projection served by the backend is the campaign view for them.
      console.warn('[PSEMineEngine] campaign document read unavailable; using public projection:', e);
    }

    // Public projection (GET /api/mine/campaign/status): the same authoritative
    // campaign, served to any caller. This is the ONLY campaign source a
    // signed-out visitor can reach, so it must not be gated behind the
    // restricted document read.
    try {
      const res = await fetch('/api/mine/campaign/status', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.success && json.campaign) {
          return json.campaign as PSEMineCampaign;
        }
      }
    } catch (e) {
      console.warn('[PSEMineEngine] getOrCreateActiveCampaign lookup notice:', e);
    }

    return null;
  }

  /**
   * Initializes a PSEmine user profile if not yet created
   */
  public static async getOrCreatePSEUser(
    uid: string, 
    email?: string | null, 
    username?: string
  ): Promise<PSEMineUser> {
    const userRef = doc(db, 'psemine_users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data() as PSEMineUser;
    }

    const now = new Date().toISOString();
    const initialUser: PSEMineUser = {
      uid,
      email: email || undefined,
      username: username || `Miner_${uid.slice(0, 5)}`,
      campaignId: this.CAMPAIGN_DOC_ID,
      status: 'inactive',
      toolCapacityGBPPerHour: 0,
      referralCapacityGBPPerHour: 0,
      totalCapacityGBPPerHour: 0,
      totalAccruedGBP: 0,
      lastAccruedAt: now,
      miningStartedAt: null,
      connectedWallet: null,
      payoutWallet: null,
      payoutWalletUpdatedAt: null,
      qualifiedReferralsCount: 0,
      toolOwnershipCounts: {
        starter: 0,
        builder: 0,
        advanced: 0,
        elite: 0
      },
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(userRef, initialUser);
      // Log initial activity
      await this.logActivity(uid, {
        type: 'campaign_state_changed',
        title: 'Joined PSEmine Campaign',
        description: 'Enrolled in the 90-day Genesis mining campaign.'
      });
    } catch (e) {
      console.warn('[PSEMineEngine] User profile creation fallback:', e);
    }

    return initialUser;
  }

  /**
   * Explicit PSEmine enrollment — POST /api/mine/enroll.
   *
   * Entitlement is opt-in and backend-authoritative: the client cannot write
   * users/{uid}.productAccess (firestore.rules permit only a fixed field
   * whitelist on owner updates), and simply browsing /mine must never grant
   * product access. A signed-in user who is not enrolled calls this once; the
   * backend sets productAccess.psemine, writes the audit record, and creates
   * the zeroed bootstrap profile. AuthContext's users/{uid} listener then
   * propagates the entitlement live — no reload, no second identity.
   */
  public static async enroll(): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        return { success: false, error: 'NOT_AUTHENTICATED', message: 'Your session has expired. Please sign in again.' };
      }
      const response = await fetch('/api/mine/enroll', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) return { success: true };
      return {
        success: false,
        error: data.error || 'ENROLLMENT_FAILED',
        message: pseFailureMessage('POST /api/mine/enroll', response.status, data),
      };
    } catch (e) {
      return {
        success: false,
        error: 'NETWORK',
        message: pseTransportFailureMessage('POST /api/mine/enroll', e),
      };
    }
  }

  /**
   * Phase 2: triggers the CANONICAL server-side accrual checkpoint via
   * GET /api/mine/state. Frontend timing is never authoritative; this call
   * lets the backend settle eligible operating time and returns the current
   * ledger-backed accrued balance.
   */
  public static async syncAccrual(uid: string): Promise<number> {
    void uid; // uid implied by the Firebase token
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return 0;
      const res = await fetch('/api/mine/state', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return typeof data?.user?.accruedGBP === 'number' ? data.user.accruedGBP : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Phase 2: free operating-cycle maintenance via
   * POST /api/mine/tools/{ownershipId}/maintain. Restores future earning
   * eligibility; no reward is minted by maintenance itself.
   */
  public static async maintainTool(ownershipId: string): Promise<{ success: boolean; error?: string; cycleIndex?: number; settledMinor?: number; resumesAt?: string; restartDelayMinutes?: number }> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return { success: false, error: 'Authentication required.' };
      const res = await fetch(`/api/mine/tools/${encodeURIComponent(ownershipId)}/maintain`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: pseFailureMessage(
            `POST /api/mine/tools/${ownershipId}/maintain`, res.status, data,
          ),
        };
      }
      return { success: true, cycleIndex: data.cycleIndex, settledMinor: data.settledMinor, resumesAt: data.resumesAt, restartDelayMinutes: data.restartDelayMinutes };
    } catch (e: unknown) {
      return {
        success: false,
        error: pseTransportFailureMessage(
          `POST /api/mine/tools/${ownershipId}/maintain`, e,
        ),
      };
    }
  }

  /**
   * Updates user payout wallet via the backend (server-controlled, cutoff enforced
   * server-side per campaign state — frontend values are never authoritative).
   */
  public static async updatePayoutWallet(
    newWallet: string
  ): Promise<{ success: boolean; error?: string }> {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      return { success: false, error: 'Authentication required. Please sign in.' };
    }

    const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
    if (!EVM_ADDRESS_REGEX.test(newWallet.trim())) {
      return { success: false, error: 'Invalid BNB Smart Chain address format (must be 42-character hex starting with 0x).' };
    }

    const res = await fetch('/api/mine/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ wallet: newWallet.trim() })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: pseFailureMessage('POST /api/mine/wallet (payout)', res.status, data),
      };
    }
    return { success: true };
  }

  /**
   * Records the connected wallet server-side without changing the payout destination.
   */
  public static async setConnectedWallet(
    wallet: string
  ): Promise<{ success: boolean; error?: string }> {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) return { success: false, error: 'Authentication required.' };
    try {
      const res = await fetch('/api/mine/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ wallet, updatePayout: false })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: pseFailureMessage('POST /api/mine/wallet (connected)', res.status, data),
        };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: pseTransportFailureMessage('POST /api/mine/wallet (connected)', e),
      };
    }
  }

  /**
   * Super Admin Kill Switch & Archival Process
   */
  public static async triggerCampaignShutdown(
    adminUid: string, 
    reason: string = 'Campaign Duration Reached & Settled'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        return { success: false, error: 'Authentication required for campaign shutdown.' };
      }
      const response = await fetch('/api/admin/mine/campaign/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'shutdown', reason, adminUid })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.message || data.error || 'Failed to trigger campaign shutdown.' };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Server error during campaign shutdown.';
      return { success: false, error: errMsg };
    }
  }

  /**
   * DEPRECATED client activity write (Phase 1): activity is server-authoritative
   * (psemine_activities written by the backend). Kept as a no-op for signature
   * compatibility with existing call sites.
   */
  public static async logActivity(
    userId: string, 
    data: Omit<PSEMineActivity, 'id' | 'userId' | 'createdAt'>
  ): Promise<void> {
    void userId;
    void data;
  }
}
