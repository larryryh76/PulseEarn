import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="relative pt-32 pb-24 md:pt-48 md:pb-40 overflow-hidden">
      {/* Refined Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[140px] opacity-40" />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-primary text-xs font-bold tracking-wider uppercase mb-8 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
            Ecosystem v2.0 is live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold leading-[1.05] mb-8 tracking-tight"
          >
            The New Standard for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">Crypto Earning</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="text-white/50 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed font-medium"
          >
            PulseEarn bridges institutional-grade security with high-yield gamification. Navigate the future of decentralized finance with precision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
          >
            <Button size="lg" glow className="px-10" onClick={() => navigate('/signup')}>
              Get Started
              <ArrowRight size={18} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-10"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Protocol
            </Button>
          </motion.div>

          {/* Refined Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mt-24 pt-12 border-t border-white/[0.05] w-full"
          >
            {[
              { label: 'Active Users', value: '120K+', icon: User },
              { label: 'Total Rewards', value: '$12.5M+', icon: Zap },
              { label: 'Daily Volume', value: '$4.2M+', icon: TrendingUp },
              { label: 'Network Uptime', value: '99.9%', icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center md:items-start gap-1">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                <span className="text-2xl font-mono font-bold text-white/90 tracking-tight">{stat.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const User = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default Hero;
