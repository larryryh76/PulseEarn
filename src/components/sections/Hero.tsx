import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Zap, Globe, Lock, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { cn } from '../../utils';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-24 md:pt-48 md:pb-40 overflow-hidden">
      {/* IMMERSIVE BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] opacity-70" />
        <motion.div style={{ y: y2 }} className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[160px] opacity-50" />

        {/* DYNAMIC GRID */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        {/* FLOATING ORBS */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 5 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={cn(
              "absolute rounded-full bg-primary/20 blur-3xl",
              i === 0 ? "top-1/4 left-1/4 w-32 h-32" : i === 1 ? "bottom-1/4 right-1/3 w-48 h-48" : "top-1/2 right-1/4 w-24 h-24"
            )}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

          {/* BADGE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group cursor-pointer inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-10 backdrop-blur-md hover:bg-white/[0.05] transition-all"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </div>
            Protocol v2.4 Node synchronization complete
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </motion.div>

          {/* MAIN TITLE */}
          <motion.div
            style={{ opacity }}
            className="space-y-6 mb-12"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl md:text-8xl lg:text-[10rem] font-heading font-bold leading-[0.9] tracking-tighter"
            >
              ENGINEERING <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/20">WEALTH</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="flex items-center justify-center gap-4 text-white/20"
            >
               <div className="h-[1px] w-12 bg-white/10" />
               <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-white/40">The Institutional Standard</span>
               <div className="h-[1px] w-12 bg-white/10" />
            </motion.div>
          </motion.div>

          {/* DESCRIPTION */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-white/50 text-lg md:text-2xl max-w-3xl mb-16 leading-relaxed font-medium"
          >
            PulseEarn is the premiere yield orchestration layer for the next generation of digital assets. Professional tools, extreme rewards, zero friction.
          </motion.p>

          {/* ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
          >
            <Button size="lg" glow className="px-12 py-8 text-sm uppercase tracking-widest font-bold" onClick={() => navigate('/signup')}>
              Initialize Account
              <Cpu size={20} className="ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-12 py-8 text-sm uppercase tracking-widest font-bold border-white/10 hover:bg-white/5"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Ecosystem
            </Button>
          </motion.div>

          {/* TRUST BAR / STATS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="w-full max-w-6xl mt-32 pt-16 border-t border-white/[0.05]"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16">
              {[
                { label: 'Network Value', value: '$14.2B', icon: Globe, detail: 'LOCKED ASSETS' },
                { label: 'Oracle Precision', value: '99.98%', icon: CpuIcon, detail: 'UPTIME SLA' },
                { label: 'Security Grade', value: 'AAA+', icon: Lock, detail: 'QUANTUM READY' },
                { label: 'User Yield', value: '$1.4M', icon: Zap, detail: 'PAID DAILY' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center md:items-start text-left group">
                  <div className="flex items-center gap-3 mb-4">
                     <stat.icon size={16} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                     <span className="text-white/20 text-[9px] font-bold uppercase tracking-[0.3em] group-hover:text-primary transition-colors">{stat.label}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-3xl md:text-4xl font-bold text-white tracking-tighter group-hover:scale-105 origin-left transition-transform duration-500">{stat.value}</span>
                     <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest mt-1">{stat.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CpuIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9h6v6H9z" />
    <path d="M15 2v2" />
    <path d="M9 2v2" />
    <path d="M15 20v2" />
    <path d="M9 20v2" />
    <path d="M20 15h2" />
    <path d="M20 9h2" />
    <path d="M2 15h2" />
    <path d="M2 9h2" />
  </svg>
);

export default Hero;
