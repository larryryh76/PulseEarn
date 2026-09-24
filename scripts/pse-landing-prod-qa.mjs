/**
 * PSEmine PUBLIC LANDING production QA — rendered evidence, not source review.
 *
 * The console has its own production harness (`pse-production-qa.mjs`). This is
 * the landing's equivalent: it loads the REAL deployment in a real browser at
 * the four certification viewports and checks the public product brief against
 * the approved design contract, rather than assuming the page is finished
 * because it renders.
 *
 * WHAT IT PROVES
 * --------------
 *  1. LAYOUT      no horizontal overflow, no content clipped by an ancestor, no
 *                 section collisions, and every briefed section present, at
 *                 390×844, 430×932, 768×1024 and 1440×900.
 *  2. DESIGN      the Duty & Ledger surface vocabulary: no card radius outside
 *                 the 6/8/10 ladder, a restrained palette (surfaces, shadows,
 *                 text colours within budget), and money that is never set in
 *                 the machine-face mono font.
 *  3. FIGURES     money is legible (no tiny financial text) and every locked
 *                 economic figure is on the page exactly as the product defines
 *                 it — four tiers with their real price, hourly rate and
 *                 ownership limit, plus the three capacity ceilings.
 *  4. REAL DATA   the rendered campaign figures must agree with the PUBLIC
 *                 campaign endpoint (`/api/mine/campaign/status`): duration, and
 *                 the day count if the page shows one. A fabricated countdown
 *                 fails here.
 *  5. NO FAKE DATA no invented social proof, users, testimonials, earnings,
 *                 guarantees, APY/ROI claims or star ratings.
 *  6. CTA INTEGRITY every anchor target exists on the page, every internal link
 *                 points at a route the application actually declares, and the
 *                 primary CTA really navigates.
 *
 * Usage:
 *   bun scripts/pse-landing-prod-qa.mjs                     # production
 *   bun scripts/pse-landing-prod-qa.mjs --base https://…    # any deployment
 *
 * Exit code 0 = every check passed. Any failure prints the offending elements
 * and exits non-zero, so a regression cannot be reported as a pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const BASE = arg('--base', 'https://www.pulseearn.online').replace(/\/$/, '');
const OUT = arg('--out', '/tmp/pse-landing-prod-qa');

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

/** Long-form 13px or smaller is a defect; money below 13px is a defect too. */
const MIN_FIGURE_PX = 13;

const REQUIRED_SECTIONS = ['header', 'hero', 'product', 'tools', 'capacity', 'campaign', 'money', 'referrals', 'assurance', 'faq', 'cta', 'footer'];

/**
 * The locked economics, as the product defines them. The landing must show
 * exactly these — not a rounded, renamed or invented tier.
 */
const LOCKED = {
  network: 'BNB Smart Chain',
  durationDays: 90,
  toolCeiling: '£10.60/hour',
  referralCeiling: '£1.50/hour',
  totalCeiling: '£12.10/hour',
  referralBonus: '£0.30/hour',
  tiers: [
    { name: 'Starter Miner', price: '£3.00', rate: '£0.10/hour', max: 5 },
    { name: 'Builder Miner', price: '£10.00', rate: '£0.50/hour', max: 3 },
    { name: 'Advanced Miner', price: '£50.00', rate: '£1.20/hour', max: 3 },
    { name: 'Elite Miner', price: '£200.00', rate: '£2.50/hour', max: 2 },
  ],
};

/** Invented proof / promises. The page sells specification, never statistics. */
const FAKE_DATA = [
  { re: /\b\d[\d,.]*\s*\+?\s*(users|members|miners|operators|customers)\b/i, why: 'invented user count' },
  { re: /\btrusted by\b/i, why: 'invented social proof' },
  { re: /\btestimonial/i, why: 'invented testimonial' },
  { re: /\bguaranteed\b/i, why: 'guaranteed-return claim' },
  { re: /\b(APY|APR|ROI)\b/, why: 'yield/return claim' },
  { re: /[★⭐]|\b\d\.\d\s*\/\s*5\b/, why: 'invented rating' },
  { re: /\bpaid out\b\s*£/i, why: 'invented payout total' },
];

