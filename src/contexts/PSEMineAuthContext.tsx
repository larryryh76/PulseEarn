import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { PSEMineAuthContext } from './PSEMineAuthContextValue';
import { PSEMineEngine } from '../engines/psemine/PSEMineEngine';

export const PSEMineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser, userData, loading,
    login, signup: identitySignup, signInWithGoogle: identityGoogleSignIn,
    logout, sendVerification, resetPassword,
  } = useAuth();

  const isVerified = currentUser?.emailVerified ?? false;

  /**
   * PSEmine entitlement comes from the shared identity document. Signup writes
   * it explicitly for the chosen product (see AuthContext.initializeUserProfile)
   * and enrollment writes it server-side — it is never inferred from the fact
   * that a user is authenticated.
   */
  const hasPSEmineAccess = userData?.productAccess?.psemine === true;

  /**
   * PSEmine signup: reuses the shared Firebase identity, then attributes the
   * referral via the canonical backend endpoint (deterministic
   * psemine_referrals record). No duplicate account is created, and the
   * identity is created with `productAccess { pulseearn: false, psemine: true }`
   * — a PSEmine signup never grants, or triggers, the PulseEarn economy.
   */
  const signupWithReferral = useCallback(async (
    email: string,
    password: string,
    username: string,
    referralCode?: string
  ): Promise<void> => {
    const profile = await identitySignup(email, password, username, referralCode, 'psemine');
    // Entitlement is SERVER-GRANTED. The shared identity layer never claims
    // productAccess.psemine (the Firestore create rule forbids it), so a newly
    // created identity asks the backend for the grant + audit entry exactly
    // once, here. An existing identity is left untouched — it keeps whatever
    // access it already has and sees the explicit enable path instead.
    if (profile.created) {
      try {
        await PSEMineEngine.enroll();
      } catch (e) {
        // Enrollment failure must not block account creation: the signed-in
        // user lands on the entitlement gate, which offers the same enable
        // action explicitly and shows the backend's own message.
        console.warn('[PSEMineAuth] enrollment notice:', e);
      }
    }
    if (referralCode) {
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        if (auth.currentUser) {
          // Result is persisted by the engine: retryable failures are retained
          // for re-submission on the next session; permanent validation
          // failures (self-referral, unknown referrer) are not retried.
          await PSEMineEngine.registerReferral(auth.currentUser.uid, username, referralCode);
        }
      } catch (e) {
        // Attribution failure must not block signup; the code is retained for
        // the next-session retry and the backend can reconcile later.
        console.warn('[PSEMineAuth] referral attribution notice:', e);
      }
    }
  }, [identitySignup]);

  /**
   * PSEmine Google sign-in: delegates to the ONE shared Firebase Google
   * identity (AuthContext.signInWithGoogle). A brand-new Google account created
   * here is enrolled in PSEmine; an EXISTING account keeps whatever
   * entitlement it already has — Google sign-in never silently upgrades an
   * account (the console offers explicit enrollment instead).
   */
  const googleSignIn = useCallback(async (referralCode?: string): Promise<void> => {
    const profile = await identityGoogleSignIn(referralCode, 'psemine');
    // Same server-granted entitlement rule as the email path: only a BRAND-NEW
    // identity is enrolled. Signing in with Google on an existing account never
    // silently upgrades it to dual access.
    if (profile.created) {
      try {
        await PSEMineEngine.enroll();
      } catch (e) {
        console.warn('[PSEMineAuth] Google enrollment notice:', e);
      }
    }
    if (referralCode) {
      try {
        const { getAuth } = await import('firebase/auth');
        const fbAuth = getAuth();
        if (fbAuth.currentUser) {
          await PSEMineEngine.registerReferral(
            fbAuth.currentUser.uid,
            fbAuth.currentUser.displayName || 'Miner',
            referralCode
          );
        }
      } catch (e) {
        // Attribution failure must not block Google sign-in; retained for the
        // next-session retry (same policy as the email signup path).
        console.warn('[PSEMineAuth] Google referral attribution notice:', e);
      }
    }
  }, [identityGoogleSignIn]);

  /**
   * Explicit enrollment for an existing signed-in account. Backend-authoritative
   * and audited; the AuthContext users/{uid} listener propagates the new
   * entitlement live, so the console unlocks without a reload or a second
   * identity.
   */
  const [enrolling, setEnrolling] = useState(false);
  const enablePSEmine = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: 'NOT_AUTHENTICATED', message: 'Please sign in again.' };
    }
    setEnrolling(true);
    try {
      return await PSEMineEngine.enroll();
    } finally {
      setEnrolling(false);
    }
  }, [currentUser]);

  // Retry any referral code retained after a transient registration failure.
  // Runs once per signed-in ENROLLED session; idempotent server-side. The latch
  // resets on sign-out so a later sign-in (same mounted provider) retries again.
  // Gated on entitlement so a PulseEarn-only session never touches PSEmine.
  const retriedThisSession = useRef(false);
  useEffect(() => {
    if (!currentUser || !hasPSEmineAccess) return;
    if (retriedThisSession.current) return;
    retriedThisSession.current = true;
    PSEMineEngine.retryPendingReferral().catch(() => undefined);
  }, [currentUser, hasPSEmineAccess]);

  useEffect(() => {
    if (!currentUser) retriedThisSession.current = false;
  }, [currentUser]);

  const value = useMemo(() => ({
    currentUser,
    userData,
    loading,
    isVerified,
    hasPSEmineAccess,
    enablePSEmine,
    login,
    signup: signupWithReferral,
    signInWithGoogle: googleSignIn,
    logout,
    sendVerification,
    resetPassword,
  }), [
    currentUser, userData, loading, isVerified, hasPSEmineAccess, enablePSEmine,
    login, signupWithReferral, googleSignIn, logout, sendVerification, resetPassword,
  ]);

  // `enrolling` is intentionally not surfaced: enrollment state is local to the
  // component that triggers it, and the context value stays referentially stable.
  void enrolling;

  return (
    <PSEMineAuthContext.Provider value={value}>
      {children}
    </PSEMineAuthContext.Provider>
  );
};
