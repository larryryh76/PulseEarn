/**
 * Wallet runtime gate — executes the REAL production wallet functions inside
 * Chromium against a stub EIP-1193 provider, capturing the exact parameters a
 * wallet would display at its approval screen.
 *
 * Layers proven:
 *   1. EIP-6963 discovery picks up a stub wallet announced before app boot.
 *   2. connectWithProvider() → eth_requestAccounts → address adoption.
 *   3. ensureChain() → fail-closed chain assertion (correct chain passes; a
 *      wrong chain with no switch support must return false and STOP).
 *   4. sendPaymentTransaction() → the exact eth_sendTransaction params the
 *      wallet would show (from/to/value); the stub REJECTS with 4001,
 *      mirroring the user cancelling at the approval screen. Nothing broadcasts.
 *   5. Rejection classification: 4001 → user-cancel path, no fake success.
 *   6. Event registration: accountsChanged / chainChanged / disconnect.
 *
 * No funds can move: the provider is a stub; eth_sendTransaction throws 4001.
 * The receiving address below is the authoritative campaign destination. The
 * value is a syntactically valid wei string for display capture only — no
 * backend quote is fetched (the sandbox has no Firebase session).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const DIST = path.join(process.cwd(), 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const RECEIVER = '0x8b32a461d3106b3356e9a389dfeb74ac084c8f33'; // authoritative destination (on-chain lowercase form)
const STUB_ADDR = '0x1111111111111111111111111111111111111111';

// 0. Transpile the real production module once (esbuild → self-contained ESM).
const tmpDir = '/tmp/pse-wallet-gate';
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
execSync(
  `bunx esbuild src/engines/psemine/pseWallet.ts --bundle --format=esm --define:import.meta.env={} --outfile=${tmpDir}/pseWallet.mjs`,
  { cwd: process.cwd(), stdio: 'pipe' },
);
const walletModuleJs = fs.readFileSync(path.join(tmpDir, 'pseWallet.mjs'), 'utf8');

// 1. Static server (dist) + the transpiled module route, one handler only.
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__pseWallet.mjs') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(walletModuleJs);
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'SERVICE_UNAVAILABLE', requestId: 'wallet-gate' }));
    return;
  }
  let f = path.join(DIST, url.pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

/** Stub provider: records every call, configurable chain, eth_sendTransaction records approval params then rejects 4001. */
const STUB = `
window.__calls = [];
window.__stubMode = { chainId: '0x38', supportSwitch: true };
window.__stubProvider = {
  request: async (args) => {
    window.__calls.push({ method: args.method, params: args.params ?? null, at: Date.now() });
    switch (args.method) {
      case 'eth_accounts': return ['${STUB_ADDR}'];
      case 'eth_requestAccounts': return ['${STUB_ADDR}'];
      case 'eth_chainId': return window.__stubMode.chainId;
      case 'wallet_switchEthereumChain':
        if (!window.__stubMode.supportSwitch) { const e = new Error('unsupported'); e.code = 4200; throw e; }
        window.__stubMode.chainId = args.params[0].chainId;
        return null;
      case 'wallet_addEthereumChain':
        window.__stubMode.chainId = args.params[0].chainId;
        return null;
      case 'eth_sendTransaction': {
        window.__lastApprovalTx = args.params[0];
        const e = new Error('user rejected transaction'); e.code = 4001; throw e;
      }
      default: return null;
    }
  },
  on() {}, removeListener() {},
};
window.addEventListener('eip6963:requestProvider', () => {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: {
    info: { uuid: 'stub-1', name: 'Stub Wallet', icon: '', rdns: 'com.pse.stub' },
    provider: window.__stubProvider,
  }}));
});
`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.addInitScript(STUB);

const report = { steps: [] };
const step = (name, data) => { report.steps.push({ name, ...data }); console.log(`\n== ${name} ==\n${JSON.stringify(data, null, 1)}`); };

