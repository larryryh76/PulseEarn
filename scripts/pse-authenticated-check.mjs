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
 * Optionally PSE_API_PROXY=https://… to forward the local harness's /api/* calls
 * to a real deployment while still rendering the LOCAL build. Without it the
 * harness answers /api/* with 503, so the console renders its unavailable
 * states; with it the local build is exercised against live backend data.
 *
 * Optionally PSE_ENROLL=1 to click the console's own self-serve
 * "Enable PSEmine for this account" control when the account is not enrolled,
 * so the console pages can be measured instead of the gate. The backend grants
 * access and audits it; enrollment creates a zeroed mining account and charges
 * nothing. Off by default — the harness never changes product state unasked.
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
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const API_PROXY = process.env.PSE_API_PROXY; // e.g. https://www.pulseearn.online
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

/**
 * Forward /api/* to a real deployment when PSE_API_PROXY is set. Only the local
 * harness needs this: it exists so the LOCAL build can be rendered with live
 * backend data instead of the 503 "no backend in this sandbox" answer.
 */
function proxyApi(req, res, url) {
  const target = new URL(url.pathname + url.search, API_PROXY);
  // `accept-encoding` is deliberately dropped: node's http client does not
  // decompress, so forwarding it would pass compressed bytes through without a
  // content-encoding the browser can act on — the JSON would then fail to parse
  // and every console page would wrongly render "the response was incomplete".
  const { 'accept-encoding': _drop, host: _host, ...forward } = req.headers;
  const upstream = (target.protocol === 'https:' ? https : http).request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || undefined,
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...forward, host: target.host },
  }, up => {
    res.writeHead(up.statusCode || 502, {
      'Content-Type': up.headers['content-type'] || 'application/json',
      ...(up.headers['content-length'] ? { 'Content-Length': up.headers['content-length'] } : {}),
      ...(up.headers['content-encoding'] ? { 'Content-Encoding': up.headers['content-encoding'] } : {}),
      ...(up.headers['x-request-id'] ? { 'x-request-id': up.headers['x-request-id'] } : {}),
      ...(up.headers['x-correlation-id'] ? { 'x-correlation-id': up.headers['x-correlation-id'] } : {}),
    });
    up.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'PROXY_ERROR', requestId: 'auth-harness-proxy' }));
  });
  req.pipe(upstream);
}

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (API_PROXY) { proxyApi(req, res, url); return; }
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
    // WCAG 2.5.8 exempts controls rendered INLINE inside a sentence (a prose
    // link is sized by its text line, not by a tap-target rule). Those are
    // reported separately so the main list stays actionable.
    if (getComputedStyle(el).display === 'inline') continue;
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
  const viewportWidth = document.documentElement.clientWidth;
  const overflowElements = els.map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), className: String(el.className?.baseVal || el.className || '').slice(0, 120),
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 70),
      left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10,
      width: Math.round(r.width * 10) / 10 };
  }).filter(el => el.left < -1 || el.right > viewportWidth + 1)
    .sort((a, b) => Math.max(b.right - viewportWidth, -b.left) - Math.max(a.right - viewportWidth, -a.left))
    .slice(0, 20);
  const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').trim();

  // Composition law, measured from the rendered DOM: top-level bordered
  // containers only (ledgers/plates). A sub-plate INSIDE a ledger is not a
  // second wall, so nested boxes are counted separately instead of being
  // folded into one misleading number.
  const BOXES = '.pse-ledger, .pse-plate';
  const boxes = Array.from(document.querySelectorAll(BOXES)).filter(vis);
  const topBoxes = boxes.filter(el => !el.parentElement || !el.parentElement.closest(BOXES));
  // The canonical rails are told apart by what they contain: the campaign rail
  // carries the duty cycle, the capacity rail carries the lane register.
  const rails = Array.from(document.querySelectorAll('.pse-rail')).filter(vis);
  const campaignRails = rails.filter(r => r.querySelector('.pse-duty'));
  const capacityRails = rails.filter(r => r.querySelector('.pse-reg'));
  return {
    docHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflowElements,
    headingSizes: [...new Set(headings.map(h => h.size))].sort((a, b) => b - a),
    headings: headings.slice(0, 12),
    cardLike, surfaces: surfaces.size,
    smallTargetsUnder44: smallTargets.slice(0, 10),
    textChars: bodyText.length,
    // The first 700 characters as rendered — what a reviewer would read first.
    // Reports stay readable without opening a screenshot, and a gated/errored
    // page is visible as such instead of being averaged into a number.
    textHead: bodyText.slice(0, 700),
    topLedgers: topBoxes.length,
    nestedLedgers: boxes.length - topBoxes.length,
    campaignRails: campaignRails.length,
    capacityRails: capacityRails.length,
    campaignRailText: campaignRails[0] ? campaignRails[0].innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
    capacityRailText: capacityRails[0] ? capacityRails[0].innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
  };
};

