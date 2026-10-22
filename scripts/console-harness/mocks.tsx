/**
 * Provider mocks for the console harness — HARNESS ONLY.
 *
 * The real pages are imported unchanged. These modules stand in for the three
 * provider hooks they consume, so the same components the router mounts can be
 * rendered without a Firebase session, and so a fixture can put the page in a
 * state (loading, empty, error, wrong chain) that is otherwise hard to reach.
 *
 * NOTHING HERE IS APPLICATION CODE. `scripts/pse-console-check.mjs` resolves
 * these paths only inside its own esbuild process.
 */
import type { ReactNode } from 'react';
import type { Fixture } from './fixture';

declare global {
  interface Window { __PSE_FIXTURE__?: Fixture }
}

const fixture = (): Fixture => {
  if (!window.__PSE_FIXTURE__) throw new Error('console harness: no fixture installed');
  return window.__PSE_FIXTURE__;
};

/* ── src/contexts/usePSEMineAuth ─────────────────────────────────────────── */
export function usePSEMineAuth() {
  const f = fixture();
  return {
    currentUser: f.currentUser,
    userData: f.userData,
    loading: false,
    isVerified: true,
    hasPSEmineAccess: true,
    logout: async () => undefined,
    sendVerification: async () => undefined,
  };
}

/* ── src/contexts/PSEMineContext ─────────────────────────────────────────── */
const walletCalls = {
  connectWallet: async () => null,
  connectWalletConnectTransport: async () => null,
  disconnectWallet: async () => undefined,
  ensurePaymentChain: async () => false,
  refreshWalletChain: async () => null,
  updatePayoutWallet: async () => ({ success: true }),
  maintainTool: async () => ({ success: true }),
  refreshData: async () => undefined,
  requestQuote: async () => null,
  clearQuote: () => undefined,
  bindPurchaseIntent: async () => ({ success: false }),
  sendPayment: async () => '',
  submitPurchaseTx: async () => ({ success: false }),
};

export function usePSEMine(): Record<string, unknown> {
  const f = fixture();
  return {
    ...walletCalls,
    campaign: f.campaign,
    pseUser: f.state?.user ?? null,
    loading: false,
    liveAccruedGBP: f.state?.user?.accruedGBP ?? 0,
    connectedWallet: f.connectedWallet,
    isConnectingWallet: false,
    walletTransport: f.connectedWallet ? 'injected' : null,
    walletName: f.walletName,
    walletChainId: f.walletChainId,
    injectedWallets: [],
    walletConnectAvailable: false,
    tools: [],
    ownerships: [],
    purchases: [],
    referrals: [],
    activities: [],
    payouts: [],
    activeQuote: null,
    isRequestingQuote: false,
    stateEpoch: 0,
    campaignDaysRemaining: 28,
    isCampaignArchived: false,
  };
}

/* ── src/components/psemine/PseStateProvider ─────────────────────────────── */
export const PseStateProvider = ({ children }: { children?: ReactNode }) => <>{children}</>;

export function usePseState() {
  const f = fixture();
  return {
    state: f.state,
    campaignStatus: f.campaignStatus,
    loading: f.loading,
    error: f.error,
    refreshing: false,
    refresh: async () => undefined,
    feedErrors: f.feedErrors,
    refreshFeed: async () => undefined,
    withdrawals: f.withdrawals,
    referrals: f.referrals,
    referralCode: f.referralCode,
    activities: f.activities,
    notifications: f.notifications,
    unreadNotifications: f.notifications.filter(n => !n.read).length,
    markNotificationRead: async () => undefined,
  };
}

export function useAvailableGBP(): string {
  return fixture().available;
}

/* ── src/firebase/config + firebase/auth ─────────────────────────────────── */
export const auth = {
  currentUser: null,
  onAuthStateChanged: () => () => undefined,
};
export const db = {};
export const storage = {};
export default {};

export class EmailAuthProvider {
  static credential() { return {}; }
}
export const reauthenticateWithCredential = async () => undefined;
export const updatePassword = async () => undefined;
