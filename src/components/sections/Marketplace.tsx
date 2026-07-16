import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, MessageSquare, Play, Flame, Users, Target, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<'all' | 'apps' | 'surveys' | 'videos' | 'streaks' | 'referral' | 'predictions'>('all');

  const opportunities = [
    {
      id: 1,
      category: 'apps',
      title: 'Install App Challenge',
      description: 'Download and test new apps from our partners',
      reward: '+150 PTS',
      difficulty: 'Easy',
      time: '5 min',
      icon: Download,
      color: 'from-blue-500/20 to-blue-600/5',
      active: true,
    },
    {
      id: 2,
      category: 'surveys',
      title: 'Market Research Survey',
      description: 'Share your opinion on crypto and finance',
      reward: '+75 PTS',
      difficulty: 'Easy',
      time: '10 min',
      icon: MessageSquare,
      color: 'from-purple-500/20 to-purple-600/5',
      active: true,
    },
    {
      id: 3,
      category: 'videos',
      title: 'Watch & Earn',
      description: 'View sponsored content and educational videos',
      reward: '+50 PTS',
      difficulty: 'Easy',
      time: '3 min',
      icon: Play,
      color: 'from-red-500/20 to-red-600/5',
      active: true,
    },
    {
      id: 4,
      category: 'streaks',
      title: '7-Day Login Streak',
      description: 'Log in every day for a week',
      reward: '+200 PTS',
      difficulty: 'Medium',
      time: 'Daily',
      icon: Flame,
      color: 'from-orange-500/20 to-orange-600/5',
      active: true,
    },
    {
      id: 5,
      category: 'referral',
      title: 'Invite Friends',
      description: 'Get 10% of their first week earnings',
      reward: '+500 PTS',
      difficulty: 'Medium',
      time: 'Ongoing',
      icon: Users,
      color: 'from-green-500/20 to-green-600/5',
      active: true,
    },
    {
      id: 6,
      category: 'predictions',
      title: 'Bitcoin Price Prediction',
      description: 'Predict BTC movement in the next 4 hours',
      reward: '+300 PTS',
      difficulty: 'Hard',
      time: '4h',
      icon: Target,
      color: 'from-yellow-500/20 to-yellow-600/5',
      active: true,
    },
  ];

  const categories = [
    { id: 'all', label: 'All Opportunities' },
    { id: 'apps', label: 'Apps' },
    { id: 'surveys', label: 'Surveys' },
    { id: 'videos', label: 'Videos' },
    { id: 'streaks', label: 'Streaks' },
    { id: 'referral', label: 'Referral' },
    { id: 'predictions', label: 'Predictions' },
  ] as const;

  const filtered = activeCategory === 'all' ? opportunities : opportunities.filter(o => o.category === activeCategory);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3 },
    },
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-success/10 border-success/20 text-success';
      case 'Medium':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'Hard':
        return 'bg-danger/10 border-danger/20 text-danger';
      default:
        return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/2 left-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-6"
          >
            <Sparkles size={14} />
            Marketplace
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            Unlimited <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Earning Opportunities
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            From app installs to predictions, surveys to streaks. Choose what fits your schedule and
            earnings potential.
          </motion.p>
        </div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap gap-3 justify-center mb-12 md:mb-16"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 border ${
                activeCategory === cat.id
                  ? 'bg-primary text-background border-primary shadow-lg shadow-primary/30'
                  : 'bg-surface border-border text-text-secondary hover:border-primary/40 hover:bg-surface-bright'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Opportunities Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="wait">
            {filtered.map((opp) => (
              <motion.div
                key={opp.id}
                variants={cardVariants}
                layout
                className="group"
              >
                <div
                  className={`relative h-full p-8 rounded-3xl border border-border bg-surface/50 backdrop-blur-sm overflow-hidden
                    hover:border-primary/30 hover:bg-surface-bright transition-all duration-500 cursor-pointer`}
                  onClick={() => navigate('/tasks')}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${opp.color} -z-10`} />

                  {/* Top Section with Icon and Badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${opp.color} border border-border-bright
                        flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <opp.icon size={28} className="text-primary" />
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getDifficultyColor(opp.difficulty)}`}
                    >
                      {opp.difficulty}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-2 leading-tight">
                    {opp.title}
                  </h3>
                  <p className="text-text-secondary text-sm font-medium mb-6 line-clamp-2">
                    {opp.description}
                  </p>

                  {/* Divider */}
                  <div className="my-6 h-px bg-gradient-to-r from-border via-primary/20 to-border" />

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                        Reward
                      </p>
                      <p className="text-xl font-black text-primary font-mono">
                        {opp.reward}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                        Time
                      </p>
                      <p className="text-sm font-bold text-text-primary">
                        {opp.time}
                      </p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    className="w-full py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary
                      font-bold text-xs uppercase tracking-widest group-hover:bg-primary group-hover:text-background
                      transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    View Opportunity
                    <ArrowRight size={14} />
                  </button>

                  {/* Status Indicator */}
                  {opp.active && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-[9px] font-bold text-success uppercase tracking-widest">Active</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <button
            onClick={() => navigate('/signup')}
            className="px-10 py-5 rounded-2xl bg-text-primary text-background font-black text-sm uppercase tracking-[0.2em]
              hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-primary/20 inline-flex items-center gap-3"
          >
            Start Earning Today
            <ArrowRight size={18} />
          </button>
          <p className="text-text-secondary text-sm font-medium mt-6">
            New opportunities added daily. Choose what works for you.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Marketplace;
