import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, Globe, CreditCard, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';

const Features: React.FC = () => {
  const features = [
    {
      title: 'Instant Payouts',
      description: 'Receive your earnings instantly to your linked wallet. No waiting, no delays.',
      icon: Zap,
      color: 'text-primary',
    },
    {
      title: 'Secure Platform',
      description: 'State-of-the-art security measures to keep your account and data safe.',
      icon: Shield,
      color: 'text-primary',
    },
    {
      title: 'Market Insights',
      description: 'Access real-time market data and trends to help you make informed predictions.',
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'Global Access',
      description: 'PulseEarn is available worldwide. Join our community from anywhere.',
      icon: Globe,
      color: 'text-primary',
    },
    {
      title: 'Earn Points',
      description: 'Earn points for every task you complete and prediction you make.',
      icon: CreditCard,
      color: 'text-primary',
    },
    {
      title: 'Transparent Logs',
      description: 'Every point you earn is recorded in your personal activity history.',
      icon: BarChart3,
      color: 'text-primary',
    }
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-[#050507]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-8 mb-12 md:mb-16 text-center md:text-left">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4"
            >
              Why PulseEarn?
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight"
            >
              Simple. Fast. <br className="hidden sm:block" />
              <span className="text-white/40">Rewarding.</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="hidden md:block"
          >
             <p className="text-white/50 text-base font-medium max-w-sm text-right">
                Discover the most efficient way to earn rewards by participating in our growing ecosystem.
             </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-primary/20 transition-all duration-500 rounded-3xl p-8 md:p-10 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 md:mb-8 bg-white/5 border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors",
                  feature.color
                )}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 md:mb-4 text-white uppercase tracking-tight">{feature.title}</h3>
                <p className="text-white/30 leading-relaxed text-sm font-medium uppercase tracking-tighter">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
