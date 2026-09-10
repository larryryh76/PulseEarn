import React, { useState } from 'react';
import { 
  Plus, 
  Calculator, 
  Check, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineToolDefinition } from '../../types/psemine';
import { PSEMinePurchaseModal } from '../../components/psemine/PSEMinePurchaseModal';
import { cn } from '../../utils';

export const PSEMineTools: React.FC = () => {
  const { tools, pseUser } = usePSEMine();
  const [selectedTool, setSelectedTool] = useState<PSEMineToolDefinition | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Interactive Calculator State
  const [simStarter, setSimStarter] = useState(1);
  const [simBuilder, setSimBuilder] = useState(1);
  const [simAdvanced, setSimAdvanced] = useState(0);
  const [simElite, setSimElite] = useState(0);
  const [simReferrals, setSimReferrals] = useState(2);

  const toolCounts = pseUser?.toolOwnershipCounts || {
    starter: 0,
    builder: 0,
    advanced: 0,
    elite: 0
  };

  // Calculator Math
  const simToolCapacity = (simStarter * 0.10) + (simBuilder * 0.50) + (simAdvanced * 1.20) + (simElite * 2.50);
  const simReferralCapacity = Math.min(5, simReferrals) * 0.30;
  const simTotalHourlyRate = Math.min(12.10, Number((simToolCapacity + simReferralCapacity).toFixed(2)));
  const simTotalInvestment = (simStarter * 3) + (simBuilder * 10) + (simAdvanced * 50) + (simElite * 200);
  const simDailyOutput = Number((simTotalHourlyRate * 24).toFixed(2));
  const simCampaignOutput = Number((simTotalHourlyRate * 24 * 90).toFixed(2));

  const totalOwnedUnits = Object.values(toolCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 transition-colors">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
              PSEmine Tools
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Mining Tools
          </h1>
          <p className="text-xs md:text-sm text-text-secondary">
            Purchase mining tools to build and scale your hourly earning capacity.
          </p>
        </div>

        {/* User Active Capacity Snapshot */}
        <div className="p-4 bg-surface border border-border rounded-2xl flex items-center gap-5 shrink-0">
          <div>
            <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Active Tools</div>
            <div className="text-base font-bold text-text-primary tabular-nums mt-0.5">{totalOwnedUnits} Tools</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Tool Rate</div>
            <div className="text-base font-bold text-[#00E599] font-mono tabular-nums mt-0.5">
              £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}/hr
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 4 TOOL CARDS GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {tools.map((tool) => {
          const owned = toolCounts[tool.id] || 0;
          const isMax = owned >= tool.maxPerUser;

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-6 bg-surface border rounded-2xl md:rounded-3xl flex flex-col justify-between transition-all space-y-6",
                owned > 0
                  ? "border-[#00E599]/30 shadow-md shadow-[#00E599]/5"
                  : "border-border hover:border-border-bright"
              )}
            >
              <div className="space-y-4">
                
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-surface-bright text-text-secondary border border-border">
                    Tier {tool.tier}
                  </span>
                  <span className={cn(
                    "text-xs font-bold font-mono tabular-nums",
                    owned > 0 ? "text-[#00E599]" : "text-text-tertiary"
                  )}>
                    {owned} / {tool.maxPerUser} Owned
                  </span>
                </div>

                {/* Name & Description */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary tracking-tight">{tool.name}</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{tool.description}</p>
                </div>

                {/* Specs Box */}
                <div className="p-4 bg-surface-bright/50 border border-border rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary font-medium">Price</span>
                    <span className="font-bold text-text-primary font-mono text-sm tabular-nums">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary font-medium">Hourly Rate</span>
                    <span className="font-bold text-[#00E599] font-mono text-sm tabular-nums">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border text-[11px]">
                    <span className="text-text-tertiary">Max Allowed</span>
                    <span className="text-text-secondary font-medium">{tool.maxPerUser} units</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-text-tertiary">Your Hourly Output</span>
                    <span className="text-[#00E599] font-mono font-bold tabular-nums">
                      +£{(owned * tool.hourlyRateGBP).toFixed(2)}/hr
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Button */}
              <div className="pt-2">
                {isMax ? (
                  <div className="w-full py-3 bg-surface-bright border border-border text-text-tertiary text-xs font-bold uppercase tracking-wider rounded-xl text-center flex items-center justify-center gap-1.5">
                    <Check size={14} className="text-[#00E599]" />
                    <span>Max Limit Reached</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTool(tool)}
                    className="psemine-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    <span>Purchase Tool</span>
                  </button>
                )}
              </div>

            </motion.div>
          );
        })}
      </div>

      {/* ── EARNINGS CALCULATOR ─────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
        <button
          onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-surface-bright/50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599] shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-text-primary">
                Earnings Calculator
              </h2>
              <p className="text-xs text-text-secondary">
                Model tool combinations, referral boosts, and estimated 90-day campaign returns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#00E599] uppercase tracking-wider">
            <span>{isSimulatorOpen ? 'Hide' : 'Open Calculator'}</span>
            {isSimulatorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isSimulatorOpen && (
          <div className="p-6 pt-2 border-t border-border space-y-6">
            
            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              
              {/* Starter Miner */}
              <div className="p-4 bg-surface-bright/50 border border-border rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text-primary">Starter (£3)</span>
                  <span className="font-bold text-[#00E599] font-mono tabular-nums">{simStarter} / 5</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  value={simStarter} 
                  onChange={(e) => setSimStarter(parseInt(e.target.value))}
                  className="w-full accent-[#00E599] cursor-pointer"
                />
                <div className="text-[10px] text-text-tertiary text-right font-mono tabular-nums">
                  +£{(simStarter * 0.10).toFixed(2)}/hr
                </div>
              </div>

              {/* Builder Miner */}
              <div className="p-4 bg-surface-bright/50 border border-border rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text-primary">Builder (£10)</span>
                  <span className="font-bold text-[#00E599] font-mono tabular-nums">{simBuilder} / 3</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  value={simBuilder} 
                  onChange={(e) => setSimBuilder(parseInt(e.target.value))}
                  className="w-full accent-[#00E599] cursor-pointer"
                />
                <div className="text-[10px] text-text-tertiary text-right font-mono tabular-nums">
                  +£{(simBuilder * 0.50).toFixed(2)}/hr
                </div>
              </div>

              {/* Advanced Miner */}
              <div className="p-4 bg-surface-bright/50 border border-border rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text-primary">Advanced (£50)</span>
                  <span className="font-bold text-[#00E599] font-mono tabular-nums">{simAdvanced} / 3</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  value={simAdvanced} 
                  onChange={(e) => setSimAdvanced(parseInt(e.target.value))}
                  className="w-full accent-[#00E599] cursor-pointer"
                />
                <div className="text-[10px] text-text-tertiary text-right font-mono tabular-nums">
                  +£{(simAdvanced * 1.20).toFixed(2)}/hr
                </div>
              </div>

              {/* Elite Miner */}
              <div className="p-4 bg-surface-bright/50 border border-border rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text-primary">Elite (£200)</span>
                  <span className="font-bold text-[#00E599] font-mono tabular-nums">{simElite} / 2</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  value={simElite} 
                  onChange={(e) => setSimElite(parseInt(e.target.value))}
                  className="w-full accent-[#00E599] cursor-pointer"
                />
                <div className="text-[10px] text-text-tertiary text-right font-mono tabular-nums">
                  +£{(simElite * 2.50).toFixed(2)}/hr
                </div>
              </div>

              {/* Qualified Referrals */}
              <div className="p-4 bg-surface-bright/50 border border-border rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text-primary">Referrals (+£0.30)</span>
                  <span className="font-bold text-[#00E599] font-mono tabular-nums">{simReferrals} / 5</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  value={simReferrals} 
                  onChange={(e) => setSimReferrals(parseInt(e.target.value))}
                  className="w-full accent-[#00E599] cursor-pointer"
                />
                <div className="text-[10px] text-text-tertiary text-right font-mono tabular-nums">
                  +£{(simReferrals * 0.30).toFixed(2)}/hr
                </div>
              </div>

            </div>

            {/* Simulated Projected Outputs */}
            <div className="p-5 bg-surface-bright/70 border border-border rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-text-tertiary">Total Cost:</span>
                <div className="text-base font-bold text-text-primary font-mono tabular-nums mt-0.5">
                  £{simTotalInvestment.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-text-tertiary">Hourly Rate:</span>
                <div className="text-base font-bold text-[#00E599] font-mono tabular-nums mt-0.5">
                  +£{simTotalHourlyRate.toFixed(2)}/hr
                </div>
              </div>
              <div>
                <span className="text-text-tertiary">24h Estimated Output:</span>
                <div className="text-base font-bold text-text-primary font-mono tabular-nums mt-0.5">
                  £{simDailyOutput.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-text-tertiary">90-Day Campaign Return:</span>
                <div className="text-base font-bold text-[#00E599] font-mono tabular-nums mt-0.5">
                  £{simCampaignOutput.toFixed(2)}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedTool && (
        <PSEMinePurchaseModal
          tool={selectedTool}
          isOpen={Boolean(selectedTool)}
          onClose={() => setSelectedTool(null)}
        />
      )}

    </div>
  );
};
