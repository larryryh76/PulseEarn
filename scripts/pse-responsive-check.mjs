/**
 * PSEmine authenticated responsive/clipping audit (production or local preview).
 *
 * The console harness proves layout with fixture data; real accounts carry the
 * long values that actually break a phone layout: full notification bodies,
 * campaign copy, amounts, dates and status sentences. This script signs in with
 * the QA account and measures every authenticated surface at the required
 * widths, then opens the guide, the notification ledger and the purchase dialog
 * on each.
 *
 * A defect is:
 *   • page horizontal overflow                         (documentElement)
 *   • an element visibly outside the viewport
 *   • text cut by its own box or a clipping ancestor   (not an intentional
 *     address/hash truncation — those are listed separately for review)
 *   • a box that hides content it cannot show          (fixed height/clamp)
 *
 * Usage:
 *   PSE_QA_FAST=1 bun scripts/pse-responsive-check.mjs
 *   PSE_BASE=http://127.0.0.1:4173 bun scripts/pse-responsive-check.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.PSE_BASE || 'https://www.pulseearn.online';
const CREDS_FILE = process.env.PSE_QA_CREDS || '/tmp/pse-qa/creds.json';
const OUT = '/tmp/pse-responsive';
const WIDTHS = (process.env.PSE_WIDTHS || '320,360,375,390,430,1440').split(',').map(Number);
const PAGES = ['/mine/dashboard', '/mine/tools', '/mine/wallet', '/mine/referrals', '/mine/activity', '/mine/me', '/mine/guide'];
fs.mkdirSync(OUT, { recursive: true });

const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));

const AUDIT = () => {
  const vw = window.innerWidth;
  const label = el => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}`.slice(0, 110);
  };
  const visible = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clippedByAncestor = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX === 'hidden' || s.overflowX === 'clip') return p;
    }
    return null;
  };
  /** Inside an intentional horizontal scroller (rail/tab strip) or a dialog body. */
  const inScroller = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['auto', 'scroll'].includes(s.overflowX)) return p;
    }
    return null;
  };
  const wide = [];
  const outside = [];
  const cut = [];
  const hiddenY = [];

  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement) || !visible(el)) continue;
    if (el.classList.contains('sr-only')) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const leaf = el.children.length === 0 && (el.textContent || '').trim().length > 0;

    if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el) && !inScroller(el)) {
      outside.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
    }

    /* Tail cut by a clipping ancestor even though the leaf's own box fits it:
       a nowrap span is as wide as its text, so scrollWidth == clientWidth, and
       the OVERFLOW lives on the parent that hides it. */
    if (leaf) {
      const cutParent = clippedByAncestor(el);
      if (cutParent) {
        const pr = cutParent.getBoundingClientRect();
        if (r.right > pr.right + 1) {
          cut.push({
            el: label(el),
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
            scrollW: Math.round(r.right), clientW: Math.round(pr.right), ellipsis: false, tail: true,
          });
        }
      }
    }

    if (leaf && el.scrollWidth > el.clientWidth + 2) {
      const trunc = cs.textOverflow === 'ellipsis';
      const clip = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || clippedByAncestor(el);
      if (trunc || clip) {
        cut.push({
          el: label(el),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
          ellipsis: trunc,
        });
      }
    }

    /* A hiding box only matters when real CONTENT (a child element, not a
       decorative ::before/::after) is cut off. Wallet's hero art deliberately
       extends below its rounded card. */
    if (!leaf && (cs.overflowY === 'hidden' || cs.overflowY === 'clip')
      && el.scrollHeight > el.clientHeight + 2
      && !['auto', 'scroll'].includes(getComputedStyle(el.parentElement || el).overflowY)) {
      const boxBottom = r.top + el.clientHeight;
      const childCut = [...el.querySelectorAll('*')].some(child => {
        if (!(child instanceof HTMLElement)) return false;
        const s = getComputedStyle(child);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        if (!(child.textContent || '').trim()) return false;
        return child.getBoundingClientRect().bottom > boxBottom + 1;
      });
      if (childCut) {
        hiddenY.push({ el: label(el), scrollH: el.scrollHeight, clientH: el.clientHeight, clamp: cs.webkitLineClamp || null });
      }
    }
  }

  return {
    vw,
    pageOverflow: document.documentElement.scrollWidth - vw,
    outside: outside.slice(0, 10),
    cut: cut.slice(0, 14),
    hiddenY: hiddenY.slice(0, 10),
    chars: document.body.innerText.length,
  };
};

const browser = await chromium.launch({ headless: true });
const rows = [];
const failures = [];

