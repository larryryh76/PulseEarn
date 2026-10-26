/**
 * PSEmine authenticated-console rendered check.
 *
 * The console is behind authentication, so the ordinary route harness can only
 * reach its guard. This script renders the SAME page components inside the SAME
 * shell, with the three provider hooks replaced by fixture-backed mocks resolved
 * in this process only (see scripts/console-harness/). src/ is untouched.
 *
 * It measures what a design review has to be able to state:
 *   • horizontal overflow  (documentElement.scrollWidth vs innerWidth)
 *   • elements extending past the viewport (excluding intentional scrollers)
 *   • clipped leaf text (overflow hidden/clip, no ellipsis)
 *   • controls wider than their box or shorter than 44px
 *   • whether the console footer and its last link clear the fixed dock
 *   • page errors and failed same-origin requests
 *
 * Usage:
 *   bun scripts/pse-console-check.mjs                 # all pages × scenarios × widths
 *   bun scripts/pse-console-check.mjs --quick         # wallet + dashboard only
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const HARNESS = path.join(ROOT, 'scripts/console-harness');
const OUT = path.join('/tmp', 'pse-console-check');
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const WIDTHS = arg('--widths') ? arg('--widths').split(',').map(Number) : [320, 360, 390, 430, 768, 1024, 1440];
const ALL_PAGES = [
  '/mine/dashboard', '/mine/wallet', '/mine/tools', '/mine/referrals', '/mine/activity', '/mine/me',
];
const ALL_SCENARIOS = ['full', 'empty', 'loading', 'error', 'wrongchain', 'settled'];
const PAGES = (arg('--pages')?.split(',') ?? (QUICK ? ['/mine/wallet', '/mine/dashboard'] : ALL_PAGES));
const SCENARIOS = (arg('--scenarios')?.split(',') ?? (QUICK ? ['full', 'empty', 'loading', 'wrongchain'] : ALL_SCENARIOS));

/* ── 1. The stylesheet the real app ships ─────────────────────────────────── */
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const cssHref = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1]
  ?? `/assets/${fs.readdirSync(path.join(DIST, 'assets')).find(f => f.endsWith('.css'))}`;

/* ── 2. Bundle the harness with the provider hooks mocked ─────────────────── */
const MOCKS = path.join(HARNESS, 'mocks.tsx');
await build({
  entryPoints: [path.join(HARNESS, 'entry.tsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  target: ['es2020'],
  outdir: OUT,
  entryNames: 'app',
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env': '{}',
  },
  plugins: [{
    name: 'console-harness-mocks',
    setup(b) {
      b.onResolve(
        { filter: /(^|\/)(usePSEMineAuth|PSEMineContext|PseStateProvider)$/ },
        () => ({ path: MOCKS }),
      );
      b.onResolve({ filter: /firebase\/config$/ }, () => ({ path: MOCKS }));
      b.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: MOCKS }));
    },
  }],
  logLevel: 'warning',
});

