/**
 * PSEmine rendered-evidence harness.
 *
 * Serves the production build (dist/) over an ephemeral in-process HTTP server,
 * loads each PSEmine route at the six required viewport widths, and records:
 *
 *   • a PNG screenshot per route × width  (default: /tmp/pse-visual)
 *   • horizontal-overflow measurement (documentElement.scrollWidth vs viewport)
 *   • console errors / page errors / failed same-origin requests
 *   • whether the app actually painted (body text length, #root children)
 *   • the document title (PSEmine must own it, not PulseEarn)
 *   • every request to a PulseEarn product endpoint, which must NOT happen
 *     during a PSEmine session
 *
 * It is a one-shot process: the server is created inside the run and closed at
 * the end, so it never leaves a long-lived dev server behind.
 *
 * Usage:  bun scripts/pse-visual-check.mjs [--widths 375,390,...] [--out DIR]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

const args = process.argv.slice(2);
const outArgIdx = args.indexOf('--out');
const OUT = outArgIdx >= 0 ? args[outArgIdx + 1] : '/tmp/pse-visual';
const widthsArgIdx = args.indexOf('--widths');
const WIDTHS = widthsArgIdx >= 0
  ? args[widthsArgIdx + 1].split(',').map(n => parseInt(n.trim(), 10))
  : [375, 390, 430, 768, 1024, 1440];

/** Routes that render without an authenticated session (plus the guard itself). */
const ROUTES = [
  { id: 'landing', path: '/mine' },
  { id: 'login', path: '/mine/login' },
  { id: 'signup', path: '/mine/signup' },
  { id: 'forgot', path: '/mine/forgot-password' },
  { id: 'guide', path: '/mine/guide' },
  { id: 'dashboard-guarded', path: '/mine/dashboard' },
];

/**
 * PulseEarn PRODUCT endpoints. A PSEmine session must never touch these — the
 * defect that started this work was /api/execute-transaction (daily reward)
 * firing from a PSEmine page.
 */
const FORBIDDEN_PRODUCT_CALLS = [
  /execute-transaction/,
  /\/api\/tasks/,
  /\/api\/predictions/,
  /\/api\/daily-reward/,
  /\/api\/welcome-bonus/,
  /\/api\/streak/,
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      // No backend exists in this sandbox: answer API calls with an explicit,
      // structured "unavailable" instead of silently fabricating data.
      if (url.pathname.startsWith('/api/')) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'No API backend is running in the visual-verification sandbox.',
          requestId: 'visual-harness',
        }));
        return;
      }
      let filePath = path.join(DIST, url.pathname);
      if (!filePath.startsWith(DIST)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST, 'index.html'); // SPA fallback
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function run() {
  if (!fs.existsSync(DIST)) {
    console.error(`No build found at ${DIST}. Run: bunx vite build`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        isMobile: width <= 430,
        hasTouch: width <= 430,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      const productCalls = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
      page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
      page.on('requestfailed', r => failedRequests.push(`${r.method()} ${r.url()}`));
      // Cross-product isolation: none of these may be requested from /mine/*.
      page.on('request', r => {
        const u = r.url();
        if (FORBIDDEN_PRODUCT_CALLS.some(re => re.test(u))) productCalls.push(u);
      });

      let title = '';
      let painted = 0;
      let rootChildren = 0;
      let scrollWidth = 0;
      let clientWidth = 0;
      let overflow = [];
      try {
        await page.goto(`${base}${route.path}`, { waitUntil: 'load', timeout: 20_000 });
        await page.waitForTimeout(900);
        title = await page.title();
        painted = await page.evaluate(() => (document.body?.innerText || '').trim().length);
        rootChildren = await page.evaluate(() => document.getElementById('root')?.childElementCount ?? 0);
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        scrollWidth = metrics.scrollWidth;
        clientWidth = metrics.clientWidth;
        if (scrollWidth > clientWidth + 1) {
          // Identify which elements exceed the viewport, so a finding is actionable.
          overflow = await page.evaluate((vw) => {
            const out = [];
            document.querySelectorAll('body *').forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
                const tag = el.tagName.toLowerCase();
                const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 3).join('.') : '';
                const text = (el.textContent || '').trim().slice(0, 40);
                out.push(`${tag}${cls ? '.' + cls : ''} [${Math.round(r.left)}→${Math.round(r.right)}] "${text}"`);
              }
            });
            return out.slice(0, 8);
          }, width);
        }
        await page.screenshot({ path: path.join(OUT, `${route.id}-${width}.png`), fullPage: true, animations: 'disabled' });
      } catch (e) {
        pageErrors.push(`HARNESS: ${String(e).slice(0, 200)}`);
      }
      await context.close();

      report.push({
        route: route.path, id: route.id, width, title,
        titleOwnedByPsemine: /PSEmine/.test(title),
        paintedChars: painted, rootChildren,
        scrollWidth, clientWidth, horizontalOverflow: scrollWidth > clientWidth + 1, overflow,
        consoleErrors, pageErrors, failedRequests: failedRequests.slice(0, 5),
        crossProductCalls: [...new Set(productCalls)].slice(0, 5),
      });
    }
  }

  await browser.close();
  server.close();

  const summary = report.map(r => ({
    route: r.route, width: r.width, painted: r.paintedChars > 40, rootChildren: r.rootChildren,
    overflow: r.horizontalOverflow, consoleErrors: r.consoleErrors.length, pageErrors: r.pageErrors.length,
    title: r.titleOwnedByPsemine ? 'psemine' : 'NOT-PSEMINE',
    crossProductCalls: r.crossProductCalls.length,
  }));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: OUT, summary }, null, 2));

  const bad = report.filter(r => r.horizontalOverflow || r.pageErrors.length > 0 || r.paintedChars <= 40);
  if (bad.length) {
    console.log('\nISSUES:');
    for (const b of bad) {
      console.log(`- ${b.route} @${b.width}px overflow=${b.horizontalOverflow} painted=${b.paintedChars} pageErrors=${JSON.stringify(b.pageErrors)}`);
      for (const o of b.overflow) console.log(`    overflow: ${o}`);
    }
  } else {
    console.log('\nNo horizontal overflow, paint failures or page errors detected.');
  }

  const leaky = report.filter(r => r.crossProductCalls.length > 0);
  console.log('\nCROSS-PRODUCT ISOLATION:');
  if (leaky.length) {
    for (const l of leaky) console.log(`  ✗ ${l.route} @${l.width}px → ${l.crossProductCalls.join(', ')}`);
  } else {
    console.log(`  ✓ 0 PulseEarn product calls across ${report.length} PSEmine page loads`);
  }
  const mistitled = report.filter(r => !r.titleOwnedByPsemine);
  console.log('PRODUCT TITLE:');
  if (mistitled.length) {
    for (const m of mistitled) console.log(`  ✗ ${m.route} @${m.width}px → "${m.title}"`);
  } else {
    console.log('  ✓ every PSEmine route owns the document title');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
