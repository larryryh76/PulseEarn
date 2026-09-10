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
   * Initializes or fetches default campaign document
   */
  public static async getOrCreateActiveCampaign(): Promise<PSEMineCampaign> {
    const campaignRef = doc(db, 'psemine_campaigns', this.CAMPAIGN_DOC_ID);
    const snap = await getDoc(campaignRef);

    if (snap.exists()) {
      return snap.data() as PSEMineCampaign;
    }

    const now = new Date();
    const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const initialCampaign: PSEMineCampaign = {
      id: this.CAMPAIGN_DOC_ID,
      name: 'PSEmine Genesis 90-Day Campaign',
      status: 'active',
      startAt: now.toISOString(),
      endAt: end.toISOString(),
      durationDays: 90,
      currencyDisplay: 'GBP',
      paymentNetwork: 'BNB Smart Chain',
      paymentChainId: PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID,
      paymentAsset: 'BNB',
      receiverWalletAddress: PSEMINE_CONSTANTS.DEFAULT_RECEIVER_WALLET,
      walletChangeDeadline: new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      purchaseEnabled: true,
      miningEnabled: true,
      referralEnabled: true,
      totalCapacitiesRegisteredGBPPerHour: 0,
      totalAccruedLiabilityGBP: 0,
      totalBNBCollected: 0,
      totalMinersCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    try {
      await setDoc(campaignRef, initialCampaign);
    } catch (e) {
      console.warn('[PSEMineEngine] Firestore setDoc failed, returning in-memory campaign:', e);
    }

    return initialCampaign;
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
   * Generates a validated 10-minute BNB/GBP purchase quote
   */
  public static async generatePurchaseQuote(
    userId: string, 
    toolId: PSEToolTierId,
    exchangeRateOverride?: number
  ): Promise<PSEMineQuote> {
    const tool = LOCKED_PSEMINE_TOOLS[toolId];
    if (!tool) {
      throw new Error(`Invalid tool tier: ${toolId}`);
    }

    // Attempt authoritative server-side quote generation
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const response = await fetch('/api/mine/tools/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ toolId })
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.quote) {
            return resData.quote as PSEMineQuote;
          }
        }
      }
    } catch (oracleErr) {
      console.warn('[PSEMineEngine] Server quote endpoint unavailable, using direct oracle fallback:', oracleErr);
    }

    // Retrieve or fallback BNB/GBP exchange rate
    let exchangeRate = exchangeRateOverride || PSEMINE_CONSTANTS.FALLBACK_BNB_GBP_PRICE;
    try {
      // Check if server or public oracle has live BNB price
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBGBP');
      if (response.ok) {
        const data = await response.json();
        if (data && data.price && !isNaN(parseFloat(data.price))) {
          exchangeRate = parseFloat(data.price);
        }
      }
    } catch {
      // Fallback rate used
    }

    // Required BNB = GBP price / exchange rate (e.g. £3 / 500 = 0.006 BNB)
    const rawBnbAmount = tool.purchasePriceGBP / exchangeRate;
    // Format to 6 decimal places with precision
    const bnbAmount = parseFloat(rawBnbAmount.toFixed(6));

    const campaign = await this.getOrCreateActiveCampaign();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PSEMINE_CONSTANTS.QUOTE_EXPIRATION_MINUTES * 60 * 1000);

    const quoteId = `quote_${toolId}_${userId.slice(0, 6)}_${Date.now()}`;

    const quote: PSEMineQuote = {
      quoteId,
      userId,
      toolId,
      toolVersion: tool.version,
      gbpPrice: tool.purchasePriceGBP,
      bnbAmount,
      exchangeRateBNBGBP: exchangeRate,
      receiverWallet: campaign.receiverWalletAddress || PSEMINE_CONSTANTS.DEFAULT_RECEIVER_WALLET,
      network: PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME,
      chainId: PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    return quote;
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
      // Find referrer by referral code
      const usersQuery = query(
        collection(db, 'users'),
        where('referralCode', '==', referralCodeInput.toUpperCase().trim()),
        limit(1)
      );
      const userSnap = await getDocs(usersQuery);
      if (userSnap.empty) return false;

      const referrerId = userSnap.docs[0].id;
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
    const now = new Date().getTime();
    const deadline = new Date(campaign.walletChangeDeadline).getTime();

    if (now > deadline) {
      return { 
        success: false, 
        error: 'Payout wallet modification cutoff has passed for this campaign.' 
      };
    }

    if (!newWallet.startsWith('0x') || newWallet.length !== 42) {
      return { success: false, error: 'Invalid BNB Smart Chain wallet address.' };
    }

    const nowIso = new Date().toISOString();
    const userRef = doc(db, 'psemine_users', userId);
    await updateDoc(userRef, {
      payoutWallet: newWallet.toLowerCase(),
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
    const campaignRef = doc(db, 'psemine_campaigns', this.CAMPAIGN_DOC_ID);
    const nowIso = new Date().toISOString();

    await updateDoc(campaignRef, {
      status: 'archived',
      purchaseEnabled: false,
      miningEnabled: false,
      referralEnabled: false,
      shutdownState: {
        isArchived: true,
        archivedAt: nowIso,
        archivedBy: adminUid,
        reason
      },
      updatedAt: nowIso
    });

    return { success: true };
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
