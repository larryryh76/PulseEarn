/**
 * PSEmine Firestore-consumption METER harness.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 2026-09-21 quota incident could only be investigated from code analysis
 * because nothing measured a single session. This script is the instrument that
 * was missing, and it is deliberately the LIGHTEST possible one:
 *
 *   • MODE A (default) — N metered REST calls to `GET /api/mine/state` with the
 *     backend's opt-in cost meter (`X-Pse-Db-Metrics: 1`), and nothing else.
 *     One call falls inside the noise floor of the project's own traffic, so it
 *     can be run before and after a change without influencing the result.
 *   • MODE B (`PSE_METRICS_BROWSER=1`) — exactly ONE authenticated browser
 *     session, left open on the console for PSE_METRICS_HOLD_MIN minutes, with
 *     every `/api/*` request, its DB-meter headers, every console warning/error
 *     and the rendered figures captured. That is the "reads per normal user
 *     session" measurement the forensic audit could not take: listener count,
 *     polling cadence and write attribution in one pass.
 *
 * It never creates an account, never writes application data, never signs a
 * transaction and never spends BNB. Credentials are read the same way the other
 * harnesses read them and are never printed.
 *
 * Usage:
 *   bun scripts/pse-db-metrics.mjs                                  # 1 metered call
 *   PSE_METRICS_SAMPLES=3 bun scripts/pse-db-metrics.mjs            # 3, 4s apart
 *   PSE_METRICS_BROWSER=1 PSE_METRICS_HOLD_MIN=15 bun scripts/pse-db-metrics.mjs
 *   PSE_METRICS_OUT=/tmp/after.json PSE_METRICS_BROWSER=1 bun scripts/pse-db-metrics.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const PROD = process.env.PSE_METRICS_BASE_URL || process.env.PSE_QA_BASE_URL || 'https://www.pulseearn.online';
const CREDS_FILE = process.env.PSE_METRICS_CREDS || process.env.PSE_QA_CREDS || '/tmp/pse-qa/creds.json';
const SAMPLES = Number(process.env.PSE_METRICS_SAMPLES || '1');
const BROWSER = process.env.PSE_METRICS_BROWSER === '1';
const HOLD_MIN = Number(process.env.PSE_METRICS_HOLD_MIN || '15');
const OUT = process.env.PSE_METRICS_OUT || '/tmp/pse-db-metrics';
let PROJECT_ID = 'pulseearn-a4b16';
const FEEDS = process.env.PSE_METRICS_FEEDS === '1';
const INDEX_PROBE = process.env.PSE_METRICS_INDEX_PROBE === '1';

const readCreds = () => {
  const c = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  const email = c.email || c.PSE_TEST_EMAIL || c.PSE_QA_EMAIL;
  const password = c.password || c.PSE_TEST_PASSWORD || c.PSE_QA_PASSWORD;
  if (!email || !password) throw new Error('QA credentials file has no email/password pair');
  return { email, password };
};

/** Public Firebase web API key from the production bundle (same path the harnesses use). */
async function firebaseKey() {
  const html = await (await fetch(`${PROD}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  for (const s of scripts.slice(0, 12)) {
    const js = await (await fetch(PROD + s)).text();
    const m = js.match(/apiKey:"([A-Za-z0-9_-]{20,})"/)
      || js.match(/apiKey":"([A-Za-z0-9_-]{20,})/)
      || js.match(/(AIza[A-Za-z0-9_-]{30,40})/);
    if (m) return m[1];
  }
  throw new Error('public Firebase web API key not found in the production bundle');
}

async function fbSignIn(email, password) {
  const key = await firebaseKey();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`fb sign-in ${res.status}: ${j.error?.message || '?'}`);
  return j.idToken;
}

/** Accepts a Fetch `Headers` (REST path) or a plain object (Playwright response). */
const meterOf = (headers) => {
  const out = {};
  const entries = typeof headers?.entries === 'function' ? headers.entries() : Object.entries(headers || {});
  for (const [k, v] of entries) if (k.toLowerCase().startsWith('x-pse-db')) out[k.toLowerCase()] = v;
  return out;
};
const numbers = (meter) => {
  const n = {};
  for (const [k, v] of Object.entries(meter)) {
    const parsed = Number(v);
    if (!Number.isNaN(parsed)) n[k] = parsed;
  }
  return n;
};
const sumMeters = (list) => {
  const acc = {};
  for (const m of list) for (const [k, v] of Object.entries(numbers(m))) acc[k] = (acc[k] || 0) + v;
  return acc;
};

/** The signed-in uid, read from the ID-token payload (never printed). */
const uidOf = (token) => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  return payload.user_id || payload.sub;
};

/**
 * MODE C (`PSE_METRICS_FEEDS=1`) — ONE metered call per PSEmine feed.
 *
 * The backend's tally lives on Flask's per-request `g`, so asking for the meter
 * on a feed reports exactly what THAT feed cost in Firestore operations and in
 * documents touched. This is what separates "API calls" from "document reads".
 */
/**
 * Structural summary of a response body — key names, array LENGTHS and scalar
 * values only. It exists so a data-integrity check can see whether the figures
 * the console renders are present and plausible without the harness storing or
 * printing any personal data.
 */
const summarize = (body) => {
  if (!body || typeof body !== 'object') return null;
  const scalars = {};
  const arrays = {};
  for (const [k, v] of Object.entries(body)) {
    if (Array.isArray(v)) arrays[k] = v.length;
    else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') scalars[k] = v;
  }
  const nested = {};
  for (const [k, v] of Object.entries(body)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      nested[k] = Object.fromEntries(Object.entries(v)
        .filter(([, x]) => typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean')
        .map(([x, y]) => [x, typeof y === 'string' && y.length > 60 ? `${y.slice(0, 60)}…` : y]));
    }
  }
  return { keys: Object.keys(body), arrays, scalars, nested };
};

/**
 * MODE F (`PSE_METRICS_QUOTES=1`) — the authoritative quote for every locked
 * tier, so the prices the production backend serves can be compared against the
 * locked table instead of being assumed. POSTs only create a quote record; no
 * wallet is touched, nothing is signed and no BNB is spent.
 */
async function quoteSamples(token) {
  const out = [];
  for (const toolId of ['starter', 'builder', 'advanced', 'elite']) {
    const t0 = Date.now();
    const res = await fetch(`${PROD}/api/mine/tools/quote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
        'X-Pse-Db-Metrics': '1', 'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({ toolId }),
    });
    const body = await res.json().catch(() => null);
    const q = body?.quote || {};
    out.push({
      toolId, status: res.status, durationMs: Date.now() - t0,
      gbpPrice: q.gbpPrice ?? null, bnbAmount: q.bnbAmount ?? null,
      exchangeRateBNBGBP: q.exchangeRateBNBGBP ?? null,
      chainId: q.chainId ?? null, receiverWallet: q.receiverWallet ?? null,
      expiresAt: q.expiresAt ?? null, meter: meterOf(res.headers),
    });
    const last = out[out.length - 1];
    console.log(`  ${toolId.padEnd(8)} ${res.status} gbp=${last.gbpPrice} bnb=${last.bnbAmount} rate=${last.exchangeRateBNBGBP} chain=${last.chainId} ${JSON.stringify(last.meter)}`);
  }
  return out;
}

