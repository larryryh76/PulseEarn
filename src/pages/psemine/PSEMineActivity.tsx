import React, { useState } from 'react';
import { 
  Cpu, 
  Users, 
  Wallet, 
  ExternalLink
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Immutable Activity & Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Authoritative audit trail of all mining hardware deployments, capacity transitions, and referral events.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'TOOL_PURCHASE', label: 'Tools' },
            { id: 'REFERRAL_QUALIFIED', label: 'Referrals' },
            { id: 'WALLET_UPDATE', label: 'Wallet' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === tab.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-4">
        {filteredActivities.length > 0 ? (
          <div className="space-y-3">
            {filteredActivities.map((act) => {
              const isPurchase = act.type === 'TOOL_PURCHASE' || act.type === 'tool_purchased';
              const isReferral = act.type === 'REFERRAL_QUALIFIED' || act.type === 'referral_qualified';

              return (
                <div
                  key={act.id}
                  className="p-4 bg-[#080d19] border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isPurchase 
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-700/40'
                        : isReferral
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/40'
                          : 'bg-slate-800 text-gray-300 border border-slate-700'
                    }`}>
                      {isPurchase ? <Cpu className="w-4 h-4" /> : isReferral ? <Users className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{act.title}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-gray-400">
                          {act.type}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">{act.description}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between sm:justify-center font-mono text-xs shrink-0">
                    <span className="text-gray-400">
                      {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {typeof act.metadata?.txHash === 'string' && (
                      <a
                        href={`https://bscscan.com/tx/${act.metadata.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 mt-1"
                      >
                        <span>BSCScan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-gray-500">
            No activities found for the selected filter.
          </div>
        )}
      </div>

    </div>
  );
};
