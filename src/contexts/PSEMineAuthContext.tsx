import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { User } from 'firebase/auth';

interface PSEMineAuthContextType {
  currentUser: User | null;
  userData: ReturnType<typeof useAuth>['userData'];
  loading: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  signup: (email: string, password: string, username: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const PSEMineAuthContext = createContext<PSEMineAuthContextType | undefined>(undefined);

export const usePSEMineAuth = () => {
  const context = useContext(PSEMineAuthContext);
  if (context === undefined) {
    throw new Error('usePSEMineAuth must be used within a PSEMineAuthProvider');
  }
  return context;
};

export const PSEMineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, login, signup, logout, sendVerification, resetPassword } = useAuth();

  const isVerified = currentUser?.emailVerified ?? false;

  return (
    <PSEMineAuthContext.Provider
      value={{
        currentUser,
        userData,
        loading,
        isVerified,
        login,
        signup,
        logout,
        sendVerification,
        resetPassword,
      }}
    >
      {children}
    </PSEMineAuthContext.Provider>
  );
};
