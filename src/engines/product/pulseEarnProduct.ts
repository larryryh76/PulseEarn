/**
 * PulseEarn product behaviour (points economy + onboarding bonuses).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * AuthContext is SHARED INFRASTRUCTURE: Firebase identity, session
 * restoration, role resolution. PulseEarn's points economy is PRODUCT
 * BEHAVIOUR. Before this split, the global AuthProvider ran the daily-reward
 * claim (PointTransactionEngine → /api/execute-transaction → success toast)
 * from inside its `users/{uid}` snapshot listener — which is mounted above the
 * router at src/main.tsx. Every authenticated, email-verified non-ops user
 * triggered it, INCLUDING a PSEmine-only user sitting on /mine/dashboard.
 *
 * Rule enforced here: nothing in this module may run unless the user is
 * actually inside the PulseEarn product. The only mount point is
 * PulseEarnProductProvider, which is scoped to PulseEarn routes in App.tsx,
 * and AuthContext.signup(..., 'pulseearn').
 *
 * PSEmine never imports this module.
 */
import { doc, getDoc, collection, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { safeFetch } from '../../utils/api';
import { PointTransactionEngine } from '../points/PointTransactionEngine';
import { EconomyConfigEngine } from '../system/EconomyConfigEngine';
import { NotificationEngine } from '../system/NotificationEngine';

/** Product scope marker — used for entitlement and audit metadata. */
export const PULSE_EARN_PRODUCT = 'pulseearn' as const;

/**
 * Daily login reward. PulseEarn economy only — this is the call that must
 * never execute for a PSEmine session.
 *
 * Idempotent by construction: the claim id embeds the local day and the uid,
 * and the backend rejects a repeat claim with DAILY_REWARD_COOLDOWN /
 * REWARD_ALREADY_CLAIMED, both treated as silent successes.
 */
export async function claimDailyReward(uid: string): Promise<boolean> {
  try {
    const config = await EconomyConfigEngine.getConfig();

    // Local-day string keeps the "once per day" promise in the user's timezone.
    const utcOffset = -new Date().getTimezoneOffset();
    const now = new Date();
    const localDate = new Date(now.getTime() + utcOffset * 60000);
    const localDayStr = localDate.toISOString().split('T')[0];
    const claimId = `daily_${localDayStr}_${uid}`;

    const result = await PointTransactionEngine.execute({
      userId: uid,
      amount: config.rewards.dailyLoginPoints,
      type: 'daily_reward',
      source: 'Daily Login Bonus',
      claimId,
      xpReward: config.rewards.dailyLoginXP,
      metadata: { localDay: localDayStr, product: PULSE_EARN_PRODUCT },
    });

    if (result.success) {
      toast.success('Daily Reward Claimed!', {
        icon: '🎁',
        duration: 5000,
        position: 'top-center',
      });
      return true;
    }
    if (result.error !== 'DAILY_REWARD_COOLDOWN' && result.error !== 'REWARD_ALREADY_CLAIMED') {
      toast.error(`Daily Reward Error: ${result.error}`, { position: 'top-center' });
    }
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('[PulseEarn] Daily reward sync failed:', message);
    toast.error('System Error: Daily reward check failed', { position: 'top-center' });
    return false;
  }
}

/**
 * Welcome bonus. Idempotent via the deterministic claimId
 * `welcome_{uid}` — safe to call on a repair path.
 */
export async function grantWelcomeBonus(uid: string): Promise<void> {
  try {
    const config = await EconomyConfigEngine.getConfig();
    const amount = config.rewards.welcomeBonusPoints ?? 30;
    const xpReward = config.rewards.welcomeBonusXP ?? 50;

    const result = await PointTransactionEngine.execute({
      userId: uid,
      amount,
      type: 'welcome_bonus',
      source: 'Welcome Bonus',
      claimId: `welcome_${uid}`,
      xpReward,
    });

    if (result.success && amount > 0) {
      toast.success(`Welcome Bonus Credited: +${amount} PTS`, {
        icon: '🎁',
        duration: 6000,
        position: 'top-center',
      });
    }
  } catch (err) {
    console.error('[PulseEarn] Welcome bonus dispatch failed:', err);
  }
}

/**
 * Repair path for accounts that predate the welcome-bonus claim record.
 * Grant-only: it never removes or re-awards an existing bonus.
 */
export async function repairWelcomeBonusIfMissing(uid: string): Promise<void> {
  try {
    const claimSnap = await getDoc(doc(db, 'system_claims', `welcome_${uid}`));
    if (claimSnap.exists()) return;
    if (import.meta.env.DEV) console.log('[PulseEarn] Repairing welcome bonus…');
    await grantWelcomeBonus(uid);
  } catch (err) {
    console.error('[PulseEarn] Welcome bonus repair failed:', err);
  }
}

/**
 * PulseEarn referral linkage and signup bonuses.
 *
 * Backend-authoritative lookup (SEC-001) + immediate bonus distribution.
 * Every failure is isolated: a referral problem must never block account
 * creation.
 */
export async function applyReferralSignup(
  user: User,
  username: string,
  referralCodeInput: string,
): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    const res = await safeFetch('/api/referrals/lookup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ referralCode: referralCodeInput }),
    });

    if (!res.success) return;

    const referredBy = res.referrerId;
    const referralDocRef = doc(collection(db, 'referrals'));
    const referralDocId = referralDocRef.id;

    await setDoc(referralDocRef, {
      referrerId: referredBy,
      refereeId: user.uid,
      refereeUsername: username,
      status: 'REGISTERED',
      product: PULSE_EARN_PRODUCT,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'users', user.uid), { referredBy, referralDocId });

    const bonusRes = await safeFetch('/api/referrals/apply-signup-bonus', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ referrerId: referredBy, referralDocId }),
    });

    if (bonusRes.success) {
      toast.success(`Referral Bonus: +${bonusRes.refereeBonusPoints} PTS`, {
        icon: '🎁',
        duration: 6000,
        position: 'top-center',
      });
      await NotificationEngine.send({
        userId: referredBy,
        title: 'Referral Bonus Earned',
        description: `${username} joined using your code. You earned ${bonusRes.referrerBonusPoints} PTS!`,
        type: 'referral_joined',
      });
    }
  } catch (err) {
    console.error('[PulseEarn] Referral linkage failure (isolated):', err);
  }
}

/** PulseEarn-scoped welcome notification. */
export async function sendPulseEarnWelcomeNotification(uid: string): Promise<void> {
  try {
    await NotificationEngine.send({
      userId: uid,
      title: 'Identity Synchronized',
      description: 'Your PulseEarn profile has been established. Welcome to the network.',
      type: 'system',
    });
  } catch (err) {
    console.error('[PulseEarn] Welcome notification failed:', err);
  }
}

/**
 * Full PulseEarn post-signup pipeline: referral attribution, welcome bonus,
 * welcome notification. Only ever called from a PulseEarn signup.
 */
export async function runPulseEarnOnboarding(
  user: User,
  username: string,
  referralCodeInput?: string,
): Promise<void> {
  if (referralCodeInput) {
    await applyReferralSignup(user, username, referralCodeInput);
  }
  await grantWelcomeBonus(user.uid);
  await sendPulseEarnWelcomeNotification(user.uid);
}
