import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FinalCTA: React.FC = () => {
  return (
    <section className="py-32 md:py-48 relative overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-primary/10 blur-[200px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/10 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Ready to Start?
          </motion.div>

          {/* Main Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-text-primary tracking-tighter mb-8 uppercase leading-[1.05]"
          >
            Stop Wasting <br className="hidden sm:block" />
            Your Potential
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-text-secondary font-medium mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Join thousands of verified earners already maximizing their potential through genuine opportunities.
            Sign up in seconds. Start earning today.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <button className="px-12 py-6 rounded-2xl bg-text-primary text-background font-black text-base uppercase tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-primary/30">
              Get Started Now
            </button>
            <button className="px-8 py-6 rounded-2xl border border-border bg-surface-glass hover:bg-surface-glass-hover font-bold text-sm uppercase tracking-widest text-text-primary transition-all">
              Learn More
            </button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-6 justify-center items-center text-sm font-bold uppercase tracking-widest text-text-tertiary"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              Fully Verified
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              No Credit Card Required
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              Instant Withdrawal
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex justify-center mt-20"
        >
          <div className="flex flex-col items-center gap-3 text-text-tertiary">
            <span className="text-xs font-bold uppercase tracking-widest">Explore More</span>
            <ChevronDown size={20} />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
