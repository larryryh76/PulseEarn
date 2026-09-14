import { 
  doc, 
  getDoc, 
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
  PSEMinePurchase, 
  PSEMineReferral, 
  PSEMineActivity, 
  PSEMineQuote, 
  PSEToolTierId,
  LOCKED_PSEMINE_TOOLS,
  PSEMINE_CONSTANTS
} from '../../types/psemine';

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
    try {
      const campaignRef = doc(db, 'psemine_campaigns', this.CAMPAIGN_DOC_ID);
      const snap = await getDoc(campaignRef);

      if (snap.exists()) {
        return snap.data() as PSEMineCampaign;
      }

      // Try fetching active campaign from backend status endpoint
      const res = await fetch('/api/mine/campaign/status');
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
  public static async maintainTool(ownershipId: string): Promise<{ success: boolean; error?: string; cycleIndex?: number; settledMinor?: number }> {
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
        return { success: false, error: data.message || data.error || 'Maintenance failed.' };
      }
      return { success: true, cycleIndex: data.cycleIndex, settledMinor: data.settledMinor };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Maintenance error.';
      return { success: false, error: errMsg };
    }
  }

  /**
   * Generates an authoritative server-side 15-minute BNB/GBP purchase quote
   */
  public static async generatePurchaseQuote(
    _userId: string, 
    toolId: PSEToolTierId
  ): Promise<PSEMineQuote> {
    const tool = LOCKED_PSEMINE_TOOLS[toolId];
    if (!tool) {
      throw new Error(`Invalid tool tier: ${toolId}`);
    }

    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Authentication required to generate purchase quote.');
    }

    const response = await fetch('/api/mine/tools/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ toolId })
    });

    const resData = await response.json().catch(() => ({}));
    if (response.ok && resData.success && resData.quote) {
      return resData.quote as PSEMineQuote;
    }

    throw new Error(resData.message || resData.error || 'Failed to generate authoritative quote from server.');
  }

  /**
   * Creates a backend-authoritative purchase intent bound to a persisted server quote.
   * (Phase 1: clients no longer write psemine_purchases directly.)
   */
  public static async createPurchaseIntent(
    quote: PSEMineQuote, 
    paymentWallet: string
  ): Promise<PSEMinePurchase> {
    const tool = LOCKED_PSEMINE_TOOLS[quote.toolId];
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Authentication required to create purchase intent.');
    }

    const res = await fetch('/api/mine/purchases/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quoteId: quote.quoteId, paymentWallet })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.purchaseId) {
      throw new Error(data.message || data.error || 'Failed to create purchase intent.');
    }

    return {
      id: data.purchaseId,
      userId: quote.userId,
      toolId: quote.toolId,
      toolName: tool?.name || quote.toolId,
      toolVersion: quote.toolVersion,
      quoteId: quote.quoteId,
      quotedGBPAmount: quote.gbpPrice,
      quotedBNBAmount: quote.bnbAmount,
      exchangeRateBNBGBP: quote.exchangeRateBNBGBP,
      receiverWallet: quote.receiverWallet,
      paymentWallet: paymentWallet.toLowerCase(),
      transactionHash: null,
      network: quote.network,
      status: 'awaiting_payment',
      confirmations: 0,
      requiredConfirmations: 3,
      createdAt: new Date().toISOString(),
      expiresAt: quote.expiresAt,
      confirmedAt: null,
      activatedAt: null
    } as PSEMinePurchase;
  }

  /**
   * Authoritative Tool Purchase Activation & Capacity Recalculation via Secure Backend API
   */
  public static async activateToolPurchase(
    purchaseId: string, 
    txHash: string,
    senderWallet?: string
  ): Promise<{ success: boolean; error?: string; user?: PSEMineUser }> {
    const purchaseRef = doc(db, 'psemine_purchases', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);

    if (!purchaseSnap.exists()) {
      return { success: false, error: 'Purchase intent not found' };
    }

    const purchase = purchaseSnap.data() as PSEMinePurchase;
    if (purchase.status === 'activated') {
      return { success: false, error: 'Purchase already activated' };
    }

    // Call authoritative server endpoint with user Firebase ID token with 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        return { success: false, error: 'Authentication required. Please sign in.' };
      }

      const res = await fetch('/api/mine/tools/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          purchaseId: purchase.id,
          transactionHash: txHash,
          senderWallet: (senderWallet || purchase.paymentWallet || '').toLowerCase(),
          toolId: purchase.toolId
        }),
        signal: controller.signal
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { 
          success: false, 
          error: data.message || data.error || 'On-chain transaction verification failed on BSC.' 
        };
      }

      // Fetch fresh authoritative user record from Firestore
      const userSnap = await getDoc(doc(db, 'psemine_users', purchase.userId));
      const updatedUser = userSnap.exists() ? (userSnap.data() as PSEMineUser) : undefined;

      return { success: true, user: updatedUser };
    } catch (e: unknown) {
      console.error('[PSEMineEngine] activateToolPurchase error:', e);
      const message =
        e instanceof Error
          ? (e.name === 'AbortError' ? 'Verification request timed out. Please verify on BSCScan or retry.' : e.message)
          : typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string'
            ? (e as { message: string }).message
            : 'Server verification failed';
      return { success: false, error: message };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Referral Qualification Engine:
   * Checked authoritatively on backend during tool verification.
   */
  public static async checkRefereeQualification(refereeId: string): Promise<boolean> {
    try {
      const refQuery = query(
        collection(db, 'psemine_referrals'),
        where('refereeId', '==', refereeId),
        limit(1)
      );
      const refSnap = await getDocs(refQuery);
      if (refSnap.empty) return false;
      const ref = refSnap.docs[0].data() as PSEMineReferral;
      return ref.status === 'qualified';
    } catch (e) {
      console.error('[PSEMineEngine] checkRefereeQualification error:', e);
      return false;
    }
  }

  /**
   * Links a new miner to a referrer via the canonical backend registration endpoint.
   * (Phase 1: referral records are created server-side with deterministic identity.)
   */
  /**
   * Result of a referral registration attempt. `retryable` distinguishes
   * transient failures (network/server) from permanent validation failures
   * (self-referral, unknown referrer) so callers only persist retryable ones.
   */
  public static async registerReferral(
    refereeId: string,
    _refereeUsername: string,
    referralCodeInput: string
  ): Promise<{ ok: boolean; retryable: boolean }> {
    void refereeId;
    let code = '';
    let result: { ok: boolean; retryable: boolean } = { ok: false, retryable: true };
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return result;

      code = referralCodeInput.trim();
      const res = await fetch('/api/mine/referrals/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ referralCode: code })
      });
      const data = await res.json().catch(() => ({}));
      result = (res.ok && data.success)
        ? { ok: true, retryable: false }
        : { ok: false, retryable: res.status >= 500 || res.status === 429 };
      return result;
    } catch (e) {
      console.error('[PSEMineEngine] registerReferral error:', e);
      return result;
    } finally {
      // Retain retryable failures in localStorage so the next PSEmine session
      // can re-submit the attribution — signup success never loses the code.
      if (code) {
        try {
          if (result.ok || !result.retryable) {
            localStorage.removeItem(PSEMineEngine.PENDING_REFERRAL_KEY);
          } else {
            localStorage.setItem(
              PSEMineEngine.PENDING_REFERRAL_KEY,
              JSON.stringify({ code, savedAt: Date.now() })
            );
          }
        } catch {
          /* storage unavailable — best effort */
        }
      }
    }
  }

  private static readonly PENDING_REFERRAL_KEY = 'psemine_pending_referral_code';

  /**
   * Re-submits a referral code retained after a transient registration
   * failure. Idempotent server-side (deterministic referral identity), so
   * re-submission is safe. Clears the retained code on success or on a
   * permanent rejection (no point retrying validation failures).
   */
  public static async retryPendingReferral(): Promise<boolean> {
    try {
      const raw = localStorage.getItem(PSEMineEngine.PENDING_REFERRAL_KEY);
      if (!raw) return false;
      const { code } = JSON.parse(raw) as { code?: string };
      if (!code) {
        localStorage.removeItem(PSEMineEngine.PENDING_REFERRAL_KEY);
        return false;
      }
      const result = await PSEMineEngine.registerReferral('', '', code);
      if (result.ok || !result.retryable) {
        localStorage.removeItem(PSEMineEngine.PENDING_REFERRAL_KEY);
      }
      return result.ok;
    } catch {
      return false;
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
      return { success: false, error: data.message || data.error || 'Could not update payout wallet.' };
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
        return { success: false, error: data.message || data.error || 'Could not record wallet.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error recording wallet.' };
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
