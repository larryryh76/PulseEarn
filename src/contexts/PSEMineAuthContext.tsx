import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { PSEMineAuthContext } from './PSEMineAuthContextValue';
import { PSEMineEngine } from '../engines/psemine/PSEMineEngine';

export const PSEMineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser, userData, loading,
    login, signup: identitySignup,
    signInWithGoogle: identityGoogleSignIn,
    signUpWithGoogle: identityGoogleSignUp,
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
   * PSEmine signup reuses the shared Firebase identity. The profile records
   * a pending enrollment and the backend grants access only after the email
   * verification claim is present. Referral attribution is queued until that
   * verified, enrolled session can submit it; PulseEarn rewards stay isolated.
   */
  const signupWithReferral = useCallback(async (
    email: string,
    password: string,
    username: string,
    referralCode?: string
  ): Promise<void> => {
    // Profile creation records pending PSEmine enrollment. The backend will
    // grant the entitlement only after the verified-email token is presented.
    const profile = await identitySignup(email, password, username, referralCode, 'psemine', true);
    // Do not call referral APIs with an unverified token: queue the code and let
    // the enrolled, verified session submit it once the backend gate permits it.
    if (profile.created && referralCode) PSEMineEngine.queuePendingReferral(referralCode);
  }, [identitySignup]);

  /**
   * PSEmine Google sign-in: delegates to the ONE shared Firebase Google
   * identity (AuthContext.signInWithGoogle). A brand-new Google account created
   * here is enrolled in PSEmine; an EXISTING account keeps whatever
   * entitlement it already has — Google sign-in never silently upgrades an
   * account (the console offers explicit enrollment instead).
   */
  const googleSignIn = useCallback(async (): Promise<void> => {
    // Login is identity-only. It must not create a profile, enroll the product,
    // or attribute a referral for a first-time Google identity.
    await identityGoogleSignIn();
  }, [identityGoogleSignIn]);

  const googleSignUp = useCallback(async (referralCode?: string): Promise<void> => {
    // Google identity is verified by the provider. The shared provider sees
    // the new profile's pending enrollment marker and grants access through the
    // same verified-token backend path. Existing identities are not upgraded.
    const profile = await identityGoogleSignUp(referralCode, 'psemine', true);
    if (profile.created && referralCode) PSEMineEngine.queuePendingReferral(referralCode);
  }, [identityGoogleSignUp]);

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

  // Auto-complete an explicit PSEmine signup only after Firebase supplies a
  // verified-email token. The backend clears this pending marker on successful
  // enrollment, so a later admin revocation cannot be undone by this effect.
  const pendingEnrollmentHandledUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser) {
      pendingEnrollmentHandledUidRef.current = null;
      return;
    }
    const pendingEnrollment = (userData as (typeof userData & { pendingPsemineEnrollment?: boolean }))?.pendingPsemineEnrollment === true;
    if (!isVerified || !pendingEnrollment || hasPSEmineAccess
      || pendingEnrollmentHandledUidRef.current === currentUser.uid) return;

    pendingEnrollmentHandledUidRef.current = currentUser.uid;
    void enablePSEmine().then((result: any) => {
      if (!result?.success) {
        pendingEnrollmentHandledUidRef.current = null;
        console.warn('[PSEmineAuth] verified signup enrollment did not complete:', result?.error || result?.message || 'unknown error');
      }
    }).catch(error => {
      pendingEnrollmentHandledUidRef.current = null;
      console.error('[PSEmineAuth] verified signup enrollment failed:', error);
    });
  }, [currentUser?.uid, isVerified, (userData as any)?.pendingPsemineEnrollment, hasPSEmineAccess, enablePSEmine]);

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
    signUpWithGoogle: googleSignUp,
    logout,
    sendVerification,
    resetPassword,
  }), [
    currentUser, userData, loading, isVerified, hasPSEmineAccess, enablePSEmine,
    login, signupWithReferral, googleSignIn, googleSignUp, logout, sendVerification, resetPassword,
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
