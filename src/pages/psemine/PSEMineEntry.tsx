import { Navigate } from 'react-router-dom';
import { PSEmineProtectedRoute } from './PSEmineAuth';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMineLanding } from './PSEMineLanding';

function EntryLoadingStatus() {
  return (
    <main aria-busy="true">
      <p role="status" aria-live="polite">Restoring PSEmine session…</p>
    </main>
  );
}

export const PSEMineEntry: React.FC = () => {
  const { currentUser, loading } = usePSEMineAuth();

  if (loading) return <EntryLoadingStatus />;
  if (!currentUser) return <PSEMineLanding />;

  return (
    <PSEmineProtectedRoute>
      <Navigate to="/mine/dashboard" replace />
    </PSEmineProtectedRoute>
  );
};