/* ── 3. Serve dist assets, the harness bundle and one HTML page ───────────── */
const MIME = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json',
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PSEmine console harness</title>
<link rel="stylesheet" href="${cssHref}">
</head><body><div id="root"></div><script src="/app.js"></script></body></html>`);
    return;
  }
  if (url.pathname === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    fs.createReadStream(path.join(OUT, 'app.js')).pipe(res);
    return;
  }
  const file = path.join(DIST, url.pathname);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404).end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

/* ── 4. Measure one rendered page ─────────────────────────────────────────── */
const AUDIT = () => {
  const vw = window.innerWidth;
  const scrollW = document.documentElement.scrollWidth;
  const label = el => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 120);
  };
  const visible = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Ignore descendants that are intentionally clipped by a parent. Their
  // bounding boxes may extend past the viewport (decorative orbit art in the
  // tools marketplace does this), but overflow:hidden/clip prevents them from
  // creating visible page overflow. documentElement.scrollWidth below remains
  // the authoritative guard for actual horizontal scrolling.
  const inScroller = el => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)
        || ['hidden', 'clip'].includes(s.overflowY)) return true;
    }
    return false;
  };

  const wide = [];
  const clipped = [];
  const controls = [];

  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);

    if (!inScroller(el) && (r.right > vw + 1 || r.left < -1)) {
      wide.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
    }

    /* `.sr-only` is clipped BY DESIGN: it is the text a sighted reader must not
       see and a screen reader must. It is not a clipping defect. */
    const isLeaf = el.children.length === 0 && (el.textContent || '').trim().length > 0
      && !el.classList.contains('sr-only');
    if (isLeaf && cs.textOverflow !== 'ellipsis'
      && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')
      && el.scrollWidth > el.clientWidth + 2) {
      clipped.push({ el: label(el), scrollW: el.scrollWidth, clientW: el.clientWidth });
    }

    if (el.matches('.pse-btn, .pse-w-action, .pse-icon-btn, .pse-nav-link, .pse-dock-link, .pse-foot-col a')) {
      if (el.scrollWidth > el.clientWidth + 2) {
        controls.push({ el: label(el), issue: 'content wider than control', scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
      if (r.height < 32) controls.push({ el: label(el), issue: 'target shorter than 32px', height: Math.round(r.height) });
    }
  }

  const dock = document.querySelector('.pse-dock');
  const foot = document.querySelector('.pse-console-foot');
  const lastFootLink = document.querySelector('.pse-console-foot-base a, .pse-foot-col a:last-child');
  window.scrollTo(0, document.documentElement.scrollHeight);
  const dockTop = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : null;
  const footBottom = foot ? foot.getBoundingClientRect().bottom : null;
  const lastBottom = lastFootLink ? lastFootLink.getBoundingClientRect().bottom : null;

  return {
    vw,
    scrollW,
    overflowX: scrollW - vw,
    wide: wide.slice(0, 8),
    clipped: clipped.slice(0, 8),
    controls: controls.slice(0, 8),
    dockTop: dockTop === null ? null : Math.round(dockTop),
    footBottom: footBottom === null ? null : Math.round(footBottom),
    lastBottom: lastBottom === null ? null : Math.round(lastBottom),
    bodyText: document.body.innerText.length,
  };
};

/* ── 5. Run every page × scenario × width ─────────────────────────────────── */
/* ── 5a. Inspect one state in detail (composition, not just defects) ─────── */
if (args.includes('--inspect')) {
  const browser = await chromium.launch({ headless: true });
  for (const pagePath of PAGES) {
    for (const scenario of SCENARIOS) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, isMobile: width < 700, hasTouch: width < 700 });
        const page = await ctx.newPage();
        await page.goto(`${base}/?path=${encodeURIComponent(pagePath)}&scenario=${scenario}`, { waitUntil: 'load' });
        await page.waitForTimeout(350);
        const detail = await page.evaluate(() => {
          const box = sel => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
          };
          const cs = sel => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const s = getComputedStyle(el);
            return { bg: s.backgroundColor, color: s.color, border: s.borderColor, display: s.display, cols: s.gridTemplateColumns, pad: s.padding };
          };
          const actionTops = [...document.querySelectorAll('.pse-w-action')].map(el => Math.round(el.getBoundingClientRect().top));
          const footCols = [...document.querySelectorAll('.pse-foot-col')].map(el => {
            const r = el.getBoundingClientRect();
            return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
          });
          const txRows = [...document.querySelectorAll('.pse-w-txrow')].map(el => Math.round(el.getBoundingClientRect().height));
          return {
            shell: cs('.pse-console-shell'),
            bar: box('.pse-bar'),
            strip: box('.pse-strip'),
            mainPadBottom: getComputedStyle(document.querySelector('.pse-console-main')).paddingBottom,
            dock: box('.pse-dock'),
            foot: box('.pse-console-foot'),
            footInner: box('.pse-console-foot-inner'),
            footInnerStyle: (() => {
              const el = document.querySelector('.pse-console-foot-inner');
              if (!el) return null;
              const s = getComputedStyle(el);
              return { width: s.width, maxWidth: s.maxWidth, marginLeft: s.marginLeft, boxSizing: s.boxSizing, count: document.querySelectorAll('.pse-console-foot-inner').length, parent: el.parentElement?.className };
            })(),
            footCols,
            footGrid: cs('.pse-console-foot-inner'),
            primaryBtn: cs('.pse-btn'),
            navCurrent: cs('.pse-nav-link[aria-current="page"]'),
            hero: box('.pse-w-hero'),
            heroFigure: cs('.pse-w-hero-figure'),
            balance: box('.pse-w-balance'),
            walletGrid: cs('.pse-w-grid'),
            actionCols: [...new Set(actionTops)].length,
            actionsPerRow: actionTops.filter(t => t === actionTops[0]).length,
            txRows,
            text: (document.querySelector('.pse-console-main')?.innerText || '').slice(0, 1400).replace(/\n+/g, ' | '),
          };
        });
        console.log(JSON.stringify({ page: pagePath, scenario, width, ...detail }));
        await ctx.close();
      }
    }
  }
  await browser.close();
  server.close();
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const rows = [];

for (const pagePath of PAGES) {
  for (const scenario of SCENARIOS) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: width < 700 ? 844 : 900 },
        isMobile: width < 700,
        hasTouch: width < 700,
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
      await page.goto(`${base}/?path=${encodeURIComponent(pagePath)}&scenario=${scenario}`, { waitUntil: 'load' });
      await page.waitForTimeout(450);
      const result = await page.evaluate(AUDIT);

      /* The wallet's transaction detail is a fold: it is only measurable once it
         is open, and it is where the full hash and address live — exactly the
         strings that used to widen a phone layout. */
      let detailResult = null;
      if (pagePath === '/mine/wallet' && (scenario === 'full' || scenario === 'settled')) {
        const rows = page.locator('.pse-w-txrow');
        const count = await rows.count();
        for (let i = 0; i < count; i += 1) await rows.nth(i).click();
        detailResult = await page.evaluate(AUDIT);
      }

      const problems = [];
      if (result.overflowX > 0) problems.push(`horizontal overflow ${result.overflowX}px`);
      if (result.wide.length) problems.push(`${result.wide.length} element(s) outside viewport`);
      if (result.clipped.length) problems.push(`${result.clipped.length} clipped text node(s)`);
      if (result.controls.length) problems.push(`${result.controls.length} control(s)`);
      if (result.dockTop !== null && result.footBottom !== null && result.footBottom > result.dockTop) {
        problems.push(`footer under the dock (${result.footBottom} > ${result.dockTop})`);
      }
      if (result.dockTop !== null && result.lastBottom !== null && result.lastBottom > result.dockTop) {
        problems.push(`last footer link under the dock (${result.lastBottom} > ${result.dockTop})`);
      }
      if (result.bodyText < 120) problems.push(`page did not paint (${result.bodyText} chars)`);
      if (errors.length) problems.push(`page error: ${errors[0]}`);
      if (detailResult) {
        if (detailResult.overflowX > 0) problems.push(`horizontal overflow ${detailResult.overflowX}px with transaction details open`);
        if (detailResult.wide.length) problems.push(`${detailResult.wide.length} element(s) outside viewport with details open`);
        if (detailResult.clipped.length) problems.push(`${detailResult.clipped.length} clipped text node(s) with details open`);
        if (detailResult.dockTop !== null && detailResult.lastBottom !== null && detailResult.lastBottom > detailResult.dockTop) {
          problems.push('last footer link under the dock with details open');
        }
      }

      const row = { page: pagePath, scenario, width, ...result, details: detailResult, problems };
      rows.push(row);
      if (problems.length) failures.push(row);

      const shotName = `${pagePath.replace(/\//g, '-').replace(/^-/, '')}-${scenario}-${width}.png`;
      if ((scenario === 'full' && (width === 320 || width === 390 || width === 1440))
        || (scenario !== 'full' && width === 390)) {
        await page.screenshot({ path: path.join(OUT, shotName), fullPage: true, animations: 'disabled' });
      }
      await ctx.close();
    }
  }
}

await browser.close();
server.close();

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));

const summary = rows.length;
console.log(`Rendered ${summary} console states (${PAGES.length} pages × ${SCENARIOS.length} scenarios × ${WIDTHS.length} widths).`);
console.log(`Screenshots + report: ${OUT}`);

if (failures.length === 0) {
  console.log('PASS — no overflow, clipping, control or dock defects measured.');
} else {
  console.log(`FAIL — ${failures.length} state(s) with measured defects:`);
  for (const f of failures.slice(0, 24)) {
    console.log(`  ${f.width}px ${f.page} [${f.scenario}] → ${f.problems.join('; ')}`);
    for (const w of f.wide) console.log(`      wide: ${w.el} (${w.left}..${w.right})`);
    for (const c of f.clipped) console.log(`      clipped: ${c.el} (${c.scrollW} > ${c.clientW})`);
    for (const c of f.controls) console.log(`      control: ${c.el} — ${c.issue}${c.height ? ` (${c.height}px)` : ''}`);
  }
  process.exitCode = 1;
}
