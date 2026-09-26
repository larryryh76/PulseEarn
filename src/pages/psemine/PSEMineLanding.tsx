import React from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { campaignStatusView, usePseDocumentTitle } from '../../components/psemine/pse';

export const PSEMineLanding: React.FC = () => {
  const { campaign, loading: campaignLoading } = usePSEMine();
  const { currentUser, loading: authLoading } = usePSEMineAuth();

  usePseDocumentTitle('PSEmine');

  const campaignStatus = campaign
    ? campaignStatusView(campaign.status).label
    : campaignLoading
      ? 'Loading'
      : 'Unavailable';
  const primaryHref = currentUser ? '/mine/dashboard' : '/mine/signup';
  const primaryLabel = currentUser ? 'Open dashboard' : 'Create an account';

  return (
    <>
      <header>
        <h1>PSEmine</h1>
      </header>
      <main>
        <p>Campaign: {campaign?.name ?? 'PSEmine'}</p>
        <p>Campaign status: {campaignStatus}</p>
        <nav aria-label="PSEmine account">
          <ul>
            {!authLoading && <li><Link to={primaryHref}>{primaryLabel}</Link></li>}
            <li><Link to="/mine/login">Sign in</Link></li>
          </ul>
          {authLoading && <p role="status">Checking sign-in status…</p>}
        </nav>
      </main>
    </>
  );
};

export default PSEMineLanding;
