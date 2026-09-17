/**
 * PSEmine rendered design measurement.
 *
 * Measures the *real* layout in Chromium (not the JSX): document height,
 * heading scale, surface/radius/shadow variance, vertical rhythm, tap-target
 * compliance, text clipping and palette spread. Screenshots land in --out.
 *
 * Usage: bun scripts/pse-design-audit.mjs [--routes /mine,/mine/guide] [--out DIR]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', '/tmp/pse-visual');
const ROUTES = arg('--routes', '/mine,/mine/guide,/mine/login').split(',');
const WIDTHS = arg('--widths', '390,1440').split(',').map(Number);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE', requestId: 'design-audit' }));
    return;
  }
  let f = path.join(DIST, url.pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const MEASURE = () => {
  const vis = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const px = v => Math.round(parseFloat(v) || 0);
  const els = Array.from(document.querySelectorAll('body *')).filter(vis);

  // Heading scale
  const headings = ['h1', 'h2', 'h3', 'h4'].flatMap(tag =>
    Array.from(document.querySelectorAll(tag)).filter(vis).map(h => ({
      tag, size: px(getComputedStyle(h).fontSize), weight: getComputedStyle(h).fontWeight,
      text: (h.textContent || '').trim().slice(0, 46),
    })));

  // Surface variance: how many different radii / shadows / card-ish borders
  const radii = new Set(), shadows = new Set(), surfaceColors = new Set(), textColors = new Set();
  let bordered = 0, cardish = 0;
  for (const el of els) {
    const s = getComputedStyle(el);
    if (s.borderRadius && s.borderRadius !== '0px') radii.add(s.borderRadius);
    if (s.boxShadow && s.boxShadow !== 'none') shadows.add(s.boxShadow.slice(0, 60));
    const bg = s.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') surfaceColors.add(bg);
    if (s.color) textColors.add(s.color);
    const hasBorder = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
    if (hasBorder) bordered++;
    const r = el.getBoundingClientRect();
    if (hasBorder && bg !== 'rgba(0, 0, 0, 0)' && r.width > 160 && r.height > 60) cardish++;
  }

  // Vertical rhythm between top-level sections
  const roots = Array.from(document.querySelectorAll('main > *, main > * > section, section')).filter(vis);
  const gaps = [];
  for (let i = 1; i < roots.length; i++) {
    const a = roots[i - 1].getBoundingClientRect(), b = roots[i].getBoundingClientRect();
    const g = Math.round(b.top - a.bottom);
    if (g >= 0 && g < 400) gaps.push(g);
  }

  // Tap targets (mobile)
  const small = [];
  for (const el of Array.from(document.querySelectorAll('button, a, [role=button], input, select, textarea')).filter(vis)) {
    const r = el.getBoundingClientRect();
    if (r.height < 44) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 26)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // Text clipping: element whose content overflows its own box
  const clipped = els.filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0)
    .map(el => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`).slice(0, 10);

  const longLines = els.filter(el => el.children.length === 0 && (el.textContent || '').trim().length > 160)
    .map(el => `${(el.textContent || '').trim().length}ch`).slice(0, 5);

  return {
    docHeight: document.documentElement.scrollHeight,
    bodyFont: px(getComputedStyle(document.body).fontSize),
    textChars: (document.body.innerText || '').length,
    headings,
    headingSizes: [...new Set(headings.map(h => h.size))].sort((a, b) => b - a),
    h1Count: headings.filter(h => h.tag === 'h1').length,
    radii: [...radii], shadowCount: shadows.size, surfaceColors: [...surfaceColors].slice(0, 14),
    textColorCount: textColors.size, borderedEls: bordered, cardLikeEls: cardish,
    sectionGaps: gaps, medianGap: gaps.length ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null,
    interactiveCount: document.querySelectorAll('button, a, input, select, textarea, [role=button]').length,
    smallTapTargets: small.slice(0, 12), clippedText: clipped, longTextBlocks: longLines,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
  };
};

const browser = await chromium.launch({ headless: true });
fs.mkdirSync(OUT, { recursive: true });
const results = [];
for (const route of ROUTES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width <= 430, hasTouch: width <= 430 });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const m = await page.evaluate(MEASURE);
    await page.screenshot({ path: path.join(OUT, `audit${route.replace(/\//g, '_')}-${width}.png`), fullPage: true, animations: 'disabled' });
    results.push({ route, width, ...m });
    await ctx.close();
  }
}
await browser.close();
server.close();

for (const r of results) {
  console.log('='.repeat(74));
  console.log(`${r.route} @${r.width}px   docHeight=${r.docHeight}  text=${r.textChars}ch  overflow=${r.scrollW > r.clientW + 1}`);
  console.log(`  heading sizes: [${r.headingSizes.join(', ')}]   h1 count=${r.h1Count}`);
  console.log(`  body font=${r.bodyFont}px   radii=[${r.radii.join(', ')}]  shadows=${r.shadowCount}  textColors=${r.textColorCount}`);
  console.log(`  bordered=${r.borderedEls}  cardLike=${r.cardLikeEls}  surfaces=${r.surfaceColors.length}`);
  console.log(`  sectionGaps=${r.medianGap !== null ? 'median ' + r.medianGap : 'n/a'}  (${r.sectionGaps.slice(0, 12).join(',')})`);
  console.log(`  interactive=${r.interactiveCount}  tapTargetsUnder44=${r.smallTapTargets.length}`);
  r.smallTapTargets.forEach(t => console.log(`     · ${t}`));
  if (r.clippedText.length) { console.log('  CLIPPED:'); r.clippedText.forEach(c => console.log(`     · ${c}`)); }
  if (r.longTextBlocks.length) console.log(`  longTextBlocks=${r.longTextBlocks.join(' ')}`);
  console.log('  headings:');
  r.headings.slice(0, 14).forEach(h => console.log(`     ${h.tag} ${h.size}px/${h.weight} — ${h.text}`));
}
fs.writeFileSync(path.join(OUT, 'design-audit.json'), JSON.stringify(results, null, 2));
console.log(`\nSaved to ${OUT}`);