/**
 * MODE E (`PSE_METRICS_RULES_PROBE=1`) — READ-ONLY probes of the DEPLOYED
 * security rules, using the signed-in user's own token.
 *
 * Nothing here writes, and nothing prints document contents. It answers the one
 * question code cannot: are the rules that are live in `pulseearn-a4b16` the
 * owner-scoped ones the repository declares?
 */
async function rulesProbe(token, projectId, uid) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const targets = [
    { label: 'psemine_users/{self}          (owner read — expect 200)', path: `psemine_users/${uid}`, showKeys: true },
    // DISCRIMINATING PROBE: a foreign-looking uid in the path. An owner-scoped
    // rule denies it (403). A wide-open `allow read: if true` would return 404
    // instead, so this separates "scoped" from "public" in one request.
    { label: 'psemine_users/{foreign uid}     (owner-scoped — expect 403, NOT 404)', path: 'psemine_users/pseProbeForeignUser0001', showKeys: false },
    { label: 'psemine_campaigns/active_campaign (entitled read — expect 200)', path: 'psemine_campaigns/active_campaign', showKeys: true },
    { label: 'users/{self}                 (PulseEarn owner read — expect 200)', path: `users/${uid}`, showKeys: true },
  ];
  const out = [];
  for (const t of targets) {
    const res = await fetch(`${base}/${t.path}`, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    let keys = null;
    let stamps = null;
    if (t.showKeys && res.ok) {
      try {
        const fields = JSON.parse(text).fields || {};
        keys = Object.keys(fields);
        // Timestamps ONLY (never contents): the test for "does merely viewing
        // the dashboard write this document?" is whether the backend's own
        // updatedAt/lastAccruedAt advance while a session sits and watches.
        stamps = Object.fromEntries(['updatedAt', 'lastAccruedAt', 'connectedWalletUpdatedAt', 'createdAt']
          .filter(k => fields[k])
          .map(k => [k, fields[k].timestampValue || fields[k].stringValue || null]));
      } catch { keys = null; }
    }
    out.push({ path: t.path, httpStatus: res.status, topLevelFields: keys, stamps, detail: text.slice(0, 200).replace(/\s+/g, ' ') });
    console.log(`  ${t.label.padEnd(70)} → HTTP ${res.status}${keys ? ` fields=[${keys.join(', ')}]` : ''}`);
    if (stamps) console.log(`      timestamps: ${JSON.stringify(stamps)}`);
  }
  return out;
}

