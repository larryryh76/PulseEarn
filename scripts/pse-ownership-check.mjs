/**
 * Ownership projection gate.
 *
 * The purchase dialog said "You will own 0 of 3 after this purchase" because it
 * printed the PRE-purchase verified count. These cases pin the business rule
 * against each real tier limit (Starter 5, Builder 3, Advanced 3, Elite 2).
 */
import fs from 'node:fs';
import { projectOwnershipAfterPurchase, canBuyAnotherUnit } from '../src/engines/psemine/pseOwnership.ts';
import { LOCKED_PSEMINE_TOOLS } from '../src/types/psemine.ts';

const TOOLS_SRC = fs.readFileSync(new URL('../src/pages/psemine/PSEMineTools.tsx', import.meta.url), 'utf8');

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
};

check('own:0+1=1', projectOwnershipAfterPurchase(0, 1, 3) === 1);
check('own:1+1=2', projectOwnershipAfterPurchase(1, 1, 3) === 2);
check('own:2+1=3', projectOwnershipAfterPurchase(2, 1, 3) === 3);
check('own:3+1=3-at-limit', projectOwnershipAfterPurchase(3, 1, 3) === 3);
check('own:quantity-two', projectOwnershipAfterPurchase(0, 2, 5) === 2);
check('own:quantity-clamped-to-limit', projectOwnershipAfterPurchase(4, 3, 5) === 5);
check('own:negative-and-invalid-input-safe', projectOwnershipAfterPurchase(-2, 1, 3) === 1
  && projectOwnershipAfterPurchase(Number.NaN, 1, 3) === 1);
check('own:per-tier-limit-respected', projectOwnershipAfterPurchase(0, 1, 2) === 1
  && projectOwnershipAfterPurchase(2, 1, 2) === 2);

const tiers = Object.values(LOCKED_PSEMINE_TOOLS);
check('tiers:each-projects-current-plus-one', tiers.every(tool =>
  projectOwnershipAfterPurchase(0, 1, tool.maxPerUser) === 1
  && projectOwnershipAfterPurchase(tool.maxPerUser, 1, tool.maxPerUser) === tool.maxPerUser));
check('tiers:limits-are-the-real-ones', tiers.map(t => t.maxPerUser).join(',') === '5,3,3,2',
  tiers.map(t => `${t.id}:${t.maxPerUser}`).join(' '));
check('buy:blocked-at-limit', canBuyAnotherUnit(3, 3) === false);
check('buy:allowed-below-limit', canBuyAnotherUnit(2, 3) === true);

// The dialog must print the projection from the helper, not the pre-purchase
// count (the reported “You will own 0 of 3 after this purchase”).
check('copy:uses-projection-helper', TOOLS_SRC.includes('projectOwnershipAfterPurchase(owned, 1, tool.maxPerUser)'));
check('copy:states-purchase-brings-you-to', TOOLS_SRC.includes('this purchase brings you to {projectedOwned} of {tool.maxPerUser}'));
check('copy:no-pre-purchase-count', !TOOLS_SRC.includes('You will own {owned} of'));
check('copy:keeps-session-mechanics', TOOLS_SRC.includes('This tier mines in sessions: when a session ends, mining stops until you restart the tool.'));

const failures = results.filter(r => !r.pass);
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failures }, null, 1));
process.exit(failures.length ? 1 : 0);
