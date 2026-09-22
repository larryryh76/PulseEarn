/**
 * PSEMine landing rendered evidence.
 *
 * Serves the production build (dist/) and captures, for each section of the
 * public landing page at /mine:
 *   • a PNG per section at desktop (1440) and mobile (390)
 *   • a full-page PNG per width
 *   • horizontal-overflow measurement per width (documentElement.scrollWidth)
 *   • console/page errors and the painted-text length (did the app boot?)
 *
 * Usage: bun scripts/psemine-landing-shots.mjs [--out DIR] [--widths 1440,390]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');

/**
 * Chromium resolution.
 *
 * The bundled browser download is not always present (locked-down or
 * image-provided machines ship a pinned Chromium near /opt/browsers instead),
 * so look for one before falling back to Playwright's own resolution:
 *   1. PSE_CHROMIUM=/path/to/chrome
 *   2. the system chromium
 *   3. any /opt/browsers/chromium_headless_shell-N/.../chrome-headless-shell
 *   4. any /opt/browsers/chromium-N/chrome-linux64/chrome
 */
const findChromium = () => {
  const explicit = [
    process.env.PSE_CHROMIUM,
    '/usr/local/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const p of explicit) if (fs.existsSync(p)) return p;
  const roots = ['/opt/browsers', process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root)) {
      if (!dir.startsWith('chromium')) continue;
      for (const sub of [path.join(root, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
                         path.join(root, dir, 'chrome-linux64', 'chrome'),
                         path.join(root, dir, 'chrome-linux', 'chrome')]) {
        if (fs.existsSync(sub)) return sub;
      }
    }
  }
  return null;
};
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', '/home/team/shared/psemine-design/phase1');
const WIDTHS = arg('--widths', '1440,390').split(',').map(Number);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE' }));
    return;
  }
  let f = path.join(DIST, url.pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(OUT, { recursive: true });

const chromiumPath = findChromium();
const browser = await chromium.launch(chromiumPath ? { executablePath: chromiumPath } : {});
console.error(`[shots] chromium: ${chromiumPath ?? 'playwright default'}`);
const report = [];

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: width > 600 ? 900 : 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 200)));

  await page.goto(`${base}/mine`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => ({
    title: document.title,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    textLength: document.body.innerText.length,
    sections: Array.from(document.querySelectorAll('[data-pse-section]')).map(el => el.getAttribute('data-pse-section')),
    // ── Layout defects: horizontal overflow, section collisions, content
    //    escaping its own section box (the class of bug that makes one section
    //    paint on top of the next one).
    layout: (() => {
      const vw = document.documentElement.clientWidth;
      const secEls = Array.from(document.querySelectorAll('[data-pse-section]'));
      const secBoxes = secEls.map(el => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute('data-pse-section'),
          top: Math.round(r.top + window.scrollY),
          bottom: Math.round(r.bottom + window.scrollY),
        };
      });
      const describe = el => {
        const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).slice(0, 3).join('.');
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${el.textContent ? ' "' + el.textContent.trim().slice(0, 40) + '"' : ''}`;
      };
      const visible = el => {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
        if (s.position === 'fixed' || s.position === 'sticky') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const overflow = [];
      const escaped = [];
      const clipped = [];
      const clipsAt = el => {
        const s = getComputedStyle(el);
        return ['hidden', 'clip', 'scroll', 'auto'].includes(s.overflowX)
          || ['hidden', 'clip', 'scroll', 'auto'].includes(s.overflowY);
      };
      for (const el of document.querySelectorAll('body *')) {
        if (!visible(el)) continue;
        let r = el.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1) {
          overflow.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right) });
        }
        // Content clipped by an ancestor that hides its overflow: a panel whose
        // child is wider or taller than the panel silently cuts it off, which is
        // exactly how a card can lose its own text without any page overflow.
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          if (!clipsAt(a)) continue;
          const ar = a.getBoundingClientRect();
          const overRight = r.right - ar.right;
          const overBottom = r.bottom - ar.bottom;
          if (overRight > 1 || r.left < ar.left - 1 || overBottom > 1) {
            clipped.push({
              el: describe(el),
              by: describe(a),
              overBy: { right: Math.round(overRight), bottom: Math.round(overBottom) },
            });
          }
          break; // nearest clipping ancestor is the one that decides
        }
        const sec = el.closest('[data-pse-section]');
        if (!sec) continue;
        const box = secBoxes.find(b => b.name === sec.getAttribute('data-pse-section'));
        if (!box) continue;
        const own = el.getBoundingClientRect();
        const top = own.top + window.scrollY;
        const bottom = own.bottom + window.scrollY;
        // A header/footer may legitimately stick outside; everything else must
        // live inside the section box it belongs to.
        if (bottom > box.bottom + 1 || top < box.top - 1) {
          escaped.push({ sec: box.name, el: describe(el), top: Math.round(top), bottom: Math.round(bottom) });
        }
      }
      const collisions = [];
      for (let i = 0; i < secBoxes.length; i += 1) {
        for (let j = i + 1; j < secBoxes.length; j += 1) {
          const a = secBoxes[i];
          const b = secBoxes[j];
          if (a.name === 'header' || b.name === 'header') continue;
          if (b.top < a.bottom - 1 && a.top < b.bottom - 1) collisions.push(`${a.name} ∩ ${b.name}`);
        }
      }
      return {
        overflow: overflow.slice(0, 6),
        overflowCount: overflow.length,
        clippedByAncestor: clipped.slice(0, 8),
        clippedCount: clipped.length,
        escapedFromSection: escaped.slice(0, 6),
        escapedCount: escaped.length,
        collisions,
      };
    })(),
    minFontPx: (() => {
      const sizes = [];
      for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) continue;
        if (!el.textContent || !el.textContent.trim()) continue;
        if (el.children.length && Array.from(el.children).some(c => c.textContent && c.textContent.trim())) continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        sizes.push(Math.round(parseFloat(s.fontSize)));
      }
      return sizes.length ? Math.min(...sizes) : 0;
    })(),
  }));

  await page.screenshot({ path: path.join(OUT, `landing-full-${width}.png`), fullPage: true });

  // Section boxes, measured with the page in its normal state (document-absolute).
  const sections = await page.evaluate(() => Array.from(document.querySelectorAll('[data-pse-section]')).map(el => {
    const r = el.getBoundingClientRect();
    return {
      name: el.getAttribute('data-pse-section'),
      top: Math.max(0, Math.round(r.top + window.scrollY)),
      height: Math.round(r.height),
    };
  }));

  /* Per-section clips are taken by resizing the viewport to the section and
     scrolling that section to the top of the viewport, then shooting the
     viewport — rather than by a document-absolute `clip`, which the Chromium
     builds available here refuse the moment a clip reaches past the viewport
     ("Clipped area is either empty or outside the resulting image"). Each PNG
     therefore contains one section and nothing of its neighbours.

     Two capture-only adjustments keep that true:
       • the landing header is `position: sticky` and would otherwise sit on top
         of every clip: it is set to `static` for the capture, which occupies the
         identical flow box, so no section moves;
       • the header's scrolled state is cleared so no translucent bar is painted
         over a section's first line.
     Section geometry itself is measured above, before any of this. */
  const clipHeight = 4400;
  await page.evaluate(() => {
    const h = document.querySelector('.pse-land-head');
    if (h) { h.style.position = 'static'; h.removeAttribute('data-stuck'); }
  });
  const restoreHead = () => page.evaluate(() => {
    const h = document.querySelector('.pse-land-head');
    if (h) { h.style.position = ''; h.removeAttribute('data-stuck'); }
  });

  const shotFailures = [];
  for (const s of sections) {
    if (s.height < 4) continue;
    try {
      const h = Math.min(s.height, clipHeight);
      await page.setViewportSize({ width, height: h });
      const top = await page.evaluate((n) => {
        const el = document.querySelector(`[data-pse-section="${n}"]`);
        return Math.round(el.getBoundingClientRect().top + window.scrollY);
      }, s.name);
      await page.evaluate(y => window.scrollTo(0, y), top);
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `landing-${s.name}-${width}.png`) });
      if (s.height > clipHeight) {
        shotFailures.push(`${s.name}@${width}: ${s.height}px section captured at ${clipHeight}px`);
      }
    } catch (e) {
      // A section that cannot be captured is itself a finding, not a crash: the
      // run keeps its other evidence and reports the section by name.
      shotFailures.push(`${s.name}@${width} top=${s.top} h=${s.height}: ${String(e.message).split('\n')[0]}`);
    }
  }
  await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
  await restoreHead();

  report.push({ width, ...metrics, sections, shotFailures, errors: [...new Set(errors)].slice(0, 8) });
  await page.close();
}

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
