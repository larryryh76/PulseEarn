import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Target, Star, Flame, Crown } from 'lucide-react';

const Achievements: React.FC = () => {
  const achievements = [
    {
      title: 'Level System',
      description: 'Progress through 50 levels as you earn and complete activities',
      icon: Crown,
      color: 'from-yellow-500/20 to-yellow-600/5',
      details: ['1-10: Apprentice', '11-30: Expert', '31-50: Master'],
    },
    {
      title: 'Daily Streaks',
      description: 'Maintain consecutive login days to unlock streak bonuses',
      icon: Flame,
      description2: 'Multipliers scale up to 5x for extended streaks',
      details: ['7-day: +20%', '30-day: +75%', '365-day: +500%'],
    },
    {
      title: 'Milestone Rewards',
      description: 'Unlock exclusive badges and bonuses at key earnings thresholds',
      icon: Star,
      color: 'from-purple-500/20 to-purple-600/5',
      details: ['1K PTS', '10K PTS', '100K PTS'],
    },
    {
      title: 'Activity Badges',
      description: 'Earn special recognition for completing specific challenge types',
      icon: Target,
      color: 'from-blue-500/20 to-blue-600/5',
      details: ['Survey Master', 'App Enthusiast', 'Prediction Expert'],
    },
    {
      title: 'XP Progression',
      description: 'Gain XP alongside PTS for deeper account progression',
      icon: Zap,
      color: 'from-green-500/20 to-green-600/5',
      details: ['Track Progress', 'Unlock Features', 'Prestige'],
    },
    {
      title: 'Leaderboards',
      description: 'Compete globally and regionally for top earner status',
      icon: Trophy,
      color: 'from-orange-500/20 to-orange-600/5',
      details: ['Global Rankings', 'Regional Leaders', 'Hall of Fame'],
    },
  ];

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
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
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
            <Trophy size={14} />
            Progression System
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            Achievements & <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Milestones
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            Track your progress with levels, streaks, and achievements. The more you engage,
            the more rewards and exclusive opportunities unlock.
          </motion.p>
        </div>

        {/* Achievements Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {achievements.map((achievement, index) => (
            <motion.div key={index} variants={itemVariants} className="group">
              <div className="h-full p-8 md:p-10 rounded-3xl border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright hover:border-primary/30 transition-all duration-500">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${achievement.color} border border-border-bright flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <achievement.icon size={28} className="text-primary" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">
                  {achievement.title}
                </h3>

                {/* Description */}
                <p className="text-text-secondary text-sm font-medium mb-6 leading-relaxed">
                  {achievement.description}
                </p>

                {/* Details */}
                <div className="space-y-3 pt-6 border-t border-border/50">
                  {achievement.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-text-tertiary text-xs font-bold uppercase tracking-widest">
                        {detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Progression Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 md:mt-32 p-8 md:p-12 rounded-3xl border border-border bg-surface-bright/50 backdrop-blur-sm"
        >
          <h3 className="text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight mb-8">
            Your Growth Journey
          </h3>
          <div className="space-y-6">
            {[
              { phase: 'Start', desc: 'Sign up and complete first task', progress: 0 },
              { phase: 'Bronze', desc: 'Reach Level 10', progress: 20 },
              { phase: 'Silver', desc: 'Reach Level 30', progress: 60 },
              { phase: 'Gold', desc: 'Reach Level 50', progress: 100 },
            ].map((phase, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="text-sm font-black text-primary uppercase tracking-widest min-w-24">
                  {phase.phase}
                </div>
                <div className="flex-grow space-y-2">
                  <div className="h-2 bg-surface rounded-full overflow-hidden border border-border">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${phase.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 1 }}
                      className="h-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                  <p className="text-text-tertiary text-xs font-medium">{phase.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Achievements;
