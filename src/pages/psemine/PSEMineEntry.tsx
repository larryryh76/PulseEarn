import { Navigate } from 'react-router-dom';
import { PSEmineProtectedRoute } from './PSEmineAuth';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMineLanding } from './PSEMineLanding';
import { PseLoading } from '../../components/psemine/PseBasics';

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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Restoring PSEmine session" />
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
