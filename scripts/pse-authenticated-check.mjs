/**
 * PSEmine AUTHENTICATED verification harness.
 *
 * Runs the signed-in console the way a reviewer would, and records evidence the
 * public-route harness cannot reach: the six console pages, at six widths, with
 * measured layout, console/network capture and cross-product isolation checks.
 *
 * CREDENTIALS
 * -----------
 * This workspace sandbox has no Firebase configuration, so the script cannot
 * invent a session. Supply a real test account and it runs; omit it and the
 * script exits 0 with a clear "skipped" notice, so CI stays honest instead of
 * green-by-accident.
 *
 *   PSE_TEST_EMAIL=you@example.com PSE_TEST_PASSWORD='…' \
 *     bun scripts/pse-authenticated-check.mjs
 *
 * The password is read from the process environment only — never from a file,
 * never logged, never written to the report.
 *
 * Optionally PSE_TEST_BASE_URL=https://… to point at a deployment instead of the
 * local build (the local build must exist: `bunx vite build`).
 *
 * NOTE ON ACCOUNT SAFETY: the harness only signs in and reads pages. It never
 * purchases, withdraws or mutates economic state.
 *
 * NOTE ON THE SESSION: the signed-in session lives in ONE persistent browser
 * context for the whole run. Firebase stores its session in IndexedDB, which
 * Playwright's storageState() does not capture, so per-width contexts came back
 * signed out and reported a console that was simply unauthenticated. Widths are
 * measured by resizing the viewport (mobile emulation flags are per-context).
 *
 * The account must hold PSEmine entitlement (`users/{uid}.productAccess.psemine`)
 * or the console correctly renders the entitlement gate on every protected route
 * — that is a product state, and the report says so rather than claiming a pass.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const OUT = process.env.PSE_OUT || '/tmp/pse-auth';
const EMAIL = process.env.PSE_TEST_EMAIL;
const PASSWORD = process.env.PSE_TEST_PASSWORD;
const BASE_URL = process.env.PSE_TEST_BASE_URL;

const WIDTHS = (process.env.PSE_WIDTHS || '375,390,430,768,1024,1440').split(',').map(Number);

/** Console + auth routes, in the order a signed-in reviewer walks them. */
const ROUTES = [
  { id: 'dashboard', path: '/mine/dashboard' },
  { id: 'tools', path: '/mine/tools' },
  { id: 'wallet', path: '/mine/wallet' },
  { id: 'referrals', path: '/mine/referrals' },
  { id: 'activity', path: '/mine/activity' },
  { id: 'me', path: '/mine/me' },
  { id: 'guide', path: '/mine/guide' },
  { id: 'landing-signed-in', path: '/mine' },
];

/**
 * The PulseEarn product surface a PSEmine session must never touch. These are
 * the real routes found in api/index.py, not guesses — a pattern that matches
 * nothing proves nothing, so the list is kept in step with the backend.
 */
const FORBIDDEN_PRODUCT_CALLS = [
  /\/api\/execute-transaction/,
  /\/api\/execute-prediction/,
  /\/api\/resolve-prediction/,
  /\/api\/tasks\/submit/,
  /\/api\/referrals\/apply-signup-bonus/,
  /\/api\/process-referral-reward/,
  /\/api\/offerwall\/my-rewards/,
  /\/api\/evaluate-user-integrity/,
];

/**
 * PulseEarn Firestore collections. The web SDK puts the document path in the
 * request URL, so a cross-product listener is observable here even though it is
 * not an /api/ call — this is the runtime half of the isolation guard, which
 * only proves the source has no such imports.
 *
 * Collections come from the PulseEarn engines:
 *   users/{uid}/notifications  NotificationEngine, BroadcastEngine
 *   users/{uid}/activities     ActivityEngine
 *   user_predictions           MarketResolutionEngine
 *   referrals / support_tickets / broadcasts / system_anomalies
 */
const FORBIDDEN_STORE_PATHS = [
  /\/documents\/users\/[^/]+\/notifications/,
  /\/documents\/users\/[^/]+\/activities/,
  /\/documents\/user_predictions/,
  /\/documents\/referrals/,
  /\/documents\/support_tickets/,
  /\/documents\/broadcasts/,
  /\/documents\/system_anomalies/,
];

/**
 * Firestore request URLs carry the project API key in the query string. Only the
 * path is ever recorded, so no credential can reach a screenshot or a report.
 */
function safePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '<unparseable>';
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE', requestId: 'auth-harness' }));
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

