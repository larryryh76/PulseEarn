import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Zap, Globe, Lock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 md:pt-40 md:pb-32 overflow-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px] opacity-70" />
        <motion.div style={{ y: y2 }} className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[140px] opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          {/* BADGE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary text-[10px] font-bold tracking-widest uppercase mb-8 backdrop-blur-md"
          >
            <div className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </div>
            Join the Next Era of Rewards
          </motion.div>

          {/* MAIN TITLE */}
          <motion.div
            style={{ opacity }}
            className="space-y-4 mb-8"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.9] tracking-tighter"
            >
              EARN <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/30">REWARDS.</span>
            </motion.h1>
          </motion.div>

          {/* DESCRIPTION */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-white/50 text-base md:text-xl max-w-2xl mb-12 leading-relaxed font-medium"
          >
            The modern way to grow your crypto holdings. Predict market movements, complete missions, and earn exclusive rewards on PulseEarn.
          </motion.p>

          {/* ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
          >
            <Button size="lg" className="px-12 py-7 text-[11px] uppercase tracking-[0.2em] font-bold bg-white text-black hover:bg-white/90" onClick={() => navigate('/signup')}>
              Launch App
              <ArrowRight size={16} className="ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-12 py-7 text-[11px] uppercase tracking-[0.2em] font-bold border-white/10 hover:bg-white/5"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              The Ecosystem
            </Button>
          </motion.div>

          {/* STATS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-full mt-24 pt-12 border-t border-white/[0.05]"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Total Rewards', value: '$1.4M', icon: Zap },
                { label: 'Active Users', value: '45K+', icon: Globe },
                { label: 'Security Grade', value: 'AAA', icon: Lock },
                { label: 'Daily Volume', value: '$8.2M', icon: TrendingUp },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-white/20">
                     <stat.icon size={12} className="text-primary opacity-50" />
                     <span className="text-[9px] font-bold uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-tighter">{stat.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
