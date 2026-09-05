import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLoader from './PsemineLoader';

export const PsemineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, psemineProfile, loading } = usePsemineAuth();
  const location = useLocation();

  if (loading) {
    return <PsemineLoader message="Checking your account..." />;
  }

  if (!currentUser) {
    return <Navigate to="/mine/login" state={{ from: location }} replace />;
  }

  if (!currentUser.emailVerified && location.pathname !== '/mine/verify-email') {
    return <Navigate to="/mine/verify-email" replace />;
  }

  // If email is verified and trying to access dashboard before completing guide:
  if (
    currentUser.emailVerified &&
    location.pathname === '/mine/dashboard' &&
    psemineProfile &&
    !psemineProfile.hasCompletedGuide
  ) {
    return <Navigate to="/mine/guide" replace />;
  }

  return <>{children}</>;
};

export const PseminePublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, psemineProfile, loading } = usePsemineAuth();

  if (loading) {
    return <PsemineLoader message="Preparing PSEmine..." />;
  }

  if (currentUser) {
    if (!currentUser.emailVerified) {
      return <Navigate to="/mine/verify-email" replace />;
    }
    if (psemineProfile?.hasCompletedGuide) {
      return <Navigate to="/mine/dashboard" replace />;
    }
    return <Navigate to="/mine/guide" replace />;
  }

  return <>{children}</>;
};
