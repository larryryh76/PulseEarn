import React, { useCallback } from 'react';
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
          await PSEMineEngine.registerReferral(auth.currentUser.uid, username, referralCode);
        }
      } catch (e) {
        // Attribution failure must not block signup; backend can reconcile later.
        console.warn('[PSEMineAuth] referral attribution notice:', e);
      }
    }
  }, [signup]);

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
