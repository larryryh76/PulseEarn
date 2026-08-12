import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Target, ShieldCheck, Cpu, Zap, Crown, ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react';

const WalletRewards: React.FC = () => {
  const economyFlow = [
    {
      step: '01',
      title: 'Opportunity',
      description: 'Select campaigns, tasks, and price forecasting pools.',
      icon: Target,
      color: 'from-blue-500/20 to-blue-600/5',
    },
    {
      step: '02',
      title: 'Verification',
      description: 'Intelligent backend nodes audit and authenticate work.',
      icon: ShieldCheck,
      color: 'from-purple-500/20 to-purple-600/5',
    },
    {
      step: '03',
      title: 'Point Engine',
      description: 'PTS rewards are instantly minted to public ledger.',
      icon: Cpu,
      color: 'from-accent/20 to-accent/5',
    },
    {
      step: '04',
      title: 'Wallet',
      description: 'PTS balance is held in your secure encrypted wallet.',
      icon: Wallet,
      color: 'from-green-500/20 to-green-600/5',
    },
    {
      step: '05',
      title: 'XP Growth',
      description: 'Experience points accumulate with every action.',
      icon: Zap,
      color: 'from-yellow-500/20 to-yellow-600/5',
    },
    {
      step: '06',
      title: 'Level Up',
      description: 'Ascend levels to unlock higher campaign reward multipliers.',
      icon: Crown,
      color: 'from-orange-500/20 to-orange-600/5',
    },
    {
      step: '07',
      title: 'Withdrawal',
      description: 'Convert PTS 1:1 for USDT or crypto directly to you.',
      icon: ArrowUpRight,
      color: 'from-red-500/20 to-red-600/5',
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
            <Sparkles size={14} />
            Ecosystem Economy Flow
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            Visualizing the <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Economy
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            From opportunity discovery to secure verification and instant settlement. Experience a premium,
            stable reward pipeline designed around transparent user milestones.
          </motion.p>
        </div>

        {/* 7-Step Economy Flow Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {economyFlow.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.6 }}
                  className="relative group"
                >
                  <div className="h-full p-6 rounded-2xl border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright hover:border-primary/30 transition-all duration-500 flex flex-col justify-between">
                    <div>
                      {/* Step Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                          STEP {item.step}
                        </span>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} border border-border-bright flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <item.icon size={18} className="text-primary" />
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-tight mb-2">
                        {item.title}
                      </h3>
                      <p className="text-text-secondary text-[11px] font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Flow connection indicators (Desktop only) */}
                  {index < economyFlow.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 text-text-tertiary/30">
                      <ChevronRight size={16} />
                    </div>
                  )}
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
              title: 'Flexible Withdrawal Channels',
              items: ['Direct-to-Wallet Crypto Transfers', 'Centralized Settlement Integrations', 'Near-Instant Token Minting', 'No Lock-ups or Arbitrary Limits'],
            },
            {
              title: 'Point Transaction Engine Protocol',
              items: ['1:1 PTS Conversion At Market Value', 'Zero Hidden Network Service Fees', 'Fully Auditable Platform Ledgers', 'Double-Spend & Verification Shield'],
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2rem] border border-border bg-surface-bright/50 backdrop-blur-sm hover:border-border-bright transition-colors"
            >
              <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-6 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feature.title}
              </h3>
              <div className="space-y-4">
                {feature.items.map((item, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    <span className="text-text-secondary text-xs font-semibold uppercase tracking-wider">{item}</span>
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