const FEED_PATHS = [
  '/api/mine/state',
  '/api/mine/activities',
  '/api/mine/notifications',
  '/api/mine/referrals',
  '/api/mine/withdrawals',
  '/api/mine/campaign/status',
];

async function feedSamples(token) {
  const out = [];
  for (const path of FEED_PATHS) {
    const t0 = Date.now();
    const res = await fetch(PROD + path, {
      headers: { Authorization: `Bearer ${token}`, 'X-Pse-Db-Metrics': '1', 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await res.json().catch(() => null);
    const meter = meterOf(res.headers);
    const bytes = body ? JSON.stringify(body).length : 0;
    out.push({ path, status: res.status, durationMs: Date.now() - t0, jsonBytes: bytes, meter, shape: summarize(body) });
    console.log(`  ${path.padEnd(32)} ${res.status} ${String(Date.now() - t0).padStart(5)}ms ${String(bytes).padStart(6)}b  ${JSON.stringify(meter)}`);
  }
  return out;
}

/**
 * MODE D (`PSE_METRICS_INDEX_PROBE=1`) — ask Firestore directly whether each
 * DECLARED composite index can actually plan its query.
 *
 * A declared-but-undeployed (or still-building) composite index is invisible in
 * application behaviour: Firestore rejects the shape with FAILED_PRECONDITION
 * and the purchases listener silently degrades. `runQuery` over REST with the
 * signed-in user's own token distinguishes the two states explicitly:
 *   • 200                    → the shape is planable (index deployed + building done)
 *   • FAILED_PRECONDITION    → the index is missing or still building
 *   • PERMISSION_DENIED      → rules deny this caller; index state NOT proven
 * At most one document read per probe.
 */
async function probeIndexes(token, uid, projectId) {
  const declared = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf8')).indexes || [];
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const results = [];
  for (const ix of declared) {
    const fields = ix.fields.map(f => ({ path: f.fieldPath, order: f.order === 'DESCENDING' ? 'DESCENDING' : 'ASCENDING' }));
    const equality = fields.slice(0, -1);
    const last = fields[fields.length - 1];
    const valueFor = (path) => (/^(is|has)[A-Z]|Flag|Enabled$/i.test(path)
      ? { booleanValue: false } : { stringValue: uid });
    const structured = {
      from: [{ collectionId: ix.collectionGroup }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: equality.map(f => ({
            fieldFilter: { field: { fieldPath: f.path }, op: 'EQUAL', value: valueFor(f.path) },
          })),
        },
      },
      orderBy: [{ field: { fieldPath: last.path }, direction: last.order }],
      limit: 1,
    };
    let verdict = 'UNKNOWN', detail = '';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: structured }),
      });
      const text = await res.text();
      const status = (() => { try { return JSON.parse(text).error?.status || ''; } catch { return ''; } })();
      if (res.status === 200) verdict = 'INDEX PRESENT';
      else if (status === 'FAILED_PRECONDITION' || /requires an index/i.test(text)) verdict = 'INDEX MISSING';
      else if (res.status === 403 || status === 'PERMISSION_DENIED') verdict = 'RULES DENY (not proven)';
      else verdict = `HTTP ${res.status} ${status}`;
      detail = text.slice(0, 180).replace(/\s+/g, ' ');
      results.push({ collectionGroup: ix.collectionGroup, shape: fields.map(f => `${f.path} ${f.order}`).join(', '), httpStatus: res.status, verdict });
    } catch (e) {
      results.push({ collectionGroup: ix.collectionGroup, shape: fields.map(f => `${f.path} ${f.order}`).join(', '), httpStatus: null, verdict: 'ERROR', detail: String(e).slice(0, 160) });
    }
    const r = results[results.length - 1];
    console.log(`  ${(r.collectionGroup + ' (' + r.shape + ')').padEnd(64)} → ${r.verdict}`);
  }
  return results;
}

