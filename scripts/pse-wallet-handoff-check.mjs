/**
 * PSEmine WalletConnect handoff regression harness.
 *
 * The failure this locks down (proven against the real WalletConnect relay):
 * SignClient keeps the pending session ONLY in memory. If Android Chrome
 * discards/reloads the tab while the wallet app is open, the settlement cannot
 * be attached to a pending session, so the fresh document can NEVER recover the
 * approval from storage. The old code waited 7 s and then silently gave up.
 *
 * These tests cover the deterministic units:
 *   • handoff record / TTL / reload detection / one-shot resume decision
 *   • id-scoped clearing (an old page cannot erase a newer attempt)
 *   • the approval waiter (late approval, timeout, cancellation, wake-ups)
 *   • redacted, reload-surviving diagnostics
 *   • the existing single-send + classification guarantees
 *
 * Run: bun scripts/pse-wallet-handoff-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const tmpDir = '/tmp/pse-wallet-handoff';
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
execSync(
  `bunx esbuild src/engines/psemine/pseWallet.ts --bundle --format=esm --platform=node --define:import.meta.env={} --external:@reown/* --external:@walletconnect/* --outfile=${tmpDir}/pseWallet.mjs`,
  { cwd: process.cwd(), stdio: 'pipe' },
);

const makeStorage = () => {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear(),
    key: index => [...store.keys()][index] ?? null,
    get length() { return store.size; },
    _store: store,
  };
};
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();
// The trace is intentionally console-visible in the app; keep this harness's
// stdout valid JSON. Assertions read the trace state directly.
console.info = () => undefined;

const m = await import(pathToFileURL(path.join(tmpDir, 'pseWallet.mjs')).href);

const results = [];
const check = (name, pass, detail) => results.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });

const NOW = 1_800_000_000_000;
const DOC_A = 1_800_000_000_000;
const ADDRESS = '0x1111111111111111111111111111111111111111';
const TOPIC = 'ab'.repeat(32);

// ── 1. Handoff record and reload policy ────────────────────────────────────
localStorage.clear();
const record = m.markWalletConnectHandoff(NOW, DOC_A);
check('handoff:record-shape', record.v === 2 && typeof record.id === 'string' && record.startedAt === NOW);
check('handoff:pending', m.hasPendingWalletConnectHandoff(NOW + 60_000) === true);
check('handoff:same-document-waits', m.shouldResumeWalletConnectHandoff(record, NOW + 5_000, DOC_A) === 'wait');
check(
  'handoff:previous-document-resumes-once',
  m.isHandoffFromPreviousDocument(record, DOC_A + 60_000) === true &&
  m.shouldResumeWalletConnectHandoff(record, NOW + 60_000, DOC_A + 60_000) === 'resume',
);
const resumed = m.markWalletConnectHandoff(NOW + 61_000, DOC_A + 60_000, record.id, true);
check('handoff:resume-increments-same-id', resumed.id === record.id && resumed.resumeAttempts === 1);
check(
  'handoff:second-reload-needs-manual-resume',
  m.shouldResumeWalletConnectHandoff(resumed, NOW + 70_000, DOC_A + 90_000) === 'manual',
);
check(
  'handoff:outside-pairing-window-is-manual',
  m.shouldResumeWalletConnectHandoff(record, NOW + 5 * 60_000, DOC_A + 5 * 60_000) === 'manual',
);
check(
  'handoff:expired-is-gone',
  m.hasPendingWalletConnectHandoff(NOW + m.HANDOFF_TTL_MS + 1) === false &&
  m.readWalletConnectHandoff(NOW + m.HANDOFF_TTL_MS + 1) === null,
);

localStorage.clear();
const first = m.markWalletConnectHandoff(NOW, DOC_A);
const second = m.markWalletConnectHandoff(NOW + 10_000, DOC_A);
m.clearWalletConnectHandoff(first.id);
check('handoff:old-id-cannot-clear-new-attempt', m.readWalletConnectHandoff(NOW + 11_000)?.id === second.id);
m.clearWalletConnectHandoff(second.id);
check('handoff:matching-id-clears', m.readWalletConnectHandoff(NOW + 12_000) === null);

localStorage.clear();
localStorage.setItem('psemine_wc_handoff', String(NOW));
const legacy = m.readWalletConnectHandoff(NOW + 1_000);
check('handoff:legacy-marker-readable', legacy?.id === `legacy-${NOW}`);
check(
  'handoff:legacy-never-auto-resumes',
  legacy !== null && m.shouldResumeWalletConnectHandoff(legacy, NOW + 1_000, DOC_A + 60_000) === 'manual',
);
m.clearWalletConnectHandoff();
check('handoff:legacy-cleared', m.readWalletConnectHandoff(NOW) === null);

// ── 2. Approval waiter ─────────────────────────────────────────────────────
const provider = { request: async () => '0x1' };
const call = (name, fn) => fn().then(value => ({ name, ok: true, value })).catch(error => ({ name, ok: false, error: String(error) }));

const immediate = await m.awaitApprovedWallet(async () => provider, () => () => undefined, { timeoutMs: 100 });
check('wait:immediate-provider', immediate.state === 'provider' && immediate.provider === provider);

let polls = 0;
const late = await m.awaitApprovedWallet(
  async () => (++polls >= 4 ? provider : null),
  () => () => undefined,
  { timeoutMs: 500, intervalMs: 10 },
);
check('wait:late-approval-resolves', late.state === 'provider' && polls >= 4, { polls });

const timedOut = await m.awaitApprovedWallet(async () => null, () => () => undefined, { timeoutMs: 60, intervalMs: 10 });
check('wait:no-approval-times-out', timedOut.state === 'timeout');

let cancelled = false;
const cancelWait = m.awaitApprovedWallet(
  async () => { cancelled = true; return null; },
  () => () => undefined,
  { timeoutMs: 2_000, intervalMs: 10, isCancelled: () => cancelled },
);
const cancelledResult = await Promise.race([cancelWait, new Promise(resolve => setTimeout(() => resolve({ state: 'hung' }), 250))]);
check('wait:cancellation-stops-immediately', cancelledResult.state === 'cancelled');

let wake = null;
let lateProvider = null;
const wakeWait = m.awaitApprovedWallet(
  async () => lateProvider,
  notify => { wake = notify; return () => { wake = null; }; },
  { timeoutMs: 1_000, intervalMs: 10 },
);
setTimeout(() => { lateProvider = provider; wake?.(); }, 30);
const woken = await Promise.race([wakeWait, new Promise(resolve => setTimeout(() => resolve({ state: 'hung' }), 400))]);
check('wait:visibility-wake-resolves', woken.state === 'provider');

let unsubscribed = false;
let unsubscribePolls = 0;
const dispose = await m.awaitApprovedWallet(
  async () => (++unsubscribePolls >= 3 ? provider : null),
  () => () => { unsubscribed = true; },
  { timeoutMs: 200, intervalMs: 10 },
);
check('wait:unsubscribes-on-resolution', dispose.state === 'provider' && unsubscribed === true, { polls: unsubscribePolls });

// ── 3. Diagnostics: redacted, bounded, reload-aware ────────────────────────
sessionStorage.clear();
const id = m.beginWalletTrace('test');
m.recordWalletStage('provider_resolved', `addr=${ADDRESS} topic=${TOPIC} uri=wc:deadbeef`);
m.recordWalletStage('hash_received', `tx=0x${'a'.repeat(64)}`);
m.recordWalletDocumentBoot();
const trace = m.getWalletTrace();
const diagnostics = m.formatWalletDiagnostics();
check('trace:has-correlation-id', typeof id === 'string' && trace?.id === id && m.getWalletCorrelationId() === id);
check('trace:document-boot-counted', trace?.documents === 2, { documents: trace?.documents });
check('trace:address-redacted', !diagnostics.includes(ADDRESS) && diagnostics.includes('0x1111…1111'));
check('trace:topic-redacted', !diagnostics.includes(TOPIC) && !diagnostics.includes('wc:deadbeef'));
check('trace:tx-hash-redacted', !diagnostics.includes('a'.repeat(64)) && diagnostics.includes('[tx]'));
const keptId = m.ensureWalletTrace('retry');
check('trace:ensure-keeps-id-across-reload', keptId === id && m.getWalletTrace()?.id === id);
m.clearWalletTrace();
check('trace:cleared', m.getWalletTrace() === null);

// ── 4. Sending is still exactly once, with a redacted diagnostic trail ─────
const TX = { from: ADDRESS, to: '0x2222222222222222222222222222222222222222', value: '1000000000000000' };
const HASH = `0x${'b'.repeat(64)}`;
const calls = [];
sessionStorage.clear();
m.beginWalletTrace('send');
const sent = await m.sendPaymentTransaction({
  request: async (args, chain) => { calls.push({ method: args.method, chain }); return HASH; },
  on() {}, removeListener() {},
}, TX, 'walletConnect');
const stages = m.getWalletTrace()?.events.map(event => event.stage) ?? [];
check('send:one-attempt', calls.length === 1 && sent === HASH);
check('send:explicit-bsc-chain', calls[0]?.chain === 'eip155:56');
check('send:stages-recorded', stages.includes('transaction_request_started') && stages.includes('hash_received'), { stages });
check('send:no-amount-or-address-in-trace', !m.formatWalletDiagnostics().includes(TX.to) && !m.formatWalletDiagnostics().includes(TX.value));

// ── 5. WalletConnect uses the approved CAIP-10 session, not mutable defaults ──
let switchRequests = 0;
const wcSessionProvider = {
  session: { namespaces: { eip155: { accounts: [`eip155:56:${ADDRESS}`] } } },
  request: async args => {
    if (args.method === 'eth_chainId') return '0x1'; // stale mutable default after mobile handoff
    if (args.method === 'wallet_switchEthereumChain') { switchRequests += 1; throw new Error('unsupported method'); }
    return null;
  },
  on() {}, removeListener() {},
};
const wcChainOk = await m.ensureChain(wcSessionProvider, 56, 'walletConnect');
check('walletconnect:approved-bsc-session-overrides-stale-default', wcChainOk === true);
check('walletconnect:no-injected-chain-switch-rpc', switchRequests === 0, { switchRequests });
const wcWrongSession = {
  session: { namespaces: { eip155: { accounts: [`eip155:1:${ADDRESS}`] } } },
  request: async args => args.method === 'eth_chainId' ? '0x1' : null,
  on() {}, removeListener() {},
};
const wcWrongChain = await m.ensureChain(wcWrongSession, 56, 'walletConnect');
check('walletconnect:unapproved-chain-fails-closed', wcWrongChain === false);

const failing = { request: async () => { const error = new Error('No matching key. session topic doesn\'t exist'); throw error; }, on() {}, removeListener() {} };
sessionStorage.clear();
m.beginWalletTrace('send-predispatch');
let failure = null;
try { await m.sendPaymentTransaction(failing, TX, 'walletConnect'); } catch (error) { failure = error; }
check('send:predispatch-retryable', m.isSessionUnavailable(failure) && !m.isSubmissionUncertain(failure));
check('send:predispatch-recorded', (m.getWalletTrace()?.events || []).some(event => event.stage === 'pre_dispatch_failure'));

const failures = results.filter(result => !result.pass);
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failures, results }, null, 1));
process.exit(failures.length ? 1 : 0);
