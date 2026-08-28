import React from 'react';
import { Outlet } from 'react-router-dom';
import { PSEMineProvider, usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineNavbar } from './PSEMineNavbar';
import { PSEMineFooter } from './PSEMineFooter';
import { Archive } from 'lucide-react';

const PSEMineLayoutContent: React.FC = () => {
  const { isCampaignArchived, campaign } = usePSEMine();

  if (isCampaignArchived) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        <PSEMineNavbar />
        
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#0d1424] border border-amber-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-amber-950/20">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Archive className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                PSEmine Campaign Closed
              </h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                The 90-day PSEmine campaign has concluded and reached official settlement. All active mining operations and capacity accruals are sealed.
              </p>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-left text-xs text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Closure Reason:</span>
                <span className="font-semibold text-white">{campaign?.shutdownState?.reason || 'Campaign Duration Expired'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Archived At:</span>
                <span className="font-mono text-cyan-300">{campaign?.shutdownState?.archivedAt ? new Date(campaign.shutdownState.archivedAt).toLocaleDateString() : 'Settled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Historical Records:</span>
                <span className="text-emerald-400 font-semibold">Preserved for Auditing & Reconciliation</span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Approved crypto payouts for eligible accrued balances are processed to miners' configured BNB Smart Chain wallets.
            </p>
          </div>
        </main>

        <PSEMineFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <PSEMineNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
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