/** Refuse to measure a degraded backend: its numbers mean nothing and the load makes an outage worse. */
async function preflight() {
  const res = await fetch(`${PROD}/api/health`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(e => { throw new Error(`health unreachable: ${e.message}`); });
  const body = await res.json().catch(() => null);
  const checks = body?.checks || {};
  PROJECT_ID = body?.projectId || PROJECT_ID;
  console.log(`── PREFLIGHT ── /api/health → ${res.status} ${body?.status || ''}`
    + ` (firestore=${checks.firestoreReachable}, storage=${checks.storageReachable})`);
  if (!(res.ok && body?.success === true) && process.env.PSE_METRICS_FORCE !== '1') {
    console.error('REFUSING TO MEASURE: backend is not healthy. Override with PSE_METRICS_FORCE=1 only to observe a degraded backend.');
    process.exit(3);
  }
}

/** MODE A — metered REST samples. */
async function restSamples(token) {
  const samples = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t0 = Date.now();
    const res = await fetch(`${PROD}/api/mine/state`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Pse-Db-Metrics': '1', 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await res.json().catch(() => null);
    const meter = meterOf(res.headers);
    samples.push({
      n: i + 1, status: res.status, durationMs: Date.now() - t0, meter,
      requestId: res.headers.get('x-request-id'),
      report: body ? {
        campaignStatus: body.effectiveCampaignStatus ?? null,
        tools: Array.isArray(body.tools) ? body.tools.length : null,
        ownerships: Array.isArray(body.ownerships) ? body.ownerships.length : null,
        availableMinor: body.user?.availableMinor ?? null,
        lifecycleState: body.user?.lifecycleState ?? null,
      } : null,
    });
    console.log(`  sample ${i + 1}: ${res.status} in ${Date.now() - t0}ms  ${JSON.stringify(meter)}`);
    if (i + 1 < SAMPLES) await new Promise(r => setTimeout(r, 4000));
  }
  return samples;
}

/** MODE B — exactly one authenticated console session, held open, fully instrumented. */
async function browserSession(email, password) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // Ask the backend for its per-request cost meter on the console's OWN state
  // calls, so a session reports the writes/transactions it caused — not just how
  // many requests it made. The header is opt-in and same-origin only; the app
  // never sends it, so ordinary users are unaffected.
  await context.route('**/api/**', async (route) => {
    const headers = { ...route.request().headers() };
    // Meter every PSEmine API call the console makes, so feed reads inside the
    // session are attributed instead of being invisible.
    if (new URL(route.request().url()).pathname.startsWith('/api/mine/')) headers['x-pse-db-metrics'] = '1';
    await route.continue({ headers });
  });
  const page = await context.newPage();

  const apiCalls = [];       // every /api/* request seen, with status + meter
  const consoleEvents = [];  // warnings/errors, deduped later
  const pageErrors = [];
  page.on('console', m => {
    const type = m.type();
    if (type === 'warning' || type === 'error') consoleEvents.push({ type, text: m.text().slice(0, 500), at: Date.now() });
  });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    // A redirected/opaque response can throw here; that is not an error worth
    // aborting a measurement for — the call is still counted, just un-metered.
    let meter = {};
    try { meter = meterOf(res.headers()); } catch { /* opaque response */ }
    apiCalls.push({ at: Date.now(), path: new URL(url).pathname, status: res.status(), meter });
  });

  await page.goto(`${PROD}/mine/login`, { waitUntil: 'load', timeout: 60_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !/\/(login|signup)/.test(u.pathname), { timeout: 60_000 });

  // Land on the console and stay there, so the cadence is measured unimpeded.
  await page.goto(`${PROD}/mine/dashboard`, { waitUntil: 'load', timeout: 60_000 });
  const startedAt = Date.now();
  const readings = [];
  const figureProbe = () => {
    const text = (document.body.innerText || '').replace(/\s+/g, ' ');
    return {
      gbp: [...text.matchAll(/£\s?[\d,]+\.\d{2}/g)].map(m => m[0]).slice(0, 8),
      headline: text.slice(0, 240),
    };
  };
  readings.push({ at: 0, ...(await page.evaluate(figureProbe)) });

  // OPTIONAL TOUR (`PSE_METRICS_TOUR=1`): walk every authenticated console route
  // once and record what each one rendered, what it cost, and whether the
  // "services temporarily unavailable" banner ever appeared. A 200 on the SPA
  // shell proves nothing about the page actually working, so this is the check
  // that does.
  let tour = null;
  if (process.env.PSE_METRICS_TOUR === '1') {
    tour = [];
    const widths = (process.env.PSE_METRICS_WIDTHS || '390,1440').split(',').map(Number);
    const routes = (process.env.PSE_METRICS_ROUTES || '/mine,/mine/dashboard,/mine/tools,/mine/wallet,/mine/referrals,/mine/activity,/mine/me,/mine/guide').split(',');
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const r of routes) {
        const before = apiCalls.length;
        const errsBefore = pageErrors.length;
        await page.goto(PROD + r, { waitUntil: 'load', timeout: 45_000 });
        await page.waitForTimeout(3000);
        const probe = await page.evaluate(() => {
          const text = document.body.innerText || '';
          const doc = document.documentElement;
          return {
            textLen: text.replace(/\s+/g, ' ').trim().length,
            overflow: doc.scrollWidth > window.innerWidth + 1,
            scrollWidth: doc.scrollWidth,
            innerWidth: window.innerWidth,
            unavailableBanner: /temporarily unavailable|Something went wrong|Cannot read propert|Internal Server Error/i.test(text),
            headline: text.replace(/\s+/g, ' ').trim().slice(0, 80),
          };
        }).catch(() => ({ textLen: 0, overflow: null, unavailableBanner: null, headline: null }));
        tour.push({
          width, route: r, textLen: probe.textLen, overflow: probe.overflow,
          scrollWidth: probe.scrollWidth, innerWidth: probe.innerWidth,
          unavailableBanner: probe.unavailableBanner, headline: probe.headline,
          newApiCalls: apiCalls.slice(before).map(c => `${c.path} ${c.status}`),
          pageErrors: pageErrors.slice(errsBefore),
        });
        console.log(`  TOUR @${width} ${r.padEnd(20)} text=${String(probe.textLen).padStart(5)} overflow=${probe.overflow} banner=${probe.unavailableBanner} newApi=${apiCalls.length - before}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${PROD}/mine/dashboard`, { waitUntil: 'load', timeout: 45_000 });
  }

  const holdMs = HOLD_MIN * 60_000;
  const sampleEvery = 30_000;
  while (Date.now() - startedAt < holdMs) {
    await page.waitForTimeout(Math.min(sampleEvery, Math.max(1000, holdMs - (Date.now() - startedAt))));
    readings.push({ at: Math.round((Date.now() - startedAt) / 1000), ...(await page.evaluate(figureProbe).catch(() => ({ gbp: null, headline: null }))) });
  }

  const stateCalls = apiCalls.filter(c => c.path === '/api/mine/state');
  const spacingSec = stateCalls.slice(1).map((c, i) => Math.round((c.at - stateCalls[i].at) / 1000));
  const byPath = {};
  for (const c of apiCalls) byPath[c.path] = (byPath[c.path] || 0) + 1;
  const uniqueConsole = [...new Map(consoleEvents.map(e => [`${e.type}:${e.text}`, e])).values()];
  // Firestore's missing-index error carries the console URL that creates it.
  const indexUrls = [...new Set(consoleEvents.flatMap(e => (e.text.match(/https:\/\/console\.firebase\.google\.com\S+/g) || [])))];

  await browser.close();
  return {
    holdMinutes: HOLD_MIN,
    stateCalls: stateCalls.length,
    stateSpacingSec: spacingSec,
    stateMeterTotals: sumMeters(stateCalls.map(c => c.meter)),
    apiRequestsByPath: byPath,
    allMeterTotals: sumMeters(apiCalls.map(c => c.meter)),
    totalApiRequests: apiCalls.length,
    consoleWarningsAndErrors: uniqueConsole,
    consoleEventCounts: consoleEvents.reduce((a, e) => { a[e.type] = (a[e.type] || 0) + 1; return a; }, {}),
    pageErrors: [...new Set(pageErrors)],
    missingIndexConsoleUrls: indexUrls,
    tour,
    readings,
    apiCalls,
  };
}

