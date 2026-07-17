import React from 'react';
import { motion } from 'framer-motion';
import { Users, Share2, TrendingUp, Zap } from 'lucide-react';

const Community: React.FC = () => {
  const highlights = [
    {
      icon: Users,
      stat: '50K+',
      label: 'Active Users',
      description: 'A thriving global community of earners',
    },
    {
      icon: Zap,
      stat: '1M+',
      label: 'Tasks Completed',
      description: 'Real activity driving real rewards',
    },
    {
      icon: TrendingUp,
      stat: '$2.5M',
      label: 'Rewards Distributed',
      description: 'Verified earnings in user hands',
    },
  ];

  const socialProof = [
    {
      name: 'Alex M.',
      role: 'PulseEarn Member',
      quote: 'Finally a platform that feels transparent. I can see exactly where my earnings come from.',
      initials: 'AM',
      color: 'from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/30',
    },
    {
      name: 'Sarah K.',
      role: 'Top Earner',
      quote: 'The variety of opportunities keeps me engaged. Earning real money has never been this straightforward.',
      initials: 'SK',
      color: 'from-purple-500/20 to-pink-500/5 text-purple-400 border-purple-500/30',
    },
    {
      name: 'Jordan T.',
      role: 'Community Builder',
      quote: 'The referral program is amazing. I earned more by inviting friends than any other platform.',
      initials: 'JT',
      color: 'from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/30',
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2" />
        <div className="absolute bottom-1/2 right-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
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
            <Users size={14} />
            Community
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter mb-6 uppercase leading-[1.1]"
          >
            Join a Global <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Earning Community
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto"
          >
            Thousands of verified earners are already on PulseEarn. Share opportunities,
            celebrate wins, and build together.
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20 md:mb-32"
        >
          {highlights.map((highlight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright transition-all text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <highlight.icon size={28} className="text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-black text-primary mb-2">
                {highlight.stat}
              </div>
              <div className="text-text-primary font-bold uppercase tracking-tight mb-2">
                {highlight.label}
              </div>
              <p className="text-text-secondary text-sm font-medium">
                {highlight.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Social Proof */}
        <div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight mb-8 text-center"
          >
            What Our Community Says
          </motion.h3>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {socialProof.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2rem] border border-border bg-surface/50 backdrop-blur-sm hover:bg-surface-bright hover:border-primary/20 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} border flex items-center justify-center text-xs font-black tracking-wider`}>
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="font-black text-text-primary text-sm uppercase tracking-tight">
                        {testimonial.name}
                      </div>
                      <div className="text-text-tertiary text-[10px] font-bold uppercase tracking-widest">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm font-medium leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                </div>

                <div className="flex gap-1 mt-6 pt-6 border-t border-border/40">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-amber-500 text-xs">
                      ★
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Referral CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 md:mt-32 p-8 md:p-12 rounded-3xl border border-border bg-surface-bright/50 backdrop-blur-sm text-center"
        >
          <h3 className="text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight mb-4">
            Invite Friends & Earn
          </h3>
          <p className="text-text-secondary font-medium mb-8 max-w-xl mx-auto">
            Get 10% of your friends' first week earnings. Unlimited referrals, unlimited rewards.
          </p>
          <button className="px-10 py-4 rounded-2xl bg-primary text-background font-black text-sm uppercase tracking-[0.2em] hover:opacity-90 transition-all inline-flex items-center gap-2">
            <Share2 size={18} />
            Share Your Link
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Community;
