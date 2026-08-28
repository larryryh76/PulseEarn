import React, { useState } from 'react';
import { 
  Cpu, 
  Plus, 
  Calculator 
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { 
  PSEMineToolDefinition 
} from '../../types/psemine';
import { PSEMinePurchaseModal } from '../../components/psemine/PSEMinePurchaseModal';

export const PSEMineTools: React.FC = () => {
  const { tools, pseUser } = usePSEMine();
  const [selectedTool, setSelectedTool] = useState<PSEMineToolDefinition | null>(null);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>4 HARDWARE TIERS • LOCKED ECONOMIC MODEL</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Mining Hardware Marketplace
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          Deploy cloud computational mining nodes to scale your hourly GBP capacity. Each tier features hard-capped ownership limits to protect economic sustainability.
        </p>
      </div>

      {/* 4 Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool) => {
          const owned = toolCounts[tool.id] || 0;
          const isMax = owned >= tool.maxPerUser;

          return (
            <div
              key={tool.id}
              className={`p-6 bg-[#0a1124] border rounded-3xl flex flex-col justify-between transition-all ${
                owned > 0
                  ? 'border-cyan-500/50 shadow-xl shadow-cyan-950/30'
                  : 'border-cyan-900/40 hover:border-cyan-500/40'
              }`}
            >
              <div className="space-y-4">
                
                {/* Badge Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/40">
                    Tier {tool.tier}
                  </span>
                  <span className={`text-xs font-mono font-bold ${owned > 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                    {owned} / {tool.maxPerUser} Owned
                  </span>
                </div>

                {/* Name & Tagline */}
                <div>
                  <h3 className="text-xl font-extrabold text-white">{tool.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{tool.description}</p>
                </div>

                {/* Specs Box */}
                <div className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-2xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price (GBP):</span>
                    <span className="font-extrabold text-white text-sm">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hourly Rate:</span>
                    <span className="font-extrabold text-cyan-400 text-sm">+£{tool.hourlyRateGBP.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-gray-400">Max Ownership:</span>
                    <span className="text-gray-300 font-bold">{tool.maxPerUser} Units</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">90-Day Output:</span>
                    <span className="text-emerald-400 font-bold">£{(tool.hourlyRateGBP * 24 * 90).toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Action Button */}
              <div className="pt-6">
                {isMax ? (
                  <div className="w-full py-3 bg-slate-900 border border-slate-800 text-gray-400 rounded-xl text-xs font-bold text-center">
                    Maximum Capacity Reached
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTool(tool)}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{owned > 0 ? `Deploy Unit ${owned + 1}` : 'Deploy Miner'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Stacking Calculator */}
      <div className="p-8 lg:p-10 bg-gradient-to-br from-[#0c1428] to-[#070b16] border border-cyan-900/50 rounded-3xl space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Interactive Capacity Stacking Simulator
            </h2>
            <p className="text-xs text-gray-400">
              Model your continuous GBP earnings across custom tool combinations and referral tiers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          
          {/* Controls */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            
            {/* Starter Slider */}
            <div className="p-4 bg-[#080d19] border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-white font-bold">
                <span>Starter Miner (£3 / £0.10/hr)</span>
                <span className="text-cyan-400">{simStarter} / 5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={simStarter}
                onChange={(e) => setSimStarter(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Builder Slider */}
            <div className="p-4 bg-[#080d19] border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-white font-bold">
                <span>Builder Miner (£10 / £0.50/hr)</span>
                <span className="text-cyan-400">{simBuilder} / 3</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                value={simBuilder}
                onChange={(e) => setSimBuilder(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Advanced Slider */}
            <div className="p-4 bg-[#080d19] border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-white font-bold">
                <span>Advanced Miner (£50 / £1.20/hr)</span>
                <span className="text-cyan-400">{simAdvanced} / 3</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                value={simAdvanced}
                onChange={(e) => setSimAdvanced(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Elite Slider */}
            <div className="p-4 bg-[#080d19] border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-white font-bold">
                <span>Elite Miner (£200 / £2.50/hr)</span>
                <span className="text-cyan-400">{simElite} / 2</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={simElite}
                onChange={(e) => setSimElite(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Referrals Slider */}
            <div className="sm:col-span-2 p-4 bg-[#080d19] border border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-white font-bold">
                <span>Qualified Referrals (+£0.30/hr each)</span>
                <span className="text-emerald-400">{simReferrals} / 5 (+£{simReferralCapacity.toFixed(2)}/hr)</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={simReferrals}
                onChange={(e) => setSimReferrals(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

          </div>

          {/* Simulated Output Card */}
          <div className="p-6 bg-[#080d1a] border border-cyan-500/40 rounded-3xl space-y-4 font-mono text-xs shadow-xl">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Projected Output Analysis
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-300">
                <span>Hourly Rate:</span>
                <span className="text-lg font-black text-cyan-300">£{simTotalHourlyRate.toFixed(2)} / hr</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Daily Earnings (24h):</span>
                <span className="text-base font-bold text-white">£{simDailyOutput.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300 pt-2 border-t border-slate-800">
                <span className="font-bold text-white">90-Day Campaign Total:</span>
                <span className="text-xl font-black text-emerald-400">£{simCampaignOutput.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-300">
              Total Hardware Cost: <strong>£{simTotalInvestment.toFixed(2)}</strong> (Paid in BNB)
            </div>
          </div>

        </div>
      </div>

      {/* Tool Checkout Modal */}
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
