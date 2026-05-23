import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bitcoin, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
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
    <section id="predict" className="py-24 bg-white/[0.01]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Predict & Win. <br />
                <span className="text-accent">Beat the Market.</span>
              </h2>
              <p className="text-white/40 text-sm md:text-lg mb-8 leading-relaxed">
                Analyze the trends and forecast price movements. Correct predictions reward you with points that can be converted into crypto.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10">
                {[
                  'Live price data',
                  'Multiple assets',
                  'Fast settlements',
                  'Win multipliers'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/60">
                    <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="md"
                className="text-[10px] uppercase tracking-widest font-bold"
                onClick={() => navigate('/predict')}
              >
                Start Predicting
              </Button>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Card className="p-0 border-white/10 bg-white/[0.03] overflow-hidden rounded-3xl">
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#F7931A]/10 flex items-center justify-center text-[#F7931A]">
                      <Bitcoin size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">BTC/USDT</h4>
                      <p className="text-[10px] text-white/40">Ending Soon</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold">{loading ? '---' : formatUSD(btc?.current_price || 0)}</p>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="text-center mb-6">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Forecast Direction</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={cn(
                        "h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2",
                        selectedDirection === 'up' ? "bg-green-500/10 border-green-500 text-green-500" : "bg-white/5 border-transparent"
                      )}
                    >
                      <TrendingUp className="w-6 h-6" />
                      <span className="text-[10px] font-bold uppercase">Higher</span>
                    </button>

                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={cn(
                        "h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2",
                        selectedDirection === 'down' ? "bg-red-500/10 border-red-500 text-red-500" : "bg-white/5 border-transparent"
                      )}
                    >
                      <TrendingDown className="w-6 h-6" />
                      <span className="text-[10px] font-bold uppercase">Lower</span>
                    </button>
                  </div>

                  <Button
                    glow
                    className="w-full py-4 text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => navigate('/predict')}
                  >
                    Confirm Now
                  </Button>
                </div>

                <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/20">
                    <Clock size={10} />
                    <span className="text-[9px] font-mono">04:22:15 left</span>
                  </div>
                  <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">1,242 joined</span>
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
