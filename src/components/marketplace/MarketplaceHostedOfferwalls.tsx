import React from 'react';
import { Layers, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils';

export interface HostedProvider {
  id: string;
  name: string;
  logo?: string;
  status?: 'active' | 'degraded' | 'maintenance' | 'offline' | string;
  description?: string;
}

interface MarketplaceHostedOfferwallsProps {
  providers: HostedProvider[];
  onLaunch: (provider: HostedProvider) => void;
}

export const MarketplaceHostedOfferwalls: React.FC<MarketplaceHostedOfferwallsProps> = ({
  providers,
  onLaunch,
}) => {
  if (!providers || providers.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Layers size={15} className="text-primary" />
            <span>Offerwall Partners</span>
          </h2>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            Destinations with multiple earning opportunities
          </p>
        </div>
        <span className="text-[10px] font-mono text-text-tertiary uppercase">
          {providers.length} Partner Wall{providers.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map((provider) => {
          const isMaintenance = provider.status === 'maintenance';
          const isOffline = provider.status === 'offline';
          const isDegraded = provider.status === 'degraded';
          const isDisabled = isMaintenance || isOffline;

          const statusLabel = isMaintenance
            ? 'Maintenance'
            : isOffline
            ? 'Offline'
            : isDegraded
            ? 'Degraded'
            : 'Available';

          return (
            <div
              key={provider.id}
              className="p-4 rounded-2xl border border-border bg-surface hover:border-border-bright transition-all shadow-xs flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                    Offerwall
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-text-tertiary">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isDisabled ? 'bg-danger' : isDegraded ? 'bg-warning' : 'bg-success'
                      )}
                    />
                    {statusLabel}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {provider.name}
                  </h3>
                  <p className="text-[11px] text-text-tertiary mt-1 line-clamp-2 leading-relaxed">
                    {provider.description || 'Access surveys, app installs, and task feeds on this offerwall.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-[10px] text-text-tertiary font-medium">
                  Multiple earning opportunities
                </span>
                <button
                  onClick={() => onLaunch(provider)}
                  disabled={isDisabled}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-bright hover:bg-primary hover:text-white border border-border text-xs font-bold text-text-secondary transition-all flex items-center gap-1.5 disabled:opacity-50 min-h-[36px]"
                >
                  <span>Open Offers</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
