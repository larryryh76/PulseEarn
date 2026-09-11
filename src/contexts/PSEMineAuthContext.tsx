import React from 'react';
import { useAuth } from './AuthContext';
import { PSEMineAuthContext } from './PSEMineAuthContextValue';

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
