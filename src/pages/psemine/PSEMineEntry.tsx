import { Navigate } from 'react-router-dom';
import { PSELogo } from '../../components/psemine/PSEBrand';
import { PSEmineProtectedRoute } from './PSEmineAuth';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMineLanding } from './PSEMineLanding';

function EntrySkeleton() {
  return (
    <main className="pse-scope pse-entry-skeleton" aria-busy="true" aria-label="Restoring PSEmine session">
      <header className="pse-entry-skeleton-bar">
        <PSELogo size={28} withWordmark />
        <span className="pse-skeleton pse-entry-skeleton-action" />
      </header>
      <div className="pse-entry-skeleton-wrap">
        <div className="pse-skeleton pse-entry-skeleton-kicker" />
        <div className="pse-skeleton pse-entry-skeleton-title" />
        <div className="pse-skeleton pse-entry-skeleton-title pse-entry-skeleton-title-short" />
        <div className="pse-skeleton pse-entry-skeleton-copy" />
        <div className="pse-skeleton pse-entry-skeleton-copy pse-entry-skeleton-copy-short" />
        <div className="pse-entry-skeleton-actions">
          <span className="pse-skeleton pse-entry-skeleton-button" />
          <span className="pse-skeleton pse-entry-skeleton-button pse-entry-skeleton-button-muted" />
        </div>
        <div className="pse-entry-skeleton-ledger">
          <span className="pse-skeleton" />
          <span className="pse-skeleton" />
          <span className="pse-skeleton" />
        </div>
      </div>
    </main>
  );
}

export const PSEMineEntry: React.FC = () => {
  const { currentUser, loading } = usePSEMineAuth();

  if (loading) return <EntrySkeleton />;
  if (!currentUser) return <PSEMineLanding />;

  return (
    <PSEmineProtectedRoute>
      <Navigate to="/mine/dashboard" replace />
    </PSEmineProtectedRoute>
  );
};
