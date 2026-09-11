import React, { useState } from 'react';
import { 
  Layers, 
  Users, 
  Wallet, 
  ExternalLink,
  History
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { cn } from '../../utils';

export const PSEMineActivity: React.FC = () => {
  const { activities } = usePSEMine();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredActivities = activities.filter((act) => {
    if (filterType === 'all') return true;
    return act.type === filterType;
  });

  return (
    <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 md:space-y-8 transition-colors">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
              PSEmine Records
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Activity Ledger
          </h1>
          <p className="text-xs md:text-sm text-text-secondary">
            View transaction history for tool purchases, referral activations, and wallet updates.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'TOOL_PURCHASE', label: 'Tools' },
            { id: 'REFERRAL_QUALIFIED', label: 'Referrals' },
            { id: 'WALLET_UPDATE', label: 'Wallet' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                filterType === tab.id
                  ? "bg-[#2bb39a] text-[#070A0F] shadow-sm font-extrabold"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── LEDGER LIST ─────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-3 shadow-subtle">
        {filteredActivities.length > 0 ? (
          <div className="space-y-2.5">
            {filteredActivities.map((act) => {
              const isPurchase = act.type === 'TOOL_PURCHASE' || act.type === 'tool_purchased';
              const isReferral = act.type === 'REFERRAL_QUALIFIED' || act.type === 'referral_qualified';

              return (
                <div
                  key={act.id}
                  className="p-4 bg-surface-bright/40 border border-border rounded-xl md:rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-surface-bright/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border",
                      isPurchase 
                        ? "bg-[#2bb39a]/10 text-[#2bb39a] border-[#2bb39a]/20"
                        : isReferral
                          ? "bg-[#2bb39a]/10 text-[#2bb39a] border-[#2bb39a]/20"
                          : "bg-surface-bright text-text-secondary border-border"
                    )}>
                      {isPurchase ? <Layers size={16} /> : isReferral ? <Users size={16} /> : <Wallet size={16} />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-xs sm:text-sm">{act.title}</span>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-surface-bright text-text-tertiary border border-border font-bold">
                          {act.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-text-secondary text-xs">{act.description}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between sm:justify-center font-mono text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <span className="text-text-tertiary tabular-nums">
                      {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {typeof act.metadata?.txHash === 'string' && (
                      <a
                        href={`https://bscscan.com/tx/${act.metadata.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2bb39a] hover:underline flex items-center gap-1 mt-0.5 text-[11px] font-bold"
                      >
                        <span>View on BSCScan</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-text-tertiary space-y-2">
            <History size={24} className="mx-auto text-text-tertiary" />
            <p>No activity records found.</p>
          </div>
        )}
      </div>

    </div>
  );
};
