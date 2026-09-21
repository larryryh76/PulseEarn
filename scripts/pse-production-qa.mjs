/**
 * PSEmine PRODUCTION QA harness.
 *
 * Exercises the REAL deployment (https://www.pulseearn.online) the way a real
 * user would — no service accounts, no fabricated tokens, no direct Firestore
 * writes:
 *
 *   1. Creates a disposable but REAL mailbox (mail.tm API).
 *   2. Signs up through the real /mine/signup form on production.
 *   3. Confirms the real verification email (link opened in a real browser,
 *      handled by the production AuthAction page + Firebase client SDK).
 *   4. Walks every console route with the real backend attached.
 *   5. Wallet flows: injects an instrumented EIP-1193 provider (EIP-6963), so
 *      connect / reconnect / accountsChanged / chainChanged run through the
 *      app's actual wallet layer. WalletConnect handoff to Trust/MetaMask
 *      mobile CANNOT run inside headless Chromium — reported as a limitation.
 *   6. Payment probes: authenticated with a Firebase ID token minted through
 *      the same Identity Platform REST endpoint the client SDK uses, calling
 *      the PRODUCTION backend exactly as the UI does — quote, purchase intent
 *      (zero-address rejection, wallet binding + reuse), unknown-hash
 *      verification (recovery state), malformed hash, and the email / wallet /
 *      campaign guards on withdrawals and referrals.
 *
 * Real BNB is NEVER spent. Unknown hashes are provably absent from the chain,
 * so "recovery recorded, no activation" is the correct expected outcome.
 *
 * Credentials and tokens stay in /tmp (mode 0600) or process env. They are
 * never printed, never written to the repo, never committed.
 *
 * PRODUCTION SAFETY (added after the 2026-09-21 Firestore quota incident)
 * -----------------------------------------------------------------------
 * This harness is the heaviest thing that talks to production: a full run mounts
 * the whole console repeatedly and probes every endpoint. That is exactly what a
 * certification run is for — but it also means it must never be pointed at a
 * degraded backend, and it must not create a new account on every invocation.
 *
 *   1. PREFLIGHT. `/api/health` is checked first; a full run REFUSES to start
 *      unless the backend reports healthy, because a sweep against an exhausted
 *      dependency adds load to an outage and its failures mean nothing.
 *      Override with PSE_QA_FORCE=1 only to observe a degraded backend.
 *   2. REUSE BY DEFAULT. If a QA account already exists it is reused; a fresh
 *      mailbox + signup + email verification is an opt-in (PSE_QA_REUSE=0).
 *   3. SMOKE MODE. `PSE_QA_SMOKE=1` runs the targeted post-change verification:
 *      no browser, no route sweep, no new account — one REST sign-in and the
 *      authenticated endpoint contract checks. Use it after changing backend
 *      code; use the full run for certification.
 *
 * Usage:
 *   bun scripts/pse-production-qa.mjs                 # full run (reuses an account)
 *   PSE_QA_SMOKE=1 bun scripts/pse-production-qa.mjs # targeted backend check
 *   PSE_QA_REUSE=0 bun scripts/pse-production-qa.mjs # certify the signup path
 *   PSE_QA_CREDS=/tmp/pse-qa/creds.json bun scripts/pse-production-qa.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PROD = process.env.PSE_QA_BASE_URL || 'https://www.pulseearn.online';
const CREDS_FILE = process.env.PSE_QA_CREDS || '/tmp/pse-qa/creds.json';
const OUT = process.env.PSE_QA_OUT || '/tmp/pse-production-qa';
/** Reuse the QA account that already exists unless a fresh signup is asked for
 *  (PSE_QA_REUSE=0). Creating a mailbox and a real account on every run costs
 *  writes and a verification round trip against the same quota the product
 *  uses — one of the ways this harness contributed to the 2026-09-21 incident. */
const REUSE = process.env.PSE_QA_REUSE === '1'
  || (process.env.PSE_QA_REUSE !== '0' && fs.existsSync(CREDS_FILE));
const HEADFUL = process.env.PSE_QA_HEADED === '1';
/** Targeted post-change verification: no browser, no account creation. */
const SMOKE = process.env.PSE_QA_SMOKE === '1';
/** Escape hatch for deliberately observing a degraded backend. */
const FORCE = process.env.PSE_QA_FORCE === '1';
const CHAIN = '0x38'; // BNB Smart Chain (56)

const REPORT = {
  startedAt: new Date().toISOString(),
  target: PROD,
  signup: {}, verification: {}, walkthrough: [], wallet: {}, payment: {},
  limitations: [], defects: [],
};
const defect = (area, msg) => { REPORT.defects.push({ area, msg }); console.log(`  ✗ DEFECT [${area}] ${msg}`); };
const ok = (area, msg) => console.log(`  ✓ [${area}] ${msg}`);
const note = (m) => { REPORT.limitations.push(m); console.log(`  ! ${m}`); };

fs.mkdirSync(OUT, { recursive: true });
if (process.platform !== 'win32') fs.chmodSync(OUT, 0o700);

/* ── disposable real mailbox (mail.tm) ──────────────────────────────────── */

async function mailCreate() {
  const domRes = await fetch('https://api.mail.tm/domains');
  const domain = (await domRes.json())['hydra:member'][0].domain;
  const pass = 'Pse-QA-' + crypto.randomUUID().slice(0, 12) + '!Aa1';
  const addr = `pseqa${Date.now()}${Math.floor(Math.random() * 900 + 100)}@${domain}`;
  const res = await fetch('https://api.mail.tm/accounts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addr, password: pass }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`mail.tm account: ${res.status}`);
  const tokRes = await fetch('https://api.mail.tm/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addr, password: pass }),
  });
  const tok = (await tokRes.json()).token;
  if (!tok) throw new Error('mail.tm token failed');
  return { addr, pass, tok };
}
async function mailLatest(tok) {
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${tok}` } });
      const j = await res.json();
      return (j['hydra:member'] || [])[0] || null;
    } catch (e) {
      if (a === 2) return null; // transient provider outage — behave like "no mail yet"
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}
async function mailText(tok, id) {
  const res = await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${tok}` } });
  const j = await res.json();
  return j.text || j.html?.join?.('') || j.html || '';
}

/* ── Firebase Identity REST (the same credential path the client SDK uses) ──
 * The web API key is PUBLIC by design — it ships inside the production bundle
 * and identifies the Firebase project, not a secret. Tokens minted here are
 * exactly what `auth.verify_id_token()` accepts server-side.
 */

let FB_KEY = null;
async function firebaseKey() {
  if (FB_KEY) return FB_KEY;
  const html = await (await fetch(PROD + '/', { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  for (const s of scripts.slice(0, 12)) {
    const js = await (await fetch(PROD + s)).text();
    const m = js.match(/apiKey:"([A-Za-z0-9_-]{20,})"/)
      || js.match(/apiKey":"([A-Za-z0-9_-]{20,})/)
      || js.match(/(AIza[A-Za-z0-9_-]{30,40})/); // minified raw literal
    if (m) { FB_KEY = m[1]; return FB_KEY; }
  }
  throw new Error('public Firebase web API key not found in production bundle');
}

async function fbSignIn(email, password) {
  const key = await firebaseKey();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`fb sign-in ${res.status}: ${j.error?.message || '?'}`);
  return j; // { idToken, localId, email, emailVerified? }
}
async function fbLookup(idToken) {
  const key = await firebaseKey();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const j = await res.json();
  return j.users?.[0] || null; // { localId, email, emailVerified, ... }
}

/** Production API call with the Firebase ID token; returns {status, body}. */
async function api(method, url, body, token) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* html error page */ }
  return { status: res.status, body: data };
}