const issues = [];
const fail = (area, msg, detail) => { issues.push({ area, msg, detail }); console.log(`  ✗ [${area}] ${msg}${detail ? `\n      ${detail}` : ''}`); };
const pass = (area, msg) => console.log(`  ✓ [${area}] ${msg}`);

/* ── campaign truth (public endpoint — the same source the page reads) ─────── */
const campaignRes = await fetch(`${BASE}/api/mine/campaign/status`).catch(e => ({ ok: false, status: 0, err: String(e) }));
let campaign = null;
try { campaign = (await campaignRes.json()).campaign || null; } catch { /* handled below */ }

/** Internal routes the application declares, so a CTA cannot point at nothing. */
const readDeclaredRoutes = () => {
  const out = new Set();
  const app = path.join(process.cwd(), 'src', 'App.tsx');
  if (fs.existsSync(app)) {
    for (const m of fs.readFileSync(app, 'utf8').matchAll(/path="([^"]+)"/g)) out.add(m[1]);
  }
  const vercel = path.join(process.cwd(), 'vercel.json');
  if (fs.existsSync(vercel)) {
    for (const r of JSON.parse(fs.readFileSync(vercel, 'utf8')).redirects || []) out.add(r.source);
  }
  return out;
};
const DECLARED_ROUTES = readDeclaredRoutes();

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { base: BASE, campaign, viewports: [], cta: {}, fakeData: [], issues: [] };

console.log(`\nPSEmine landing production QA → ${BASE}`);
if (!campaign) {
  fail('preflight', `campaign endpoint unavailable (${campaignRes.status || 'network'}) — figures cannot be cross-checked`);
} else {
  pass('preflight', `campaign ${campaign.id} · ${campaign.status} · ${campaign.durationDays}-day · ${campaign.currencyDisplay}/${campaign.paymentAsset}`);
}

