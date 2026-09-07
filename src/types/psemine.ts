export interface PsemineProfile {
  uid: string;
  email: string;
  username: string;
  hasCompletedGuide: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PsemineCampaign {
  id: string;
  name: string;
  type: 'genesis' | 'seasonal' | 'promotional' | 'partner';
  status: 'upcoming' | 'active' | 'paused' | 'completed' | 'expired';
  startDate: string;
  endDate: string;
  durationDays: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PsemineTool {
  id: 'starter' | 'growth' | 'pro' | 'elite' | string;
  name: string;
  tier: 'starter' | 'growth' | 'pro' | 'elite';
  priceGbp: number;
  miningRateGbpPerHour: number;
  maxCopiesPerUser: number;
  campaignId: string;
  isActive: boolean;
  description: string;
}

export interface PsemineToolOwnership {
  id: string;
  userId: string;
  toolId: string;
  orderId: string;
  txHash: string;
  purchasePriceGbp: number;
  miningRateGbpPerHour: number;
  campaignId: string;
  activationState: 'active' | 'paused' | 'expired';
  acquiredAt: string;
  activatedAt: string;
  expiresAt: string;
  accumulatedOutputGbp: number;
  status: 'active' | 'completed' | 'revoked';
}

export interface PsemineMiningSession {
  id: string;
  userId: string;
  campaignId: string;
  state: 'inactive' | 'active' | 'paused' | 'completed' | 'expired';
  activeToolsCount: number;
  baseMiningRateGbpPerHour: number;
  referralBonusGbpPerHour: number;
  totalMiningRateGbpPerHour: number;
  accumulatedOutputGbp: number;
  lastCalculatedAt: string;
  startedAt: string;
  expiresAt: string;
}

export interface PsemineActivity {
  id: string;
  userId: string;
  type:
    | 'ACCOUNT_CREATED'
    | 'GUIDE_COMPLETED'
    | 'ORDER_CREATED'
    | 'TOOL_PURCHASED'
    | 'PAYMENT_CONFIRMED'
    | 'TOOL_ACTIVATED'
    | 'MINING_STARTED'
    | 'MINING_PAUSED'
    | 'MINING_RESUMED'
    | 'REFERRAL_QUALIFIED'
    | 'BONUS_UPDATED'
    | 'WITHDRAWAL_REQUESTED'
    | 'WITHDRAWAL_COMPLETED'
    | 'SECURITY_EVENT';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PsemineHistory {
  id: string;
  userId: string;
  category: 'PURCHASE' | 'MINING' | 'PAYMENT' | 'REFERRAL' | 'WITHDRAWAL' | 'CAMPAIGN';
  referenceId: string;
  amountGbp: number;
  details: string;
  timestamp: string;
}

export interface PsemineReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
  status: 'pending' | 'qualified' | 'rejected';
  bonusRateGbpPerHour: number;
  qualifiedAt?: string;
  createdAt: string;
}

export interface PsemineNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'mining' | 'purchase' | 'payment' | 'referral' | 'campaign' | 'withdrawal' | 'security';
  read: boolean;
  createdAt: string;
}

export interface PsemineOrder {
  id: string;
  userId: string;
  toolId: string;
  priceGbp: number;
  quoteBnbPerGbp: number;
  payableBnbAmount: string;
  payableWeiAmount: string;
  quoteProvider: string;
  quoteTimestamp: string;
  quoteExpiry: string;
  destinationAddress: string;
  chainId: number;
  status: 'pending' | 'quoted' | 'submitted' | 'confirming' | 'confirmed' | 'failed' | 'rejected' | 'expired';
  paymentTxHash?: string;
  createdAt: string;
}

export interface PseminePayment {
  id: string;
  orderId: string;
  userId: string;
  toolId: string;
  priceGbp: number;
  paidBnbAmount: string;
  paidWeiAmount: string;
  asset: 'BNB';
  chainId: number;
  destinationAddress: string;
  txHash: string;
  blockNumber: number;
  status: 'confirmed' | 'failed';
  createdAt: string;
  confirmedAt: string;
}

export interface PsemineWithdrawal {
  id: string;
  userId: string;
  amountGbp: number;
  payoutAddress: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PsemineSupport {
  id: string;
  userId: string;
  subject: string;
  category: 'Mining' | 'Tools' | 'Payment' | 'Wallet' | 'Referral' | 'Withdrawal' | 'Security' | 'General';
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface PsemineAuditLog {
  id: string;
  actorId: string;
  actorType: 'user' | 'admin' | 'system';
  action: string;
  targetId?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface PsemineFraudFlag {
  id: string;
  userId: string;
  flagType:
    | 'DUPLICATE_TX'
    | 'REPLAY_ATTEMPT'
    | 'REFERRAL_FARMING'
    | 'IMPOSSIBLE_RATE'
    | 'SUSPICIOUS_WITHDRAWAL'
    | 'MULTI_ACCOUNT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  status: 'active' | 'investigating' | 'cleared' | 'actioned';
  createdAt: string;
}
