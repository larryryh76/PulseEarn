import { describe, test, expect } from 'bun:test';
import fs from 'fs';

describe('PSEmine Authoritative Core Remediation Tests', () => {
  const apiIndex = fs.readFileSync('api/index.py', 'utf-8');
  const walletCtx = fs.readFileSync('src/contexts/PsemineWalletContext.tsx', 'utf-8');
  const checkout = fs.readFileSync('src/components/mine/BNBPaymentCheckout.tsx', 'utf-8');
  const indexes = fs.readFileSync('firestore.indexes.json', 'utf-8');

  test('1. Payment contract uses single authoritative orders/verify-payment contract', () => {
    expect(checkout).toContain("fetch('/api/psemine/orders/verify-payment'");
    expect(checkout).not.toContain("fetch('/api/psemine/verify-payment'");
    expect(fs.existsSync('src/components/mine/BNBPaymentButton.tsx')).toBe(false);
  });

  test('2. Wallet context uses the selected TrustConnect provider for EIP-1193 state', () => {
    expect(walletCtx).toContain("provider.request<string>({ method: 'eth_chainId' })");
    expect(walletCtx).toContain('connection.wallet.getProvider()');
    expect(walletCtx).toContain("method: 'wallet_switchEthereumChain'");
    expect(walletCtx).not.toContain("isBscNetwork: true");
  });

  test('3. Payment verification enforces sender binding and flags mismatches', () => {
    expect(apiIndex).toContain("intendedPaymentWallet");
    expect(apiIndex).toContain("expected_sender");
    expect(apiIndex).toContain("ORDER_PAYMENT_WALLET_MISSING");
    expect(apiIndex).not.toContain("provided_wallet");
    expect(apiIndex).toContain("SENDER_MISMATCH");
    expect(apiIndex).toContain("status': 'manual_review'");
    expect(apiIndex).toContain("status': 'flagged_mismatch'");
  });

  test('3a. Checkout waits for and preserves the order wallet binding', () => {
    expect(checkout).toContain('paymentWallet = await waitForWalletAddress()');
    expect(checkout).toContain("order.intendedPaymentWallet?.trim().toLowerCase()");
    expect(checkout).toContain('currentWallet !== intendedWallet');
    expect(checkout.indexOf('currentWallet !== intendedWallet')).toBeLessThan(checkout.indexOf('await sendBnbPayment'));
  });

  test('4. BSC confirmation depth is backend-configurable with safe default', () => {
    expect(apiIndex).toContain("PSEMINE_MIN_CONFIRMATIONS = max(1, int(os.environ.get(");
    expect(apiIndex).toContain("INSUFFICIENT_CONFIRMATIONS");
    expect(apiIndex).toContain("eth_blockNumber");
    expect(apiIndex).toContain("'confirmationDepth': block_depth");
  });

  test('5. Hardcoded £500/BNB fallback is completely removed', () => {
    expect(apiIndex).not.toContain("fallback_static");
    expect(apiIndex).not.toContain("price = 500.0");
    expect(apiIndex).toContain("PRICE_SERVICE_UNAVAILABLE");
  });

  test('6. Mining session sync uses deterministic hourly ledger key for idempotency', () => {
    expect(apiIndex).toContain("accrual_{uid}_{hour_slot}");
    expect(apiIndex).toContain("hour_slot = now_dt.strftime('%Y%m%d_%H')");
  });

  test('7. Firestore index coverage includes psemine compound query collections', () => {
    const json: { indexes: Array<{ collectionGroup: string }> } = JSON.parse(indexes);
    const collections = json.indexes.map((idx) => idx.collectionGroup);
    expect(collections).toContain('psemine_orders');
    expect(collections).toContain('psemine_withdrawals');
    expect(collections).toContain('psemine_tool_ownership');
    expect(collections).toContain('psemine_referrals');
    expect(collections).toContain('psemine_mining_ledger');
    expect(collections).toContain('psemine_payments');
  });

  test('8. Single production backend authority in api/index.py with deprecated main.py', () => {
    const mainPy = fs.readFileSync('backend/main.py', 'utf-8');
    expect(mainPy).toContain("DEPRECATED / LEGACY FILE - NON-PRODUCTION");
  });
});
