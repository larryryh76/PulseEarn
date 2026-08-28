import React, { useState } from 'react';
import { 
  Cpu, 
  Users, 
  Wallet, 
  ExternalLink,
  History
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';

export const PSEMineActivity: React.FC = () => {
  const { activities } = usePSEMine();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredActivities = activities.filter((act) => {
    if (filterType === 'all') return true;
    return act.type === filterType;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Activity & Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Cryptographic ledger of all hardware node deployments, capacity upgrades, and referral events.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 p-1 bg-[#0D131F] border border-slate-800 rounded-xl">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'TOOL_PURCHASE', label: 'Hardware' },
            { id: 'REFERRAL_QUALIFIED', label: 'Referrals' },
            { id: 'WALLET_UPDATE', label: 'Wallet' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="p-5 sm:p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3">
        {filteredActivities.length > 0 ? (
          <div className="space-y-2.5">
            {filteredActivities.map((act) => {
              const isPurchase = act.type === 'TOOL_PURCHASE' || act.type === 'tool_purchased';
              const isReferral = act.type === 'REFERRAL_QUALIFIED' || act.type === 'referral_qualified';

              return (
                <div
                  key={act.id}
                  className="p-4 bg-[#080C14] border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isPurchase 
                        ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
                        : isReferral
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {isPurchase ? <Cpu className="w-4 h-4" /> : isReferral ? <Users className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{act.title}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {act.type}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{act.description}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between sm:justify-center font-mono text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <span className="text-slate-400">
                      {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {typeof act.metadata?.txHash === 'string' && (
                      <a
                        href={`https://bscscan.com/tx/${act.metadata.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 mt-0.5 text-[11px]"
                      >
                        <span>View BSCScan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <History className="w-6 h-6 mx-auto text-slate-600" />
            <p>No activity events recorded under this filter.</p>
          </div>
        )}
      </div>

    </div>
  );
};
