import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, TrendingUp, ShieldCheck, Activity, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Premium interactive states
  const [balance, setBalance] = useState(0);
  const [feedEntries, setFeedEntries] = useState([
    { id: 1, text: '@0x3a... completed Survey Campaign', reward: '+150 PTS', type: 'survey' },
    { id: 2, text: '@sarah_k won Bitcoin Daily Predict', reward: '+350 PTS', type: 'predict' },
    { id: 3, text: '@alex_m claimed 7-Day Streak', reward: '+200 PTS', type: 'streak' },
  ]);

  // Balance Counter Animation on mount
  useEffect(() => {
    const end = 124550;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad

      setBalance(Math.floor(easeProgress * end));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    requestAnimationFrame(animateCount);
  }, []);

  // Periodic Live Feed rotation simulator
  useEffect(() => {
    const activities = [
      { text: '@0x8f... finished App Install', reward: '+100 PTS', type: 'app' },
      { text: '@jordan_t completed Ad Mission', reward: '+50 PTS', type: 'video' },
      { text: '@0x5c... completed Profile Verify', reward: '+80 PTS', type: 'verify' },
      { text: '@clara_p won Sol Forecast Challenge', reward: '+420 PTS', type: 'predict' },
      { text: '@0x9a... completed Finance Survey', reward: '+120 PTS', type: 'survey' },
    ];

    const interval = setInterval(() => {
      const nextActivity = activities[Math.floor(Math.random() * activities.length)];
      setFeedEntries(prev => {
        const updated = [{ id: Date.now(), ...nextActivity }, ...prev];
        if (updated.length > 4) updated.pop();
        return updated;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 md:pt-32 pb-24 md:pb-32 overflow-hidden bg-background transition-colors duration-300">
      {/* PREMIUM BACKGROUND ARCHITECTURE */}
      <div className="absolute inset-0 -z-10">
        <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[160px] opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-6xl mx-auto">

          {/* BADGE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-accent border border-border-bright text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-xl whitespace-nowrap"
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
            className="space-y-6 mb-8 md:mb-12 w-full relative"
          >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 blur-[120px] -z-10" />

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.05] sm:leading-[1.05] tracking-tight text-text-primary break-words uppercase"
            >
              EARN <br className="hidden sm:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-primary to-primary-bright">REWARDS.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-text-secondary text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium px-4"
            >
              Discover a transparent reward ecosystem. Earn PTS through verified community activities and market-based forecasting campaigns.
            </motion.p>
          </motion.div>

          {/* PRIMARY ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-24 relative"
          >
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 rounded-xl bg-text-primary text-background font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-5 rounded-xl bg-surface-glass border border-border-bright text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-glass-hover active:scale-95 transition-all flex items-center justify-center"
            >
              Learn More
            </button>
          </motion.div>

          {/* HIGH-FIDELITY DASHBOARD MOCKUP */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative w-full max-w-5xl mx-auto group"
          >
             {/* Pulsing Gradient Glow behind mockups */}
             <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 to-accent/10 blur-3xl opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse" />

             {/* Floating Phone Mockup showing PulseEarn */}
             <motion.div
               animate={{ y: [0, -18, 0], rotate: [0, 1, 0] }}
               transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
               className="absolute -right-8 -bottom-12 lg:-right-16 lg:-bottom-16 w-[250px] h-[490px] hidden md:block z-30 pointer-events-none drop-shadow-2xl"
             >
               {/* Smartphone Frame */}
               <div className="relative w-full h-full bg-[#08080C] rounded-[2.5rem] border-[6px] border-[#1E1E2C] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col p-2.5">
                 {/* Speaker Notch */}
                 <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#1E1E2C] rounded-full z-40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#08080C]" />
                 </div>

                 {/* Screen Content */}
                 <div className="w-full h-full bg-[#0A0A10] rounded-[1.8rem] overflow-hidden p-4 flex flex-col justify-between border border-white/5 relative">
                    {/* Glowing Accent */}
                    <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-primary/20 rounded-full blur-[40px]" />

                    {/* Mobile Header */}
                    <div className="flex justify-between items-center pt-3 z-10">
                       <span className="text-[10px] font-black text-text-primary uppercase tracking-wider font-mono">PulseEarn Mobile</span>
                       <div className="flex gap-1.5 items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                          <span className="text-[8px] font-black text-success uppercase tracking-widest font-mono">Active</span>
                       </div>
                    </div>

                    {/* Available Balance Card */}
                    <div className="p-3.5 rounded-2xl bg-surface/90 border border-border/80 space-y-1.5 z-10">
                       <span className="text-[7px] font-black text-text-tertiary uppercase tracking-widest block">Available Balance</span>
                       <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-text-primary tracking-tight font-mono">
                             {balance.toLocaleString()}
                          </span>
                          <span className="text-[8px] font-bold text-primary font-mono">PTS</span>
                       </div>
                    </div>

                    {/* Streak Tracker Card */}
                    <div className="p-3.5 rounded-2xl bg-surface/90 border border-border/80 z-10 flex items-center justify-between">
                       <div className="space-y-0.5">
                          <span className="text-[7px] font-black text-text-tertiary uppercase tracking-widest block">Daily Streak</span>
                          <span className="text-[10px] font-black text-text-primary uppercase tracking-tight">7 Consecutive Days</span>
                       </div>
                       <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                          <span className="text-xs">🔥</span>
                          <span className="text-[9px] font-black text-orange-400 font-mono">7x</span>
                       </div>
                    </div>

                    {/* Active Forecast */}
                    <div className="p-3.5 rounded-2xl bg-surface/90 border border-border/80 z-10 space-y-1.5">
                       <div className="flex justify-between items-center">
                          <span className="text-[7px] font-black text-text-tertiary uppercase tracking-widest">Active Forecast</span>
                          <span className="text-[8px] font-black text-success uppercase tracking-widest font-mono">BTC UP</span>
                       </div>
                       <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-text-primary font-mono">BTC / USDT</span>
                          <span className="text-[10px] font-black text-primary font-mono">+300 PTS</span>
                       </div>
                       {/* Sparkline */}
                       <div className="h-6 w-full overflow-hidden flex items-end">
                          <div className="flex items-end gap-1 w-full h-full pt-1.5">
                             {[15, 30, 20, 45, 35, 65, 50, 85].map((val, idx) => (
                               <div
                                 key={idx}
                                 style={{ height: `${val}%` }}
                                 className="flex-1 bg-gradient-to-t from-primary/20 to-primary rounded-t-sm"
                               />
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* Mobile Footer Navigation Bar */}
                    <div className="flex justify-between items-center px-4 pt-3 border-t border-border/40 z-10">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                       <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary/40" />
                       <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary/40" />
                       <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary/40" />
                    </div>
                 </div>
               </div>
             </motion.div>

             <div className="relative bg-surface rounded-[2rem] md:rounded-[3rem] border border-border shadow-premium overflow-hidden">
                {/* Mock Header */}
                <div className="h-16 border-b border-border bg-surface-bright flex items-center justify-between px-6 md:px-10">
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                   </div>
                   <div className="px-4 py-1 rounded-md bg-surface-glass border border-border text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
                      pulseearn.online/dashboard
                   </div>
                   <div className="w-20" />
                </div>

                {/* Mock Content */}
                <div className="p-6 md:p-10 flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
                   {/* Main Section */}
                   <div className="lg:col-span-8 space-y-6 md:space-y-8">
                      <div className="h-32 sm:h-40 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-6 md:p-8 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
                         <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Available Balance</span>
                            <Zap size={20} className="text-primary animate-pulse" />
                         </div>
                         <div className="flex items-baseline gap-2 md:gap-3">
                            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tighter font-mono">
                              {balance.toLocaleString()}
                            </span>
                            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-text-tertiary uppercase tracking-widest font-mono">PTS</span>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                         <div className="h-40 md:h-48 rounded-2xl md:rounded-3xl bg-surface-bright border border-border p-5 md:p-6 space-y-4 hover:border-primary/20 transition-colors duration-300">
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-2 text-success">
                                  <TrendingUp size={16} />
                                  <span className="text-[10px] font-bold uppercase">Daily Profit</span>
                               </div>
                               <span className="text-xs font-bold text-success font-mono">+2,450 PTS</span>
                            </div>
                            <div className="h-2 w-full bg-surface-glass rounded-full overflow-hidden">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: '74%' }}
                                 transition={{ duration: 1.5, ease: 'easeOut' }}
                                 className="h-full bg-success"
                               />
                            </div>
                            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
                               74% of daily target reached
                            </p>
                            <div className="flex -space-x-2 pt-2 md:pt-4">
                               {[1,2,3,4].map(i => (
                                 <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-surface-accent flex items-center justify-center text-[10px] font-black font-mono">
                                   {String.fromCharCode(65 + i)}
                                 </div>
                               ))}
                            </div>
                         </div>
                         <div className="h-40 md:h-48 rounded-2xl md:rounded-3xl bg-surface-bright border border-border p-5 md:p-6 space-y-4 hover:border-primary/20 transition-colors duration-300">
                            <div className="flex items-center gap-2 text-primary">
                               <ShieldCheck size={16} />
                               <span className="text-[10px] font-bold uppercase">System Status</span>
                            </div>

                            <div className="space-y-3 pt-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Ledger Engine</span>
                                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase text-success">
                                     <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                                     Synced
                                  </span>
                               </div>
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Verification Nodes</span>
                                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase text-success">
                                     12/12 Online
                                  </span>
                               </div>
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">USDT Payouts</span>
                                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase text-success">
                                     Active
                                  </span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                   {/* Sidebar Section */}
                   <div className="lg:col-span-4 space-y-6 md:space-y-8">
                      <div className="rounded-2xl md:rounded-3xl border border-border bg-surface-bright/50 p-5 md:p-6 space-y-4 hover:border-primary/20 transition-colors duration-300">
                         <div className="flex items-center gap-2 text-text-tertiary">
                            <Activity size={14} className="text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Live Activity Feed</span>
                         </div>
                         <div className="space-y-3 min-h-[140px] flex flex-col justify-start">
                            <AnimatePresence mode="popLayout">
                               {feedEntries.map((entry) => (
                                 <motion.div
                                   key={entry.id}
                                   initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: -15, scale: 0.98 }}
                                   transition={{ duration: 0.4 }}
                                   className="flex items-center justify-between p-2.5 rounded-xl bg-surface-bright/60 border border-border/40 hover:bg-surface-bright"
                                 >
                                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                                       <span className="text-[10px] font-bold text-text-primary truncate">
                                          {entry.text}
                                       </span>
                                    </div>
                                    <span className="text-[10px] font-black text-success font-mono whitespace-nowrap">
                                       {entry.reward}
                                    </span>
                                 </motion.div>
                               ))}
                            </AnimatePresence>
                         </div>
                      </div>
                      <div className="rounded-2xl md:rounded-3xl border border-border bg-surface-bright/50 p-5 md:p-6 flex flex-col items-center gap-4 text-center hover:border-primary/20 transition-colors duration-300">
                         <div className="w-12 h-12 rounded-2xl bg-surface-glass border border-border-bright flex items-center justify-center text-text-tertiary">
                            <Target size={24} className="text-primary" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Profile Level</p>
                            <p className="text-xl font-black text-text-primary tracking-tighter">LVL 24</p>
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
