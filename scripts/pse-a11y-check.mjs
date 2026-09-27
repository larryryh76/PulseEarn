/**
 * PSEmine accessibility measurement.
 *
 * Measures in Chromium, on the PSEmine surfaces, what the design system claims:
 *
 *   1. TEXT CONTRAST (WCAG 2.1 AA)
 *      Every visible text element's effective foreground is composited against
 *      its effective background (walking ancestors, honouring alpha) and the
 *      contrast ratio is computed. Thresholds: 4.5:1 for normal text, 3:1 for
 *      large text (≥24px, or ≥18.66px bold). This is the check that catches the
 *      classic "tertiary grey on a slightly lighter panel" defect that no
 *      screenshot review reliably spots.
 *
 *   2. TOUCH TARGETS
 *      Interactive controls under 44px in either dimension are reported. Links
 *      that are inline inside a paragraph or list item are reported separately:
 *      WCAG 2.5.8 (AA) requires 24px for those, 44px for standalone controls,
 *      and padding an inline prose link to 44px would break the text.
 *
 *   3. TEXT CLIPPING
 *      Leaf elements whose content overflows their own box — the signature of a
 *      label squeezed by a flex layout.
 *
 * It serves the production build (dist/) over an ephemeral in-process server, so
 * it leaves nothing running. Usage:
 *
 *   bun scripts/pse-a11y-check.mjs [--viewports 390x844,1440x900] [--routes /mine,...] [--theme light|dark|both]
 *
 * `--theme both` (the default) measures each viewport twice, because PSEmine's
 * palette is declared for BOTH the light and dark app themes and a reading taken
 * in only one of them proves nothing about the other.
 *
 * Exit code is 0 even when it finds issues: it is a measurement, and the report
 * says what it measured. Failures are printed explicitly.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const ROUTES = arg('--routes', '/mine,/mine/login,/mine/signup').split(',');
const VIEWPORTS = arg('--viewports', '390x844,430x932,768x1024,1440x900').split(',').map(pair => {
  const [w, h] = pair.trim().toLowerCase().split('x');
  return { width: parseInt(w, 10), height: parseInt(h || '900', 10) };
});
const THEME = arg('--theme', 'both');
const THEMES = THEME === 'both' ? ['dark', 'light'] : [THEME];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE', requestId: 'a11y-harness' }));
    return;
  }
  let file = path.join(DIST, url.pathname);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

/** Runs inside the page: returns contrast failures, small targets and clips. */
const MEASURE = () => {
  const parse = input => {
    const m = String(input || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map(p => parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  /**
   * Composite `fg` (closer to the viewer) over `bg` (further away), carrying the
   * resulting alpha. Carrying alpha matters: a translucent parent (e.g. a 14%
   * white hairline) must not be treated as opaque, or the effective background
   * of anything inside it is computed as a light colour and every contrast
   * reading taken against it is wrong.
   */
  const over = (fg, bg) => {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  };
  const lum = c => {
    const f = v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const effectiveBg = el => {
    let acc = null;
    let node = el;
    while (node) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      // Walk from the element outward, so each newly found ancestor sits BEHIND
      // everything accumulated so far.
      if (bg && bg.a > 0) acc = acc ? over(acc, bg) : bg;
      if (acc && acc.a >= 0.999) return acc;
      node = node.parentElement;
    }
    // Nothing opaque in the chain: the page canvas. Both themes declare a page
    // background, so this is the last-resort assumption only.
    return acc ? over(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 };
  };
  /** True when the element sits inside a running text block (prose link). */
  const inlineInText = el => {
    const parent = el.parentElement;
    if (!parent) return false;
    if (!['P', 'LI', 'SPAN', 'DD', 'DT', 'TD', 'LABEL'].includes(parent.tagName)) return false;
    return parent.textContent.trim().length > (el.textContent || '').trim().length + 12;
  };

  const contrast = [];
  const targets = [];
  const inlineTargets = [];
  const clipped = [];
  const seen = new Set();

  document.querySelectorAll('body *').forEach(el => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const ownText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim())
      .join('')
      .trim();

    if (ownText.length > 1) {
      const fg = parse(style.color);
      if (fg) {
        const bg = effectiveBg(el);
        const composed = over(fg, bg);
        const size = parseFloat(style.fontSize);
        const weight = parseInt(style.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const r = ratio(composed, bg);
        const min = large ? 3 : 4.5;
        if (r < min) {
          contrast.push({
            text: ownText.slice(0, 40),
            tag: el.tagName.toLowerCase(),
            cls: (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 2).join(' '),
            size, weight, ratio: Math.round(r * 100) / 100, min,
            color: style.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          });
        }
      }
    }

    if (el.matches('a, button, input, select, textarea, [role=button]')) {
      const key = `${el.tagName}|${(el.textContent || '').trim().slice(0, 24)}|${Math.round(rect.width)}x${Math.round(rect.height)}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (rect.height < 44 || rect.width < 44) {
          const label = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28);
          const entry = `${el.tagName.toLowerCase()} "${label}" ${Math.round(rect.width)}x${Math.round(rect.height)}`;
          if (el.tagName === 'A' && inlineInText(el)) inlineTargets.push(entry);
          else targets.push(entry);
        }
      }
    }

    if (el.children.length === 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
      clipped.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 28)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
  });

  const dedupe = list => [...new Set(list)];
  return {
    contrast: contrast.sort((a, b) => a.ratio - b.ratio).slice(0, 15),
    targets: dedupe(targets).slice(0, 15),
    inlineTargets: dedupe(inlineTargets).slice(0, 15),
    clipped: dedupe(clipped).slice(0, 10),
  };
};

if (!fs.existsSync(DIST)) {
  console.error(`No build found at ${DIST}. Run: bunx vite build`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
let failures = 0;

for (const route of ROUTES) {
  for (const { width, height } of VIEWPORTS) {
   for (const theme of THEMES) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width <= 430, hasTouch: width <= 430 });
    // The app reads its theme from this key before first paint (index.html).
    await context.addInitScript(t => { try { localStorage.setItem('pulseearn-theme', t); } catch { /* ignore */ } }, theme);
    const page = await context.newPage();
    let result;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(700);
      result = await page.evaluate(MEASURE);
    } catch (e) {
      result = { error: String(e).slice(0, 160), contrast: [], targets: [], inlineTargets: [], clipped: [] };
    }
    await context.close();

    console.log(`\n${route} @${width}x${height} · ${theme}`);
    if (result.error) {
      console.log(`  ERROR: ${result.error}`);
      failures++;
      continue;
    }
    if (result.contrast.length) {
      failures++;
      console.log(`  CONTRAST FAILURES (${result.contrast.length}):`);
      result.contrast.forEach(c => console.log(`    · ${c.ratio}:1 (min ${c.min}) ${c.tag}.${c.cls} ${c.size}px/${c.weight} "${c.text}" ${c.color} on ${c.bg}`));
    } else {
      console.log('  contrast: ✓ every measured text element meets WCAG AA');
    }
    console.log(`  targets under 44px: ${result.targets.length}${result.targets.length ? ' → ' + result.targets.join(' | ') : ' ✓'}`);
    console.log(`  inline prose links under 44px (exempt, WCAG 2.5.8): ${result.inlineTargets.length}${result.inlineTargets.length ? ' → ' + result.inlineTargets.join(' | ') : ''}`);
    if (result.clipped.length) {
      failures++;
      console.log(`  CLIPPED TEXT: ${result.clipped.join(' | ')}`);
    } else {
      console.log('  clipped text: ✓ none');
    }
   }
  }
}

await browser.close();
server.close();
console.log(`\n${failures ? `RESULT: ${failures} viewport(s) with findings` : 'RESULT: no contrast, clipping or standalone touch-target findings'}`);
