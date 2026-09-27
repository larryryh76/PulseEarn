import { Navigate } from 'react-router-dom';
import { PSEmineProtectedRoute } from './PSEmineAuth';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMineLanding } from './PSEMineLanding';
import { PSELogo } from '../../components/psemine/PSEBrand';

/** Announces that the PSEmine session is being restored while authentication loads. */
function EntryLoadingStatus() {
  return (
    <main className="pm-product pm-auth-loading" aria-busy="true">
      <PSELogo size={36} withWordmark />
      <p role="status" aria-live="polite">Restoring your PSEmine session…</p>
    </main>
  );
}

/** Shows the public landing page to visitors and routes signed-in users through the protected dashboard gate. */
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