async function waitForRenderedPage(page, network, timeoutMs = 60000) {
  const started=Date.now(), out={ready:false,reason:'',elapsedMs:0,skeletons:[],pendingApi:0};
  const sels=['[aria-busy="true"]','[data-loading="true"]','[class*="skeleton" i]','[class*="shimmer" i]','[class*="placeholder" i]'];
  let prior='',stable=0;
  try {
    await page.waitForLoadState('domcontentloaded',{timeout:15000});
    await page.evaluate(async()=>{if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);});
    while(Date.now()-started<timeoutMs){
      const v=await page.evaluate(ss=>{
        const vis=e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity)!==0&&r.width>0&&r.height>0;};
        const skeletons=ss.flatMap(sel=>[...document.querySelectorAll(sel)].filter(vis).map(e=>({selector:sel,className:String(e.className?.baseVal||e.className||'').slice(0,90)}))).slice(0,25);
        const text=(document.querySelector('#root')||document.body).innerText.replace(/\\s+/g,' ').trim();
        return {chars:text.length,head:text.slice(0,350),skeletons,busy:!!document.querySelector('[aria-busy="true"],[data-loading="true"]'),images:[...document.images].filter(i=>!i.complete).length};
      },sels);
      out.skeletons=v.skeletons;out.pendingApi=network.pendingApi;
      const sig=JSON.stringify([v.chars,v.head,v.skeletons.length,v.images,network.pendingApi]);stable=sig===prior?stable+1:0;prior=sig;
      if(v.chars>100&&!v.skeletons.length&&!v.busy&&!v.images&&!network.pendingApi&&stable>=3){out.ready=true;out.reason='content rendered; placeholders gone; API idle; DOM stable';break;}
      if(network.completedApi>0&&!network.pendingApi&&stable>=7&&Date.now()-started>15000){out.reason='API settled but page remains loading/empty';break;}
      await page.waitForTimeout(500);
    }
    if(!out.reason)out.reason='readiness timeout';
    await page.evaluate(async()=>{const step=Math.max(400,Math.floor(innerHeight*.75));for(let y=0;y<document.documentElement.scrollHeight;y+=step){scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}scrollTo(0,0);await Promise.all([...document.images].map(i=>i.complete?Promise.resolve():Promise.race([new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}),new Promise(r=>setTimeout(r,5000))])));});
    await page.waitForTimeout(700);
  }catch(e){out.reason='readiness exception: '+String(e).slice(0,180);}
  out.elapsedMs=Date.now()-started;out.pendingApi=network.pendingApi;out.apiResponses=network.apiResponses.slice(-30);out.failedRequests=network.failedRequests.slice(-20);return out;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.log('PSEmine authenticated verification: SKIPPED');
    console.log('  No test credentials in the environment, and this sandbox has no');
    console.log('  Firebase configuration, so no session can be created here.');
    console.log('  Re-run with:  PSE_TEST_EMAIL=… PSE_TEST_PASSWORD=… bun scripts/pse-authenticated-check.mjs');
    console.log('  Console routes therefore remain NOT RUNTIME VERIFIED in this environment.');
    process.exitCode = 1;
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

  // ── Opt-in enrollment (PSE_ENROLL=1) ────────────────────────────────────────
  // A fresh account is enrolled in nothing. PSEmine access is explicit, and the
  // console itself offers "Enable PSEmine for this account": the backend grants
  // access and records an audit entry (zeroed balances, no purchases, no
  // charges). Off by default — the harness must never change product state
  // unless the reviewer asked for it. Without enrollment the console renders
  // the gate, and the report says so instead of claiming a pass.
  const enrollment = { attempted: false, gateFound: false, clicked: false, cleared: false, reason: '' };
  if (process.env.PSE_ENROLL === '1') {
    enrollment.attempted = true;
    try {
      await authPage.goto(`${base}/mine/dashboard`, { waitUntil: 'load', timeout: 25_000 });
      await authPage.waitForTimeout(1500);
      const gate = authPage.getByRole('button', { name: /enable psemine for this account/i }).first();
      if (await gate.count()) {
        enrollment.gateFound = true;
        await gate.click();
        enrollment.clicked = true;
        try {
          await gate.waitFor({ state: 'detached', timeout: 20_000 });
          enrollment.cleared = true;
        } catch {
          enrollment.reason = 'gate still present 20s after enabling';
        }
      } else {
        enrollment.reason = 'no enrollment gate rendered (already enrolled, or a different state)';
      }
    } catch (e) {
      enrollment.reason = String(e).slice(0, 200);
    }
    console.log(`Enrollment: gate ${enrollment.gateFound ? 'found' : 'not found'} · clicked ${enrollment.clicked} · cleared ${enrollment.cleared}${enrollment.reason ? ` (${enrollment.reason})` : ''}`);
  }

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

      let measured=null,landedOn='',title='',readiness=null;
      const network={pendingApi:0,completedApi:0,apiResponses:[],failedRequests:[]};
      const apiReq=r=>safePath(r.url()).startsWith('/api/');
      const onReq=r=>{if(apiReq(r))network.pendingApi++;};
      const onDone=r=>{if(apiReq(r))network.pendingApi=Math.max(0,network.pendingApi-1);};
      const onResp=r=>{if(safePath(r.url()).startsWith('/api/')){network.completedApi++;network.apiResponses.push({method:r.request().method(),path:safePath(r.url()),status:r.status()});}};
      const onFail=r=>{if(apiReq(r))network.failedRequests.push({method:r.method(),path:safePath(r.url()),failure:r.failure()?.errorText||'failed'});};
      const onRequestFailed=r=>{onDone(r);onFail(r);};
      authPage.on('request',onReq);authPage.on('requestfinished',onDone);authPage.on('requestfailed',onRequestFailed);authPage.on('response',onResp);
      try{
        await authPage.goto(`${base}${route.path}`,{waitUntil:'domcontentloaded',timeout:30000});
        readiness=await waitForRenderedPage(authPage,network,60000);
        landedOn=await authPage.evaluate(()=>location.pathname);title=await authPage.title();measured=await authPage.evaluate(MEASURE);
        const stem=`${route.id}-${width}`;
        await authPage.screenshot({path:path.join(OUT,`${stem}-full.png`),fullPage:true,animations:'disabled',timeout:30000});
        await authPage.screenshot({path:path.join(OUT,`${stem}-viewport.png`),fullPage:false,animations:'disabled',timeout:30000});
        fs.writeFileSync(path.join(OUT,`${stem}.json`),JSON.stringify({route:route.path,width,landedOn,title,readiness,measured,visibleText:await authPage.locator('body').innerText().catch(()=>''),html:await authPage.locator('body').evaluate(e=>e.innerHTML).catch(()=> '')},null,2));
      }catch(e){pageErrors.push(`HARNESS: ${String(e).slice(0,220)}`);}
      finally{authPage.off('request',onReq);authPage.off('requestfinished',onDone);authPage.off('requestfailed',onRequestFailed);authPage.off('response',onResp);}
      results.push({route:route.path,id:route.id,width,landedOn,title,settled:readiness?.ready===true,readiness,reachedConsole:landedOn===route.path,...(measured||{}),horizontalOverflow:measured?measured.scrollWidth>measured.clientWidth+1:null,apiResponses:network.apiResponses,failedApiRequests:network.failedRequests,consoleErrors:[...consoleErrors],pageErrors:[...pageErrors],crossProductCalls:[...new Set(productCalls)],crossProductStoreReads:[...new Set(productStores)]});
    }
  }

  // ── Interactive overlays: notification sheet and quote modal ──────────────
  // These checks open read-only UI surfaces. The quote may be requested, but the
  // harness never connects a wallet, signs, submits, or approves a transaction.
  const overlays = {
    notifications: { opened: false, screenshot: null, text: '', error: '' },
    quote: { opened: false, screenshot: null, text: '', error: '', paymentStarted: false },
  };
  try {
    await authPage.setViewportSize({ width: 390, height: 844 });
    await authPage.goto(`${base}/mine/dashboard`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    const notificationButton = authPage.getByRole('button', { name: /^Notifications(?:,.*)?$/i }).first();
    await notificationButton.waitFor({ state: 'visible', timeout: 12_000 });
    await notificationButton.click();
    const notificationDialog = authPage.getByRole('dialog', { name: 'Notifications' });
    await notificationDialog.waitFor({ state: 'visible', timeout: 8_000 });
    overlays.notifications.opened = true;
    overlays.notifications.text = (await notificationDialog.innerText()).slice(0, 1800);
    overlays.notifications.screenshot = 'notifications-390.png';
    await authPage.screenshot({ path: path.join(OUT, overlays.notifications.screenshot), fullPage: false, animations: 'disabled' });
    await authPage.getByRole('button', { name: /close notifications/i }).click();
  } catch (e) {
    overlays.notifications.error = String(e).slice(0, 220);
  }
  try {
    await authPage.goto(`${base}/mine/tools`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    const buy = authPage.getByRole('button', { name: /view details|buy this tool/i }).first();
    await buy.waitFor({ state: 'visible', timeout: 12_000 });
    if (await buy.isEnabled()) {
      await buy.click();
      const dialog = authPage.locator('.pse-purchase-dialog');
      await dialog.waitFor({ state: 'visible', timeout: 20_000 });
      if (!BASE_URL) await dialog.locator('.pse-tool-detail-hero').waitFor({ state: 'visible', timeout: 8_000 });
      overlays.quote.opened = true;
      overlays.quote.text = (await dialog.innerText()).slice(0, 2600);
      overlays.quote.screenshot = 'tool-details-390.png';
      await authPage.screenshot({ path: path.join(OUT, overlays.quote.screenshot), fullPage: false, animations: 'disabled' });
      overlays.quote.paymentStarted = false;
      const close = dialog.getByRole('button', { name: /^Close$/i }).first();
      if (await close.count()) await close.click();
    } else {
      overlays.quote.error = 'First purchase action is disabled by live campaign/account state; modal not opened.';
    }
  } catch (e) {
    overlays.quote.error = String(e).slice(0, 220);
  }
  fs.writeFileSync(path.join(OUT, 'overlay-interactions.json'), JSON.stringify(overlays, null, 2));

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
    JSON.stringify({ enrollment, routes: results, overlays, logout }, null, 2),
  );
  if (enrollment.attempted) {
    console.log(`\nEnrollment: gate ${enrollment.gateFound ? 'found' : 'NOT FOUND'} · clicked ${enrollment.clicked} · cleared ${enrollment.cleared}${enrollment.reason ? ` (${enrollment.reason})` : ''}`);
  }
  console.log(`\nLogout: control ${logout.controlFound ? 'found' : 'NOT FOUND'} · session ended: ${logout.signedOut}${logout.reason ? ` (${logout.reason})` : ''}`);

  // ── Report ────────────────────────────────────────────────────────────────
  const redirects = results.filter(r => !r.reachedConsole);
  const overflow = results.filter(r => r.horizontalOverflow);
  const leaks = results.filter(r => r.crossProductCalls.length || r.crossProductStoreReads.length);
  const errored = results.filter(r => r.pageErrors.length);
  const taps = results.filter(r => (r.smallTargetsUnder44 || []).length && r.width <= 430);
  const unsettled = results.filter(r => !r.settled);

  console.log(`\nLoads: ${results.length} (${ROUTES.length} routes × ${WIDTHS.length} widths)`);
  console.log(`  redirected away from the console: ${redirects.length}`);
  redirects.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width} → ${r.landedOn}`));
  console.log(`  horizontal overflow: ${overflow.length}`);
  overflow.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width} (${r.scrollWidth} > ${r.clientWidth})`));
  console.log(`  PulseEarn product calls / store reads: ${leaks.length}`);
  leaks.slice(0, 6).forEach(r => console.log(
    `    ${r.route} @${r.width} → ${[...r.crossProductCalls, ...r.crossProductStoreReads].join(', ')}`,
  ));
  console.log(`  pages not fully settled: ${unsettled.length}`);
  unsettled.slice(0,12).forEach(r=>console.log(`    ${r.route} @${r.width}: ${r.readiness?.reason||'unknown'}; skeletons=${r.readiness?.skeletons?.length||0}`));
  console.log(`  page errors: ${errored.length}`);
  errored.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width} → ${r.pageErrors[0]}`));
  console.log(`  mobile pages with taps under 44px: ${taps.length}`);
  taps.slice(0, 6).forEach(r => console.log(`    ${r.route} @${r.width}: ${r.smallTargetsUnder44.slice(0, 3).join(' | ')}`));
  console.log(`\nReport + screenshots: ${OUT}`);
  // A report is evidence, not a pass: fail the job when critical responsive or
  // runtime invariants are violated so a green workflow cannot hide a defect.
  const failures = [];
  if (redirects.length) failures.push(`${redirects.length} authenticated routes redirected away from their destination`);
  if (overflow.length) failures.push(`${overflow.length} route/viewport combinations have horizontal overflow`);
  if (leaks.length) failures.push(`${leaks.length} cross-product calls or store reads detected`);
  if (unsettled.length) failures.push(`${unsettled.length} route/viewport combinations did not settle`);
  if (errored.length) failures.push(`${errored.length} route/viewport combinations have uncaught page errors`);
  if (!logout.signedOut) failures.push('authenticated QA account did not complete the logout check');
  if (failures.length) {
    console.error('\nAUTHENTICATED QA FAILED:');
    failures.forEach(reason => console.error(`  - ${reason}`));
    process.exitCode = 1;
  } else {
    console.log('\nAUTHENTICATED QA PASSED: no overflow, route, isolation, readiness, page-error, or logout failures.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
