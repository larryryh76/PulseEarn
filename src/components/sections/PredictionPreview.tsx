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
    <section id="predictions" className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 md:gap-20 lg:gap-32 items-center">
          <div className="lg:w-1/2 text-center lg:text-left space-y-8 md:space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4 md:space-y-6"
            >
              <div className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-3 justify-center lg:justify-start">
                <Target size={16} className="text-primary" />
                Market Predictions
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-tight">
                Predict & <br className="hidden sm:block" />
                <span className="text-text-tertiary opacity-80 dark:opacity-100">Earn More.</span>
              </h2>
              <p className="text-text-secondary text-base sm:text-lg font-medium max-w-xl leading-relaxed">
                Use your market knowledge to predict price movements. Correct predictions result in bonus points and rewards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left pt-4">
                {[
                  'Real-time Market Data',
                  'Multiple Assets',
                  'Instant Settlements',
                  'Bonus Multipliers'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 md:gap-4 text-text-primary/50 group">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-text-primary transition-all">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-white" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{item}</span>
                  </div>
                ))}
              </div>

                  <div className="pt-8">
                 <button
                  onClick={() => navigate('/predict')}
                  className="px-10 py-5 rounded-xl bg-surface-glass border border-border-bright text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-glass-hover active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    Start Predicting <TrendingUp size={16} />
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
              <Card className="p-0 border border-border-bright bg-background overflow-hidden rounded-[2.5rem] shadow-premium">
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-bright/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 border border-[#F7931A]/20 flex items-center justify-center text-[#F7931A]">
                      <Bitcoin size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-primary">BTC/USDT</h4>
                      <p className="text-[10px] text-text-primary/30 font-bold uppercase tracking-widest">Live Market</p>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-xl font-mono font-bold text-text-primary tracking-tight leading-none">{loading ? '---' : formatUSD(btc?.current_price || 0)}</p>
                    <span className="text-[10px] font-bold text-success uppercase tracking-widest">Live</span>
                  </div>
                </div>

                <div className="p-8 md:p-10">
                  <div className="text-center mb-8">
                    <p className="text-text-primary/30 text-[10px] uppercase tracking-[0.2em] font-bold">What is your prediction?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={cn(
                        "h-24 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group",
                        selectedDirection === 'up' ? "bg-success/5 border-success text-success shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-surface-bright/50 border-border text-text-secondary hover:border-border-bright transition-colors"
                      )}
                    >
                      <TrendingUp className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Price Up</span>
                    </button>

                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={cn(
                        "h-24 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group",
                        selectedDirection === 'down' ? "bg-danger/5 border-danger text-danger shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-surface-bright/50 border-border text-text-secondary hover:border-border-bright transition-colors"
                      )}
                    >
                      <TrendingDown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Price Down</span>
                    </button>
                  </div>

                  <button
                    onClick={() => navigate('/predictions')}
                    className="w-full py-5 rounded-xl bg-text-primary text-background text-xs font-bold uppercase tracking-widest shadow-xl hover:opacity-90 active:scale-95 transition-all"
                  >
                    View Market
                  </button>
                </div>

                <div className="px-6 py-4 bg-surface-bright/50 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-3 text-text-primary/30">
                    <Clock size={12} />
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-success">Active</span>
                  </div>
                  <span className="text-[10px] text-text-primary/30 font-bold uppercase tracking-widest">Market Feed</span>
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