for (const vp of VIEWPORTS) {
  console.log(`\n── /mine @ ${vp.width}×${vp.height} ──`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width <= 430,
    hasTouch: vp.width <= 430,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 200)));
  await page.goto(`${BASE}/mine`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2200);

  const m = await page.evaluate((MIN_FIGURE_PX) => {
    const vis = el => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const describe = el => {
      const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).slice(0, 3).join('.');
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${(el.textContent || '').trim().slice(0, 40)}"`;
    };
    const vw = document.documentElement.clientWidth;

    // 1 · layout
    const overflow = [];
    const clipped = [];
    const clipsAt = el => ['hidden', 'clip', 'scroll', 'auto'].includes(getComputedStyle(el).overflowX);
    for (const el of Array.from(document.querySelectorAll('body *')).filter(vis)) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) overflow.push(describe(el));
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (!clipsAt(a)) continue;
        const ar = a.getBoundingClientRect();
        if (r.right - ar.right > 1 || r.bottom - ar.bottom > 1) clipped.push(`${describe(el)} clipped by ${describe(a)}`);
        break;
      }
    }
    const boxes = Array.from(document.querySelectorAll('[data-pse-section]')).map(el => {
      const r = el.getBoundingClientRect();
      return { name: el.getAttribute('data-pse-section'), top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) };
    });
    const collisions = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.name === 'header' || b.name === 'header') continue;
      if (b.top < a.bottom - 1 && a.top < b.bottom - 1) collisions.push(`${a.name} ∩ ${b.name}`);
    }

    // 2 · design system
    const radii = new Set(), shadows = new Set(), surfaces = new Set(), textColors = new Set();
    for (const el of Array.from(document.querySelectorAll('body *')).filter(vis)) {
      const s = getComputedStyle(el);
      if (s.borderRadius && s.borderRadius !== '0px') radii.add(s.borderRadius);
      if (s.boxShadow && s.boxShadow !== 'none') shadows.add(s.boxShadow);
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') surfaces.add(s.backgroundColor);
      if (s.color) textColors.add(s.color);
    }

    // 3 · financial legibility — money is never tiny and never the machine face
    const figures = [];
    for (const sel of ['.pse-fact-v', '.pse-row-v', '.pse-reg-val', '.pse-reg-total', '.pse-fig-a', '.pse-fig-b', '.pse-fig-c', '.pse-fig-d', '.pse-verdict-fig']) {
      for (const el of Array.from(document.querySelectorAll(sel)).filter(vis)) {
        const s = getComputedStyle(el);
        const text = (el.textContent || '').trim();
        // A FIGURE means an amount of money. Machine labels that happen to
        // carry a numeral ("Stage 1" in the referral clauses, a tier number)
        // are nameplates and are MEANT to be set in the mono face — they are
        // not money, so they are not measured here.
        if (!/[£$€]/.test(text)) continue;
        figures.push({ sel, text: text.slice(0, 30), px: Math.round(parseFloat(s.fontSize)), mono: /JetBrains Mono/i.test(s.fontFamily) });
      }
    }

    // 4 · tap targets (phone widths only carry the rule)
    const smallTargets = [];
    for (const el of Array.from(document.querySelectorAll('a, button, [role=button], input, select')).filter(vis)) {
      const r = el.getBoundingClientRect();
      if (r.height >= 44) continue;
      const style = getComputedStyle(el);
      // WCAG 2.5.8 exempts links inside a sentence; report those separately.
      const inline = el.tagName === 'A' && (el.closest('p, li') !== null) && style.display.includes('inline');
      smallTargets.push({ text: (el.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), inline });
    }

    // 5 · links, anchors and buttons
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
      href: a.getAttribute('href'),
      text: (a.textContent || '').trim().slice(0, 40),
    }));
    const ids = new Set(Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: (b.textContent || '').trim().slice(0, 40),
      disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
      expanded: b.getAttribute('aria-expanded'),
    }));

    return {
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
      title: document.title,
      docHeight: document.documentElement.scrollHeight,
      overflow, clipped, collisions,
      sections: boxes.map(b => b.name),
      sectionsWithoutHeight: boxes.filter(b => b.bottom - b.top < 40).map(b => b.name),
      radii: [...radii], shadows: shadows.size, surfaces: surfaces.size, textColors: textColors.size,
      minFigurePx: figures.length ? Math.min(...figures.map(f => f.px)) : null,
      tinyFigures: figures.filter(f => f.px < MIN_FIGURE_PX),
      monoFigures: figures.filter(f => f.mono),
      smallTargets,
      links, ids: [...ids], buttons,
    };
  }, MIN_FIGURE_PX).catch(e => ({ evaluateError: String(e) }));

  if (m.evaluateError) { fail('render', `measurement failed: ${m.evaluateError}`); await ctx.close(); continue; }
  await page.screenshot({ path: path.join(OUT, `landing-${vp.width}.png`), fullPage: true, animations: 'disabled' }).catch(() => {});

  // ── 1 · layout
  if (m.overflow.length) fail('layout', `${m.overflow.length} element(s) past the viewport edge @${vp.width}`, m.overflow.slice(0, 5).join(' · '));
  else pass('layout', `no horizontal overflow @${vp.width}`);
  if (m.clipped.length) fail('layout', `${m.clipped.length} element(s) clipped by an ancestor @${vp.width}`, m.clipped.slice(0, 5).join(' · '));
  if (m.collisions.length) fail('layout', `section collisions @${vp.width}: ${m.collisions.join(', ')}`);
  const missing = REQUIRED_SECTIONS.filter(s => !m.sections.includes(s));
  if (missing.length) fail('layout', `missing briefed section(s) @${vp.width}: ${missing.join(', ')}`);
  else pass('layout', `all ${REQUIRED_SECTIONS.length} briefed sections present @${vp.width}`);

  // ── 2 · design system
  const strayRadii = m.radii.filter(r => !['0px', '1px', '2px', '4px', '6px', '8px', '10px', '50%', '1px 0px 0px 1px', '0px 1px 1px 0px'].includes(r));
  if (strayRadii.length) fail('design', `card radius outside the 6/8/10 ladder @${vp.width}: ${strayRadii.join(', ')}`);
  if (m.shadows > 3) fail('design', `${m.shadows} distinct shadows @${vp.width} (restraint budget: 3)`);
  if (m.textColors > 12) fail('design', `${m.textColors} text colours @${vp.width} (budget: 12)`);
  if (m.surfaces > 16) fail('design', `${m.surfaces} painted surfaces @${vp.width} (budget: 16)`);
  if (!strayRadii.length && m.shadows <= 3 && m.textColors <= 12 && m.surfaces <= 16) {
    pass('design', `restrained: radii ${m.radii.length} kinds · ${m.shadows} shadow(s) · ${m.textColors} text colours · ${m.surfaces} surfaces`);
  }

  // ── 3 · figures
  if (m.monoFigures.length) fail('figures', `money set in the machine face @${vp.width}`, m.monoFigures.slice(0, 3).map(f => `${f.sel} "${f.text}"`).join(' · '));
  if (m.tinyFigures.length) fail('figures', `${m.tinyFigures.length} financial figure(s) under ${MIN_FIGURE_PX}px @${vp.width}`, m.tinyFigures.slice(0, 4).map(f => `${f.sel} "${f.text}" ${f.px}px`).join(' · '));
  else if (m.minFigurePx !== null) pass('figures', `smallest financial figure ${m.minFigurePx}px @${vp.width}`);

  // ── 6a · CTA integrity (static, every viewport)
  const deadAnchors = m.links.filter(l => l.href && l.href.startsWith('#') && !m.ids.includes(l.href.slice(1)));
  if (deadAnchors.length) fail('cta', `anchor target missing @${vp.width}: ${deadAnchors.map(l => l.href).join(', ')}`);
  const badRoutes = m.links
    .filter(l => l.href && !l.href.startsWith('#') && !/^https?:|^mailto:|^tel:/.test(l.href))
    .map(l => ({ ...l, path: l.href.split(/[?#]/)[0] }))
    .filter(l => !DECLARED_ROUTES.has(l.path) && !DECLARED_ROUTES.has(l.path.replace(/\/$/, '')));
  if (badRoutes.length) fail('cta', `internal link to an undeclared route @${vp.width}`, badRoutes.map(l => `${l.path} ("${l.text}")`).join(' · '));
  const deadButtons = m.buttons.filter(b => !b.disabled && b.expanded === null && !/pay|buy|connect|continue|retry/i.test(b.text));
  if (deadButtons.length > 12) fail('cta', `${deadButtons.length} unlabelled non-toggling buttons @${vp.width}`);

  // ── 4 · tap targets on phones
  if (vp.width <= 430) {
    const bad = m.smallTargets.filter(t => !t.inline);
    if (bad.length) fail('touch', `${bad.length} tap target(s) under 44px @${vp.width}`, bad.slice(0, 6).map(t => `"${t.text}" ${t.w}×${t.h}`).join(' · '));
    else pass('touch', `every non-inline control is ≥ 44px tall @${vp.width}`);
  }

  // ── 5 · content contract (locked economics + real data + no fake data)
  if (vp.width === 1440) {
    for (const t of LOCKED.tiers) {
      for (const token of [t.name, t.price, t.rate, `Max ${t.max} per account`]) {
        if (!m.text.includes(token)) fail('content', `tier figure missing from the brief: "${token}"`);
      }
    }
    for (const [label, token] of [['tool capacity ceiling', LOCKED.toolCeiling], ['referral capacity ceiling', LOCKED.referralCeiling],
      ['total capacity ceiling', LOCKED.totalCeiling], ['referral lane value', LOCKED.referralBonus], ['network', LOCKED.network], ['payment asset', 'BNB']]) {
      if (!m.text.includes(token)) fail('content', `${label} missing from the brief: "${token}"`);
    }
    if (!/GBP/.test(m.text)) fail('content', 'GBP accounting is not stated');
    if (!/\bBNB\b/.test(m.text)) fail('content', 'BNB payment is not stated');
    if (!/referral/i.test(m.text)) fail('content', 'the referral model is not explained');

    // Real campaign data, not a fabricated countdown.
    if (campaign) {
      if (!m.text.includes(`${campaign.durationDays}-day`) && !m.text.includes(`${campaign.durationDays} days`)) {
        fail('realdata', `campaign duration ${campaign.durationDays} days is not shown`);
      }
      // A STARTED campaign rendered as "Scheduled"/"window not open" is a real
      // defect: the page's campaign projection has silently degraded to the
      // null-campaign default and now contradicts the authoritative endpoint.
      // (Regression this check exists for: a denied Firestore campaign read
      // aborting the public-projection fetch, so the live campaign rendered as
      // Scheduled / Day 0.)
      const STARTED = ['active', 'paused', 'settling', 'payout'];
      const started = STARTED.includes(campaign.status);
      const saysNotOpen = /\bscheduled\b/i.test(m.text) || /campaign window is not open/i.test(m.text) || /hasn.t started yet/i.test(m.text);
      if (started && saysNotOpen) {
        fail('realdata', `the page presents the campaign as Scheduled / not open while ${campaign.id} is "${campaign.status}" — the rendered campaign state contradicts /api/mine/campaign/status`);
      }
      // Case-insensitive: the rail's day label is rendered through a
      // text-transform, so innerText comes back uppercased.
      const dayMatch = m.text.match(/day (\d+) (?:of|\/)\s*(\d+)/i);
      if (dayMatch) {
        const expected = Math.max(1, Math.floor((Date.now() - Date.parse(campaign.startAt)) / 86400000) + 1);
        const shown = Number(dayMatch[1]);
        if (Math.abs(shown - expected) > 1) fail('realdata', `rendered day ${shown} disagrees with the campaign start (expected ~${expected})`);
        else pass('realdata', `rendered day ${shown} agrees with campaign start (${campaign.startAt})`);
      } else if (started) {
        // A campaign already inside its window MUST be counted on the page.
        // Only a genuinely pre-start campaign may legitimately show no day.
        fail('realdata', `campaign is "${campaign.status}" (started ${campaign.startAt}) but the page renders no day count — the campaign projection is missing`);
      } else {
        pass('realdata', 'campaign has not started; no day count rendered (nothing to fabricate)');
      }
      const leftMatch = m.text.match(/(\d+)\s*days? remain/i) || m.text.match(/(\d+)d left/i);
      if (leftMatch) {
        const expectedLeft = Math.ceil((Date.parse(campaign.endAt) - Date.now()) / 86400000);
        if (Math.abs(Number(leftMatch[1]) - expectedLeft) > 1) fail('realdata', `"${leftMatch[0]}" disagrees with the campaign end (expected ~${expectedLeft})`);
        else pass('realdata', `"${leftMatch[0]}" agrees with campaign end (${campaign.endAt})`);
      } else {
        pass('realdata', 'no remaining-days countdown rendered (nothing to fabricate)');
      }
    }

    for (const f of FAKE_DATA) {
      const hit = m.text.match(f.re);
      if (hit) { fail('fakedata', `${f.why}: "${hit[0]}"`); report.fakeData.push(hit[0]); }
    }
    if (!report.fakeData.length) pass('fakedata', 'no invented users, proofs, guarantees, yields or ratings');
  }

  report.viewports.push({
    width: vp.width, height: vp.height, title: m.title, docHeight: m.docHeight,
    sections: m.sections, minFigurePx: m.minFigurePx, surfaces: m.surfaces, shadows: m.shadows,
    textColors: m.textColors, consoleErrors: errors, smallTargets: m.smallTargets.length,
  });
  if (errors.length) fail('console', `${errors.length} console/page error(s) @${vp.width}`, errors.slice(0, 3).join(' · '));
  else pass('console', `no console or page errors @${vp.width}`);

  // ── 6b · the primary CTA must actually navigate (once, at desktop)
  if (vp.width === 1440) {
    const cta = page.locator('a:has-text("Start mining"), a:has-text("Open your console"), a:has-text("Create an account")').first();
    if (await cta.count()) {
      const before = new URL(page.url()).pathname;
      await cta.click();
      await page.waitForTimeout(2500);
      const after = new URL(page.url()).pathname;
      report.cta.primary = { from: before, to: after };
      if (after === before) fail('cta', `primary CTA did not navigate (stayed on ${after})`);
      else pass('cta', `primary CTA navigated ${before} → ${after}`);
    } else {
      fail('cta', 'no primary CTA found in the hero');
    }

    // A brief nav anchor must scroll to its section.
    await page.goto(`${BASE}/mine`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    const navLink = page.locator('header nav a[href^="#"]').first();
    if (await navLink.count()) {
      const before = await page.evaluate(() => window.scrollY);
      await navLink.click();
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => window.scrollY);
      const target = await page.evaluate(() => {
        const a = document.querySelector('header nav a[href^="#"]');
        const el = a && document.getElementById(a.getAttribute('href').slice(1));
        return el ? Math.round(el.getBoundingClientRect().top) : null;
      });
      report.cta.anchor = { before, after, sectionTop: target };
      if (after <= before && (target === null || Math.abs(target) > 200)) fail('cta', `nav anchor did not move to its section (scrollY ${before} → ${after}, section top ${target})`);
      else pass('cta', `nav anchor scrolled to its section (scrollY ${before} → ${after})`);
    }
  }

  await ctx.close();
}

/* ── route guards (signed out) ─────────────────────────────────────────────
 * The console is entitlement-gated on the FRONTEND, but the guard is what keeps
 * an anonymous visitor out of it, so it is verified on the real deployment:
 * every protected console route must land on the sign-in page carrying the
 * intended destination, and must not render the console surface at all.
 */
console.log('\n── PROTECTED ROUTES (signed out) ──');
const guardCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const GUARDED = ['/mine/dashboard', '/mine/tools', '/mine/wallet', '/mine/referrals', '/mine/activity', '/mine/me', '/mine/guide/onboarding'];
report.guards = [];
for (const route of GUARDED) {
  const g = await guardCtx.newPage();
  await g.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
  await g.waitForTimeout(2500);
  const res = await g.evaluate(() => ({
    path: location.pathname,
    returnTo: new URLSearchParams(location.search).get('returnTo'),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
  }));
  const leaked = /where this campaign stands|mining console|account position|settlement & payout/i.test(res.text);
  report.guards.push({ route, ...res, leaked });
  const okRedirect = res.path === '/mine/login';
  const okReturnTo = decodeURIComponent(res.returnTo || '') === route;
  if (!okRedirect) fail('guard', `${route} → ${res.path} (expected /mine/login)`);
  else if (!okReturnTo) fail('guard', `${route} redirected without a usable returnTo (got "${res.returnTo}")`);
  else if (leaked) fail('guard', `${route} rendered console content before the guard`);
  else pass('guard', `${route} → /mine/login?returnTo=${route}`);
  await g.close();
}
{
  const a = await guardCtx.newPage();
  await a.goto(`${BASE}/admin/mine`, { waitUntil: 'load', timeout: 45000 });
  await a.waitForTimeout(2500);
  const res = await a.evaluate(() => ({ path: location.pathname, text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200) }));
  const leaked = /ops|admin console|payment recovery/i.test(res.text);
  report.guards.push({ route: '/admin/mine', ...res, leaked });
  if (res.path === '/admin/mine' || leaked) fail('guard', `/admin/mine reachable while signed out (path ${res.path})`);
  else pass('guard', `/admin/mine → ${res.path} while signed out`);
  await a.close();
}
await guardCtx.close();

await browser.close();
report.issues = issues;
fs.writeFileSync(path.join(OUT, 'landing-prod-qa.json'), JSON.stringify(report, null, 2));

console.log(`\n${'='.repeat(72)}`);
if (issues.length) {
  console.log(`FAILED — ${issues.length} issue(s) across ${VIEWPORTS.length} viewports`);
  for (const i of issues) console.log(`  · [${i.area}] ${i.msg}`);
} else {
  console.log(`PASSED — landing contract clean at ${VIEWPORTS.map(v => v.width).join(', ')}px`);
}
console.log(`Report: ${path.join(OUT, 'landing-prod-qa.json')}\n`);
process.exit(issues.length ? 1 : 0);
