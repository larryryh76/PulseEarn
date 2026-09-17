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
 *   7. Payer binding: resolvePaymentPayer() refuses a wallet that is not the
 *      purchase's bound payer (WALLET_MISMATCH).
 *   8. Double-broadcast protection: AT MOST ONE eth_sendTransaction per call in
 *      every branch — hash returned, user rejection, ambiguous error (which
 *      stops as PAYMENT_SUBMISSION_UNCERTAIN) and the provably pre-broadcast
 *      fallback. The fallback never runs after a send error.
 *   9. Purchase-flow ORDER: the payer intent is bound BEFORE the wallet signs
 *      (source order of the real Pay now handler).
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

  // 8. PAYER BINDING GUARD (real module). A purchase bound to wallet A must not
  //    be paid from wallet B; the backend enforces it against the on-chain
  //    sender, and this guard keeps the UI from ever asking B to fund it.
  const payerGuard = await page.evaluate(async () => {
    const m = await import('/__pseWallet.mjs');
    const A = '0xaaa0000000000000000000000000000000000001';
    const B = '0xbbb0000000000000000000000000000000000002';
    return {
      sameWallet: m.resolvePaymentPayer(A, A),
      checksummedConnected: m.resolvePaymentPayer(A.toLowerCase(), A.toUpperCase()),
      walletSwitch: m.resolvePaymentPayer(A, B),
      noBinding: m.resolvePaymentPayer(null, B),
      retryNotSubmitted: m.canRetryPayment('NOT_SUBMITTED'),
      retryUnknown: m.canRetryPayment('UNKNOWN_SUBMISSION_STATE'),
      retrySubmitted: m.canRetryPayment('SUBMITTED'),
      uncertainCode: new m.PsePaymentSubmissionUncertainError().code,
    };
  });
  step('payer-binding-guard', {
    ...payerGuard,
    pass: payerGuard.sameWallet.ok === true
      && payerGuard.checksummedConnected.ok === true
      && payerGuard.walletSwitch.ok === false && payerGuard.walletSwitch.code === 'WALLET_MISMATCH'
      && payerGuard.noBinding.ok === false && payerGuard.noBinding.code === 'PAYER_NOT_BOUND'
      && payerGuard.retryNotSubmitted === true
      && payerGuard.retryUnknown === false && payerGuard.retrySubmitted === false
      && payerGuard.uncertainCode === 'PAYMENT_SUBMISSION_UNCERTAIN',
  });

  // 9. DOUBLE-BROADCAST PROTECTION (real sendPaymentTransaction). Every branch
  //    must perform AT MOST ONE eth_sendTransaction: an ambiguous send stops as
  //    PAYMENT_SUBMISSION_UNCERTAIN and is never retried, and the raw fallback
  //    may only run when the failure was PROVEN pre-broadcast (the wallet never
  //    received a send request at all).
  const broadcast = await page.evaluate(async (receiver) => {
    const m = await import('/__pseWallet.mjs');
    const FROM = '0x1111111111111111111111111111111111111111';
    const HASH = '0x' + '22'.repeat(32);
    const VALUE = '10000000000000000';
    const TO = receiver;
    // ethers resolves sendTransaction with the TRANSACTION RESPONSE, so a wallet
    // that returns a hash is followed by an eth_getTransactionByHash poll. A real
    // node answers it from the mempool; the stub must too, or the harness would
    // wait forever (and the previous run proved it).
    const TX_RESPONSE = {
      hash: HASH, blockHash: '0x' + '11'.repeat(32), blockNumber: '0x1', transactionIndex: '0x0',
      from: FROM, to: TO, value: '0x' + BigInt(VALUE).toString(16),
      gasPrice: '0x3b9aca00', gasLimit: '0x5208', nonce: '0x0', type: '0x2', chainId: '0x38',
      v: '0x1', yParity: '0x1', r: '0x' + '00'.repeat(31) + '1', s: '0x' + '00'.repeat(31) + '1',
      input: '0x', accessList: [], maxFeePerGas: '0x3b9aca00', maxPriorityFeePerGas: '0x3b9aca00',
    };

    // capability: how well the wallet can BUILD a transaction through ethers.
    // send: what eth_sendTransaction answers with.
    const runCase = async ({ capability, send }) => {
      const calls = [];
      const provider = {
        lastSendParams: null,
        request: async (args) => {
          calls.push(args.method);
          const method = args.method;
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [FROM];
          if (method === 'eth_chainId') return '0x38';
          if (method === 'eth_sendTransaction') {
            provider.lastSendParams = (args.params || [])[0] || null;
            if (send === 'hash') return HASH;
            if (send === 'reject') { const e = new Error('user rejected transaction'); e.code = 4001; throw e; }
            // Ambiguous: a send was requested and no hash came back.
            const e = new Error('provider connection lost'); e.code = -32000; throw e;
          }
          if (method === 'eth_getTransactionByHash') return TX_RESPONSE;
          if (capability === 'minimal') {
            // Minimal in-app dapp browser: ethers cannot even build the tx.
            const e = new Error('Method not found'); e.code = -32601; throw e;
          }
          switch (method) {
            case 'eth_blockNumber': return '0x1';
            case 'eth_getTransactionCount': return '0x0';
            case 'eth_estimateGas': return '0x5208';
            case 'eth_gasPrice': return '0x3b9aca00';
            case 'eth_maxPriorityFeePerGas': return '0x3b9aca00';
            case 'eth_feeHistory': return { oldestBlock: '0x1', baseFeePerGas: ['0x3b9aca00', '0x3b9aca00'], gasUsedRatio: [0.5], reward: [['0x3b9aca00']] };
            case 'eth_getCode': return '0x';
            case 'eth_getBlockByNumber': return {
              hash: '0x' + '11'.repeat(32), parentHash: '0x' + '00'.repeat(32), number: '0x1',
              timestamp: '0x1', gasLimit: '0x1c9c380', gasUsed: '0x5208', difficulty: '0x0',
              baseFeePerGas: '0x3b9aca00', miner: '0x' + '00'.repeat(20), extraData: '0x',
              nonce: '0x0000000000000000', transactions: [], uncles: [],
              logsBloom: '0x' + '00'.repeat(256), sha3Uncles: '0x' + '00'.repeat(32),
              stateRoot: '0x' + '00'.repeat(32), receiptsRoot: '0x' + '00'.repeat(32),
              transactionsRoot: '0x' + '00'.repeat(32),
            };
            default: return null;
          }
        },
        on() {},
        removeListener() {},
      };
      let outcome = null;
      let hash = null;
      try {
        hash = await m.sendPaymentTransaction(provider, { from: FROM, to: receiver, value: VALUE });
        outcome = 'HASH_RETURNED';
      } catch (e) {
        outcome = m.isSubmissionUncertain(e) ? 'PAYMENT_SUBMISSION_UNCERTAIN'
          : m.isWalletRejection(e) ? 'USER_REJECTED' : 'OTHER:' + String(e && e.message).slice(0, 60);
      }
      const sendCalls = calls.filter(c => c === 'eth_sendTransaction');
      const sent = provider.lastSendParams;
      // WHICH PATH ACTUALLY SENT IT — read off the payload, not assumed:
      //   ethers builds the tx first and includes gas → {from, gas, to, value}
      //   the fallback sends the minimal EIP-1193 form  → {from, to, value}
      const keys = sent && typeof sent === 'object' ? Object.keys(sent).sort().join(',') : null;
      const pathUsed = keys === null ? 'none' : (keys === 'from,to,value' ? 'raw-minimal' : 'ethers-built');
      return {
        outcome,
        hash,
        sendAttempts: sendCalls.length,
        pathUsed,
        lastSendParams: sent || null,
      };
    };

    const out = {};
    // A wallet that can build through ethers and returns a hash.
    out.ethersPath = await runCase({ capability: 'capable', send: 'hash' });
    // A wallet that can build, is asked to send, and never answers with a hash.
    out.ambiguousSend = await runCase({ capability: 'capable', send: 'ambiguous' });
    out.userRejected = await runCase({ capability: 'capable', send: 'reject' });
    // A minimal dapp browser: the send request is never reached via ethers.
    out.preBroadcastFallback = await runCase({ capability: 'minimal', send: 'hash' });
    out.fallbackAlsoAmbiguous = await runCase({ capability: 'minimal', send: 'ambiguous' });
    out.hash = HASH;
    out.value = VALUE;
    out.from = FROM;
    return out;
  }, RECEIVER);

  const b = broadcast;
  const cases = [b.ethersPath, b.ambiguousSend, b.userRejected, b.preBroadcastFallback, b.fallbackAlsoAmbiguous];
  const oneSendEach = cases.every(c => c.sendAttempts <= 1);
  const fb = b.preBroadcastFallback.lastSendParams;
  const fallbackParamsExact = Boolean(fb)
    && fb.from === b.from
    && String(fb.to).toLowerCase() === RECEIVER
    && String(fb.value) === b.value;
  step('double-broadcast-protection', {
    hashReturnedOnce: b.ethersPath.outcome === 'HASH_RETURNED' && b.ethersPath.sendAttempts === 1,
    ethersPathUsedWhenCapable: b.ethersPath.pathUsed === 'ethers-built',
    ambiguousSendStops: b.ambiguousSend.outcome === 'PAYMENT_SUBMISSION_UNCERTAIN'
      && b.ambiguousSend.sendAttempts === 1 && b.ambiguousSend.pathUsed === 'ethers-built',
    userRejectionNotRetried: b.userRejected.outcome === 'USER_REJECTED' && b.userRejected.sendAttempts === 1,
    preBroadcastFallbackOnly: b.preBroadcastFallback.outcome === 'HASH_RETURNED'
      && b.preBroadcastFallback.sendAttempts === 1
      && b.preBroadcastFallback.pathUsed === 'raw-minimal',
    fallbackParamsExact,
    fallbackAlsoAmbiguousStops: b.fallbackAlsoAmbiguous.outcome === 'PAYMENT_SUBMISSION_UNCERTAIN'
      && b.fallbackAlsoAmbiguous.sendAttempts === 1,
    atMostOneSendPerCall: oneSendEach,
    observed: {
      outcomes: cases.map(c => c.outcome),
      paths: cases.map(c => c.pathUsed),
      sends: cases.map(c => c.sendAttempts),
    },
    pass: b.ethersPath.outcome === 'HASH_RETURNED' && b.ethersPath.sendAttempts === 1
      && b.ambiguousSend.outcome === 'PAYMENT_SUBMISSION_UNCERTAIN' && b.ambiguousSend.sendAttempts === 1
      && b.ambiguousSend.hash === null
      && b.userRejected.outcome === 'USER_REJECTED' && b.userRejected.sendAttempts === 1
      && b.preBroadcastFallback.outcome === 'HASH_RETURNED' && b.preBroadcastFallback.sendAttempts === 1
      && fallbackParamsExact
      && b.fallbackAlsoAmbiguous.outcome === 'PAYMENT_SUBMISSION_UNCERTAIN'
      && b.fallbackAlsoAmbiguous.sendAttempts === 1
      && oneSendEach,
  });

  // 10. PURCHASE-FLOW ORDER (source order of the real handler): bind the payer
  //     BEFORE the wallet is asked to sign, guard the payer, then send, then
  //     submit the hash. A regression here is what let wallet B become the
  //     payer of wallet A's quote.
  const toolsSrc = fs.readFileSync(path.join(process.cwd(), 'src/pages/psemine/PSEMineTools.tsx'), 'utf8');
  const payStart = toolsSrc.indexOf('const payNow = async () => {');
  const payBody = payStart === -1 ? '' : toolsSrc.slice(payStart, toolsSrc.indexOf('\n  };', payStart));
  const iBind = payBody.indexOf('bindPurchaseIntent');
  const iGuard = payBody.indexOf('resolvePaymentPayer');
  const iSend = payBody.indexOf('sendPayment(');
  const iSubmit = payBody.indexOf('submitPurchaseTx(');
  const iUncertain = payBody.indexOf('isSubmissionUncertain');
  const iRetryGate = payBody.indexOf('canRetryPayment');
  step('purchase-flow-order', {
    foundPayNow: payStart !== -1,
    bindBeforeSign: iBind !== -1 && iSend !== -1 && iBind < iSend,
    payerGuardBetweenBindAndSend: iGuard > iBind && iGuard < iSend,
    hashSubmittedAfterSend: iSubmit > iSend,
    ambiguousBranchHandled: iUncertain > iSend,
    retryGatePresent: iRetryGate !== -1 && iRetryGate < iBind,
    pass: payStart !== -1 && iBind !== -1 && iGuard !== -1 && iSend !== -1 && iSubmit !== -1
      && iBind < iGuard && iGuard < iSend && iSend < iSubmit
      && iUncertain > iSend && iRetryGate !== -1 && iRetryGate < iBind,
  });

  fs.writeFileSync(path.join(tmpDir, 'report.json'), JSON.stringify(report, null, 2));
};

await run();
await browser.close();
server.close();
const failed = report.steps.filter(s => s.pass === false);
console.log(`\n${failed.length === 0 ? 'ALL WALLET GATE STEPS PASSED' : 'FAILED STEPS: ' + failed.map(f => f.name).join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
