import React, { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { claimDailyReward, runPulseEarnOnboarding } from '../engines/product/pulseEarnProduct';
import { UserEngine } from '../engines/system/UserEngine';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PulseEarnProductProvider — the PulseEarn product boundary.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Mounted ONLY inside the PulseEarn route tree (src/App.tsx). Everything
 * product-specific that used to live in the global AuthProvider's snapshot
 * listener runs here instead, so it is structurally impossible for a PSEmine
 * route to trigger PulseEarn economy:
 *
 *   • daily login reward claim (PointTransactionEngine → /api/execute-transaction)
 *   • the PulseEarn reward toast that came with it
 *   • device fingerprint recording
 *   • (TaskProvider is composed alongside this provider for the same reason)
 *
 * Nothing here is duplicated per component: one claim per signed-in user per
 * mounted session, guarded by a ref so React 18 StrictMode double-effects and
 * snapshot re-fires cannot double-claim. The backend claim id remains the real
 * idempotency boundary (daily_<localDay>_<uid>).
 */
export const PulseEarnProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const handledUidRef = useRef<string | null>(null);
  const onboardingHandledUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      handledUidRef.current = null;
      return;
    }
    if (!userData) return;

    const role = userData.role;
    const isOpsUser = role === 'admin' || role === 'moderator';
    if (isOpsUser) return;

    // This provider is mounted around public auth routes too. A shared Firebase
    // session is not proof of PulseEarn access: PSEmine-only identities must
    // never trigger PulseEarn rewards merely by visiting /login or /signup.
    const access = userData.productAccess;
    if (access != null && access.pulseearn !== true) return;

    // Fingerprinting is a security signal, not economy — but it belongs to the
    // same "PulseEarn session started" moment, so it stays scoped here.
    UserEngine.recordFingerprint(currentUser.uid);

    if (!currentUser.emailVerified) return;
    if (handledUidRef.current === currentUser.uid) return;
    handledUidRef.current = currentUser.uid;

    void claimDailyReward(currentUser.uid);
  }, [currentUser, currentUser?.emailVerified, userData]);

  // Signup rewards and referral attribution are financial mutations. They are
  // deliberately deferred until Firebase confirms the email identity is verified.
  // The deterministic claim IDs in the economy engine make the bonus idempotent;
  // this session latch prevents concurrent snapshot/effect calls.
  useEffect(() => {
    if (!currentUser || !userData || !currentUser.emailVerified) return;

    const role = userData.role;
    if (role === 'admin' || role === 'moderator') return;
    const access = userData.productAccess;
    const hasPulseEarnAccess = access == null || access.pulseearn === true;
    const pending = (userData as typeof userData & { signupOnboardingPending?: boolean }).signupOnboardingPending === true;
    if (!hasPulseEarnAccess || !pending || onboardingHandledUidRef.current === currentUser.uid) return;

    onboardingHandledUidRef.current = currentUser.uid;
    void (async () => {
      // The deterministic welcome claim is the persisted idempotency boundary.
      // It avoids needing a client-writable "rewards complete" flag on the user
      // profile, which is deliberately field-restricted by Firestore rules.
      const claim = await getDoc(doc(db, 'system_claims', `welcome_${currentUser.uid}`));
      if (claim.exists()) return;

      const extendedData = userData as typeof userData & { pendingReferralCode?: string | null };
      await runPulseEarnOnboarding(
        currentUser,
        userData.username || `User_${currentUser.uid.slice(0, 5)}`,
        extendedData.pendingReferralCode || undefined
      );
    })().catch(error => {
      onboardingHandledUidRef.current = null;
      console.error('[PulseEarn] Verified signup onboarding failed; it will retry on the next session:', error);
    });
  }, [currentUser, currentUser?.emailVerified, userData]);

  return <>{children}</>;
};

export default PulseEarnProductProvider;
