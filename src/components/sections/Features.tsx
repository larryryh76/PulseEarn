import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, Globe, CreditCard, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';

const Features: React.FC = () => {
  const features = [
    {
      title: 'Real-Time Rewards',
      description: 'Receive your earnings instantly. No waiting periods, no minimum withdrawals, just pure value.',
      icon: Zap,
      color: 'text-primary',
    },
    {
      title: 'Secure & Private',
      description: 'Your data and assets are protected by industry-leading security standards and encryption.',
      icon: Shield,
      color: 'text-accent',
    },
    {
      title: 'Market Insights',
      description: 'Put your market knowledge to the test. Predict movements and earn rewards from the pool.',
      icon: TrendingUp,
      color: 'text-secondary',
    },
    {
      title: 'Global Access',
      description: 'Join the PulseEarn ecosystem from anywhere in the world and start growing your portfolio.',
      icon: Globe,
      color: 'text-primary',
    },
    {
      title: 'Multi-Asset Support',
      description: 'Manage and earn in multiple digital assets, including BTC, ETH, and our native points.',
      icon: CreditCard,
      color: 'text-accent',
    },
    {
      title: 'Detailed Tracking',
      description: 'Monitor your progress with professional-grade analytics and clear history logs.',
      icon: BarChart3,
      color: 'text-secondary',
    }
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-4"
          >
            Built for Modern Crypto Users
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/40 text-base md:text-lg"
          >
            A clean, powerful, and rewarding experience designed to help you grow.
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
              <Card className="h-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 rounded-3xl p-8">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-white/5",
                  feature.color
                )}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">
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
