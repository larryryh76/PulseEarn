import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, Globe, CreditCard, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';

const Features: React.FC = () => {
  const features = [
    {
      title: 'High-Velocity Settlement',
      description: 'Receive your earnings instantly via the Pulse settlement layer. Zero latency, institutional-grade execution.',
      icon: Zap,
      color: 'text-primary',
    },
    {
      title: 'Institutional Security',
      description: 'Multi-layer identity verification and atomic claim nonces ensure your assets remain protected.',
      icon: Shield,
      color: 'text-primary',
    },
    {
      title: 'Market Signal Engine',
      description: 'Synthesize market trends and execute forecasts. Capitalize on real-time volatility with high-fidelity oracles.',
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'Global Infrastructure',
      description: 'Join a borderless ecosystem powered by distributed nodes and real-time market signals.',
      icon: Globe,
      color: 'text-primary',
    },
    {
      title: 'Unified Economy',
      description: 'Single point of truth for rewards, XP, and market capital. One ledger, complete transparency.',
      icon: CreditCard,
      color: 'text-primary',
    },
    {
      title: 'Execution Auditing',
      description: 'Every action is logged in your immutable settlement ledger. Audit your growth with professional precision.',
      icon: BarChart3,
      color: 'text-primary',
    }
  ];

  return (
    <section id="features" className="py-32 relative overflow-hidden bg-[#050507]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-primary text-[10px] font-bold tracking-[0.3em] uppercase mb-4"
            >
              System Infrastructure
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
            >
              Engineered for the <br />
              <span className="text-white/20 uppercase">Next Era of Rewards.</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="hidden md:block"
          >
             <p className="text-white/40 text-lg font-medium tracking-tight max-w-sm text-right">
                A high-fidelity platform designed for professional capital scaling and market engagement.
             </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-primary/20 transition-all duration-500 rounded-[2rem] p-10 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-8 bg-white/5 border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors",
                  feature.color
                )}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white uppercase tracking-tight">{feature.title}</h3>
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
