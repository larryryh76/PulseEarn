import React from 'react';
import { Outlet } from 'react-router-dom';
import { PSEMineProvider, usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineNavbar } from './PSEMineNavbar';
import { PSEMineFooter } from './PSEMineFooter';
import { PSEMineBottomNav } from './PSEMineBottomNav';
import { Archive } from 'lucide-react';

const PSEMineLayoutContent: React.FC = () => {
  const { isCampaignArchived, campaign } = usePSEMine();

  if (isCampaignArchived) {
    return (
      <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <PSEMineNavbar />
        
        <main className="flex-1 flex items-center justify-center p-6 pb-24 md:pb-12">
          <div className="max-w-xl w-full bg-[#0D131F] border border-amber-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-black/60">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
              <Archive className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                PSEmine Campaign Concluded
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                The 90-day PSEmine campaign has reached its official settlement period. All active capacity nodes and hourly accruals are sealed for final distribution.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-left text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-white">{campaign?.shutdownState?.reason || 'Campaign Duration Expired'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement Date:</span>
                <span className="font-mono text-blue-400">{campaign?.shutdownState?.archivedAt ? new Date(campaign.shutdownState.archivedAt).toLocaleDateString() : 'Settled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audit Status:</span>
                <span className="text-emerald-400 font-semibold">Ledger Preserved for Disbursement</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
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
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
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
