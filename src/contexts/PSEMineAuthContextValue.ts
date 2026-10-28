import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { useAuth } from './AuthContext';

export type PSEMineAuthContextType = {
  currentUser: User | null;
  userData: ReturnType<typeof useAuth>['userData'];
  loading: boolean;
  isVerified: boolean;
  /**
   * Backend-authoritative product entitlement — `users/{uid}.productAccess.psemine`.
   * Read by the backend gate (require_psemine_access) and mirrored here so the
   * console can distinguish "not enrolled" from "backend broken".
   */
  hasPSEmineAccess: boolean;
  /** Explicit, user-initiated enrollment (POST /api/mine/enroll, audited). */
  enablePSEmine: () => Promise<{ success: boolean; error?: string; message?: string }>;
  login: (email: string, password: string) => Promise<unknown>;
  /** Creates the shared identity and queues PSEmine enrollment until email verification. */
  signup: (email: string, password: string, username: string, referralCode?: string) => Promise<void>;
  /** Shared Google OAuth flow: existing identities sign in or new profiles are created after consent. */
  signInWithGoogle: (referralCode?: string, termsAccepted?: boolean) => Promise<void>;
  /** Backwards-compatible alias to the same shared Google OAuth flow. */
  signUpWithGoogle: (referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

export const PSEMineAuthContext = createContext<PSEMineAuthContextType | undefined>(undefined);
