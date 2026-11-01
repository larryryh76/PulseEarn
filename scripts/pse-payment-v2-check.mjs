import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8');
const tools = read('src/pages/psemine/PSEMineTools.tsx');
const wallet = read('src/pages/psemine/PSEMineWallet.tsx');
const context = read('src/contexts/PSEMineContext.tsx');
const api = read('api/index.py');
const engine = read('api/psemine_engine.py');
const adapter = read('api/psemine_payments_v2.py');
const admin = read('src/pages/admin/AdminPSEMine.tsx');
const referrals = read('api/psemine_core.py');

assert.match(tools, /createHostedPaymentInvoice/);
assert.match(tools, /fetchHostedPaymentStatus/);
assert.match(tools, /Continue to secure checkout/);
assert.doesNotMatch(tools, /connectWallet|sendPayment|ensurePaymentChain|WalletConnect|bnbAmountWei/);
assert.doesNotMatch(wallet, /connectWallet|disconnectWallet|WalletConnect|ensurePaymentChain/);
assert.doesNotMatch(context, /PseEip1193Provider|connectWalletConnect|sendPaymentTransaction|restoreWalletConnectSession/);
assert.match(api, /\/api\/mine\/payments\/v2\/invoices/);
assert.match(api, /\/api\/mine\/payments\/v2\/nowpayments\/ipn/);
assert.match(api, /verify_ipn_signature\(payload, signature, secret\)/);
assert.match(api, /requests\.get\(\s*f"{base}\/payment\//);
assert.match(engine, /def settle_provider_purchase\(/);
assert.match(engine, /psemine_provider_redemptions/);
assert.match(adapter, /hashlib\.sha512/);
assert.match(adapter, /hmac\.compare_digest/);
assert.match(adapter, /def normalize_provider_status/);
assert.match(adapter, /def verify_merchant_account/);
assert.match(api, /psemine_payment_orders_v2/);
assert.match(admin, /paymentProviderConfigured/);
assert.doesNotMatch(admin, /Purchase receiving wallet|saveWallet|receiverWalletAddress/);
assert.match(referrals, /REFERRAL_STAGES = \("registered", "tool_purchased", "mining_active", "qualified"\)/);
assert.match(referrals, /"wallet_connected": "registered"/);

console.log('PASS: PSEmine hosted crypto checkout, provider reconciliation, settlement, admin revenue and wallet-free purchase UX are wired.');
