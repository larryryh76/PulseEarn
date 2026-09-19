/**
 * One-off production regression (2026-09-19): expired-quote intent recovery,
 * double-click idempotency, and account-switch guard — against the LIVE
 * https://www.pulseearn.online backend with the 2af3459 fixes deployed.
 * Read-only in effect except purchase-intent creation (no funds, no activation).
 */
import fs from 'node:fs';

const PROD = 'https://www.pulseearn.online';
const WALLET_A = '0x1111111111111111111111111111111111111111';
const WALLET_B = '0x2222222222222222222222222222222222222222';

const creds = JSON.parse(fs.readFileSync('/tmp/pse-qa/creds.json', 'utf8'));
const email = creds.email || creds.PSE_TEST_EMAIL;
const password = creds.password || creds.PSE_TEST_PASSWORD;

// Firebase API key from the public production bundle (same path as the harness).
const home = await fetch(PROD, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
const scripts = [...home.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(x => x[1]);
let FB_KEY = null;
for (const s of scripts.slice(0, 12)) {
  const js = await fetch(`${PROD}${s}`).then(r => r.text());
  const m = js.match(/apiKey:"([A-Za-z0-9_-]{20,})"/)
    || js.match(/apiKey":"([A-Za-z0-9_-]{20,})/)
    || js.match(/(AIza[A-Za-z0-9_-]{30,40})/);
  if (m) { FB_KEY = m[1]; break; }
}
if (!FB_KEY) { console.error('NO_API_KEY'); process.exit(1); }

const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
}).then(r => r.json());
if (!signIn.idToken) { console.error('SIGNIN_FAILED', signIn.error?.message); process.exit(1); }
const TOKEN = signIn.idToken;

const api = async (method, url, body) => {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let body2 = null;
  try { body2 = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: body2 };
};

const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. Fresh quote for Starter Miner.
const q = await api('POST', `${PROD}/api/mine/tools/quote`, { toolId: 'starter' });
const quote = q.body?.quote;
check('quote created', q.status === 200 && !!quote?.quoteId, `expires ${quote?.expiresAt}`);

// 2. Create intent with wallet A. Earlier runs already superseded the account's
//    dead 16:36 intent (19:05), so `existing:true` with a LIVE window is the
//    CORRECT fixed behavior — a dead-quote intent is what must never come back.
//    The decisive assertions: the intent handed back carries a live quote window
//    and is bound to wallet A (a dead-quote reuse would fail the window check).
const i1 = await api('POST', `${PROD}/api/mine/purchases/create`, { quoteId: quote.quoteId, paymentWallet: WALLET_A });
if (i1.status !== 200) {
  console.error('CREATE RESPONSE:', i1.status, JSON.stringify(i1.body));
}
const pid1 = i1.body?.purchaseId;
const pur1 = i1.body?.purchase;
check('create accepted with wallet A', i1.status === 200 && !!pid1, `existing=${i1.body?.existing} id=${pid1}`);
const expMs = pur1?.expiresAt ? Date.parse(pur1.expiresAt) : (quote.expiresAt ? Date.parse(quote.expiresAt) : NaN);
check('intent carries a LIVE quote window (no dead-quote reuse)', !Number.isNaN(expMs) && expMs > Date.now(), `expiresAt=${pur1?.expiresAt || quote.expiresAt}`);
check('intent quote matches this fresh quote', pur1?.quoteId === quote.quoteId, pur1?.quoteId);
check('payer bound to wallet A', (pur1?.paymentWallet || '').toLowerCase() === WALLET_A, pur1?.paymentWallet);

// 3. Double-click: two rapid re-creates → idempotent reuse, same id, live window.
const [d1, d2] = await Promise.all([
  api('POST', `${PROD}/api/mine/purchases/create`, { quoteId: quote.quoteId, paymentWallet: WALLET_A }),
  api('POST', `${PROD}/api/mine/purchases/create`, { quoteId: quote.quoteId, paymentWallet: WALLET_A }),
]);
check('rapid re-create #1 reuses same intent', d1.status === 200 && d1.body?.existing === true && d1.body?.purchaseId === pid1, d1.body?.purchaseId);
check('rapid re-create #2 reuses same intent', d2.status === 200 && d2.body?.existing === true && d2.body?.purchaseId === pid1, d2.body?.purchaseId);

// 4. Account switch during purchase: wallet B must be refused while A's intent is live.
const b = await api('POST', `${PROD}/api/mine/purchases/create`, { quoteId: quote.quoteId, paymentWallet: WALLET_B });
check('wallet-B rebind refused (WALLET_MISMATCH)', b.status === 409 && b.body?.error === 'WALLET_MISMATCH', `${b.status} ${b.body?.error}`);

// 5. No ownership, no activation from any of the above (state read).
const st = await api('GET', `${PROD}/api/mine/state`);
check('no tool ownership created', st.status === 200 && (st.body?.tools || []).length === 0, `tools=${(st.body?.tools || []).length}`);
check('state healthy', st.status === 200);

const failed = results.filter(r => !r.pass);
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync('/tmp/pse-expiry-result.json', JSON.stringify({ results, quoteId: quote?.quoteId, purchaseId: pid1, intent: pur1 }, null, 2));
process.exit(failed.length ? 1 : 0);
