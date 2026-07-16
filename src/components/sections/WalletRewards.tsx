import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Award, Lock } from 'lucide-react';

const WalletRewards: React.FC = () => {
  const rewardFlow = [
    {
      step: 1,
      title: 'Earn PTS',
      description: 'Complete verified activities and accumulate points',
      icon: TrendingUp,
      color: 'from-primary/20 to-primary/5',
    },
    {
      step: 2,
      title: 'Convert',
      description: 'Exchange PTS 1:1 for USDT at market rates',
      icon: Wallet,
      color: 'from-accent/20 to-accent/5',
    },
    {
      step: 3,
      title: 'Secure',
      description: 'Funds held in your verified wallet account',
      icon: Lock,
      color: 'from-success/20 to-success/5',
    },
    {
      step: 4,
      title: 'Withdraw',
      description: 'Transfer to external wallet or bank anytime',
      icon: Award,
      color: 'from-warning/20 to-warning/5',
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full -translate-y-1/2" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-6"
          >
            <Wallet size={14} />
            Wallet & Rewards
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            Your Rewards, <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Your Control
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            Convert your PTS to real money instantly. Withdraw anytime with no hidden fees or minimum balance.
          </motion.p>
        </div>

        {/* Reward Flow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="relative">
            {/* Desktop Flow Lines */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {rewardFlow.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="p-8 rounded-3xl border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright hover:border-primary/30 transition-all duration-500">
                    {/* Step Number */}
                    <div className="absolute -top-4 left-6 w-10 h-10 rounded-full bg-primary text-background flex items-center justify-center font-black text-sm">
                      {item.step}
                    </div>

                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} border border-border-bright flex items-center justify-center mb-6`}>
                      <item.icon size={24} className="text-primary" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-2">
                      {item.title}
                    </h3>
                    <p className="text-text-secondary text-sm font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
        >
          {[
            {
              title: 'Multiple Withdrawal Options',
              items: ['Direct to Crypto Wallet', 'Bank Transfer', 'Payment Platform', 'Instant Settlement'],
            },
            {
              title: 'Real-Time Conversion',
              items: ['Market-Based Rates', 'No Hidden Fees', 'Transparent Pricing', 'Lock-In Available'],
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl border border-border bg-surface-bright/50 backdrop-blur-sm"
            >
              <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-6">
                {feature.title}
              </h3>
              <div className="space-y-4">
                {feature.items.map((item, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-text-secondary font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WalletRewards;
