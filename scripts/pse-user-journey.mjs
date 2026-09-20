/**
 * PSEmine AUTHENTICATED USER-JOURNEY harness (Tools + purchase UX).
 *
 * What it proves that the other harnesses cannot: a real signed-in user, in a
 * real browser, against a real deployment, sees the marketplace and the payment
 * screen behave correctly — including the two rules that were previously
 * broken in production:
 *
 *   • EXACT AMOUNT  every BNB amount in the payment panel is the SAME string
 *                   (the server quote's wei value), never a re-rounded copy.
 *   • NETWORK WARNING  it is state-aware: shown only while the connected wallet
 *                   is off BNB Smart Chain, and gone after a chain switch.
 *
 *   PSE_TEST_EMAIL=you@example.com PSE_TEST_PASSWORD='…' \
 *     PSE_TEST_BASE_URL=https://www.pulseearn.online \
 *     bun scripts/pse-user-journey.mjs
 *
 * SAFETY: the only wallet is a stub EIP-1193 provider whose eth_sendTransaction
 * always rejects with 4001 (user cancel). No key exists, nothing is broadcast,
 * and no funds can move. The script never withdraws, activates or mutates
 * economic state; it opens pages and reads them.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

/** Serves the local build (SPA fallback) when no deployment URL is supplied. */
function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE', requestId: 'user-journey' }));
        return;
      }
      let file = path.join(DIST, url.pathname);
      if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let BASE = process.env.PSE_TEST_BASE_URL || '';
const CREDS_FILE = process.env.PSE_TEST_CREDS_FILE || '/tmp/pse-qa/creds.json';
const OUT = process.env.PSE_OUT || '/tmp/pse-user-journey';

let EMAIL = process.env.PSE_TEST_EMAIL;
let PASSWORD = process.env.PSE_TEST_PASSWORD;
if ((!EMAIL || !PASSWORD) && fs.existsSync(CREDS_FILE)) {
  const c = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  EMAIL = EMAIL || c.PSE_TEST_EMAIL || c.email;
  PASSWORD = PASSWORD || c.PSE_TEST_PASSWORD || c.password;
}

if (!EMAIL || !PASSWORD) {
  console.log(JSON.stringify({
    skipped: true,
    reason: 'PSE_TEST_EMAIL / PSE_TEST_PASSWORD not provided (and no credentials file).',
    how: 'PSE_TEST_EMAIL=… PSE_TEST_PASSWORD=… bun scripts/pse-user-journey.mjs',
  }, null, 2));
  process.exit(0);
}

/** Stub EIP-1193 wallet: announces itself, starts on the WRONG chain, rejects sends. */
const STUB = `
window.__calls = [];
window.__mode = { chainId: '0x1' };
window.__stubProvider = {
  request: async (args) => {
    window.__calls.push({ method: args.method, params: args.params ?? null, at: Date.now() });
    switch (args.method) {
      case 'eth_accounts': return ['0x1111111111111111111111111111111111111111'];
      case 'eth_requestAccounts': return ['0x1111111111111111111111111111111111111111'];
      case 'eth_chainId': return window.__mode.chainId;
      case 'wallet_switchEthereumChain':
        window.__mode.chainId = args.params[0].chainId; return null;
      case 'wallet_addEthereumChain':
        window.__mode.chainId = args.params[0].chainId; return null;
      case 'eth_sendTransaction': {
        window.__lastTx = args.params[0];
        const e = new Error('user rejected transaction'); e.code = 4001; throw e;
      }
      default: return null;
    }
  },
  on() {}, removeListener() {},
};
window.addEventListener('eip6963:requestProvider', () => {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: {
    info: { uuid: 'stub-1', name: 'Stub Wallet', icon: '', rdns: 'com.pse.stub' },
    provider: window.__stubProvider,
  }}));
});
`;

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

if (!BASE) {
  if (!fs.existsSync(DIST)) {
    console.error('No deployment URL and no local build. Run: bunx vite build');
    process.exit(1);
  }
  const server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  console.log(`No PSE_TEST_BASE_URL — testing the local build at ${BASE}\n`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(STUB);
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));
fs.mkdirSync(OUT, { recursive: true });

const bodyText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

/** Authenticated navigation that reports the route it actually landed on. */
const visit = async (pathname, settle = 2500) => {
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(settle);
  return { landed: await page.evaluate(() => location.pathname), text: await bodyText() };
};

