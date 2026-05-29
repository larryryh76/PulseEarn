import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Target, TrendingUp, TrendingDown, Clock, Bitcoin, ShieldCheck, Zap } from 'lucide-react';
import { useCryptoData } from '../hooks/useCryptoData';
import { formatUSD } from '../utils/finance';
import { cn } from '../utils';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const Predict: React.FC = () => {
  const { marketData, loading } = useCryptoData();
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN' | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [amount, setAmount] = useState('100');

  const btc = marketData.find(c => c.id === 'bitcoin');

  const handleExecute = () => {
    if (!selectedDirection) {
      toast.error('Select forecast direction');
      return;
    }
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      toast.success('Forecast sequence initialized');
      setSelectedDirection(null);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.05] pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Active Market Session</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight uppercase">Execution Hub</h1>
            <p className="text-sm text-white/40 font-medium">Synthesize market signals and authorize price forecasts.</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">Session Accuracy</p>
              <p className="text-xl font-mono font-bold text-white">74.2%</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">Global Volume</p>
              <p className="text-xl font-mono font-bold text-white">1.2M PTS</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Execution Terminal */}
          <div className="lg:col-span-8 space-y-8">
            <div className="glass-panel rounded-[2.5rem] overflow-hidden border-white/10 shadow-2xl bg-black">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7931A]/10 border border-[#F7931A]/20 flex items-center justify-center text-[#F7931A]">
                    <Bitcoin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white tracking-tight uppercase">BTC / USDT</h4>
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Market Feed: Real-time</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-mono font-bold text-white tracking-tighter leading-none">
                    {loading ? '---' : formatUSD(btc?.current_price || 0)}
                  </p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    (btc?.price_change_percentage_24h || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {btc?.price_change_percentage_24h.toFixed(2)}% (24h)
                  </span>
                </div>
              </div>

              <div className="p-10 md:p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <button
                    onClick={() => setSelectedDirection('UP')}
                    className={cn(
                      "h-48 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group",
                      selectedDirection === 'UP'
                        ? "bg-emerald-500/5 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
                        : "bg-white/[0.01] border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className={cn(
                        "w-16 h-16 rounded-3xl flex items-center justify-center transition-all",
                        selectedDirection === 'UP' ? "bg-emerald-500 text-black" : "bg-white/5 text-white/20 group-hover:text-emerald-500"
                      )}>
                        <TrendingUp size={32} />
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-[0.3em]",
                        selectedDirection === 'UP' ? "text-emerald-500" : "text-white/20 group-hover:text-white"
                      )}>Forecast Bullish</span>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/20" />
                  </button>

                  <button
                    onClick={() => setSelectedDirection('DOWN')}
                    className={cn(
                      "h-48 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group",
                      selectedDirection === 'DOWN'
                        ? "bg-rose-500/5 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.1)]"
                        : "bg-white/[0.01] border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className={cn(
                        "w-16 h-16 rounded-3xl flex items-center justify-center transition-all",
                        selectedDirection === 'DOWN' ? "bg-rose-500 text-black" : "bg-white/5 text-white/20 group-hover:text-rose-500"
                      )}>
                        <TrendingDown size={32} />
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-[0.3em]",
                        selectedDirection === 'DOWN' ? "text-rose-500" : "text-white/20 group-hover:text-white"
                      )}>Forecast Bearish</span>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/20" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Allocation Amount</span>
                    <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Available: 42,850 PTS</span>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-2xl font-mono font-bold text-white outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <span className="text-xs font-bold text-white/20 uppercase tracking-widest">PTS</span>
                      <button className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-white/40 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest">Max</button>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={isExecuting}
                  onClick={handleExecute}
                >
                  {isExecuting ? 'AUTHORIZING SEQUENCE...' : 'EXECUTE FORECAST'}
                </Button>
              </div>

              <div className="px-8 py-5 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/20">
                  <Clock size={14} />
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Resolution in: 04:22:15</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border border-black bg-white/10" />
                    ))}
                  </div>
                  <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]">1,242 Active Operators</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Intel */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Target size={18} />
                <h4 className="font-bold text-base uppercase tracking-tight">Active Signals</h4>
              </div>
              <div className="space-y-4">
                {[
                  { asset: 'ETH/USDT', signal: 'BULLISH', strength: '88%' },
                  { asset: 'SOL/USDT', signal: 'NEUTRAL', strength: '52%' },
                  { asset: 'BNB/USDT', signal: 'BEARISH', strength: '74%' },
                ].map((sig, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white/80">{sig.asset}</p>
                      <p className={cn(
                        "text-[9px] font-bold uppercase tracking-widest mt-0.5",
                        sig.signal === 'BULLISH' ? "text-emerald-500" : sig.signal === 'BEARISH' ? "text-rose-500" : "text-white/40"
                      )}>{sig.signal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-white/40">{sig.strength}</p>
                      <p className="text-[8px] font-bold text-white/10 uppercase">CONFIDENCE</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <ShieldCheck size={18} />
                <h4 className="font-bold text-base uppercase tracking-tight">Execution Rules</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/20 shrink-0">
                    <Zap size={14} />
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase">Settlements are calculated every 24 hours based on high-fidelity market data.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/20 shrink-0">
                    <Clock size={14} />
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase">Positions are locked until session resolution. No premature exits allowed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
