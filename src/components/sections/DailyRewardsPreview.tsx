import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Zap, DollarSign, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { useCryptoData } from '../../hooks/useCryptoData';

const DailyRewardsPreview: React.FC = () => {
  const navigate = useNavigate();
  const { marketData } = useCryptoData();

  const btc = marketData.find(c => c.id === 'bitcoin');
  const eth = marketData.find(c => c.id === 'ethereum');

  const rewards = [
    {
      title: 'USDT Rain',
      amount: '$50.00',
      type: 'USDT',
      status: 'Active',
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      title: 'BTC Bonus',
      amount: btc ? `${(50 / btc.current_price).toFixed(6)} BTC` : '--- BTC',
      type: 'BTC',
      status: 'Active',
      icon: Zap,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      title: 'ETH Drop',
      amount: eth ? `${(50 / eth.current_price).toFixed(4)} ETH` : '--- ETH',
      type: 'ETH',
      status: 'Active',
      icon: EthIcon,
      color: 'text-secondary',
      bg: 'bg-secondary/10'
    },
  ];

  return (
    <section id="rewards" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
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
                  <Card className="flex items-center gap-5 p-4 border-white/5 bg-white/[0.02] group hover:bg-white/[0.05] transition-all rounded-2xl">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", reward.bg, reward.color)}>
                      <reward.icon size={24} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-base">{reward.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[8px] font-bold uppercase tracking-wider">
                          {reward.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-white/40 text-xs">
                        <span className="font-mono text-white/60">{reward.amount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/signup')}
                      className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-primary transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 order-1 lg:order-2 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs mb-4">
                <Gift size={16} />
                Daily Reward Drops
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Earn Passive Income <br />
                <span className="text-primary">Every Single Day.</span>
              </h2>
              <p className="text-white/40 text-sm md:text-lg mb-10 leading-relaxed">
                Our automated system distributes rewards every 24 hours. Connect, engage, and grow your portfolio effortlessly.
              </p>

              <div className="flex flex-col gap-5 text-left max-w-md mx-auto lg:mx-0">
                {[
                  { step: '01', title: 'Join PulseEarn', desc: 'Create your account in seconds.' },
                  { step: '02', title: 'Start Earning', desc: 'Complete daily missions and tasks.' },
                  { step: '03', title: 'Claim Rewards', desc: 'Watch your point balance grow daily.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                      <span className="text-sm font-bold text-primary">{item.step}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-0.5">{item.title}</h4>
                      <p className="text-white/30 text-xs">{item.desc}</p>
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