try {
  // ── 1. Sign in through the real form ─────────────────────────────────────
  await page.goto(`${BASE}/mine/login`, { waitUntil: 'load', timeout: 30_000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !/\/(login|signup)/.test(u.pathname), { timeout: 30_000 });
  check('sign-in completes', true, `landed ${await page.evaluate(() => location.pathname)}`);

  // ── 2. The console is reachable for an entitled account ──────────────────
  const tools = await visit('/mine/tools');
  check('Tools reaches the console', tools.landed === '/mine/tools', `landed ${tools.landed}`);

  // ── 3. Locked economics are rendered as configured ───────────────────────
  const econ = [
    ['Starter Miner', '£3'], ['£0.10/hour', null],
    ['Builder Miner', '£10'], ['£0.50/hour', null],
    ['Advanced Miner', '£50'], ['£1.20/hour', null],
    ['Elite Miner', '£200'], ['£2.50/hour', null],
  ];
  for (const [needle] of econ) {
    check(`Tools shows ${needle}`, tools.text.includes(needle));
  }
  check('Tools states the tool-capacity cap', /10\.60/.test(tools.text));

  // ── 4. Operating model is stated per tier (backend-driven copy) ──────────
  const sessionCopy = /session mining/i.test(tools.text);
  const continuousCopy = /continuous mining/i.test(tools.text);
  check('Tools explains session mining', sessionCopy);
  check('Tools explains continuous mining', continuousCopy);

  // ── 5. No horizontal overflow on the console at tablet width ─────────────
  // A failure names the element responsible, so the report is actionable
  // instead of just red.
  const OVERFLOW_PROBE = () => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) {
        offenders.push({
          sel: `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(/\s+/).slice(0, 3).join('.') : ''}`.slice(0, 110),
          right: Math.round(r.right), width: Math.round(r.width),
          text: (el.textContent || '').trim().slice(0, 36),
        });
      }
    });
    return { sw: document.documentElement.scrollWidth, cw: vw, offenders: offenders.slice(0, 6) };
  };
  await page.setViewportSize({ width: 768, height: 900 });
  for (const pathname of ['/mine/tools', '/mine/dashboard', '/mine/wallet']) {
    await page.goto(`${BASE}${pathname}`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(OVERFLOW_PROBE);
    check(`no horizontal overflow at 768px on ${pathname}`, m.sw <= m.cw + 1, `${m.sw} vs ${m.cw}`);
    if (m.sw > m.cw + 1) {
      console.log(`    widest offenders on ${pathname}: ${JSON.stringify(m.offenders)}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  // ── 6. Purchase panel: exact amount + state-aware network warning ────────
  await page.goto(`${BASE}/mine/tools`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(2500);    // Rows are ordered starter → builder → advanced → elite, and each row's
    // action is labelled "Purchase with BNB" (the tier name is in the row, not
    // the button) — so index 2 is the Advanced Miner row.
    const purchaseButtons = page.getByRole('button', { name: /purchase with bnb/i });
    const buttonCount = await purchaseButtons.count();
    const closed = await page.getByRole('button', { name: /purchases closed/i }).count();
    if (buttonCount < 3) {
      check('Advanced Miner purchase control exists', false,
        `found ${buttonCount} purchase buttons${closed ? `, ${closed} rows closed` : ''}`);
    } else {
      check('Advanced Miner purchase control exists', true, `${buttonCount} purchasable rows`);
      await purchaseButtons.nth(2).click();
    await page.waitForTimeout(4500);
    const panel = await bodyText();
    await page.screenshot({ path: path.join(OUT, 'purchase-panel.png'), fullPage: true, animations: 'disabled' });
    check('panel is the Advanced Miner at £50', /Advanced Miner/.test(panel) && /£50/.test(panel));

    const amounts = [...new Set(panel.match(/0\.\d{4,}\s*BNB/g) || [])];
    check('payment panel renders a BNB amount', amounts.length > 0, amounts.join(' | '));
    // The rule: ONE amount string, quoted identically wherever it appears.
    check('every BNB amount shown is the same string', amounts.length <= 1, amounts.join(' | '));

    const networkWarning = /switch your wallet to bnb smart chain|wrong network/i.test(panel);
    check(
      'network warning is SHOWN while the wallet is on another chain',
      networkWarning,
      await page.evaluate(() => window.__mode.chainId),
    );
    const switchBtn = page.getByRole('button', { name: /switch.*bnb|switch network|switch to bnb/i }).first();
    check('a switch-to-BNB action is offered', (await switchBtn.count()) > 0);
    if (await switchBtn.count()) {
      await switchBtn.click();
      await page.waitForTimeout(2500);
      const after = await bodyText();
      check('wallet chain is re-read after switching', (await page.evaluate(() => window.__mode.chainId)) === '0x38',
        await page.evaluate(() => window.__mode.chainId));
      check('network warning is REMOVED once on BNB Smart Chain',
        !/switch your wallet to bnb smart chain|wrong network/i.test(after));
    }
  }

  check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  // ── 7. Logout ends the session ───────────────────────────────────────────
  await visit('/mine/me', 1500);
  const out = page.getByRole('button', { name: /log ?out|sign ?out/i }).first();
  if (await out.count()) {
    await out.click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/mine/dashboard`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(1200);
    const landed = await page.evaluate(() => location.pathname);
    check('sign-out ends the console session', !/^\/mine\/(dashboard|tools|wallet)/.test(landed), `landed ${landed}`);
  } else {
    check('sign-out control present', false, 'not found on /mine/me — reported, not assumed');
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'user-journey-report.json'), JSON.stringify({ base: BASE, results }, null, 2));
const failed = results.filter(r => !r.pass);
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
console.log(`Report + screenshots: ${OUT}`);
process.exit(failed.length ? 1 : 0);
