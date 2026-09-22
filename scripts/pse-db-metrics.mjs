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

const meterOf = (headers) => {
  const out = {};
  for (const [k, v] of headers) if (k.toLowerCase().startsWith('x-pse-db')) out[k.toLowerCase()] = v;
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

/** Refuse to measure a degraded backend: its numbers mean nothing and the load makes an outage worse. */
async function preflight() {
  const res = await fetch(`${PROD}/api/health`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(e => { throw new Error(`health unreachable: ${e.message}`); });
  const body = await res.json().catch(() => null);
  const checks = body?.checks || {};
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

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nreport → ${OUT}`);