await preflight();
const { email, password } = readCreds();
const token = await fbSignIn(email, password);
console.log(`── SIGNED IN ── ${PROD} (account reused, no new user created)`);

const report = { target: PROD, at: new Date().toISOString(), mode: BROWSER ? 'browser-session' : 'rest-samples' };
if (BROWSER) {
  console.log(`── SESSION ── one authenticated console, held ${HOLD_MIN} minute(s)`);
  report.session = await browserSession(email, password);
  const s = report.session;
  console.log(`  /api/mine/state calls: ${s.stateCalls}  spacing(s): ${JSON.stringify(s.stateSpacingSec)}`);
  console.log(`  state meter totals:    ${JSON.stringify(s.stateMeterTotals)}`);
  console.log(`  /api requests total:   ${s.totalApiRequests}  by path: ${JSON.stringify(s.apiRequestsByPath)}`);
  console.log(`  console warn/error:    ${JSON.stringify(s.consoleEventCounts)}`);
  for (const e of s.consoleWarningsAndErrors.slice(0, 8)) console.log(`    · [${e.type}] ${e.text.slice(0, 200)}`);
  if (s.missingIndexConsoleUrls.length) console.log(`  INDEX CREATION URL(S): ${s.missingIndexConsoleUrls.join(' ')}`);
} else {
  console.log(`── REST ── ${SAMPLES} metered GET /api/mine/state`);
  report.samples = await restSamples(token);
  console.log(`  totals: ${JSON.stringify(sumMeters(report.samples.map(s => s.meter)))}`);
}

if (FEEDS) {
  console.log('── FEEDS ── one metered call per PSEmine feed');
  report.feeds = await feedSamples(token);
}
if (process.env.PSE_METRICS_QUOTES === '1') {
  console.log('── QUOTES ── authoritative quote per locked tier (no BNB spent, no wallet touched)');
  report.quotes = await quoteSamples(token);
}
if (process.env.PSE_METRICS_RULES_PROBE === '1') {
  console.log('── RULES PROBE ── deployed-rule behaviour, read-only, as the signed-in user');
  report.rulesProbe = await rulesProbe(token, PROJECT_ID, uidOf(token));
}
if (INDEX_PROBE) {
  console.log(`── INDEX PROBE ── Firestore runQuery against ${PROJECT_ID} (as the signed-in user)`);
  report.indexProbe = await probeIndexes(token, uidOf(token), PROJECT_ID);
}

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nreport → ${OUT}`);
