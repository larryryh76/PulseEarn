import { useContext } from 'react';
import { PSEMineAuthContext } from './PSEMineAuthContextValue';

export const usePSEMineAuth = () => {
  const context = useContext(PSEMineAuthContext);
  if (context === undefined) {
    throw new Error('usePSEMineAuth must be used within a PSEMineAuthProvider');
  }
  return context;
};
