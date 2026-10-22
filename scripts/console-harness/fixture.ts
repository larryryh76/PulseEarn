/**
 * Fixtures for the authenticated console harness.
 *
 * These are REAL-SHAPED values for the backend's own contracts (/api/mine/state,
 * /api/mine/withdrawals, /api/mine/referrals), including the awkward cases a
 * layout has to survive: a 42-character payout address, a 66-character
 * transaction hash, a long review note. They are harness data only and are never
 * imported by the application.
 */

export type Scenario = 'loading' | 'empty' | 'full' | 'wrongchain' | 'error' | 'settled';

const PAYOUT = '0x8b32A461d3106B3356e9A389DfeB74aC084c8F33';
const CONNECTED = '0x1111111111111111111111111111111111111111';
const HASH = '0x9f1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f901234';

const day = 86_400_000;
const now = Date.now();

const campaign = {
  id: 'camp_90d',
  name: '90-day mining campaign',
  status: 'active',
  startAt: new Date(now - 62 * day).toISOString(),
  endAt: new Date(now + 28 * day).toISOString(),
  durationDays: 90,
  purchaseEnabled: true,
  miningEnabled: true,
  referralEnabled: true,
  paymentNetwork: 'BNB Smart Chain',
  receiverWalletAddress: PAYOUT,
};

const tools = [
  {
    id: 'own_1',
    toolId: 'pse_rig_02',
    toolName: 'PSE Rig 02',
    hourlyRateGBP: 0.55,
    purchasePriceGBP: 299,
    status: 'active',
    cycleState: 'active',
    operatingModel: 'continuous' as const,
    activatedAt: new Date(now - 40 * day).toISOString(),
  },
  {
    id: 'own_2',
    toolId: 'pse_core_01',
    toolName: 'PSE Core 01',
    hourlyRateGBP: 0.25,
    purchasePriceGBP: 120,
    status: 'cycle_complete',
    cycleState: 'cycle_complete',
    operatingModel: 'session' as const,
    sessionDurationHours: 8,
    restartDelayMinutes: 30,
    activatedAt: new Date(now - 71 * day).toISOString(),
  },
];

const withdrawals = [
  {
    id: 'wd_2026_10_20_01',
    status: 'paid',
    amountGBP: 240.5,
    destinationWallet: PAYOUT,
    payoutTxHash: HASH,
    createdAt: new Date(now - 6 * day).toISOString(),
    updatedAt: new Date(now - 5 * day).toISOString(),
  },
  {
    id: 'wd_2026_10_18_02',
    status: 'under_review',
    amountGBP: 90,
    payoutWallet: PAYOUT,
    payoutTxHash: null,
    createdAt: new Date(now - 2 * day).toISOString(),
    reviewNotes:
      'Manual review: the destination address was changed shortly before settlement. Verification usually completes within two business days.',
  },
  {
    id: 'wd_2026_09_30_03',
    status: 'failed',
    amountGBP: 75.25,
    payoutAddress: PAYOUT,
    transactionHash: HASH,
    createdAt: new Date(now - 22 * day).toISOString(),
  },
];

const referrals = [
  {
    id: 'ref_1',
    status: 'qualified',
    refereeUsername: 'northfield.miner.with.a.long.name',
    bonusHourlyRate: 0.1,
    qualifiedAt: new Date(now - 12 * day).toISOString(),
    createdAt: new Date(now - 40 * day).toISOString(),
  },
  {
    id: 'ref_2',
    status: 'mining_active',
    refereeEmailMasked: 'n•••••@longdomain-example.co.uk',
    createdAt: new Date(now - 9 * day).toISOString(),
  },
  {
    id: 'ref_3',
    status: 'registered',
    referrerEmailMasked: 'r•••••@example.com',
    createdAt: new Date(now - 3 * day).toISOString(),
  },
];

const activities = [
  {
    id: 'act_1',
    type: 'purchase_activated',
    title: 'Tool activated — PSE Rig 02',
    description: 'Payment verified on BNB Smart Chain and the mining tool activated on this account.',
    amountGBP: -299,
    createdAt: new Date(now - 40 * day).toISOString(),
  },
  {
    id: 'act_2',
    type: 'referral_qualified',
    title: 'Referral qualified',
    description: 'A referred account purchased its first tool, adding referral capacity.',
    amountGBP: 0.1,
    createdAt: new Date(now - 12 * day).toISOString(),
  },
  {
    id: 'act_3',
    type: 'accrual_checkpoint',
    title: 'Campaign accrual checkpoint',
    description: 'Accrued earnings were banked for the current campaign window.',
    createdAt: new Date(now - day).toISOString(),
  },
  {
    id: 'act_4',
    type: 'maintenance_requested',
    title: 'Session restart requested',
    description: 'PSE Core 01 completed its session and was scheduled to resume after the restart delay.',
    createdAt: new Date(now - 2 * day).toISOString(),
  },
];