async function auditState(page, meta) {
  await page.waitForTimeout(650);
  const result = await page.evaluate(AUDIT);
  const problems = [];
  if (result.pageOverflow > 0) problems.push(`page overflow +${result.pageOverflow}px`);
  if (result.outside.length) problems.push(`${result.outside.length} element(s) outside viewport`);
  if (result.hiddenY.length) problems.push(`${result.hiddenY.length} hiding box(es)`);
  if (result.cut.length) problems.push(`${result.cut.length} clipped text node(s)`);
  if (result.chars < 120) problems.push(`page did not paint (${result.chars} chars)`);
  const row = { ...meta, ...result, problems };
  rows.push(row);
  if (problems.length) failures.push(row);
  return row;
}

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));

  await page.goto(`${BASE}/mine/login`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(900);
  await page.fill('input[type=email]', creds.PSE_TEST_EMAIL);
  await page.fill('input[type=password]', creds.PSE_TEST_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/mine\/(dashboard|tools)/, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(2500);

  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(path === '/mine/guide' ? 1200 : 900);
    const row = await auditState(page, { width, surface: path });
    if (path === '/mine/guide') {
      const opened = await page.locator('.pse-guide').count();
      row.guideMounted = opened > 0;
      if (!opened) row.problems.push('guide did not mount');
      if (width === 390) await page.screenshot({ path: `${OUT}/guide-${width}.png`, fullPage: true });
    }
    if (errors.length) { row.problems.push(`page error: ${errors[0]}`); failures.push(row); errors.length = 0; }
  }

  // Notification ledger on the dashboard.
  await page.goto(`${BASE}/mine/dashboard`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500);
  const bell = page.locator('button[aria-label^="Notifications"]').first();
  if (await bell.count()) {
    await bell.click();
    await page.waitForTimeout(700);
    const open = await page.locator('.pse-sheet, [role="dialog"]').count();
    const row = await auditState(page, { width, surface: 'notifications' });
    row.sheetMounted = open > 0;
    if (!open) { row.problems.push('notification sheet did not open'); failures.push(row); }
  } else {
    failures.push({ width, surface: 'notifications', problems: ['notification bell not found'] });
  }

  // Purchase dialog (first available tool).
  await page.goto(`${BASE}/mine/tools`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500);
  const buy = page.getByRole('button', { name: /buy tool|view details|review live quote|resume existing purchase/i }).first();
  if (await buy.count()) {
    await buy.click().catch(() => undefined);
    await page.waitForTimeout(900);
    const dialog = page.locator('.pse-purchase-dialog');
    if (await dialog.count()) {
      const d = await dialog.evaluate(el => {
        const cs = getComputedStyle(el);
        const overlay = el.parentElement;
        const os = overlay ? getComputedStyle(overlay) : null;
        return {
          width: Math.round(el.getBoundingClientRect().width),
          right: Math.round(el.getBoundingClientRect().right),
          scrollW: el.scrollWidth, clientW: el.clientWidth,
          overflowY: cs.overflowY,
          scrollH: el.scrollHeight, clientH: el.clientHeight,
          boxSizing: cs.boxSizing, padding: cs.padding, border: cs.borderWidth,
          overlay: os ? { width: Math.round(overlay.getBoundingClientRect().width), padding: os.padding, boxSizing: os.boxSizing } : null,
        };
      });
      const inner = await page.evaluate(AUDIT);
      const problems = [];
      if (d.width > width + 1) problems.push(`dialog wider than viewport (${d.width} > ${width})`);
      if (d.scrollW > d.clientW + 2) problems.push('dialog scrolls horizontally');
      if (inner.cut.length) problems.push(`${inner.cut.length} clipped text node(s) in dialog`);
      const row = { width, surface: 'purchase-dialog', dialog: d, ...inner, problems };
      rows.push(row);
      if (problems.length) failures.push(row);
    }
  }

  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 2));

const count = rows.length;
console.log(`Audited ${count} authenticated surfaces across widths ${WIDTHS.join(', ')} → ${OUT}/report.json`);
if (!failures.length) {
  console.log('PASS — no measured clipping, hiding or overflow on authenticated surfaces.');
} else {
  console.log(`FAIL — ${failures.length} state(s):`);
  for (const f of failures.slice(0, 40)) {
    console.log(`  ${f.width}px ${f.surface} → ${f.problems.join('; ')}`);
    for (const c of f.cut || []) console.log(`      cut${c.ellipsis ? ' (ellipsis)' : ''}: ${c.el} "${c.text}" (${c.scrollW} > ${c.clientW})`);
    for (const c of f.hiddenY || []) console.log(`      hidden: ${c.el} (${c.scrollH} > ${c.clientH}${c.clamp ? `, clamp ${c.clamp}` : ''})`);
    for (const o of f.outside || []) console.log(`      outside: ${o.el} (${o.left}..${o.right})`);
  }
  process.exitCode = 1;
}
