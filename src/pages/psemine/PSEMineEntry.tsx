import { Navigate } from 'react-router-dom';
import { PSEmineProtectedRoute } from './PSEmineAuth';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMineLanding } from './PSEMineLanding';
import { PseLoader } from '../../components/psemine/PseLoader';

/**
 * /mine entry gate.
 *
 * Resolves the destination before rendering either the public brief or the
 * console: while the session is restoring it shows a loading line, a signed-out
 * visitor gets the public page, and a signed-in account is pushed through the
 * protected route into the console. Routing logic only — no presentation.
 */
export const PSEMineEntry: React.FC = () => {
  const { currentUser, loading } = usePSEMineAuth();

  // The real stage: the session Firebase already holds is being restored. The
  // loader states that, and escalates if it takes too long, rather than showing a
  // spinner that could hang forever.
  if (loading) {
    return (
      <div className="pse pse-surface min-h-screen">
        <div className="pse-wrap">
          <PseLoader variant="page" stage="session" />
        </div>
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
