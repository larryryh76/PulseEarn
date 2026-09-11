import React from 'react';
import { Outlet } from 'react-router-dom';
import { PSEMineProvider, usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineNavbar } from './PSEMineNavbar';
import { PSEMineFooter } from './PSEMineFooter';
import { PSEMineBottomNav } from './PSEMineBottomNav';
import { PSEMineLoader } from './PSEMineLoader';
import { Archive } from 'lucide-react';

const PSEMineLayoutContent: React.FC = () => {
  const { isCampaignArchived, campaign, loading } = usePSEMine();

  if (loading) {
    return <PSEMineLoader label="Loading Campaign..." fullScreen={true} />;
  }

  if (isCampaignArchived) {
    return (
      <div className="psemine-shell min-h-screen bg-background text-text-primary flex flex-col font-sans transition-colors duration-300">
        <PSEMineNavbar />
        
        <main className="flex-1 flex items-center justify-center p-6 pb-24 md:pb-12">
          <div className="max-w-xl w-full bg-surface border border-warning/30 rounded-3xl p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto text-warning shadow-lg">
              <Archive className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                PSEmine Campaign Concluded
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                The 90-day PSEmine campaign has reached its official settlement period. All active capacity nodes and hourly accruals are sealed for final distribution.
              </p>
            </div>

            <div className="p-4 bg-surface-bright/50 border border-border rounded-2xl text-left text-xs text-text-secondary space-y-2">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Status:</span>
                <span className="font-semibold text-text-primary">{campaign?.shutdownState?.reason || 'Campaign Duration Expired'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Settlement Date:</span>
                <span className="font-mono text-primary font-bold">{campaign?.shutdownState?.archivedAt ? new Date(campaign.shutdownState.archivedAt).toLocaleDateString() : 'Settled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Audit Status:</span>
                <span className="text-success font-semibold">Ledger Preserved for Disbursement</span>
              </div>
            </div>

            <p className="text-xs text-text-tertiary">
              Verified accrued balances are disbursed in crypto to miners' configured BNB Smart Chain settlement wallets.
            </p>
          </div>
        </main>

        <PSEMineBottomNav />
        <PSEMineFooter />
      </div>
    );
  }

  return (
    <div className="psemine-shell min-h-screen bg-background text-text-primary flex flex-col font-sans transition-colors duration-300">
      <PSEMineNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PSEMineBottomNav />
      <PSEMineFooter />
    </div>
  );
};

export const PSEMineLayout: React.FC = () => {
  return (
    <PSEMineProvider>
      <PSEMineLayoutContent />
    </PSEMineProvider>
  );
};

