import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Zap, DollarSign, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';

const DailyRewardsPreview: React.FC = () => {
  const rewards = [
    {
      title: 'USDT Rain',
      amount: '$50.00',
      type: 'USDT',
      participants: '1.2k',
      status: 'Active',
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      title: 'PULSE Drop',
      amount: '500 PULSE',
      type: 'PULSE',
      participants: '3.4k',
      status: 'Active',
      icon: Zap,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'ETH Bonus',
      amount: '0.05 ETH',
      type: 'ETH',
      participants: '850',
      status: 'Active',
      icon: EthIcon,
      color: 'text-secondary',
      bg: 'bg-secondary/10'
    },
  ];

  return (
    <section id="rewards" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2 order-2 lg:order-1">
            <div className="grid grid-cols-1 gap-4">
              {rewards.map((reward, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="flex items-center gap-6 p-4 border-white/5 bg-white/[0.02] group hover:bg-white/[0.05] transition-all">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", reward.bg, reward.color)}>
                      <reward.icon size={28} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg">{reward.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                          {reward.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-white/40 text-sm">
                        <span className="font-mono text-white/60">{reward.amount}</span>
                        <span>•</span>
                        <span>{reward.participants} participants</span>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-primary transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm mb-6">
                <Gift size={20} />
                Daily Reward Drops
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Earn Passive Income <br />
                <span className="text-primary">While You Sleep.</span>
              </h2>
              <p className="text-white/60 text-lg mb-10 leading-relaxed">
                Our automated reward system distributes tokens every 24 hours to active community members. The more you engage, the higher your reward multiplier grows.
              </p>

              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-xl font-bold text-primary">01</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Connect Your Wallet</h4>
                    <p className="text-white/40 text-sm">One-click secure connection with any Web3 provider.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-xl font-bold text-primary">02</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Engage & Participate</h4>
                    <p className="text-white/40 text-sm">Complete simple tasks, predict market moves, or stake tokens.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-xl font-bold text-primary">03</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Claim Your Rewards</h4>
                    <p className="text-white/40 text-sm">Check your dashboard daily and claim your earned crypto.</p>
                  </div>
                </div>
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
