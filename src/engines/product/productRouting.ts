/**
 * Product routing — THE ONE authoritative decision.
 *
 * PSEmine and PulseEarn are separate product experiences that share ONE Firebase
 * identity. This module is the only place that decides which product an account
 * belongs to and where it is sent, so no two guards can disagree.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * IDENTITY IS NOT ENTITLEMENT
 * ════════════════════════════════════════════════════════════════════════════
 * Being signed in says who someone is. It says nothing about which product they
 * may use. Entitlement lives on `users/{uid}.productAccess` and is granted by the
 * backend (`/api/mine/enroll` for PSEmine; PulseEarn's own signup path for
 * PulseEarn). Before this module existed, the guards treated "signed in" as
 * "PulseEarn", which is why a PSEmine signup could be bounced into the PulseEarn
 * dashboard and load the PulseEarn economy.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * THE RULES, IN ORDER
 * ════════════════════════════════════════════════════════════════════════════
 *   1. Operations users (admin/moderator/root) belong on the operations console.
 *   2. An explicit PulseEarn entitlement wins → PulseEarn home.
 *   3. Otherwise an explicit PSEmine entitlement → PSEmine home.
 *   4. Otherwise no product owns the account → `null` (callers must not invent
 *      a destination).
 *
 * LEGACY ACCOUNTS. An account with NO `productAccess` record at all predates the
 * split and is a PulseEarn account by definition — that keeps every existing
 * PulseEarn user working. An account that explicitly records
 * `productAccess.pulseearn: false` (which is what a PSEmine signup writes) is
 * never treated as PulseEarn, so a PSEmine-only miner can never reach the
 * PulseEarn dashboard, wallet, tasks or rewards.
 */
import type { UserData } from '../../types';

/** Where each product lives. */
export const PULSE_EARN_HOME = '/dashboard';
export const PSE_MINE_HOME = '/mine/dashboard';
/** The PSEmine public surface (also the honest landing spot for an account with
 *  no PSEmine entitlement: it can read about the product and enable access). */
export const PSE_MINE_PUBLIC = '/mine';
export const OPS_HOME = '/admin';

/** The only two products the shared identity can be entitled to. */
export type ProductKind = 'pulseearn' | 'psemine';

/** Operations membership. Mirrors the `OpsRoute`/Firestore rules definition. */
export function isOpsAccount(userData: UserData | null | undefined): boolean {
  const role = userData?.role;
  return role === 'admin' || role === 'moderator' || userData?.isRoot === true;
}

/**
 * PulseEarn entitlement.
 *
 * `productAccess` is written explicitly on every signup (see
 * AuthContext.initializeUserProfile), so an explicit `false` is respected. Only
 * its total ABSENCE — a pre-split account — defaults to granted.
 */
export function hasPulseEarnAccess(userData: UserData | null | undefined): boolean {
  if (!userData) return false;
  const access = userData.productAccess;
  if (access === undefined || access === null) return true; // legacy account
  return access.pulseearn === true;
}

/** PSEmine entitlement. Server-granted; never inferred from being signed in. */
export function hasPSE_MineAccess(userData: UserData | null | undefined): boolean {
  return userData?.productAccess?.psemine === true;
}

/**
 * The home route for a resolved account, or `null` when the account has been
 * loaded but no product (and no operations role) owns it. Callers MUST treat
 * `null` as "make no product decision" rather than substituting a default.
 */
export function resolveHomeRoute(userData: UserData | null | undefined): string | null {
  if (!userData) return null;
  if (isOpsAccount(userData)) return OPS_HOME;
  if (hasPulseEarnAccess(userData)) return PULSE_EARN_HOME;
  if (hasPSE_MineAccess(userData)) return PSE_MINE_HOME;
  return null;
}

/**
 * Where a signed-in account that must NOT be inside PulseEarn belongs. Used by
 * the PulseEarn guard to hand a PSEmine-only account back to its own product
 * instead of showing it the PulseEarn dashboard.
 */
export function resolveNonPulseEarnRoute(userData: UserData | null | undefined): string {
  if (hasPSE_MineAccess(userData)) return PSE_MINE_HOME;
  return PSE_MINE_PUBLIC;
}
