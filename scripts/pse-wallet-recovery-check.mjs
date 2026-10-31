/**
 * PSEmine wallet recovery regression harness.
 *
 * Exercises the REAL src/engines/psemine/pseWallet.ts (transpiled with esbuild)
 * against stub EIP-1193 providers. No network, no SDK, no funds:
 *   • WalletConnect session validity (expired / unsupported chain / valid)
 *   • The session — not eth_requestAccounts — is the connection authority
 *   • Chain-scoped WalletConnect RPC (CAIP-2 eip155:56 on switch + send)
 *   • Exactly one broadcast attempt, with existing double-send protection
 *   • Local pre-dispatch session errors are NOT reported as uncertain broadcasts
 *   • Stale asset/chunk failures are classified separately from configuration
 *
 * Run: bun scripts/pse-wallet-recovery-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const tmpDir = '/tmp/pse-wallet-recovery';
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
execSync(
  `bunx esbuild src/engines/psemine/pseWallet.ts --bundle --format=esm --platform=node --define:import.meta.env={} --external:@reown/* --external:@walletconnect/* --outfile=${tmpDir}/pseWallet.mjs`,
  { cwd: process.cwd(), stdio: 'pipe' },
);

// Browser storage used by the handoff marker (module only touches it in calls).
const store = new Map();
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
};

const m = await import(pathToFileURL(path.join(tmpDir, 'pseWallet.mjs')).href);

const results = [];
const check = (name, pass, detail) => results.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });

const NOW = Date.now();
const ADDRESS = '0x1111111111111111111111111111111111111111';
const bnAccount = (chain, address = ADDRESS) => `eip155:${chain}:${address}`;
const session = (accounts, expiry = Math.floor(NOW / 1000) + 3600) => ({ expiry, namespaces: { eip155: { accounts } } });

// ── 1. Session validity ────────────────────────────────────────────────────
check('session:valid-bsc', m.inspectWalletConnectSession(session([bnAccount(56)]), NOW) === 'valid');
check('session:expired', m.inspectWalletConnectSession(session([bnAccount(56)], Math.floor(NOW / 1000) - 1), NOW) === 'expired');
check('session:foreign-chain', m.inspectWalletConnectSession(session([bnAccount(1)]), NOW) === 'unsupported');
check('session:missing', m.inspectWalletConnectSession(null, NOW) === 'missing');
check(
  'session:accounts-are-lowercased-and-chain-filtered',
  JSON.stringify(m.walletConnectSessionAccounts(session([bnAccount(56, ADDRESS.toUpperCase().replace('0X', '0x')), bnAccount(1)]))) === JSON.stringify([ADDRESS]),
);
check('session:bsc-chain-id', m.walletConnectSessionChainId(session([bnAccount(56)])) === 56);
check('session:foreign-chain-has-no-bsc-id', m.walletConnectSessionChainId(session([bnAccount(1)])) === null);

// ── 2. Handoff marker ──────────────────────────────────────────────────────
m.markWalletConnectHandoff(NOW);
check('handoff:recent-pending', m.hasPendingWalletConnectHandoff(NOW + 60_000) === true);
check('handoff:expired-not-pending', m.hasPendingWalletConnectHandoff(NOW + 16 * 60_000) === false);
check('handoff:cleared-not-pending', (m.clearWalletConnectHandoff(), m.hasPendingWalletConnectHandoff(NOW) === false));

// ── 3. Stale asset vs configuration failures ───────────────────────────────
check('asset:vite-chunk-error', m.isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/react-abc.js')));
check('asset:chunkloaderror', m.isChunkLoadError(new Error('ChunkLoadError: Loading chunk 42 failed')));
check('asset:generic-init-not-asset', m.isChunkLoadError(new Error('Project ID is not defined')) === false);

// ── 4. Local pre-dispatch errors (nothing can have been broadcast) ─────────
check('predispatch:no-session-key', m.isPreDispatchWalletError(new Error("No matching key. session topic doesn't exist: abc")));
check('predispatch:not-connected', m.isPreDispatchWalletError(new Error('Please call connect() before request()')));
check('predispatch:namespace', m.isPreDispatchWalletError(new Error("Namespace 'eip155' is not configured. Please call connect() first with namespace config.")));
check('predispatch:generic-is-not-predispatch', m.isPreDispatchWalletError(new Error('insufficient funds for gas * price + value')) === false);

// ── 5. Send: WalletConnect is routed to eip155:56, once ────────────────────
const makeProvider = handler => {
  const calls = [];
  return {
    calls,
    request: async (args, chain) => {
      calls.push({ method: args.method, params: args.params, chain: chain ?? null });
      return handler(args, chain, calls);
    },
    on() {},
    removeListener() {},
  };
};
const TX = { from: ADDRESS, to: '0x8b32a461d3106b3356e9a389dfeb74ac084c8f33', value: '1000000000000000' };
const HASH = `0x${'a'.repeat(64)}`;

const wcSend = makeProvider(() => HASH);
const wcHash = await m.sendPaymentTransaction(wcSend, TX, 'walletConnect');
check('send:walletconnect-hash', wcHash === HASH);
check('send:walletconnect-one-attempt', wcSend.calls.length === 1, { calls: wcSend.calls.length });
check('send:walletconnect-method', wcSend.calls[0]?.method === 'eth_sendTransaction');
check('send:walletconnect-chain-context', wcSend.calls[0]?.chain === 'eip155:56');
check(
  'send:walletconnect-exact-quote-params',
  JSON.stringify(wcSend.calls[0]?.params) === JSON.stringify([{ from: TX.from, to: TX.to, value: TX.value }]),
);

const injectedSend = makeProvider(() => HASH);
await m.sendPaymentTransaction(injectedSend, TX, 'injected');
check('send:injected-standard-request', injectedSend.calls.length === 1 && injectedSend.calls[0]?.chain === null);

// ── 6. Definite failures vs ambiguous broadcasts ───────────────────────────
const generic = makeProvider(() => { const e = new Error('execution reverted'); e.code = -32000; throw e; });
let uncertain = null;
try { await m.sendPaymentTransaction(generic, TX, 'walletConnect'); } catch (e) { uncertain = e; }
check('send:generic-error-is-uncertain', m.isSubmissionUncertain(uncertain));
check('send:generic-error-never-retried', generic.calls.length === 1);

const preDispatch = makeProvider(() => { throw new Error("No matching key. session topic doesn't exist: deadbeef"); });
let unavailable = null;
try { await m.sendPaymentTransaction(preDispatch, TX, 'walletConnect'); } catch (e) { unavailable = e; }
check('send:predispatch-is-session-unavailable', m.isSessionUnavailable(unavailable));
check('send:predispatch-is-not-uncertain', m.isSubmissionUncertain(unavailable) === false);
check('send:predispatch-never-retried', preDispatch.calls.length === 1);

const rejected = makeProvider(() => { const e = new Error('User rejected the request.'); e.code = 4001; throw e; });
let rejection = null;
try { await m.sendPaymentTransaction(rejected, TX, 'injected'); } catch (e) { rejection = e; }
check('send:user-rejection-classified', m.isWalletRejection(rejection));
check('send:user-rejection-never-retried', rejected.calls.length === 1);

const unsupported = makeProvider(() => { const e = new Error('Method not supported'); e.code = 4200; throw e; });
let methodError = null;
try { await m.sendPaymentTransaction(unsupported, TX, 'injected'); } catch (e) { methodError = e; }
check('send:unsupported-method-distinct', methodError?.code === 'PAYMENT_METHOD_UNSUPPORTED');
check('send:unsupported-method-has-diagnostic', typeof methodError?.diagnostic === 'string' && methodError.diagnostic.includes('eth_sendTransaction'));

// ── 7. Chain assertion ─────────────────────────────────────────────────────
let chain = 1;
const switchProvider = makeProvider(({ method }) => {
  if (method === 'eth_chainId') return `0x${chain.toString(16)}`;
  if (method === 'wallet_switchEthereumChain') { chain = 56; return null; }
  return null;
});
check('chain:walletconnect-switch-succeeds', (await m.ensureChain(switchProvider, 56, 'walletConnect')) === true);
const switchCall = switchProvider.calls.find(c => c.method === 'wallet_switchEthereumChain');
check('chain:walletconnect-switch-chain-context', switchCall?.chain === 'eip155:56');

chain = 1;
const injectedSwitch = makeProvider(({ method }) => {
  if (method === 'eth_chainId') return `0x${chain.toString(16)}`;
  if (method === 'wallet_switchEthereumChain') { chain = 56; return null; }
  return null;
});
await m.ensureChain(injectedSwitch, 56, 'injected');
const injectedSwitchCall = injectedSwitch.calls.find(c => c.method === 'wallet_switchEthereumChain');
check('chain:injected-has-no-chain-context', injectedSwitchCall?.chain === null);

const refusing = makeProvider(({ method }) => {
  if (method === 'eth_chainId') return '0x1';
  if (method === 'wallet_switchEthereumChain') throw new Error('Wallet does not support switching');
  return null;
});
check('chain:refusal-fails-closed', (await m.ensureChain(refusing, 56, 'walletConnect')) === false);

// ── 8. Connection comes from the approved session ──────────────────────────
const sessionProvider = makeProvider(({ method }) => {
  if (method === 'eth_chainId') return '0x38';
  if (method === 'wallet_switchEthereumChain') return null;
  if (method === 'eth_requestAccounts') throw new Error('eth_requestAccounts must not be used for WalletConnect');
  return null;
});
sessionProvider.session = session([bnAccount(56, '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD')]);
const connection = await m.connectWalletConnectProvider(sessionProvider, 'Test WC');
check('connect:address-from-session', connection?.address === '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', { address: connection?.address });
check('connect:chain-read-live', connection?.chainId === 56);
check('connect:transport', connection?.transport === 'walletConnect');
check('connect:no-eth-request-accounts', sessionProvider.calls.every(c => c.method !== 'eth_requestAccounts'));
const connectSwitch = sessionProvider.calls.find(c => c.method === 'wallet_switchEthereumChain');
check('connect:sets-bsc-local-default', connectSwitch?.chain === 'eip155:56');

const expiredProvider = makeProvider(() => null);
expiredProvider.session = session([bnAccount(56)], Math.floor(NOW / 1000) - 1);
let expiredError = null;
try { await m.connectWalletConnectProvider(expiredProvider); } catch (e) { expiredError = e; }
check('connect:expired-session-refused', expiredError?.code === 'SESSION_EXPIRED');

const foreignProvider = makeProvider(() => null);
foreignProvider.session = session([bnAccount(1)]);
let foreignError = null;
try { await m.connectWalletConnectProvider(foreignProvider); } catch (e) { foreignError = e; }
check('connect:foreign-chain-refused', foreignError?.code === 'SESSION_UNSUPPORTED');

// ── 9. Payer binding unchanged ─────────────────────────────────────────────
check('payer:match', m.resolvePaymentPayer(ADDRESS, ADDRESS.toUpperCase().replace('0X', '0x')).ok === true);
check('payer:mismatch', m.resolvePaymentPayer(ADDRESS, '0x2222222222222222222222222222222222222222').code === 'WALLET_MISMATCH');
check('payer:not-bound', m.resolvePaymentPayer(null, ADDRESS).code === 'PAYER_NOT_BOUND');
check('payer:retry-only-before-submission', m.canRetryPayment('NOT_SUBMITTED') === true && m.canRetryPayment('UNKNOWN_SUBMISSION_STATE') === false);

const failures = results.filter(r => !r.pass);
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failures, results }, null, 1));
process.exit(failures.length ? 1 : 0);