const notifications = [
  {
    id: 'n_1',
    type: 'payout',
    title: 'Payout under review',
    message: 'Your payout request of £90.00 is being reviewed.',
    read: false,
    createdAt: new Date(now - 2 * day).toISOString(),
  },
];

const baseUser = {
  accruedMinor: 128450,
  accruedGBP: 1284.5,
  debitedMinor: 0,
  availableMinor: 0,
  toolCapacityGBPPerHour: 0.8,
  referralCapacityGBPPerHour: 0.1,
  totalCapacityGBPPerHour: 0.9,
  qualifiedReferralsCount: 1,
  payoutWallet: PAYOUT,
  connectedWallet: null as string | null,
};

const emptyUser = {
  ...baseUser,
  accruedMinor: 0,
  accruedGBP: 0,
  availableMinor: 0,
  toolCapacityGBPPerHour: 0,
  referralCapacityGBPPerHour: 0,
  totalCapacityGBPPerHour: 0,
  qualifiedReferralsCount: 0,
  payoutWallet: null as string | null,
};

/** The provider-shaped fixture the mocked hooks hand to the real pages. */
export function buildFixture(scenario: Scenario) {
  const loading = scenario === 'loading';
  const error = scenario === 'error'
    ? {
        kind: 'network' as const,
        title: 'The mining account could not be read',
        message: 'The service did not answer, so your figures are not available in this view.',
        retryable: true,
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
      }
    : null;

  const disconnected = scenario === 'empty';
  const chainId = scenario === 'wrongchain' ? 1 : 56;
  const connectedWallet = disconnected ? null : CONNECTED;

  const state = scenario === 'empty'
    ? {
        success: true,
        user: emptyUser,
        tools: [],
        pendingPurchases: [],
        campaign: { ...campaign, status: 'scheduled' },
        effectiveCampaignStatus: 'scheduled',
        serverTimeMs: now,
      }
    : scenario === 'settled'
      ? {
          success: true,
          user: { ...baseUser, availableMinor: 124000, availableGBP: 1240 },
          tools,
          pendingPurchases: [],
          campaign: { ...campaign, status: 'settling' },
          effectiveCampaignStatus: 'settling',
          serverTimeMs: now,
        }
      : {
          success: true,
          user: baseUser,
          tools,
          pendingPurchases: [],
          campaign,
          effectiveCampaignStatus: 'active',
          serverTimeMs: now,
        };

  return {
    loading,
    error,
    state: loading || error ? null : state,
    // `loading` keeps the arrays empty, so a page that renders a real zero while
    // the read is still in flight is caught rather than excused.
    withdrawals: loading || error || scenario === 'empty'
      ? []
      : scenario === 'settled' ? withdrawals.slice(0, 1) : withdrawals,
    referrals: loading || error || scenario === 'empty' ? [] : referrals,
    referralCode: loading || error ? null : 'PSEMINE-90D-4K2Q',
    activities: loading || error || scenario === 'empty' ? [] : activities,
    notifications: loading || error ? [] : notifications,
    feedErrors: {},
    campaignStatus: loading || error ? null : (scenario === 'empty' ? 'scheduled' : scenario === 'settled' ? 'settling' : 'active'),
    campaign,
    connectedWallet,
    walletChainId: connectedWallet ? chainId : null,
    walletName: connectedWallet ? 'Stub Wallet' : null,
    available: loading || error ? '—' : `£${((scenario === 'settled' ? 124000 : 0) / 100).toFixed(2)}`,
    currentUser: {
      uid: 'uid_harness',
      email: 'miner.with.a.long.address@example-domain.co.uk',
      emailVerified: true,
      providerData: [{ providerId: 'password' }],
    },
    userData: {
      username: 'northfield',
      referralCode: 'PSEMINE-90D-4K2Q',
      onboardingCompleted: true,
      productAccess: { psemine: true },
    },
  };
}

export type Fixture = ReturnType<typeof buildFixture>;
