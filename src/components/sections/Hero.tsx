import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Zap, TrendingUp, ShieldCheck, Activity, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-32 overflow-hidden">
      {/* PREMIUM BACKGROUND ARCHITECTURE */}
      <div className="absolute inset-0 -z-10">
        <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[160px] opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-6xl mx-auto">

          {/* BADGE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-xl whitespace-nowrap"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </div>
            Start Earning Rewards Today
          </motion.div>

          {/* MAIN TITLE */}
          <motion.div
            style={{ opacity }}
            className="space-y-6 mb-12 w-full"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.1] sm:leading-[1.1] tracking-tight text-white break-words"
            >
              EARN <br className="hidden sm:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">REWARDS.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/60 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium px-4"
            >
              Discover a transparent reward ecosystem. Earn points through verified community activities and market-based forecasting campaigns.
            </motion.p>
          </motion.div>

          {/* PRIMARY ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-24"
          >
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
            >
              Learn More
            </button>
          </motion.div>

          {/* HIGH-FIDELITY DASHBOARD MOCKUP */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative w-full max-w-5xl mx-auto group"
          >
             <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 to-transparent blur-3xl opacity-30 group-hover:opacity-50 transition duration-1000" />
             <div className="relative bg-black rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* Mock Header */}
                <div className="h-16 border-b border-white/5 bg-white/[0.01] flex items-center justify-between px-10">
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                   </div>
                   <div className="px-4 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                      app.pulseearn.io/dashboard
                   </div>
                   <div className="w-20" />
                </div>

                {/* Mock Content */}
                <div className="p-6 md:p-10 flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
                   {/* Main Section */}
                   <div className="lg:col-span-8 space-y-6 md:space-y-8">
                      <div className="h-32 sm:h-40 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-6 md:p-8 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Balance</span>
                            <Zap size={20} className="text-primary" />
                         </div>
                         <div className="flex items-baseline gap-2 md:gap-3">
                            <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tighter">---,---</span>
                            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-white/20 uppercase tracking-widest font-mono">PTS</span>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                         <div className="h-40 md:h-48 rounded-2xl md:rounded-3xl bg-white/[0.02] border border-white/5 p-5 md:p-6 space-y-4">
                            <div className="flex items-center gap-2 text-success">
                               <TrendingUp size={16} />
                               <span className="text-[10px] font-bold uppercase">Daily Profit</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full w-2/3 bg-success/40" />
                            </div>
                            <div className="flex -space-x-2 pt-2 md:pt-4">
                               {[1,2,3,4].map(i => (
                                 <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white/10" />
                               ))}
                            </div>
                         </div>
                         <div className="h-40 md:h-48 rounded-2xl md:rounded-3xl bg-white/[0.02] border border-white/5 p-5 md:p-6 space-y-4">
                            <div className="flex items-center gap-2 text-primary">
                               <ShieldCheck size={16} />
                               <span className="text-[10px] font-bold uppercase">System Status</span>
                            </div>
                            <div className="space-y-2 pt-2">
                               <div className="h-2 w-full bg-white/5 rounded-sm" />
                               <div className="h-2 w-4/5 bg-white/5 rounded-sm" />
                               <div className="h-2 w-3/5 bg-white/5 rounded-sm" />
                            </div>
                         </div>
                      </div>
                   </div>
                   {/* Sidebar Section */}
                   <div className="lg:col-span-4 space-y-6 md:space-y-8">
                      <div className="rounded-2xl md:rounded-3xl border border-white/5 bg-white/[0.01] p-5 md:p-6 space-y-6">
                         <div className="flex items-center gap-2 text-white/20">
                            <Activity size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Live Feed</span>
                         </div>
                         <div className="space-y-4">
                            {[1,2,3].map(i => (
                              <div key={i} className="flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                 <div className="flex-1 h-2 bg-white/5 rounded-full" />
                                 <div className="w-8 h-2 bg-primary/20 rounded-full" />
                              </div>
                            ))}
                         </div>
                      </div>
                      <div className="rounded-2xl md:rounded-3xl border border-white/5 bg-white/[0.01] p-5 md:p-6 flex flex-col items-center gap-4 text-center">
                         <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                            <Target size={24} />
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Account Status</p>
                            <p className="text-xl font-bold text-white tracking-tighter">LVL 24</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
