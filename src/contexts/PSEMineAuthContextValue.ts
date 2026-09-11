import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { useAuth } from './AuthContext';

export type PSEMineAuthContextType = {
  currentUser: User | null;
  userData: ReturnType<typeof useAuth>['userData'];
  loading: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  signup: (email: string, password: string, username: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

export const PSEMineAuthContext = createContext<PSEMineAuthContextType | undefined>(undefined);
