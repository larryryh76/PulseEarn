import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bitcoin, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { cn } from '../../utils';
import { useNavigate } from 'react-router-dom';

const PredictionPreview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);

  return (
    <section id="predict" className="py-24 bg-white/[0.01]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Predict the Market. <br />
                <span className="text-accent">Multiply Earnings.</span>
              </h2>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">
                Think you know where the market is headed? Put your skin in the game. Correct predictions earn you a share of the daily reward pool.
              </p>

              <ul className="space-y-4 mb-10">
                {[
                  'Real-time price feeds from top exchanges',
                  'Win multipliers up to 10x on streak',
                  'Zero fees for community token holders',
                  'Transparent on-chain settlement'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/80">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="border-accent/30 text-accent hover:bg-accent/10"
                onClick={() => navigate('/predict')}
              >
                Learn Prediction Rules
              </Button>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Card className="p-0 border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F7931A]/10 flex items-center justify-center text-[#F7931A]">
                      <Bitcoin size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">BTC/USDT</h4>
                      <p className="text-xs text-white/40">Ends in 04:22:15</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-mono font-bold">$64,231.50</p>
                    <p className="text-xs text-green-500 font-medium">+2.45%</p>
                  </div>
                </div>

                <div className="p-8">
                  <div className="text-center mb-8">
                    <p className="text-white/40 text-sm uppercase tracking-widest mb-2 font-semibold">Will BTC be higher or lower in 1h?</p>
                    <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={cn(
                        "relative group h-32 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2",
                        selectedDirection === 'up'
                          ? "bg-green-500/20 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                          : "bg-white/5 border-transparent hover:border-white/20"
                      )}
                    >
                      <TrendingUp className={cn(
                        "w-8 h-8 transition-transform group-hover:-translate-y-1",
                        selectedDirection === 'up' ? "text-green-500" : "text-white/40"
                      )} />
                      <span className={cn(
                        "font-bold uppercase tracking-wider",
                        selectedDirection === 'up' ? "text-green-500" : "text-white/60"
                      )}>Higher</span>
                      <span className="text-[10px] text-white/30 font-mono">Payout 1.85x</span>
                    </button>

                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={cn(
                        "relative group h-32 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2",
                        selectedDirection === 'down'
                          ? "bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                          : "bg-white/5 border-transparent hover:border-white/20"
                      )}
                    >
                      <TrendingDown className={cn(
                        "w-8 h-8 transition-transform group-hover:translate-y-1",
                        selectedDirection === 'down' ? "text-red-500" : "text-white/40"
                      )} />
                      <span className={cn(
                        "font-bold uppercase tracking-wider",
                        selectedDirection === 'down' ? "text-red-500" : "text-white/60"
                      )}>Lower</span>
                      <span className="text-[10px] text-white/30 font-mono">Payout 2.10x</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Amount</span>
                      <span className="text-white font-mono">100.00 PULSE</span>
                    </div>
                    <Button
                      glow
                      className="w-full py-4 text-lg"
                      onClick={() => navigate('/predict')}
                    >
                      {selectedDirection ? 'Confirm Prediction' : 'Select Direction'}
                    </Button>
                  </div>
                </div>

                <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-white/10 border border-background flex items-center justify-center text-[10px] font-bold">
                        U{i}
                      </div>
                    ))}
                    <div className="pl-4 text-[10px] text-white/40 flex items-center">
                      +1.2k others predicting
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <Clock size={12} />
                    <span className="text-[10px] font-mono">04:22:15 left</span>
                  </div>
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
