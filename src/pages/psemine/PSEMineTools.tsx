import React, { useState } from 'react';
import { 
  Cpu, 
  Plus, 
  Calculator, 
  Check, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineToolDefinition } from '../../types/psemine';
import { PSEMinePurchaseModal } from '../../components/psemine/PSEMinePurchaseModal';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8 pb-24 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/40 text-blue-400 text-xs font-semibold mb-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>4 Hardware Tiers • Capped Economic Capacity</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mining Hardware Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Acquire cloud mining hardware units with BNB on Binance Smart Chain to scale continuous hourly GBP generation.
          </p>
        </div>

        {/* User Active Capacity Snapshot */}
        <div className="p-3 bg-[#0D131F] border border-slate-800 rounded-2xl flex items-center space-x-4 shrink-0">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Your Hardware Units</div>
            <div className="text-sm font-bold text-white font-mono">{totalOwnedUnits} Active</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Hardware Capacity</div>
            <div className="text-sm font-bold text-blue-400 font-mono">
              £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}/hr
            </div>
          </div>
        </div>
      </div>

      {/* 4 Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tools.map((tool) => {
          const owned = toolCounts[tool.id] || 0;
          const isMax = owned >= tool.maxPerUser;

          return (
            <div
              key={tool.id}
              className={`p-5 bg-[#0D131F] border rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                owned > 0
                  ? 'border-blue-500/40 shadow-xl shadow-black/60'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                    Tier {tool.tier}
                  </span>
                  <span className={`text-xs font-mono font-bold ${owned > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                    {owned} / {tool.maxPerUser} Owned
                  </span>
                </div>

                {/* Name & Tagline */}
                <div>
                  <h3 className="text-lg font-bold text-white">{tool.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tool.description}</p>
                </div>

                {/* Specs Box */}
                <div className="p-3.5 bg-[#080C14] border border-slate-800/80 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans">Price:</span>
                    <span className="font-bold text-white text-sm">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans">Hourly Rate:</span>
                    <span className="font-bold text-emerald-400 text-sm">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-400 font-sans">Max Ownership:</span>
                    <span className="text-slate-300">{tool.maxPerUser} units max</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-sans">Active Capacity:</span>
                    <span className="text-blue-400 font-bold">
                      +£{(owned * tool.hourlyRateGBP).toFixed(2)}/hr
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Button */}
              <div className="pt-4 mt-2">
                {isMax ? (
                  <div className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-semibold rounded-xl text-center flex items-center justify-center space-x-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Maximum Tier Limit Reached ({tool.maxPerUser}/{tool.maxPerUser})</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTool(tool)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Deploy {tool.name}</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Interactive Capacity Simulator Toggle / Section */}
      <div className="bg-[#0D131F] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <button
          onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Interactive Mining Output Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Model hardware combinations, referral accelerators, and 90-day campaign estimated outcomes.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <span>{isSimulatorOpen ? 'Hide Simulator' : 'Open Simulator'}</span>
            {isSimulatorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isSimulatorOpen && (
          <div className="p-6 pt-2 border-t border-slate-800/80 space-y-6">
            
            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Starter Miner */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Starter Miner (£3)</span>
                  <span className="font-mono text-blue-400 font-bold">{simStarter} / 5</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  value={simStarter} 
                  onChange={(e) => setSimStarter(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  +£{(simStarter * 0.10).toFixed(2)}/hr
                </div>
              </div>

              {/* Builder Miner */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Builder Miner (£10)</span>
                  <span className="font-mono text-blue-400 font-bold">{simBuilder} / 3</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  value={simBuilder} 
                  onChange={(e) => setSimBuilder(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  +£{(simBuilder * 0.50).toFixed(2)}/hr
                </div>
              </div>

              {/* Advanced Miner */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Advanced Miner (£50)</span>
                  <span className="font-mono text-blue-400 font-bold">{simAdvanced} / 3</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  value={simAdvanced} 
                  onChange={(e) => setSimAdvanced(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  +£{(simAdvanced * 1.20).toFixed(2)}/hr
                </div>
              </div>

              {/* Elite Miner */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Elite Miner (£200)</span>
                  <span className="font-mono text-blue-400 font-bold">{simElite} / 2</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  value={simElite} 
                  onChange={(e) => setSimElite(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  +£{(simElite * 2.50).toFixed(2)}/hr
                </div>
              </div>

              {/* Referrals */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-emerald-400">Referrals Boost</span>
                  <span className="font-mono text-emerald-400 font-bold">{simReferrals} / 5</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  value={simReferrals} 
                  onChange={(e) => setSimReferrals(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  +£{(Math.min(5, simReferrals) * 0.30).toFixed(2)}/hr
                </div>
              </div>

            </div>

            {/* Projection Output Row */}
            <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/40 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Total Hardware Cost</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">£{simTotalInvestment.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Simulated Rate</div>
                <div className="text-base font-bold text-blue-400 font-mono mt-0.5">£{simTotalHourlyRate.toFixed(2)}/hr</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Daily Output</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">£{simDailyOutput.toFixed(2)}/day</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">90-Day Campaign Total</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">£{simCampaignOutput.toFixed(2)}</div>
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
