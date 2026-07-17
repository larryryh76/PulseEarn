import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Lock, Eye, Zap, BarChart3 } from 'lucide-react';

const TrustSecurity: React.FC = () => {
  const features = [
    {
      icon: Shield,
      title: 'Fraud Prevention',
      description: 'Advanced verification systems detect and prevent fraudulent activity in real-time.',
      points: ['Activity Verification', 'Device Tracking', 'Behavioral Analysis'],
    },
    {
      icon: Lock,
      title: 'Secure Transactions',
      description: 'All rewards are encrypted and stored with enterprise-grade security protocols.',
      points: ['256-bit Encryption', 'Firestore Security', 'Regular Audits'],
    },
    {
      icon: Eye,
      title: 'Transparent Ledger',
      description: 'Every point earned is logged and accessible in your personal history.',
      points: ['Real-time Logs', 'Full Audit Trail', 'Export Records'],
    },
    {
      icon: CheckCircle,
      title: 'Verified Rewards',
      description: 'Human and automated review ensures only legitimate activity earns points.',
      points: ['Multi-step Review', 'Quality Assurance', 'Instant Settlements'],
    },
    {
      icon: Zap,
      title: 'Instant Payouts',
      description: 'No hidden holds or arbitrary delays. Withdraw verified rewards anytime.',
      points: ['Immediate Processing', 'Multiple Currencies', 'Low Fees'],
    },
    {
      icon: BarChart3,
      title: 'Transparent Economy',
      description: 'Our reward system is based on verifiable market data and fair distribution.',
      points: ['Public Metrics', 'Fair Pricing', 'No Manipulation'],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
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
            <Shield size={14} />
            Trust & Security
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            Your Security <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              is Our Priority
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            We've built PulseEarn on trust. Every feature is designed to protect your rewards,
            verify legitimate activity, and ensure complete transparency.
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants} className="group">
              <div className="h-full p-8 md:p-10 rounded-3xl border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright hover:border-primary/30 transition-all duration-500">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border-bright flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon size={28} className="text-primary" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-text-secondary text-sm font-medium mb-6 leading-relaxed">
                  {feature.description}
                </p>

                {/* Points List */}
                <div className="space-y-3 pt-6 border-t border-border/50">
                  {feature.points.map((point, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-text-tertiary text-xs font-bold uppercase tracking-widest">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Platform Verification Ledger */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 p-8 md:p-10 rounded-[2.5rem] border border-border bg-surface-bright/40 backdrop-blur-sm hover:border-primary/20 transition-colors duration-300"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-md">
                Live Audit Stream
              </span>
              <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mt-3">
                Decentralized Fraud Verification Ledger
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Fully Synchronized with Verification Nodes
            </div>
          </div>

          <div className="space-y-3 font-mono">
            {[
              { id: 'TX-984201', event: 'App Installation Verify', action: 'Fraud Audit Pass', node: 'NODE_04', time: 'Just Now' },
              { id: 'TX-984196', event: 'USDT Settlement Verification', action: 'Settlement Signed', node: 'NODE_09', time: '2m ago' },
              { id: 'TX-984191', event: '7-Day Streak Validation', action: 'Multi-device Scan Pass', node: 'NODE_12', time: '5m ago' },
            ].map((log, index) => (
              <div key={index} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-surface/60 border border-border/50 text-[11px] hover:bg-surface-bright/80 transition-colors gap-2">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-primary">{log.id}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-text-secondary">{log.event}</span>
                </div>
                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <span className="px-2 py-0.5 rounded bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
                    {log.action}
                  </span>
                  <span className="text-text-tertiary font-bold">{log.node}</span>
                  <span className="text-text-tertiary/60">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {[
            { label: 'Audit Rating', value: 'A+' },
            { label: 'Average Processing Time', value: '< 15m' },
            { label: 'System Uptime', value: '99.99%' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-8 rounded-3xl border border-border bg-surface-bright/50 backdrop-blur-sm"
            >
              <div className="text-4xl md:text-5xl font-black text-primary mb-3">
                {stat.value}
              </div>
              <div className="text-text-tertiary text-xs font-bold uppercase tracking-[0.2em]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSecurity;
