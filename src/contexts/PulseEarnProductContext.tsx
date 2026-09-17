import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { claimDailyReward } from '../engines/product/pulseEarnProduct';
import { UserEngine } from '../engines/system/UserEngine';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PulseEarnProductProvider — the PulseEarn product boundary.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Mounted ONLY inside the PulseEarn route tree (src/App.tsx). Everything
 * product-specific that used to live in the global AuthProvider's snapshot
 * listener runs here instead, so it is structurally impossible for a PSEmine
 * route to trigger PulseEarn economy:
 *
 *   • daily login reward claim (PointTransactionEngine → /api/execute-transaction)
 *   • the PulseEarn reward toast that came with it
 *   • device fingerprint recording
 *   • (TaskProvider is composed alongside this provider for the same reason)
 *
 * Nothing here is duplicated per component: one claim per signed-in user per
 * mounted session, guarded by a ref so React 18 StrictMode double-effects and
 * snapshot re-fires cannot double-claim. The backend claim id remains the real
 * idempotency boundary (daily_<localDay>_<uid>).
 */
export const PulseEarnProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const handledUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      handledUidRef.current = null;
      return;
    }

    const role = userData?.role;
    const isOpsUser = role === 'admin' || role === 'moderator';
    if (isOpsUser) return;

    // Fingerprinting is a security signal, not economy — but it belongs to the
    // same "PulseEarn session started" moment, so it stays scoped here.
    UserEngine.recordFingerprint(currentUser.uid);

    if (!currentUser.emailVerified) return;
    if (handledUidRef.current === currentUser.uid) return;
    handledUidRef.current = currentUser.uid;

    void claimDailyReward(currentUser.uid);
  }, [currentUser, userData?.role]);

  return <>{children}</>;
};

export default PulseEarnProductProvider;
