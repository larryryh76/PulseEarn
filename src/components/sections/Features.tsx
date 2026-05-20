import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, Globe, Cpu, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';

const Features: React.FC = () => {
  const features = [
    {
      title: 'Hyper-Fast Rewards',
      description: 'Receive your earnings instantly to your connected wallet. No waiting periods, no minimum withdrawals.',
      icon: Zap,
      color: 'text-primary',
      glow: 'group-hover:shadow-primary/20'
    },
    {
      title: 'Institutional Security',
      description: 'Your assets are protected by industry-leading multi-sig vaults and continuous smart contract audits.',
      icon: Shield,
      color: 'text-accent',
      glow: 'group-hover:shadow-accent/20'
    },
    {
      title: 'Market Predictions',
      description: 'Put your market knowledge to the test. Predict price movements and win from the communal pool.',
      icon: TrendingUp,
      color: 'text-secondary',
      glow: 'group-hover:shadow-secondary/20'
    },
    {
      title: 'Global Ecosystem',
      description: 'PulseEarn is available globally. Connect your wallet and start earning regardless of your location.',
      icon: Globe,
      color: 'text-primary',
      glow: 'group-hover:shadow-primary/20'
    },
    {
      title: 'AI-Driven Insights',
      description: 'Get an edge with our proprietary AI tools that analyze market sentiment and social trends in real-time.',
      icon: Cpu,
      color: 'text-accent',
      glow: 'group-hover:shadow-accent/20'
    },
    {
      title: 'Advanced Analytics',
      description: 'Track your performance with professional-grade charts and detailed breakdown of your earning history.',
      icon: BarChart3,
      color: 'text-secondary',
      glow: 'group-hover:shadow-secondary/20'
    }
  ];

  return (
    <section id="earn" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Built for the <span className="text-primary">Next Generation</span> of Investors
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg"
          >
            We've combined the best of DeFi and gamification to create a platform that's as rewarding as it is engaging.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-white/5",
                  feature.color
                )}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">
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
