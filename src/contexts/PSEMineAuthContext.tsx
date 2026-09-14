import React, { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { PSEMineAuthContext } from './PSEMineAuthContextValue';
import { PSEMineEngine } from '../engines/psemine/PSEMineEngine';

export const PSEMineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, login, signup, logout, sendVerification, resetPassword } = useAuth();

  const isVerified = currentUser?.emailVerified ?? false;

  /**
   * PSEmine signup: reuses the PulseEarn Firebase identity, then attributes the
   * referral via the canonical backend endpoint (deterministic psemine_referrals
   * record). No duplicate account is created; PSEmine economics stay separate.
   */
  const signupWithReferral = useCallback(async (
    email: string,
    password: string,
    username: string,
    referralCode?: string
  ): Promise<void> => {
    await signup(email, password, username, referralCode);
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
  }, [signup]);

  // Retry any referral code retained after a transient registration failure.
  // Runs once per signed-in session; idempotent server-side. The latch resets
  // on sign-out so a later sign-in (same mounted provider) retries again.
  const retriedThisSession = useRef(false);
  useEffect(() => {
    if (!currentUser) return;
    if (retriedThisSession.current) return;
    retriedThisSession.current = true;
    PSEMineEngine.retryPendingReferral().catch(() => undefined);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) retriedThisSession.current = false;
  }, [currentUser]);

  return (
    <PSEMineAuthContext.Provider
      value={{
        currentUser,
        userData,
        loading,
        isVerified,
        login,
        signup: signupWithReferral,
        logout,
        sendVerification,
        resetPassword,
      }}
    >
      {children}
    </PSEMineAuthContext.Provider>
  );
};
