import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Zap, DollarSign, ChevronRight } from 'lucide-react';
import { EconomyConfigEngine } from '../../engines/system/EconomyConfigEngine';
import Card from '../ui/Card';
import { cn } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { useCryptoData } from '../../hooks/useCryptoData';

const DailyRewardsPreview: React.FC = () => {
  const navigate = useNavigate();
  const { marketData } = useCryptoData();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    EconomyConfigEngine.getConfig().then(setConfig);
  }, []);

  const btc = marketData.find(c => c.id === 'bitcoin');
  const eth = marketData.find(c => c.id === 'ethereum');

  // Priority 7: Accuracy - Real values from Economy Authority
  const dailyPts = config?.rewards?.dailyLoginPoints || 10;
  const dailyUsd = dailyPts / 1000;

  const rewards = [
    {
      title: 'Daily Points',
      amount: `+${dailyPts} PTS`,
      type: 'PTS',
      status: 'Active',
      icon: Zap,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'USDT Rewards',
      amount: `$${dailyUsd.toFixed(2)} USD`,
      type: 'USDT',
      status: 'Live',
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'Bitcoin Bonuses',
      amount: btc ? `${(dailyUsd / btc.current_price).toFixed(8)} BTC` : '--- BTC',
      type: 'BTC',
      status: 'Live',
      icon: Zap,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
  ];

  return (
    <section id="rewards" className="py-20 md:py-32 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 blur-[120px] -z-10" />

      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 md:gap-16 lg:gap-24 items-center">
          <div className="lg:w-1/2 order-2 lg:order-1 w-full max-w-xl">
            <div className="grid grid-cols-1 gap-4">
              {rewards.map((reward, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className="flex items-center gap-6 p-6 border border-border bg-surface group hover:bg-surface-bright hover:border-primary/20 transition-all rounded-[2rem] shadow-subtle hover:shadow-premium">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-all bg-surface-bright", reward.color)}>
                      <reward.icon size={24} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base text-text-primary">{reward.title}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-success/10 border border-success/20 text-success text-[8px] font-bold uppercase tracking-widest">
                          {reward.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-text-secondary text-xs font-bold">{reward.amount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/signup')}
                      className="w-10 h-10 rounded-xl bg-surface-accent border border-border-bright flex items-center justify-center text-text-tertiary group-hover:text-text-primary group-hover:bg-primary group-hover:border-primary transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 order-1 lg:order-2 text-center lg:text-left space-y-6 md:space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4 md:space-y-6"
            >
              <div className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-3 justify-center lg:justify-start">
                <Gift size={16} className="text-primary" />
                Daily Rewards
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter text-text-primary leading-[1] uppercase italic">
                Grow Your <br className="hidden sm:block" />
                <span className="text-text-tertiary opacity-40 dark:opacity-40">Earnings.</span>
              </h2>
              <p className="text-text-secondary text-base sm:text-lg font-medium max-w-xl leading-relaxed">
                Our platform provides daily earning opportunities. Complete tasks and see your balance grow in real-time.
              </p>

              <div className="flex flex-col gap-5 text-left max-w-md mx-auto lg:mx-0 pt-4">
                {[
                  { step: '01', title: 'Sign Up', desc: 'Create your free account in seconds.' },
                  { step: '02', title: 'Complete Tasks', desc: 'Participate in simple daily activities.' },
                  { step: '03', title: 'Get Paid', desc: 'Earn points and redeem them for rewards.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-6 group">
                    <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center shrink-0 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                      <span className="text-xs font-bold text-primary font-mono">{item.step}</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-[13px] text-text-primary uppercase tracking-wider">{item.title}</h4>
                      <p className="text-text-secondary text-[11px] font-medium uppercase tracking-tighter">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const EthIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L4.5 12L12 22L19.5 12L12 2Z" />
    <path d="M12 2V22" />
    <path d="M4.5 12L19.5 12" />
  </svg>
);

export default DailyRewardsPreview;
