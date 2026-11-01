/**
 * Regression gate for cross-account wallet-session leakage.
 * This is intentionally a source-level security assertion: the app must never
 * restore a wallet from a browser-global key or send a payment with a provider
 * adopted for a different Firebase UID.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/contexts/PSEMineContext.tsx', 'utf8');

assert.match(source, /psemine_connected_wallet:\$\{uid\}/, 'wallet storage must be scoped to Firebase UID');
assert.match(source, /psemine_wallet_user_disconnected:\$\{uid\}/, 'disconnect state must be scoped to Firebase UID');
assert.match(source, /walletOwnerUidRef\.current !== currentUserUid/, 'wallet actions must reject a provider owned by another account');
assert.match(source, /previousUid !== currentUserUid/, 'account changes must retire the previous wallet session');
assert.match(source, /handoffOwnerUid === currentUserUid/, 'mobile wallet handoffs must be owned by the active Firebase UID');
assert.match(source, /\}, \[currentUserUid\]\);/, 'wallet restore lifecycle must react to authenticated UID changes');
assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem|removeItem)\('psemine_connected_wallet'\)/, 'legacy browser-global wallet key must not be read or written');
assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem|removeItem)\('psemine_wallet_user_disconnected'\)/, 'legacy browser-global disconnect key must not be read or written');

console.log('PASS: PSEmine wallet sessions are isolated by authenticated Firebase UID.');
