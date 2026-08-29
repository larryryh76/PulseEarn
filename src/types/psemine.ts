export type PSEMineCampaignStatus = 
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'settling'
  | 'payout'
  | 'closed'
  | 'archived';

export type PSEToolTierId = 'starter' | 'builder' | 'advanced' | 'elite';

export interface PSEMineToolDefinition {
  id: PSEToolTierId;
  name: string;
  tier: number;
  tagline: string;
  description: string;
  purchasePriceGBP: number; // £3, £10, £50, £200
  hourlyRateGBP: number;    // £0.10, £0.50, £1.20, £2.50
  maxPerUser: number;       // 5, 3, 3, 2
  enabled: boolean;
  version: number;
  displayOrder: number;
  specs: {
    powerEfficiency: string;
    hashRateClass: string;
    warrantyDays: number;
  };
}

export interface PSEMineCampaign {
  id: string;
  name: string;
  status: PSEMineCampaignStatus;
  startAt: string; // ISO String or Firestore timestamp representation
  endAt: string;   // 90 days from start
  durationDays: number; // 90
  currencyDisplay: 'GBP';
  paymentNetwork: 'BNB Smart Chain';
  paymentChainId: number; // 56 for Mainnet, 97 for Testnet
  paymentAsset: 'BNB';
  receiverWalletAddress: string;
  walletChangeDeadline: string; // Cutoff before settlement
  purchaseEnabled: boolean;
  miningEnabled: boolean;
  referralEnabled: boolean;
  totalCapacitiesRegisteredGBPPerHour: number;
  totalAccruedLiabilityGBP: number;
  totalBNBCollected: number;
  totalMinersCount: number;
  shutdownState?: {
    isArchived: boolean;
    archivedAt: string;
    archivedBy: string;
    reason: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PSEMineUser {
  uid: string;
  email?: string;
  username?: string;
  campaignId: string;
  status: 'inactive' | 'active' | 'paused' | 'settling' | 'ended' | 'archived';
  toolCapacityGBPPerHour: number;     // Sum of owned tools (max £10.60/hr)
  referralCapacityGBPPerHour: number; // Qualified referrals * £0.30 (max £1.50/hr)
  totalCapacityGBPPerHour: number;    // toolCapacity + referralCapacity (max £12.10/hr)
  totalAccruedGBP: number;            // Authoritative server-accrued GBP
  lastAccruedAt: string;              // ISO timestamp of last accrual calculation
  miningStartedAt: string | null;
  connectedWallet: string | null;     // 0x...
  payoutWallet: string | null;        // 0x...
  payoutWalletUpdatedAt: string | null;
  qualifiedReferralsCount: number;    // 0 - 5
  toolOwnershipCounts: Record<PSEToolTierId, number>;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PSEMineToolOwnership {
  id: string;
  userId: string;
  toolId: PSEToolTierId;
  toolName: string;
  toolVersion: number;
  purchaseId: string;
  hourlyRateGBP: number;
  purchasePriceGBP: number;
  activatedAt: string;
  status: 'active' | 'revoked' | 'expired';
}

export type PSEMinePurchaseStatus =
  | 'created'
  | 'awaiting_payment'
  | 'transaction_submitted'
  | 'confirming'
  | 'confirmed'
  | 'activated'
  | 'expired'
  | 'underpaid'
  | 'manual_review'
  | 'failed'
  | 'reversed';

export interface PSEMinePurchase {
  id: string;
  userId: string;
  toolId: PSEToolTierId;
  toolName: string;
  toolVersion: number;
  quoteId: string;
  quotedGBPAmount: number;
  quotedBNBAmount: number;
  exchangeRateBNBGBP: number;
  receiverWallet: string;
  paymentWallet: string | null;
  transactionHash: string | null;
  network: string;
  status: PSEMinePurchaseStatus;
  statusMessage?: string;
  confirmations: number;
  requiredConfirmations: number;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  activatedAt: string | null;
}

export type PSEMineReferralStage =
  | 'registered'
  | 'wallet_connected'
  | 'tool_purchased'
  | 'mining_active'
  | 'qualified'
  | 'rejected';

export interface PSEMineReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeEmailMasked?: string;
  refereeUsername: string;
  status: PSEMineReferralStage;
  bonusHourlyRate: number; // 0.30
  capacityContributionGBPPerHour?: number;
  stageHistory: {
    registeredAt: string;
    walletConnectedAt?: string;
    toolPurchasedAt?: string;
    miningActiveAt?: string;
    qualifiedAt?: string;
  };
  createdAt: string;
  qualifiedAt: string | null;
}

export type PSEMinePayoutStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'reversed';

export interface PSEMinePayout {
  id: string;
  userId: string;
  campaignId: string;
  finalGBPAmount: number;
  cryptoAsset: 'BNB' | 'USDT_BSC';
  cryptoAmount: number;
  network: 'BNB Smart Chain';
  destinationWallet: string;
  transactionHash: string | null;
  status: PSEMinePayoutStatus;
  reviewNotes?: string;
  createdAt: string;
  approvedAt?: string | null;
  processedAt: string | null;
}

export type PSEMineActivityType =
  | 'tool_purchased'
  | 'capacity_updated'
  | 'referral_registered'
  | 'referral_qualified'
  | 'mining_accrual'
  | 'wallet_updated'
  | 'campaign_state_changed'
  | 'settlement_prepared'
  | 'payout_completed'
  | 'TOOL_PURCHASE'
  | 'REFERRAL_QUALIFIED'
  | 'WALLET_UPDATE';

export interface PSEMineActivity {
  id: string;
  userId: string;
  type: PSEMineActivityType;
  title: string;
  description: string;
  amountGBP?: number;
  capacityDeltaGBPPerHour?: number;
  referenceId?: string; // purchaseId, referralId, payoutId
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PSEMineQuote {
  quoteId: string;
  userId: string;
  toolId: PSEToolTierId;
  toolVersion: number;
  gbpPrice: number;
  bnbAmount: number;
  exchangeRateBNBGBP: number;
  receiverWallet: string;
  network: string;
  chainId: number;
  createdAt: string;
  expiresAt: string;
}

// 4 LOCKED TOOL ECONOMICS
export const LOCKED_PSEMINE_TOOLS: Record<PSEToolTierId, PSEMineToolDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter Miner',
    tier: 1,
    tagline: 'Entry-level mining capacity for emerging miners',
    description: 'Deploys a lightweight, dedicated mining node with £0.10/hour continuous campaign capacity.',
    purchasePriceGBP: 3,
    hourlyRateGBP: 0.10,
    maxPerUser: 5,
    enabled: true,
    version: 1,
    displayOrder: 1,
    specs: {
      powerEfficiency: '98.4%',
      hashRateClass: 'Class-1 Standard',
      warrantyDays: 90
    }
  },
  builder: {
    id: 'builder',
    name: 'Builder Miner',
    tier: 2,
    tagline: 'Standard production rig for core capacity scaling',
    description: 'Deploys a balanced mining rig delivering £0.50/hour continuous campaign capacity.',
    purchasePriceGBP: 10,
    hourlyRateGBP: 0.50,
    maxPerUser: 3,
    enabled: true,
    version: 1,
    displayOrder: 2,
    specs: {
      powerEfficiency: '99.1%',
      hashRateClass: 'Class-2 Advanced',
      warrantyDays: 90
    }
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced Miner',
    tier: 3,
    tagline: 'High-throughput mining unit for heavy operations',
    description: 'High-density computational node providing £1.20/hour continuous campaign capacity.',
    purchasePriceGBP: 50,
    hourlyRateGBP: 1.20,
    maxPerUser: 3,
    enabled: true,
    version: 1,
    displayOrder: 3,
    specs: {
      powerEfficiency: '99.6%',
      hashRateClass: 'Class-3 Enterprise',
      warrantyDays: 90
    }
  },
  elite: {
    id: 'elite',
    name: 'Elite Miner',
    tier: 4,
    tagline: 'Maximum capability enterprise mining cluster',
    description: 'Institutional-grade mining cluster providing £2.50/hour continuous campaign capacity.',
    purchasePriceGBP: 200,
    hourlyRateGBP: 2.50,
    maxPerUser: 2,
    enabled: true,
    version: 1,
    displayOrder: 4,
    specs: {
      powerEfficiency: '99.9%',
      hashRateClass: 'Class-4 Tier-1',
      warrantyDays: 90
    }
  }
};

// Economic Limits Constants
export const PSEMINE_CONSTANTS = {
  MAX_TOOL_CAPACITY_GBP_PER_HOUR: 10.60, // 5*0.10 + 3*0.50 + 3*1.20 + 2*2.50 = 0.50 + 1.50 + 3.60 + 5.00 = 10.60
  MAX_QUALIFIED_REFERRALS: 5,
  REFERRAL_BONUS_GBP_PER_HOUR: 0.30,
  MAX_REFERRAL_CAPACITY_GBP_PER_HOUR: 1.50, // 5 * 0.30
  MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR: 12.10, // 10.60 + 1.50
  CAMPAIGN_DURATION_DAYS: 90,
  QUOTE_EXPIRATION_MINUTES: 10,
  DEFAULT_BSC_CHAIN_ID: 56,
  DEFAULT_BSC_TESTNET_CHAIN_ID: 97,
  PAYMENT_NETWORK_NAME: 'BNB Smart Chain',
  FALLBACK_BNB_GBP_PRICE: 485.50
};
