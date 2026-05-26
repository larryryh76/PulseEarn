import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bitcoin, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { useCryptoData } from '../../hooks/useCryptoData';
import { formatUSD } from '../../utils/finance';

const PredictionPreview: React.FC = () => {
  const navigate = useNavigate();
  const { marketData, loading } = useCryptoData();
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);

  const btc = marketData.find(c => c.id === 'bitcoin');

  return (
    <section id="predict" className="py-32 bg-[#050507] relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-20 lg:gap-32 items-center">
          <div className="lg:w-1/2 text-center lg:text-left space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="text-primary text-[10px] font-bold tracking-[0.4em] uppercase mb-4 flex items-center gap-3 justify-center lg:justify-start">
                <Target size={16} className="text-primary" />
                Execution Hub
              </div>
              <h2 className="text-4xl md:text-7xl font-bold tracking-tighter text-white uppercase leading-[0.9]">
                Forecast & <br />
                <span className="text-white/20">Dominate.</span>
              </h2>
              <p className="text-white/40 text-lg md:text-xl font-medium tracking-tight max-w-xl leading-relaxed uppercase">
                Synthesize market signals and execute price forecasts. Precision accuracy results in high-fidelity point distributions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left pt-6">
                {[
                  'Real-time Oracle Data',
                  'Cross-Asset Support',
                  'Atomic Settlements',
                  'Risk Multipliers'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-white/50 group">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-white" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-10">
                 <button
                  onClick={() => navigate('/predict')}
                  className="px-12 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-4"
                 >
                    Access Hub <TrendingUp size={16} />
                 </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full max-w-xl mx-auto relative">
            <div className="absolute -inset-10 bg-primary/10 blur-[100px] rounded-full opacity-50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="p-0 border border-white/10 bg-black overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7931A]/10 border border-[#F7931A]/20 flex items-center justify-center text-[#F7931A]">
                      <Bitcoin size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white tracking-tight uppercase">BTC/USDT</h4>
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Oracle Session #429</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-2xl font-mono font-bold text-white tracking-tighter leading-none">{loading ? '---' : formatUSD(btc?.current_price || 0)}</p>
                    <span className="text-[10px] font-bold text-success uppercase tracking-widest">Live Signal</span>
                  </div>
                </div>

                <div className="p-10 md:p-12">
                  <div className="text-center mb-10">
                    <p className="text-white/20 text-[11px] uppercase tracking-[0.4em] font-bold">Initialize Forecast</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-10">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={cn(
                        "h-32 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-4 group",
                        selectedDirection === 'up' ? "bg-success/5 border-success text-success shadow-[0_0_30px_rgba(34,197,94,0.1)]" : "bg-white/[0.01] border-white/5 text-white/20 hover:border-white/20"
                      )}
                    >
                      <TrendingUp className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Bullish</span>
                    </button>

                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={cn(
                        "h-32 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-4 group",
                        selectedDirection === 'down' ? "bg-danger/5 border-danger text-danger shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "bg-white/[0.01] border-white/5 text-white/20 hover:border-white/20"
                      )}
                    >
                      <TrendingDown className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Bearish</span>
                    </button>
                  </div>

                  <button
                    onClick={() => navigate('/predict')}
                    className="w-full py-6 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-[0.3em] shadow-2xl hover:bg-white/90 active:scale-95 transition-all"
                  >
                    Execute Position
                  </button>
                </div>

                <div className="px-8 py-5 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white/20">
                    <Clock size={14} />
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase">04:22:15 remaining</span>
                  </div>
                  <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]">1,242 Active Operators</span>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PredictionPreview;