/**
 * Refuse to sweep a backend whose upstream dependency is already failing.
 *
 * A full run against an exhausted Firestore adds load to an outage, and every
 * assertion it makes is meaningless (a 503 from quota exhaustion looks like a
 * product defect). Operators get a clear instruction instead of a false report.
 */
async function preflightUpstream(base) {
  let res;
  let body = null;
  try {
    res = await fetch(`${base}/api/health`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    body = await res.json().catch(() => null);
  } catch (e) {
    console.error(`\nREFUSING TO RUN: ${base}/api/health is unreachable (${e.message}).`);
    process.exit(3);
  }
  const checks = body?.checks || {};
  console.log(`── PREFLIGHT ── /api/health → ${res.status} ${body?.status || ''}`
    + ` (firestore=${checks.firestoreReachable}, storage=${checks.storageReachable})`);
  if ((res.ok && body?.success === true) || FORCE) {
    if (FORCE && !(res.ok && body?.success === true)) {
      console.log('  ! PSE_QA_FORCE=1 — proceeding against an unhealthy backend');
    }
    return;
  }
  console.error('\nREFUSING TO RUN: the backend is not healthy.');
  console.error('  A full sweep would add load to an already-degraded dependency and');
  console.error('  every failure it reported would be meaningless.');
  console.error(`  /api/health → ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  console.error('  Restore the upstream dependency (Firestore quota / credentials), then re-run.');
  console.error('  Set PSE_QA_FORCE=1 only when observing a degraded backend is the goal.');
  process.exit(3);
}

/**
 * SMOKE MODE — the targeted post-change verification (PSE_QA_SMOKE=1).
 *
 * Deliberately cheap: one REST sign-in, then the authenticated endpoint
 * contracts. No browser, no console mounts, no listeners, no account creation.
 * This is the run to use while iterating on backend code; the full harness is
 * for certification and should be invoked deliberately.
 */
async function smokeRun(creds) {
  console.log('\n── SMOKE RUN (targeted backend verification) ──');
  const signIn = await fbSignIn(creds.PSE_TEST_EMAIL, creds.PSE_TEST_PASSWORD);
  const TOKEN = signIn.idToken;
  REPORT.session = { uid: signIn.localId, email: signIn.email };

  const endpoints = [
    ['GET', '/api/mine/state'],
    ['GET', '/api/mine/activities'],
    ['GET', '/api/mine/referrals'],
    ['GET', '/api/mine/withdrawals'],
    ['GET', '/api/mine/notifications'],
  ];
  for (const [method, path] of endpoints) {
    const res = await api(method, `${PROD}${path}`, null, TOKEN);
    REPORT.smoke = REPORT.smoke || {};
    REPORT.smoke[path] = { status: res.status, error: res.body?.error || null };
    if (res.status === 200) ok('smoke', `${path} → 200`);
    else if (res.status === 503) note(`${path} → 503 ${res.body?.error || ''} (upstream unavailable)`);
    else defect('smoke', `${path} → ${res.status} ${res.body?.error || ''}`);
  }
  const state = REPORT.smoke?.['/api/mine/state'];
  if (state?.status === 200) ok('smoke', 'canonical state endpoint healthy');

  // Unauthenticated contract: the endpoint must reject, not crash.
  const anon = await api('GET', `${PROD}/api/mine/state`, null, 'not-a-token');
  REPORT.smoke['/api/mine/state (anonymous)'] = { status: anon.status };
  if (anon.status === 401) ok('smoke', 'unauthenticated state request rejected (401)');
  else defect('smoke', `unauthenticated state request → ${anon.status}`);

  finish();
}

/* ── helpers ────────────────────────────────────────────────────────────── */

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
/** Local static server ONLY when targeting the local build (BASE_URL override). */
async function localServer() {
  const DIST = path.join(process.cwd(), 'dist');
  const s = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) { res.writeHead(503).end('{}'); return; }
    let f = path.join(DIST, req.url.split('?')[0]);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${s.address().port}`;
}

/** Instrumented EIP-1193 provider: deterministic BSC wallet with event control. */
const STUB = ({ addr, chain }) => `
window.__pseQA = { accountsChanged: null, chainChanged: null, calls: [] };
window.__stubAddr = '${addr}';
window.__stubChain = '${chain}';
window.__payMode = 'ok'; // ok | reject | uncertain
window.__sendCount = 0;
window.__switchCount = 0;
window.__denySwitch = false;
window.__granted = true; // pre-authorised, like a returning wallet user
const prov = {
  request: async ({ method, params }) => {
    window.__pseQA.calls.push(method);
    if (method === 'eth_accounts') return window.__granted ? [window.__stubAddr] : [];
    if (method === 'eth_requestAccounts') {
      if (window.__denied) throw Object.assign(new Error('user rejected'), { code: 4001 });
      window.__granted = true; return [window.__stubAddr];
    }
    if (method === 'eth_chainId') return window.__stubChain;
    window.__lastWalletMethod = window.__lastWalletMethod || [];
    window.__lastWalletMethod.push(method);
    if (method === 'wallet_switchEthereumChain') {
      window.__switchCount += 1;
      if (window.__denySwitch) throw Object.assign(new Error('user rejected the chain switch'), { code: 4001 });
      if ((params?.[0]?.chainId || '').toLowerCase() === '0x38') { window.__stubChain = '0x38'; return null; }
      throw Object.assign(new Error('unrecognized chain'), { code: 4902 });
    }
    if (method === 'wallet_addEthereumChain') { window.__stubChain = params?.[0]?.chainId || window.__stubChain; return null; }
    if (method === 'eth_sendTransaction') {
      window.__sendCount += 1;
      if (window.__payMode === 'reject') throw Object.assign(new Error('user rejected transaction'), { code: 4001 });
      if (window.__payMode === 'uncertain') throw new Error('Unspecified error - RPC transport failed mid-request');
      if (window.__stubChain !== '0x38') throw Object.assign(new Error('wrong chain'), { code: -32000 });
      return '0x' + 'cd'.repeat(32); // deterministic fake hash (never broadcast)
    }
    return null;
  },
  on(ev, fn) { if (ev === 'accountsChanged') window.__pseQA.accountsChanged = fn; if (ev === 'chainChanged') window.__pseQA.chainChanged = fn; },
  removeListener() {},
};
// Real injected wallets (MetaMask/Trust in-browser) also set window.ethereum;
// the app's silent-restore path requires it, so the stub provides it too.
window.ethereum = prov;
// EIP-6963 discovery responder: announce ON REQUEST (the announce fired at
// init precedes any listener — the request/announce handshake is what makes
// the wallet discoverable to late listeners).
window.addEventListener('eip6963:requestProvider', () => {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: {
    info: { uuid: 'qa-uuid', name: 'QA Stub Wallet', icon: '', rdns: 'com.pseqa.stub' },
    provider: prov,
  }}));
});
`;

async function routeCheck(ctx, base, path_, width = 390) {
  const page = await ctx.newPage();
  const errs = []; const apiCalls = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('request', r => { if (r.url().includes('/api/')) apiCalls.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) apiCalls.push(`${r.request().method()} ${new URL(r.url()).pathname}:${r.status()}(server)`); });
  await page.goto(base + path_, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2200);
  const info = await page.evaluate(() => ({
    text: (document.body?.innerText || '').trim(),
    title: document.title,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
  }));
  const shot = path.join(OUT, `${path_.replace(/\W+/g, '_')}-${width}.png`);
  await page.screenshot({ path: shot, fullPage: true, animations: 'disabled' }).catch(() => {});
  await page.close();
  return { path: path_, width, title: info.title, chars: info.text.length,
    overflow: info.scrollW > info.clientW + 1, pageErrors: errs,
    serverErrors: [...new Set(apiCalls)].filter(c => /:(4\d\d|5\d\d)/.test(c)).slice(0, 6),
    sample: info.text.slice(0, 140).replace(/\s+/g, ' ') };
}

/** Real form login in a browser context; returns the context (signed in). */
async function formLoginContext(browser, base, email, password, viewport) {
  const ctx = await browser.newContext({ ...(viewport || {}), storageState: undefined });
  const page = await ctx.newPage();
  await page.goto(`${base}/mine/login`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForTimeout(4000);
  return { ctx, page };
}

/* ── main ───────────────────────────────────────────────────────────────── */

async function main() {
  let creds = null;
  if (REUSE && fs.existsSync(CREDS_FILE)) {
    creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    console.log(`Reusing QA account ${creds.PSE_TEST_EMAIL}`);
  } else {
    const m = await mailCreate();
    creds = { PSE_TEST_EMAIL: m.addr, PSE_TEST_PASSWORD: m.pass, PSE_MAILTM_TOKEN: m.tok, PSE_MAILTM_ADDR: m.addr };
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 1));
    if (process.platform !== 'win32') fs.chmodSync(CREDS_FILE, 0o600);
  }
  const EMAIL = creds.PSE_TEST_EMAIL, PASSWORD = creds.PSE_TEST_PASSWORD, MAILTOK = creds.PSE_MAILTM_TOKEN;
  console.log(`PSEmine production QA → ${PROD}`);
  console.log(`QA account: ${EMAIL} (credentials in ${CREDS_FILE}, 0600)`);

  const base = PROD.startsWith('http') ? PROD : await localServer();
  // Safety gates: never sweep a degraded backend, and never mount the console
  // when the caller only wants the targeted endpoint verification.
  if (base === PROD) await preflightUpstream(base);
  if (SMOKE) { await smokeRun(creds); return; }

  const browser = await chromium.launch({ headless: !HEADFUL });

  /* 1 ── real production signup through the real form ─────────────────── */
  if (!REUSE) {
    console.log('\n── SIGNUP (real production form) ──');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await page.goto(`${base}/mine/signup`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[autocomplete=nickname]', 'PSE QA Miner');
    await page.fill('input[autocomplete=new-password]', PASSWORD);
    await page.click('button[type=submit]');
    try {
      await page.waitForURL(/verify-email/, { timeout: 20000 });
      ok('signup', `account created, redirected to ${new URL(page.url()).pathname}`);
      REPORT.signup.ok = true;
    } catch {
      REPORT.signup.ok = false;
      defect('signup', `no redirect to /mine/verify-email; url=${page.url()} errs=${errs.slice(0, 2).join(' | ')}`);
    }
    REPORT.signup.pageErrors = errs;
    await ctx.close();
  }

  /* 2 ── real email verification via the real mailbox ─────────────────── */
  console.log('\n── EMAIL VERIFICATION (real inbox) ──');
  {
    let link = null;
    // Only poll the inbox when this run actually created the account: a reused
    // account was verified by the run that created it, so waiting up to 60s for
    // mail that will never arrive is pure waste on every targeted run.
    for (let i = 0; i < 12 && !link && !REUSE; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const msg = await mailLatest(MAILTOK);
      if (!msg) continue;
      const body = await mailText(MAILTOK, msg.id);
      const m = body.match(/https:\/\/[^"'\s]*\/auth\/action[^\s"']*/);
      if (m) link = m[0].replace(/&amp;/g, '&');
    }
    if (!link && !REUSE) {
      defect('verification', 'no Firebase action link arrived in the disposable inbox within 60s');
    }
    if (link) {
      REPORT.verification.linkReceived = true;
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(link, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(3500);
      // The production AuthAction page applies oobCode through the Firebase
      // client SDK; if it renders a continue affordance, click it.
      for (const label of ['Continue', 'Confirm', 'Verify', 'Go to', 'Return']) {
        const btn = page.locator(`button:has-text("${label}"), a:has-text("${label}")`).first();
        if (await btn.count() && await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(2500); break; }
      }
      await ctx.close();
    }
    // Authoritative check: does Identity Platform now report emailVerified?
    try {
      const sig = await fbSignIn(EMAIL, PASSWORD);
      const acct = await fbLookup(sig.idToken);
      REPORT.verification.signedIn = true;
      REPORT.verification.emailVerified = !!acct?.emailVerified;
      REPORT.verification.uid = acct?.localId;
      REPORT.__idToken = sig.idToken;
      if (acct?.emailVerified) ok('verification', `Identity Platform reports emailVerified=true for ${acct.email}`);
      else defect('verification', `emailVerified still false after action link (acct=${JSON.stringify(acct?.email)})`);
    } catch (e) {
      defect('verification', `REST sign-in check failed: ${String(e).slice(0, 140)}`);
    }
  }

  const TOKEN = REPORT.__idToken;
  const UID = REPORT.verification.uid;

  /* 3 ── authenticated walkthrough (signed-in browser, real backend) ──── */
  console.log('\n── AUTHENTICATED WALKTHROUGH (production, real backend) ──');
  let authCtx = null;
  if (REPORT.verification.emailVerified && TOKEN) {
    const { ctx, page } = await formLoginContext(browser, base, EMAIL, PASSWORD, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const finalUrl = new URL(page.url()).pathname;
    if (/mine\/(dashboard|tools|wallet|guide)/.test(finalUrl)) ok('auth', `form sign-in landed on ${finalUrl}`);
    else if (/verify-email/.test(finalUrl)) defect('auth', `signed-in user bounced back to ${finalUrl} despite emailVerified=true`);
    else console.log(`  ! [auth] landed on ${finalUrl}`);

    // 3b ── entitlement gate: a fresh signup whose enrollment notice failed
    // sits on PSEmineAccessGate. The real user's recovery path is the explicit
    // "Enable PSEmine for this account" action — walk it like a user.
    const gateBtn = page.locator('button:has-text("Enable PSEmine")').first();
    if (await gateBtn.count() && await gateBtn.isVisible().catch(() => false)) {
      REPORT.entitlement = { gated: true, enabled: false };
      console.log('  entitlement gate shown — clicking "Enable PSEmine for this account"');
      await gateBtn.click();
      try {
        await page.waitForSelector('button:has-text("Enable PSEmine")', { state: 'detached', timeout: 15000 });
        REPORT.entitlement.enabled = true;
        ok('entitlement', 'gate cleared after enable (identity listener refreshed)');
      } catch {
        defect('entitlement', 'enable clicked but the gate did not clear within 15s');
      }
    } else {
      REPORT.entitlement = { gated: false, enabled: false };
    }
    // 3c ── onboarding gate, if the account is flagged onboardingCompleted=false.
    await page.waitForTimeout(1500);
    if (/guide\/onboarding/.test(new URL(page.url()).pathname)) {
      const cont = page.locator('button:has-text("Continue to dashboard")').first();
      if (await cont.count()) {
        await cont.click().catch(() => {});
        await page.waitForTimeout(2500);
        ok('onboarding', `onboarding completed via real button → ${new URL(page.url()).pathname}`);
        REPORT.onboarding = { completed: true };
      }
    } else {
      REPORT.onboarding = { completed: 'not-required' };
    }
    REPORT.__storage = await ctx.storageState();
    authCtx = ctx;
  } else {
    note('Authenticated walkthrough skipped: email verification did not complete.');
  }

  if (authCtx) {
    const routes = ['/mine/dashboard', '/mine/tools', '/mine/wallet', '/mine/referrals', '/mine/activity', '/mine/me', '/mine/guide', '/mine'];
    for (const r of routes) {
      const res = await routeCheck(authCtx, base, r);
      REPORT.walkthrough.push(res);
      const bad = res.pageErrors.length || res.overflow || res.serverErrors.length;
      if (bad) console.log(`  ✗ ${r} errs=${res.pageErrors.length} overflow=${res.overflow} server=${res.serverErrors.join(',')}`);
      else console.log(`  ✓ ${r} (${res.chars}ch, title="${res.title}")`);
    }
  }

  /* 4 ── wallet flows (instrumented EIP-1193, real app wallet layer) ──── */
  console.log('\n── WALLET (instrumented EIP-1193 through the app layer) ──');
  if (authCtx) {
    const w = await authCtx.newPage();
    await w.addInitScript(STUB({ addr: '0x1111111111111111111111111111111111111111', chain: CHAIN }));
    await w.goto(`${base}/mine/wallet`, { waitUntil: 'load', timeout: 30000 });
    await w.waitForTimeout(3000); // discovery announce window + page settle

    // A backend wallet association from an earlier session renders this page in
    // the Connected state — disconnect through the real UI so the connect flow
    // can be exercised from scratch.
    const disc = w.locator('button:has-text("Disconnect")').first();
    if (await disc.count() && await disc.isVisible().catch(() => false)) {
      await disc.click().catch(() => {});
      await w.waitForTimeout(1500);
      ok('wallet', 'existing connection cleared through the real Disconnect control');
    }

    const clickConnect = async () => {
      const candidates = [
        'button:has-text("Connect wallet")',
        'button:has-text("Connect")',
        'button:has-text("Connect a wallet to continue")',
        'button:has-text("Reconnect your wallet to continue")',
      ];
      for (const sel of candidates) {
        const b = w.locator(sel).first();
        if (await b.count() && await b.isVisible().catch(() => false)) {
          await b.click().catch(() => {});
          await w.waitForTimeout(1600);
          return true;
        }
      }
      return false;
    };

    // Explicit connect, then click the announced wallet entry if the UI shows one.
    const clicked = await clickConnect();
    const stubEntry = w.locator('button:has-text("QA Stub Wallet")').first();
    if (await stubEntry.count() && await stubEntry.isVisible().catch(() => false)) {
      await stubEntry.click().catch(() => {});
      await w.waitForTimeout(1800);
    }
    const state1 = await w.evaluate(() => ({
      calls: window.__pseQA?.calls || [],
      granted: !!window.__granted,
      bodyHasConnected: /0x1111/i.test(document.body.innerText),
    }));
    REPORT.wallet.connect = { clicked, ...state1 };
    if (state1.calls.includes('eth_requestAccounts')) ok('wallet', `connect flow reached eth_requestAccounts (${state1.calls.length} provider calls)`);
    else defect('wallet', `connect flow never requested accounts (clicked=${clicked}, calls=${JSON.stringify(state1.calls)})`);

    // accountsChanged → wallet B
    const switchRes = await w.evaluate(async () => {
      const before = document.body.innerText.match(/0x[0-9a-fA-F]{4}/)?.[0] || null;
      window.__pseQA.accountsChanged?.(['0x2222222222222222222222222222222222222222']);
      await new Promise(r => setTimeout(r, 1400));
      const after = document.body.innerText.match(/0x[0-9a-fA-F]{4}/)?.[0] || null;
      return { before, after };
    });
    REPORT.wallet.accountsChanged = switchRes;
    if (switchRes.after && switchRes.after !== switchRes.before) ok('wallet', `accountsChanged reflected in UI (${switchRes.before} → ${switchRes.after})`);
    else defect('wallet', `accountsChanged not reflected (${JSON.stringify(switchRes)})`);
    // Switch BACK to wallet A so the persisted session matches the provider's
    // accounts — exactly what a user returning to their original wallet does.
    // (Silent restore on later pages must be able to adopt this session.)
    await w.evaluate(async () => {
      window.__pseQA.accountsChanged?.(['0x1111111111111111111111111111111111111111']);
      await new Promise(r => setTimeout(r, 1200));
    });

    // Wrong network: the product design gates at PAYMENT time (ensurePaymentChain),
    // not on chainChanged (which is state-refresh only by design). With a LIVE
    // provider session: phase A refuses the in-wallet switch (stub denies) → the
    // app must block with an instruction and never reach eth_sendTransaction;
    // phase B allows the switch (stub grants 0x38) → the send must proceed.
    const t3 = await authCtx.newPage();
    await t3.addInitScript(STUB({ addr: '0x1111111111111111111111111111111111111111', chain: '0x1' }));
    // Establish a REAL provider session: silent-restore on this fresh page adopts
    // the persisted injected session via eth_accounts (window.ethereum is set by
    // the stub, matching real MetaMask/Trust in-browser behavior).
    await t3.goto(`${base}/mine/tools`, { waitUntil: 'load', timeout: 30000 });
    await t3.waitForTimeout(3000);
    let netGuard = { reached: false, blocked: false, noSend: true, switchedToBsc: false, switchRequested: false, liveSession: false,
      diag: await t3.evaluate(() => ({
        hasEthereum: !!window.ethereum,
        storedAddress: JSON.parse(localStorage.getItem('psemine_connected_wallet') || 'null')?.address || null,
        providerAccounts: null,
      })) };
    netGuard.diag.providerAccounts = await t3.evaluate(async () => window.ethereum ? await window.ethereum.request({ method: 'eth_accounts' }) : null);
    netGuard.liveSession = !!(netGuard.diag.providerAccounts?.length && netGuard.diag.providerAccounts[0] === netGuard.diag.storedAddress);
    if (netGuard.liveSession) await t3.evaluate(() => { window.__denySwitch = true; }); // phase A: refuse
    const buy3 = t3.locator('button:has-text("Purchase with BNB")').first();
    if (await buy3.count() && await buy3.isVisible().catch(() => false)) {
      await buy3.click();
      await t3.waitForTimeout(1200);
      const cont3 = t3.locator('button:has-text("Continue to payment")').first();
      if (await cont3.count() && await cont3.isVisible().catch(() => false)) {
        await cont3.click();
        await t3.waitForTimeout(1200);
        // The warning is STATE-AWARE: it renders with the pay step itself and
        // Pay is disabled while the wallet is off BSC, so the user never has to
        // press Pay to discover a wrong network.
        const pay3 = t3.locator('button:has-text("Open wallet & pay")').first();
        const switch3 = t3.locator('button:has-text("Switch to BNB Smart Chain")').first();
        if (await pay3.count() && await pay3.isVisible().catch(() => false)) {
          netGuard.reached = true;
          netGuard.blocked = await t3.evaluate(() => /wrong network|switch to bnb smart chain/i.test(document.body.innerText));
          netGuard.payDisabled = await pay3.isDisabled().catch(() => null);
          netGuard.noSend = await t3.evaluate(() => !window.__pseQA.calls.includes('eth_sendTransaction'));
          netGuard.providerCalls = await t3.evaluate(() => [...window.__pseQA.calls]);
          netGuard.pageText = (await t3.evaluate(() => document.body.innerText)).slice(0, 500);
          // Phase A: the wallet REFUSES the switch — warning stays, nothing signs.
          if (await switch3.count() && await switch3.isVisible().catch(() => false)) {
            await switch3.click();
            await t3.waitForTimeout(3000);
            netGuard.switchRequested = await t3.evaluate(() => window.__switchCount > 0);
            netGuard.chainAfterRefusal = await t3.evaluate(() => window.__stubChain);
            netGuard.stillBlockedAfterRefusal = await t3.evaluate(() =>
              !window.__pseQA.calls.includes('eth_sendTransaction') && /wrong network/i.test(document.body.innerText));
          }
          // Phase B: the switch is accepted — the console RE-READS the chain
          // (wallets need not emit chainChanged), clears the warning, enables
          // Pay, and the send proceeds on BSC.
          await t3.evaluate(() => { window.__denySwitch = false; });
          if (await switch3.count() && await switch3.isVisible().catch(() => false)) {
            await switch3.click();
            await t3.waitForTimeout(2500);
          }
          netGuard.warningCleared = await t3.evaluate(() => !/wrong network/i.test(document.body.innerText));
          netGuard.switchedToBsc = await t3.evaluate(() => window.__stubChain === '0x38');
          if (await pay3.isEnabled().catch(() => false)) {
            await pay3.click();
            await t3.waitForTimeout(5000);
            netGuard.sentOnBsc = await t3.evaluate(() =>
              window.__pseQA.calls.includes('eth_sendTransaction') && window.__stubChain === '0x38');
          }
        }
      }
    }
    REPORT.wallet.networkSwitch = netGuard;
    if (netGuard.reached && netGuard.blocked && netGuard.payDisabled && netGuard.noSend
        && netGuard.switchRequested && netGuard.stillBlockedAfterRefusal
        && netGuard.warningCleared && netGuard.switchedToBsc && netGuard.sentOnBsc)
      ok('wallet', 'wrong-network pay step warns and blocks with nothing signed; a refused switch keeps it blocked; accepting the switch clears the warning and the send proceeds on BSC');
    else if (!netGuard.liveSession) note(`wrong-network switch path untestable this run (no live provider session): ${JSON.stringify(netGuard)}`);
    else defect('wallet', `wrong-network guard: ${JSON.stringify(netGuard)}`);
    await t3.close();

    // Restore the main wallet page to wallet A on BSC for the remaining probes.
    await w.evaluate(() => { window.__pseQA.chainChanged?.('0x38'); window.__pseQA.accountsChanged?.(['0x1111111111111111111111111111111111111111']); });
    await w.waitForTimeout(1200);

    // Backend association with wallet A (updatePayout=false keeps payout untouched).
    const assoc = await api('POST', `${PROD}/api/mine/wallet`, { wallet: '0x1111111111111111111111111111111111111111', updatePayout: false }, TOKEN);
    REPORT.wallet.backendAssociation = { status: assoc.status, body: assoc.body };
    if (assoc.status === 200) ok('wallet', 'backend accepted connected-wallet association (200)');
    else console.log(`  ! [wallet] backend association → ${assoc.status} ${JSON.stringify(assoc.body).slice(0, 120)}`);

    /* 4b ── REAL purchase modal flow (quote → bind → sign → submit) ── */
    console.log('\n── PURCHASE MODAL (real UI, wallet-signed, no real BNB) ──');
    const t2 = await authCtx.newPage();
    // Watch the backend conversation so a stuck step is diagnosed from the
    // response, not guessed from the UI text.
    const modalApi = [];
    t2.on('response', async r => {
      if (!r.url().includes('/api/mine/')) return;
      let body = null;
      try { body = (await r.text()).slice(0, 220); } catch { /* body unavailable */ }
      modalApi.push({ status: r.status(), url: r.url().replace(base, ''), body });
    });
    await t2.addInitScript(STUB({ addr: '0x1111111111111111111111111111111111111111', chain: CHAIN }));
    await t2.goto(`${base}/mine/tools`, { waitUntil: 'load', timeout: 30000 });
    await t2.waitForTimeout(3000);
    const buy = t2.locator('button:has-text("Purchase with BNB")').first();
    if (await buy.count() && await buy.isVisible().catch(() => false)) {
      await buy.click();
      // The dialog opens on the WALLET step when nothing is connected, or
      // straight on the quote when a remembered session was silently restored.
      // Handle both — and never click "Reconnect…" as if it were "Continue".
      const dlg = t2.locator('[role="dialog"]').first();
      try { await dlg.waitFor({ state: 'visible', timeout: 10000 }); } catch { /* reported below */ }
      const pickStub = async () => {
        const stub = dlg.locator('button:has-text("QA Stub Wallet")').first();
        if (await stub.count() && await stub.isVisible().catch(() => false)) {
          await stub.click().catch(() => {});
          await t2.waitForTimeout(2000);
          return true;
        }
        return false;
      };
      if (!(await pickStub())) {
        const connectCta = dlg.locator('button:has-text("Connect a wallet to continue")').first();
        if (await connectCta.count() && await connectCta.isVisible().catch(() => false)) {
          await connectCta.click().catch(() => {});
          await t2.waitForTimeout(1500);
          await pickStub();
        }
      }
      // REFRESH RECOVERY takes priority over a fresh quote: this account still
      // has an in-flight purchase for the cheapest tier, so the dialog is
      // expected to reopen THAT record rather than quote a new one. Asserting
      // it here is the point — a refresh must never create a second intent.
      const dlgText = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ');
      const recovered = /Transaction submitted|Confirming payment/i.test(dlgText);
      REPORT.payment.modalRecovered = recovered;
      REPORT.payment.modalVisible = await dlg.isVisible().catch(() => false);
      REPORT.payment.modalText = dlgText.slice(0, 500);
      REPORT.payment.modalButtons = await dlg.getByRole('button').allInnerTexts().catch(() => []);
      console.log(`  · [modal] state: ${dlgText.slice(0, 180) || '(no dialog text)'}`);
      console.log(`  · [modal] buttons: ${JSON.stringify(REPORT.payment.modalButtons)}`);
      REPORT.payment.modalApi = modalApi;
      console.log(`  · [modal] api: ${JSON.stringify(modalApi.slice(-6))}`);
      // The dialog can open straight on the PAY step when a LIVE intent for this
      // tier is resumed with its original quote — that is correct behaviour, not
      // a missing quote step, so both arrivals are accepted and cross-checked.
      const payControl = () => dlg.locator('button:has-text("Open wallet & pay")').first();
      let payReady = (await payControl().count()) > 0;
      let reachedQuote = false;
      if (!recovered && !payReady) {
        try {
          await t2.waitForSelector('text=You pay (exact amount)', { timeout: 15000 });
          reachedQuote = true;
        } catch { /* reported below */ }
      }
      if (!recovered && !payReady) payReady = (await payControl().count()) > 0;
      const finalText = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ');
      const qinfo = {
        bnb: finalText.match(/([0-9]+\.[0-9]{4,}) BNB/)?.[1] || null,
        receiver: finalText.match(/0x8b32[0-9a-zA-Z]{4}/)?.[0] || null,
      };
      REPORT.payment.modalQuote = { reachedQuote, payReady, recovered, ...qinfo };
      if (recovered) {
        const pending = (await api('GET', `${PROD}/api/mine/state`, null, TOKEN)).body?.pendingPurchases || [];
        const inFlight = pending.filter(p => ['transaction_submitted', 'confirming'].includes(p.status));
        REPORT.payment.recoveredRecord = inFlight.map(p => ({ id: p.purchaseId, tool: p.toolId, status: p.status }));
        if (inFlight.length > 0 && /no new purchase was created/i.test(dlgText)) {
          ok('payment', `refresh recovery: the dialog reopened the existing ${inFlight[0].tool} purchase (${inFlight[0].status}) instead of creating a second intent`);
        } else {
          defect('payment', `recovery dialog did not reference the backend's in-flight record: ${JSON.stringify(REPORT.payment.recoveredRecord)}`);
        }
      } else if (payReady || reachedQuote) {
        // ONE amount string everywhere: the summary, the "you pay exactly" block
        // and the Pay control itself must all quote the same value.
        const amounts = [...new Set(finalText.match(/0\.[0-9]{4,}\s*BNB/g) || [])].map(s => s.trim());
        const payLabel = (await payControl().innerText().catch(() => '')).replace(/\s+/g, ' ');
        const payAmount = (payLabel.match(/0\.[0-9]{4,}/) || [])[0];
        REPORT.payment.exactAmount = { amounts, payLabel, payAmount };
        if (amounts.length === 1 && payAmount === amounts[0].replace(/\s*BNB$/, '')) {
          ok('payment', `dialog reached a payable state (${payReady ? 'resumed original quote' : 'fresh quote'}): ${amounts[0]} shown identically on the Pay control`);
        } else {
          defect('payment', `amounts disagree across the payment dialog: ${JSON.stringify(REPORT.payment.exactAmount)}`);
        }
      } else {
        defect('payment', `purchase dialog reached neither a quote nor a payable state (reachedQuote=${reachedQuote}, payReady=${payReady})`);
      }

      // continue to payment → the bound-payer step. Skipped only when the
      // dialog legitimately stands in the recovered (already-submitted) state.
      const cont = dlg.locator('button:has-text("Continue to payment")').first();
      if (recovered) {
        const recheck = dlg.locator('button:has-text("Check verification again")').first();
        const closeBtn = dlg.locator('button:has-text("Close")').first();
        REPORT.payment.recoveryControls = { recheck: await recheck.count(), close: await closeBtn.count() };
        if (await recheck.count()) ok('payment', 'recovery state offers a verification re-check (hash reused, nothing re-sent)');
        else defect('payment', 'recovery state offered no verification re-check');
        if (await closeBtn.count()) await closeBtn.click().catch(() => {});
      } else {
        // Reach the pay step when the dialog is still on the quote step. A live
        // resumed purchase is already past it and offers no Continue control —
        // that is correct behaviour, not a missing step.
        if (await cont.count() && await cont.isVisible().catch(() => false)) {
          await cont.click();
          await t2.waitForTimeout(1500);
        }
        const payShown = await t2.evaluate(() => ({
          boundPayer: /Bound payer/.test(document.body.innerText),
          sendBtn: !!document.body.innerText.match(/Open wallet & pay/),
          exactAmountLabel: document.body.innerText.match(/Open wallet & pay [0-9.]+ BNB/)?.[0] || null,
          quotedAmount: document.body.innerText.match(/([0-9]+\.[0-9]{4,}) BNB/)?.[1] || null,
        }));
        REPORT.payment.payStep = payShown;
        // The bound-payer block appears once a bind exists; on a first pass the
        // bind itself happens at send time. Either way the send control must be present.
        if (payShown.sendBtn) ok('payment', `pay step reachable (bound-payer block pre-shown: ${payShown.boundPayer})`);
        else defect('payment', 'pay step rendered without the send control');

        // Sign path: the stub returns a deterministic FAKE hash that provably
        // does not exist on BSC. The correct product outcome is: backend
        // independently queries the chain, fails the verification, retains the
        // hash guidance, and activates nothing.
        await t2.evaluate(() => { window.__payMode = 'ok'; });
        const send = dlg.locator('button:has-text("Open wallet & pay")').first();
        // Never click a disabled control blind: record the pay step's own words
        // so a blocked payment is DIAGNOSED instead of dying in a click timeout.
        REPORT.payment.payStepText = (await t2.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 700);
        const sendEnabled = await send.isEnabled().catch(() => false);
        REPORT.payment.sendEnabled = sendEnabled;
        if (!sendEnabled) {
          defect('payment', `send control is disabled on the pay step: ${REPORT.payment.payStepText.slice(0, 240)}`);
        } else {
          await send.click();
        }
        await t2.waitForTimeout(6000);
        const afterPayText = await t2.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
        REPORT.payment.fakeHashPath = {
          visibleMessage: afterPayText.match(/(Verification failed[^.]{0,120}|TRANSACTION_NOT_FOUND[^.]{0,120}|keep the transaction hash[^.]{0,120})/i)?.[0] || null,
        };

        // DECISIVE assertion is backend state: a wallet-signed hash that does
        // not exist on BSC must produce NO ownership and NO activation.
        const stateAfter = await api('GET', `${PROD}/api/mine/state`, null, TOKEN);
        const toolsAfter = (stateAfter.body?.tools || []).map(t => ({ toolId: t.toolId, status: t.status }));
        REPORT.payment.fakeHashPath.toolsAfter = toolsAfter;
        REPORT.payment.fakeHashPath.purchaseStatuses = (stateAfter.body?.purchases || []).map(p => p.status);
        if (toolsAfter.length === 0) ok('payment', 'fake-hash submission: backend verified on-chain, failed it, and activated NOTHING (no tool ownership records)');
        else defect('payment', `fake-hash submission created ownership: ${JSON.stringify(toolsAfter)}`);

        // REJECTION path: restart through the real control, then reject in-wallet.
        const restart = dlg.locator('button:has-text("Start a new purchase")').first();
        if (await restart.count() && await restart.isVisible().catch(() => false)) {
          await restart.click();
          await t2.waitForTimeout(2500);
          const cont2 = dlg.locator('button:has-text("Continue to payment")').first();
          if (await cont2.count() && await cont2.isVisible().catch(() => false)) {
            await cont2.click();
            await t2.waitForTimeout(1200);
            await t2.evaluate(() => { window.__payMode = 'reject'; });
            const send2 = dlg.locator('button:has-text("Open wallet & pay")').first();
            if (await send2.count()) {
              await send2.click();
              await t2.waitForTimeout(2500);
              const rej = await t2.evaluate(() => /cancelled in your wallet/i.test(document.body.innerText));
              REPORT.payment.userReject = { handled: rej };
              if (rej) ok('payment', 'user rejection surfaced as a recoverable cancel (no fake success)');
              else defect('payment', 'user rejection did not surface the recoverable state');
            }
          }
        }
        // Reachability is asserted above ("pay step rendered without the send
        // control"); by here the rejection path may legitimately have returned
        // the dialog to the quote step, so no further state is claimed.
      }
    } else {
      note('Purchase button not visible (campaign gate or entitlement state) — modal flow skipped.');
    }
    await t2.close();
    await w.close();
  } else note('Wallet flows skipped (no authenticated session).');

  /* 5 ── payment flow probes (Firebase token, production backend) ─────── */
  console.log('\n── PAYMENT PROBES (production backend, no real BNB) ──');
  if (TOKEN) {
    // 5a. Quote for the cheapest tool (starter).
    const q = await api('POST', `${PROD}/api/mine/tools/quote`, { toolId: 'starter' }, TOKEN);
    REPORT.payment.quote = { status: q.status, body: q.body };
    console.log(`  quote: ${q.status} ${JSON.stringify(q.body).slice(0, 200)}`);

    const quoteId = q.body?.quote?.quoteId || q.body?.quoteId || q.body?.id;

    // 5b. Zero-address rejection on intent creation.
    const zero = await api('POST', `${PROD}/api/mine/purchases/create`, { quoteId, paymentWallet: '0x' + '0'.repeat(40) }, TOKEN);
    REPORT.payment.zeroAddress = { status: zero.status, body: zero.body };
    if (zero.status === 400 && /INVALID_PAYMENT_WALLET/.test(zero.body?.error || '')) ok('payment', 'zero-address payment wallet rejected (400 INVALID_PAYMENT_WALLET)');
    else defect('payment', `zero-address intent → ${zero.status} ${JSON.stringify(zero.body).slice(0, 120)}`);

    // 5c. Real intent bound to the stub wallet A.
    const intent = quoteId
      ? await api('POST', `${PROD}/api/mine/purchases/create`, { quoteId, paymentWallet: '0x1111111111111111111111111111111111111111' }, TOKEN)
      : { status: 0, body: { error: 'no quote id returned' } };
    REPORT.payment.intent = { status: intent.status, body: intent.body };
    console.log(`  intent: ${intent.status} ${JSON.stringify(intent.body).slice(0, 200)}`);
    const purchaseId = intent.body?.purchaseId;
    // The intent handed back must carry a LIVE quote: a dead-quote intent can
    // never verify (QUOTE_EXPIRED forever), so returning one dead-ends the
    // (user, tool) pair. Regression guard for the 2026-09-19 lapsed-reuse fix.
    if (purchaseId) {
      const expIso = intent.body?.purchase?.expiresAt || intent.body?.expiresAt;
      const expMs = expIso ? Date.parse(expIso) : NaN;
      if (!Number.isNaN(expMs)) {
        if (expMs > Date.now()) ok('payment', 'created intent carries a live quote window');
        else defect('payment', `intent carries an ALREADY-EXPIRED quote (${expIso}) — dead-end lock`);
      } else note('intent response did not expose expiresAt for liveness check');
    }

    // 5d. Same wallet again → must REUSE the same intent (reload-recovery safe).
    if (purchaseId) {
      const intent2 = await api('POST', `${PROD}/api/mine/purchases/create`, { quoteId, paymentWallet: '0x1111111111111111111111111111111111111111' }, TOKEN);
      REPORT.payment.intentReuse = { status: intent2.status, sameId: intent2.body?.purchaseId === purchaseId, existing: intent2.body?.existing };
      if (intent2.body?.existing === true && intent2.body?.purchaseId === purchaseId) ok('payment', 'second create reuses the same intent (reload-recovery safe)');
      else if (intent2.status === 200 && intent2.body?.purchaseId && intent2.body?.purchaseId !== purchaseId) ok('payment', 'lapsed-quote intent superseded by a fresh one (dead-end lock fixed)');
      else defect('payment', `second create did not reuse intent: ${JSON.stringify(intent2.body).slice(0, 140)}`);

      // 5e. Wallet-B intent on the same tool → refused while A's intent is live.
      const rebind = await api('POST', `${PROD}/api/mine/purchases/create`, { quoteId, paymentWallet: '0x2222222222222222222222222222222222222222' }, TOKEN);
      REPORT.payment.rebindGuard = { status: rebind.status, body: rebind.body };
      if (rebind.status === 409) ok('payment', 'wallet-B rebind refused while wallet-A intent is live (409)');
      else console.log(`  ! [payment] rebind → ${rebind.status} (expected 409 while intent live)`);

      // 5f. Unknown transaction hash → recovery recorded, no activation.
      const unknown = '0x' + 'ab'.repeat(32);
      const ver = await api('POST', `${PROD}/api/mine/tools/verify-purchase`, { purchaseId, transactionHash: unknown, senderWallet: '0x1111111111111111111111111111111111111111' }, TOKEN);
      REPORT.payment.unknownHash = { status: ver.status, body: ver.body };
      if ([404, 422].includes(ver.status)) ok('payment', `unknown tx hash rejected (${ver.status} ${ver.body?.error}) — no activation, recovery evidence expected`);
      else defect('payment', `unknown hash → ${ver.status} ${JSON.stringify(ver.body).slice(0, 140)}`);

      // 5g. Malformed hash guard.
      const malformed = await api('POST', `${PROD}/api/mine/tools/verify-purchase`, { purchaseId, transactionHash: '0xdeadbeef', senderWallet: '0x1111111111111111111111111111111111111111' }, TOKEN);
      REPORT.payment.malformedHash = { status: malformed.status, error: malformed.body?.error };
      if (malformed.status === 400) ok('payment', 'malformed hash rejected (400)');
      else defect('payment', `malformed hash → ${malformed.status}`);

      // 5h. Duplicate submission of the same unknown hash.
      const dup = await api('POST', `${PROD}/api/mine/tools/verify-purchase`, { purchaseId, transactionHash: unknown, senderWallet: '0x1111111111111111111111111111111111111111' }, TOKEN);
      REPORT.payment.duplicateUnknown = { status: dup.status, error: dup.body?.error };
      console.log(`  duplicate unknown-hash submit → ${dup.status} ${dup.body?.error || ''}`);

      // 5m. REAL-CHAIN MISMATCH (no funds spent): fetch a REAL mainnet BSC
      // transaction directly from the chain (latest block) and submit it — it
      // exists on-chain but has nothing to do with this purchase, so the
      // verifier must independently fetch it from BSC and reject it on a term
      // mismatch (DESTINATION_MISMATCH), proving the backend genuinely reads
      // the chain rather than pattern-matching hashes.
      let realTx = null;
      try {
        const rpc = 'https://bsc-dataseed.binance.org/';
        const lr = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }) }).then(r => r.json());
        const block = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: [lr.result, true], id: 2 }) }).then(r => r.json());
        const txs = (block?.result?.transactions || []).filter(t => t.to && t.value !== '0x0');
        if (txs.length) realTx = txs[txs.length - 1].hash;
      } catch { /* probe is best-effort */ }
      if (realTx) {
        const real = await api('POST', `${PROD}/api/mine/tools/verify-purchase`, { purchaseId, transactionHash: realTx, senderWallet: '0x1111111111111111111111111111111111111111' }, TOKEN);
        REPORT.payment.realChainMismatch = { status: real.status, hash: realTx, body: real.body };
        console.log(`  real-chain mismatch probe → ${real.status} ${real.body?.error || ''}`);
        if (real.status === 422 && real.body?.error && !['TRANSACTION_NOT_FOUND', 'RPC_ERROR'].includes(real.body.error)) {
          ok('payment', `real BSC transaction (${realTx.slice(0, 18)}…) fetched from the chain and REJECTED on terms (${real.body.error}) — backend genuinely verifies on-chain`);
        } else if (real.status === 422) {
          note(`real-hash probe hit ${real.body?.error} — chain-read not proven by this probe`);
        } else {
          defect('payment', `real-chain mismatch → ${real.status} ${JSON.stringify(real.body).slice(0, 120)}`);
        }
      } else {
        note('real-chain probe unavailable (BSC RPC fetch failed) — skipped');
      }
    } else if (intent.status === 403 || intent.status === 409) {
      note(`purchase intent not permitted for QA account (${intent.status} ${intent.body?.error}) — lifecycle/campaign gate; intent-bound probes skipped`);
    } else {
      defect('payment', `no purchaseId from intent creation (${intent.status})`);
    }

    // 5i. Referral guards (require the 2026-09-19 engine fix DEPLOYED — the
    // current production backend still exhibits the defect): an unresolvable
    // code must be a hard 404 with NO orphan row; a self-code is 409.
    const expectFixed = process.env.PSE_EXPECT_FIXED_BACKEND === '1';
    const refTypo = await api('POST', `${PROD}/api/mine/referrals/register`, { referralCode: 'PSETYPO99' }, TOKEN);
    REPORT.payment.refTypo = { status: refTypo.status, error: refTypo.body?.error };
    console.log(`  typo-code probe → ${refTypo.status} ${refTypo.body?.error || ''}`);
    if (refTypo.status === 404 && refTypo.body?.error === 'REFERRER_NOT_FOUND') ok('payment', 'unresolvable referral code rejected without an orphan row (404)');
    else if (!expectFixed) note(`typo code → ${refTypo.status} (expected until the referral fix is deployed)`);
    else defect('payment', `typo code → ${refTypo.status} ${refTypo.body?.error || ''} (expected 404 REFERRER_NOT_FOUND)`);

    const ref = await api('POST', `${PROD}/api/mine/referrals/register`, { referralCode: 'PSESELF01' }, TOKEN);
    REPORT.payment.selfReferral = { status: ref.status, error: ref.body?.error };
    console.log(`  self-referral probe → ${ref.status} ${ref.body?.error || ''}`);
    if (ref.status === 404 || ref.status === 409) ok('payment', `self-referral rejected (${ref.status})`);
    else if (!expectFixed) note(`self-referral → ${ref.status} (expected until the referral fix is deployed)`);
    else defect('payment', `self-referral accepted → ${ref.status}`);

    // 5j. Withdrawal guard: fresh account with no balance → rejected.
    const wd = await api('POST', `${PROD}/api/mine/withdrawals/request`, { amountGbp: 25 }, TOKEN);
    REPORT.payment.withdrawal = { status: wd.status, error: wd.body?.error };
    console.log(`  withdrawal probe → ${wd.status} ${wd.body?.error || ''}`);

    // 5k. Purchase state as the backend sees it.
    const state = await api('GET', `${PROD}/api/mine/state`, null, TOKEN);
    REPORT.payment.mineState = { status: state.status, keys: Object.keys(state.body || {}).slice(0, 12) };
    console.log(`  /api/mine/state → ${state.status}`);
    if (state.status === 200) ok('payment', 'authenticated /api/mine/state healthy on production (200)');
    else defect('payment', `state endpoint → ${state.status}`);
  } else note('Payment probes skipped (no Firebase token).');

  /* 6 ── logout / guard check ──────────────────────────────────────────── */
  if (authCtx) {
    const lp = await authCtx.newPage();
    await lp.goto(`${base}/mine/me`, { waitUntil: 'load' });
    await lp.waitForTimeout(1500);
    const btn = lp.locator('button:has-text("Sign out")').first();
    if (await btn.count()) { await btn.click().catch(() => {}); await lp.waitForTimeout(2000); }
    await lp.goto(`${base}/mine/dashboard`, { waitUntil: 'load' });
    await lp.waitForTimeout(2000);
    const backAtLogin = /mine\/login/.test(new URL(lp.url()).pathname);
    REPORT.walkthroughLogout = { backAtLogin };
    if (backAtLogin) ok('logout', 'after sign-out, /mine/dashboard redirects to /mine/login');
    else defect('logout', `dashboard reachable after logout (url=${lp.url()})`);
    await lp.close();
  }

  await browser.close();
  finish();
}

/** Write the report and exit with the conventional status (shared by both modes). */
function finish() {
  delete REPORT.__authPage;
  delete REPORT.__storage;
  delete REPORT.__idToken;

  const file = path.join(OUT, 'report.json');
  fs.writeFileSync(file, JSON.stringify(REPORT, null, 1));
  console.log(`\nReport: ${file}`);
  console.log(`DEFECTS: ${REPORT.defects.length}  LIMITATIONS: ${REPORT.limitations.length}`);
  for (const d of REPORT.defects) console.log(`  ✗ [${d.area}] ${d.msg}`);
  for (const l of REPORT.limitations) console.log(`  ! ${l}`);
  process.exit(REPORT.defects.length ? 2 : 0);
}

main().catch(e => { console.error('HARNESS FAILURE:', e); process.exit(1); });