const MEASURE = () => {
  const vis = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const px = v => Math.round(parseFloat(v) || 0);
  const els = Array.from(document.querySelectorAll('body *')).filter(vis);
  const headings = ['h1', 'h2', 'h3'].flatMap(tag =>
    Array.from(document.querySelectorAll(tag)).filter(vis).map(h => ({
      tag, size: px(getComputedStyle(h).fontSize),
      text: (h.textContent || '').trim().slice(0, 44),
    })));
  const smallTargets = [];
  for (const el of Array.from(document.querySelectorAll('button, a, [role=button], input, select')).filter(vis)) {
    const r = el.getBoundingClientRect();
    if (r.height < 44) {
      smallTargets.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  const surfaces = new Set();
  let cardLike = 0;
  for (const el of els) {
    const s = getComputedStyle(el);
    const bg = s.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') surfaces.add(bg);
    const r = el.getBoundingClientRect();
    const bordered = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
    if (bordered && bg !== 'rgba(0, 0, 0, 0)' && r.width > 160 && r.height > 60) cardLike++;
  }
  return {
    docHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    headingSizes: [...new Set(headings.map(h => h.size))].sort((a, b) => b - a),
    headings: headings.slice(0, 12),
    cardLike, surfaces: surfaces.size,
    smallTargetsUnder44: smallTargets.slice(0, 10),
    textChars: (document.body.innerText || '').length,
  };
};

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.log('PSEmine authenticated verification: SKIPPED');
    console.log('  No test credentials in the environment, and this sandbox has no');
    console.log('  Firebase configuration, so no session can be created here.');
    console.log('  Re-run with:  PSE_TEST_EMAIL=… PSE_TEST_PASSWORD=… bun scripts/pse-authenticated-check.mjs');
    console.log('  Console routes therefore remain NOT RUNTIME VERIFIED in this environment.');
    return;
  }
  if (!BASE_URL && !fs.existsSync(DIST)) {
    console.error('No build at dist/. Run: bunx vite build');
    process.exit(1);
  }
  const server = BASE_URL ? null : await startServer();
  const base = BASE_URL || `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  // ── Sign in once, through the real form ────────────────────────────────────
  // ONE persistent context for the whole run. Firebase persists its session in
  // IndexedDB, which Playwright's storageState() does NOT capture — a fresh
  // context per width came back signed out, so every console route "redirected"
  // to /mine/login and the run proved nothing. The session now lives here and
  // widths are measured by resizing the viewport instead.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const authPage = await context.newPage();
  const authErrors = [];
  authPage.on('pageerror', e => authErrors.push(String(e).slice(0, 200)));
  await authPage.goto(`${base}/mine/login`, { waitUntil: 'load' });
  try {
    await authPage.fill('input[type="email"]', EMAIL);
    await authPage.fill('input[type="password"]', PASSWORD);
    await authPage.click('button[type="submit"]');
    await authPage.waitForURL(url => !/\/(login|signup)/.test(url.pathname), { timeout: 25_000 });
  } catch (e) {
    console.log(JSON.stringify({
      signedIn: false,
      reason: String(e).slice(0, 200),
      note: 'Sign-in did not complete. The account may need email verification, or the credentials are wrong. No result is claimed.',
      authErrors,
    }, null, 2));
    await browser.close();
    if (server) server.close();
    process.exitCode = 1;
    return;
  }
  const signedInAs = await authPage.evaluate(() => document.body.innerText.slice(0, 120));
  console.log(`Signed in. Landing text: ${signedInAs.replace(/\s+/g, ' ').slice(0, 80)}`);

  // Per-iteration capture, attached ONCE to the persistent page and reset at the
  // top of every route/width pass (listeners cannot be re-registered per pass
  // without duplicating every entry).
  const capture = { consoleErrors: [], pageErrors: [], productCalls: [], productStores: [] };
  const resetCapture = () => {
    capture.consoleErrors.length = 0;
    capture.pageErrors.length = 0;
    capture.productCalls.length = 0;
    capture.productStores.length = 0;
  };
  authPage.on('console', m => { if (m.type() === 'error') capture.consoleErrors.push(m.text().slice(0, 240)); });
  authPage.on('pageerror', e => capture.pageErrors.push(String(e).slice(0, 240)));
  authPage.on('request', r => {
    const url = r.url();
    if (FORBIDDEN_PRODUCT_CALLS.some(re => re.test(url))) capture.productCalls.push(safePath(url));
    if (FORBIDDEN_STORE_PATHS.some(re => re.test(url))) capture.productStores.push(safePath(url));
  });

  // ── Walk the console at every width with that session ─────────────────────
  // Mobile emulation flags (isMobile/hasTouch) are fixed per context, so the
  // width pass is a viewport resize: that is what drives the responsive
  // breakpoints and the layout measurements taken below.
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      const { consoleErrors, pageErrors, productCalls, productStores } = capture;
      resetCapture();
      await authPage.setViewportSize({ width, height: 900 });

      let measured = null, landedOn = '', title = '';
      try {
        await authPage.goto(`${base}${route.path}`, { waitUntil: 'load', timeout: 25_000 });
        await authPage.waitForTimeout(1200);
        landedOn = await authPage.evaluate(() => location.pathname);
        title = await authPage.title();
        measured = await authPage.evaluate(MEASURE);
        await authPage.screenshot({ path: path.join(OUT, `${route.id}-${width}.png`), fullPage: true, animations: 'disabled' });
      } catch (e) {
        pageErrors.push(`HARNESS: ${String(e).slice(0, 160)}`);
      }

      results.push({
        route: route.path, id: route.id, width, landedOn, title,
        reachedConsole: landedOn === route.path,
        ...(measured || {}),
        horizontalOverflow: measured ? measured.scrollWidth > measured.clientWidth + 1 : null,
        consoleErrors: [...consoleErrors], pageErrors: [...pageErrors],
        crossProductCalls: [...new Set(productCalls)],
        crossProductStoreReads: [...new Set(productStores)],
      });
    }
  }

  // ── Logout: the session must actually end ──────────────────────────────────
  // Runs in the SAME signed-in context (a fresh context is signed out by
  // definition and would report a fabricated pass). Reported as an observation,
  // never assumed: an unmatched control records the reason instead.
  const logout = { attempted: true, controlFound: false, signedOut: false, reason: '' };
  try {
    await authPage.setViewportSize({ width: 1280, height: 900 });
    await authPage.goto(`${base}/mine/me`, { waitUntil: 'load', timeout: 25_000 });
    await authPage.waitForTimeout(800);
    logout.landedOnMe = await authPage.evaluate(() => location.pathname);
    const control = authPage.getByRole('button', { name: /log ?out|sign ?out/i }).first();
    if (await control.count()) {
      logout.controlFound = true;
      await control.click();
      // A confirm dialog may stand in the way; accept it if present.
      const confirm = authPage.getByRole('button', { name: /log ?out|sign ?out|confirm|yes/i }).last();
      if (await confirm.count()) { try { await confirm.click({ timeout: 2_000 }); } catch { /* no dialog */ } }
      await authPage.waitForTimeout(2500);
      await authPage.goto(`${base}/mine/dashboard`, { waitUntil: 'load', timeout: 25_000 });
      await authPage.waitForTimeout(1200);
      logout.landedOn = await authPage.evaluate(() => location.pathname);
      logout.signedOut = !/^\/mine\/(dashboard|tools|wallet|referrals|activity|me)/.test(logout.landedOn);
    } else {
      logout.reason = `no logout control matched on /mine/me (landed ${logout.landedOnMe}) — reported, not assumed`;
    }
  } catch (e) {
    logout.reason = String(e).slice(0, 200);
  }

  await context.close();
  await browser.close();
  if (server) server.close();
  fs.writeFileSync(
    path.join(OUT, 'authenticated-report.json'),
    JSON.stringify({ routes: results, logout }, null, 2),
  );
  console.log(`\nLogout: control ${logout.controlFound ? 'found' : 'NOT FOUND'} · session ended: ${logout.signedOut}${logout.reason ? ` (${logout.reason})` : ''}`);

  // ── Report ────────────────────────────────────────────────────────────────
  const redirects = results.filter(r => !r.reachedConsole);
  const overflow = results.filter(r => r.horizontalOverflow);
  const leaks = results.filter(r => r.crossProductCalls.length || r.crossProductStoreReads.length);
  const errored = results.filter(r => r.pageErrors.length);
  const taps = results.filter(r => (r.smallTargetsUnder44 || []).length && r.width <= 430);

  console.log(`\nLoads: ${results.length} (${ROUTES.length} routes × ${WIDTHS.length} widths)`);
  console.log(`  redirected away from the console: ${redirects.length}`);
  redirects.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width} → ${r.landedOn}`));
  console.log(`  horizontal overflow: ${overflow.length}`);
  overflow.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width} (${r.scrollWidth} > ${r.clientWidth})`));
  console.log(`  PulseEarn product calls / store reads: ${leaks.length}`);
  leaks.slice(0, 6).forEach(r => console.log(
    `    ${r.route} @${r.width} → ${[...r.crossProductCalls, ...r.crossProductStoreReads].join(', ')}`,
  ));
  console.log(`  page errors: ${errored.length}`);
  errored.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width} → ${r.pageErrors[0]}`));
  console.log(`  mobile pages with taps under 44px: ${taps.length}`);
  taps.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width}: ${r.smallTargetsUnder44.slice(0, 3).join(' | ')}`));
  console.log(`\nReport + screenshots: ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