const run = async () => {
  await page.goto(`${base}/mine/login`, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  // Module sanity: real built pseWallet.ts, isomorphic in the page.
  const mod = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    return {
      hasDiscover: typeof m.discoverInjectedWallets === 'function',
      hasSend: typeof m.sendPaymentTransaction === 'function',
      wcConfigured: m.isWalletConnectConfigured(),
    };
  });
  step('module-loaded', mod);

  // 1. EIP-6963 discovery
  const discovered = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const list = await m.discoverInjectedWallets();
    window.__stubDiscovered = list.map(w => w.name);
    return list.map(w => ({ id: w.id, name: w.name, hasRequest: typeof w.provider.request === 'function' }));
  });
  step('eip6963-discovery', {
    found: discovered,
    pass: discovered.length === 1 && discovered[0].id === 'com.pse.stub' && discovered[0].hasRequest,
  });

  // 2. Connection through the real connectWithProvider
  const connection = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const list = await m.discoverInjectedWallets();
    const c = await m.connectWithProvider(list[0].provider, 'injected', list[0].name);
    return { address: c.address, transport: c.transport, walletName: c.walletName, chainId: c.chainId };
  });
  step('connect', {
    ...connection,
    pass: connection.address === STUB_ADDR && connection.transport === 'injected' && connection.chainId === 56,
  });

  // 3. ensureChain — correct chain passes without any switch request
  const chainOk = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const list = await m.discoverInjectedWallets();
    return m.ensureChain(list[0].provider, 56);
  });
  step('ensureChain-correct-chain56', { pass: chainOk === true });

  // 3b. Wrong chain + wallet cannot switch → must return false (STOP before send)
  const chainRefused = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const list = await m.discoverInjectedWallets();
    window.__stubMode.supportSwitch = false;
    window.__stubMode.chainId = '0x1';
    const r = await m.ensureChain(list[0].provider, 56);
    window.__stubMode.chainId = '0x38';
    window.__stubMode.supportSwitch = true;
    return r;
  });
  step('ensureChain-wrong-chain-refused', { pass: chainRefused === false, note: 'fail-closed: send would be blocked' });

  // 3c. Wrong chain + wallet switches to BSC → true
  const chainSwitched = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const list = await m.discoverInjectedWallets();
    window.__stubMode.chainId = '0x1';
    const r = await m.ensureChain(list[0].provider, 56);
    window.__stubMode.chainId = '0x38';
    return r;
  });
  step('ensureChain-switch-to-bsc', { pass: chainSwitched === true });

  // 4. THE APPROVAL SCREEN: real send → params recorded by the stub → 4001.
  const approval = await page.evaluate(async (receiver) => {
    const m = await import('/__pseWallet.mjs');
    const list = await m.discoverInjectedWallets();
    try {
      await m.sendPaymentTransaction(list[0].provider, {
        from: '0x1111111111111111111111111111111111111111',
        to: receiver,
        value: '10000000000000000', // display string; not a real server quote
      });
      return { err: 'send resolved — BUG: nothing may resolve past approval in this harness' };
    } catch (e) {
      return {
        reachedApproval: Boolean(window.__lastApprovalTx),
        approvalTx: window.__lastApprovalTx || null,
        rejectionClassified: m.isWalletRejection(e),
        code: e.code ?? null,
      };
    }
  }, RECEIVER);
  const tx = approval.approvalTx || {};
  step('approval-screen-params', {
    reachedWalletApprovalScreen: approval.reachedApproval,
    txFrom: tx.from || null,
    txTo: tx.to || null,
    txValue: tx.value || null,
    userRejected4001: approval.code === 4001,
    classifiedAsUserCancel: approval.rejectionClassified,
    fundsMoved: false,
  });

  // 5. Assertions on the captured approval parameters.
  const recipientCorrect = (tx.to || '').toLowerCase() === RECEIVER;
  const senderCorrect = (tx.from || '').toLowerCase() === STUB_ADDR;
  const valueIsWeiString = /^\d+$/.test(String(tx.value));
  step('approval-assertions', {
    recipientIsAuthoritativeReceivingWallet: recipientCorrect,
    senderIsConnectedWallet: senderCorrect,
    valueIsExactWeiString: valueIsWeiString,
    pass: recipientCorrect && senderCorrect && valueIsWeiString && approval.reachedApproval && approval.rejectionClassified,
  });

  // 6. Post-rejection state: exactly one send attempt, no resolution path ran.
  const after = await page.evaluate(() => ({
    sendAttempts: window.__calls.filter(c => c.method === 'eth_sendTransaction').length,
  }));
  step('post-rejection-state', { ...after, pass: after.sendAttempts === 1 });

  // 7. Event registration contract: all three listeners, removable.
  const events = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const registered = [];
    const removed = [];
    const fakeProvider = {
      request: async ({ method }) => (method === 'eth_chainId' ? '0x38' : null),
      on: (ev) => { registered.push(ev); },
      removeListener: (ev) => { removed.push(ev); },
    };
    const unsub = m.subscribeWalletEvents(fakeProvider, {
      onAccountsChanged: () => {},
      onChainChanged: () => {},
      onDisconnect: () => {},
    });
    unsub();
    return { registered, removedCount: removed.length };
  });
  step('event-registration', {
    ...events,
    pass: events.registered.join(',') === 'accountsChanged,chainChanged,disconnect' && events.removedCount === 3,
  });

  fs.writeFileSync(path.join(tmpDir, 'report.json'), JSON.stringify(report, null, 2));
};

await run();
await browser.close();
server.close();
const failed = report.steps.filter(s => s.pass === false);
console.log(`\n${failed.length === 0 ? 'ALL WALLET GATE STEPS PASSED' : 'FAILED STEPS: ' + failed.map(f => f.name).join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
