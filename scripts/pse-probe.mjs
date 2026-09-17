/**
 * Ad-hoc rendered probe: navigates a route cluster and dumps what actually
 * rendered (final URL, document title, visible text, warnings/errors).
 *
 * Usage: bun scripts/pse-probe.mjs /mine/login /mine/signup
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const routes = process.argv.slice(2);
if (!routes.length) { console.error('usage: bun scripts/pse-probe.mjs <route...>'); process.exit(1); }

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE', requestId: 'probe' }));
    return;
  }
  let f = path.join(DIST, url.pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
const width = parseInt(process.env.W || '390', 10);
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width <= 430, hasTouch: width <= 430 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() !== 'log') logs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  await page.goto(base + route, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({
    url: location.pathname + location.search,
    title: document.title,
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).slice(0, 3),
    h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()).slice(0, 12),
    text: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 900),
    buttons: Array.from(document.querySelectorAll('button, a[role=button], [type=submit]')).map(b => (b.textContent || '').trim().slice(0, 40)).filter(Boolean).slice(0, 20),
    inputs: Array.from(document.querySelectorAll('input')).map(i => `${i.type}${i.placeholder ? ' · ' + i.placeholder.slice(0, 30) : ''}${i.name ? ' · ' + i.name : ''}`),
    pageHeight: document.documentElement.scrollHeight,
  }));
  console.log('='.repeat(70));
  console.log('ROUTE', route, '| width', width);
  console.log(JSON.stringify(info, null, 1));
  console.log('LOGS:', logs.slice(0, 6));
  await ctx.close();
}
await browser.close();
server.close();
