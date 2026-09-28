import { Navigate } from 'react-router-dom';
import { PSEmineProtectedRoute } from './PSEmineAuth';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMineLanding } from './PSEMineLanding';
import { PseLoader } from '../../components/psemine/PseLoader';

/**
 * /mine entry gate.
 *
 * Resolves the destination before rendering either the public page or the
 * console: while the session is restoring it shows the product loader (the real
 * `session` state), a signed-out visitor gets the public page, and a signed-in
 * account is pushed through the protected route into the console.
 *
 * Routing logic only — no presentation. Note the consequence for the landing: it
 * is mounted ONLY for a signed-out visitor, which is why the public page holds no
 * session state and can read no account at all.
 */
export const PSEMineEntry: React.FC = () => {
  const { currentUser, loading } = usePSEMineAuth();

  if (loading) {
    return (
      <div className="pse pse-surface pse-plane pse-center-screen">
        <PseLoader variant="page" stage="session" />
      </div>
    );
  }
  if (!currentUser) return <PSEMineLanding />;

  return (
    <PSEmineProtectedRoute>
      <Navigate to="/mine/dashboard" replace />
    </PSEmineProtectedRoute>
  );
};
