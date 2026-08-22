import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Layers } from 'lucide-react';
import { MarketplaceOpportunity, DIFFICULTY_CONFIG } from '../../types/marketplace';
import { getCanonicalStatus } from './MarketplaceOpportunityCard';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cn } from '../../utils';

interface CampaignDetailDrawerProps {
  campaignOpportunity: MarketplaceOpportunity;
  attachedTasks: MarketplaceOpportunity[];
  userTasks: Record<string, { status?: string }>;
  onClose: () => void;
  onSelectTask: (task: MarketplaceOpportunity) => void;
}

export const CampaignDetailDrawer: React.FC<CampaignDetailDrawerProps> = ({
  campaignOpportunity,
  attachedTasks,
  userTasks,
  onClose,
  onSelectTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useScrollLock(true);
  useFocusTrap(containerRef, true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex justify-end outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={campaignOpportunity.title}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block font-mono">
                Grouped Campaign
              </span>
              <h2 className="text-sm font-bold text-text-primary tracking-tight truncate">
                {campaignOpportunity.title}
              </h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close details" className="p-2 hover:bg-surface-bright rounded-xl text-text-tertiary transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Campaign Overview */}
          <div className="p-4 rounded-2xl bg-surface-bright/50 border border-border space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              {campaignOpportunity.description || 'Complete the attached tasks in this campaign to earn rewards.'}
            </p>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60 font-mono">
              <span className="text-text-tertiary">Total Pool / Reward</span>
              <span className="font-bold text-success">+{campaignOpportunity.reward.points} PTS</span>
            </div>
          </div>

          {/* Attached Tasks List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center justify-between">
              <span>Campaign Tasks ({attachedTasks.length})</span>
            </h3>

            {attachedTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface border border-border text-center text-xs text-text-tertiary">
                No sub-tasks attached to this campaign.
              </div>
            ) : (
              <div className="space-y-2">
                {attachedTasks.map((task) => {
                  const status = getCanonicalStatus(userTasks[task.id]?.status);
                  const diffConfig = DIFFICULTY_CONFIG[task.metadata.difficulty] || DIFFICULTY_CONFIG.medium;

                  return (
                    <div
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onClose();
                        onSelectTask(task);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onClose();
                          onSelectTask(task);
                        }
                      }}
                      className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/40 cursor-pointer flex items-center justify-between gap-3 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <div className="min-w-0 space-y-1">
                        <h4 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={cn('font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono', status.badgeClass)}>
                            {status.label}
                          </span>
                          <span style={{ color: diffConfig.color }}>
                            {diffConfig.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-success block">+{task.reward.points} PTS</span>
                        <span className="text-[10px] text-text-tertiary font-mono">{task.metadata.estimatedTime}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
