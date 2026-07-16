import React from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, Wallet, Trophy } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Find Opportunity',
      description: 'Browse verified tasks, surveys, apps, and predictions from our marketplace.',
      icon: Zap,
      color: 'from-primary/20 to-primary/5',
    },
    {
      step: '02',
      title: 'Complete Activity',
      description: 'Engage with genuine opportunities and provide real value to campaigns.',
      icon: CheckCircle,
      color: 'from-accent/20 to-accent/5',
    },
    {
      step: '03',
      title: 'Earn PTS',
      description: 'Receive verified points instantly for every completed action.',
      icon: Zap,
      color: 'from-success/20 to-success/5',
    },
    {
      step: '04',
      title: 'Level Up',
      description: 'Unlock higher rewards and exclusive opportunities as you climb levels.',
      icon: Trophy,
      color: 'from-warning/20 to-warning/5',
    },
    {
      step: '05',
      title: 'Withdraw Rewards',
      description: 'Convert PTS to USDT or crypto and transfer to your wallet anytime.',
      icon: Wallet,
      color: 'from-primary/20 to-primary/5',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
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
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            The Path to Rewards
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            How PulseEarn <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Works
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            Five simple steps from opportunity to real rewards. No hype, no gatekeeping—just a transparent
            economy built on real activity and real value.
          </motion.p>
        </div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4 lg:gap-6 mb-16"
        >
          {steps.map((item, index) => (
            <motion.div key={index} variants={itemVariants} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-24 left-[calc(50%+60px)] right-[calc(-50%)] h-1 bg-gradient-to-r from-border via-primary/20 to-border pointer-events-none" />
              )}

              <div className="relative h-full">
                {/* Card */}
                <div className="p-8 rounded-3xl border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright hover:border-primary/30 transition-all duration-500 h-full flex flex-col">
                  {/* Step Number */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                      Step {item.step}
                    </div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} border border-border-bright flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <item.icon size={24} className="text-primary" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg md:text-base lg:text-lg font-black text-text-primary uppercase tracking-tight mb-3 leading-tight">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-text-secondary text-sm font-medium leading-relaxed flex-grow">
                    {item.description}
                  </p>

                  {/* Bottom Accent */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      Essential
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Key Principles */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-surface-bright/50 border border-border backdrop-blur-sm rounded-[2.5rem] p-8 md:p-12"
        >
          <h3 className="text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight mb-8">
            Built on These Principles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Transparent',
                desc: 'Every point earned is logged. Every transaction is verifiable.',
              },
              {
                title: 'Immediate',
                desc: 'No waiting weeks. Rewards settle within hours of verification.',
              },
              {
                title: 'Accessible',
                desc: 'Available worldwide to anyone with real activity to offer.',
              },
            ].map((principle, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h4 className="font-black text-text-primary uppercase tracking-wider text-sm">
                    {principle.title}
                  </h4>
                </div>
                <p className="text-text-secondary text-sm font-medium leading-relaxed">
                  {principle.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
