import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
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
   * Calculates current accrued earnings up to current client/server time
   */
  public static async syncAccrual(uid: string): Promise<number> {
    const userRef = doc(db, 'psemine_users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return 0;

    const user = snap.data() as PSEMineUser;
    const campaign = await this.getOrCreateActiveCampaign();
    return this.calculateLiveAccrued(user, campaign);
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
   * Creates a purchase intent in Firestore
   */
  public static async createPurchaseIntent(
    quote: PSEMineQuote, 
    paymentWallet: string
  ): Promise<PSEMinePurchase> {
    const tool = LOCKED_PSEMINE_TOOLS[quote.toolId];
    const purchaseId = `pse_pur_${quote.toolId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const purchase: PSEMinePurchase = {
      id: purchaseId,
      userId: quote.userId,
      toolId: quote.toolId,
      toolName: tool.name,
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
      requiredConfirmations: 2,
      createdAt: new Date().toISOString(),
      expiresAt: quote.expiresAt,
      confirmedAt: null,
      activatedAt: null
    };

    const purchaseRef = doc(db, 'psemine_purchases', purchaseId);
    await setDoc(purchaseRef, purchase);

    return purchase;
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
   * Links a new miner to a referrer via referral code
   */
  public static async registerReferral(
    refereeId: string, 
    refereeUsername: string, 
    referralCodeInput: string
  ): Promise<boolean> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      let referrerId: string | null = null;

      // 1. Try server-side lookup endpoint
      if (token) {
        try {
          const resp = await fetch('/api/referrals/lookup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ referralCode: referralCodeInput.toUpperCase().trim() })
          });
          if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            if (data.success && data.referrerId) {
              referrerId = data.referrerId;
            }
          }
        } catch {
          // Fallback to client query
        }
      }

      // 2. Fallback query
      if (!referrerId) {
        const usersQuery = query(
          collection(db, 'users'),
          where('referralCode', '==', referralCodeInput.toUpperCase().trim()),
          limit(1)
        );
        const userSnap = await getDocs(usersQuery).catch(() => null);
        if (userSnap && !userSnap.empty) {
          referrerId = userSnap.docs[0].id;
        }
      }

      if (!referrerId) return false;
      if (referrerId === refereeId) return false; // Prevent self-referral

      const refId = `pse_ref_${referrerId.slice(0, 5)}_${refereeId.slice(0, 5)}_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const referralRecord: PSEMineReferral = {
        id: refId,
        referrerId,
        refereeId,
        refereeUsername,
        status: 'registered',
        bonusHourlyRate: PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR,
        stageHistory: {
          registeredAt: nowIso
        },
        createdAt: nowIso,
        qualifiedAt: null
      };

      await setDoc(doc(db, 'psemine_referrals', refId), referralRecord);

      await this.logActivity(referrerId, {
        type: 'referral_registered',
        title: 'New Miner Invited',
        description: `${refereeUsername} registered with your referral code. Awaiting wallet connection and tool deployment.`,
        referenceId: refId
      });

      return true;
    } catch (e) {
      console.error('[PSEMineEngine] registerReferral error:', e);
      return false;
    }
  }

  /**
   * Updates user payout wallet before settlement cutoff
   */
  public static async updatePayoutWallet(
    userId: string, 
    newWallet: string
  ): Promise<{ success: boolean; error?: string }> {
    const campaign = await this.getOrCreateActiveCampaign();
    if (campaign?.walletChangeDeadline) {
      const now = new Date().getTime();
      const deadline = new Date(campaign.walletChangeDeadline).getTime();

      if (now > deadline) {
        return { 
          success: false, 
          error: 'Payout wallet modification cutoff has passed for this campaign.' 
        };
      }
    }

    const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
    if (!EVM_ADDRESS_REGEX.test(newWallet.trim())) {
      return { success: false, error: 'Invalid BNB Smart Chain address format (must be 42-character hex starting with 0x).' };
    }

    const nowIso = new Date().toISOString();
    const userRef = doc(db, 'psemine_users', userId);
    await updateDoc(userRef, {
      payoutWallet: newWallet.trim().toLowerCase(),
      payoutWalletUpdatedAt: nowIso,
      updatedAt: nowIso
    });

    await this.logActivity(userId, {
      type: 'wallet_updated',
      title: 'Payout Wallet Updated',
      description: `Settlement crypto payout destination locked to ${newWallet.slice(0, 6)}...${newWallet.slice(-4)}`
    });

    return { success: true };
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
   * Logs a structured event in PSEmine user activity collection
   */
  public static async logActivity(
    userId: string, 
    data: Omit<PSEMineActivity, 'id' | 'userId' | 'createdAt'>
  ): Promise<void> {
    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const activity: PSEMineActivity = {
        id: actId,
        userId,
        ...data,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'psemine_users', userId, 'activity', actId), activity);
    } catch (e) {
      console.warn('[PSEMineEngine] Activity log write notice:', e);
    }
  }
}
