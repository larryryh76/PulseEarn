import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SignupCTA: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[3rem] overflow-hidden group"
        >
          {/* Subtle surrounding glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />

          <div className="relative bg-surface border border-border-bright rounded-3xl md:rounded-[4rem] p-8 sm:p-12 md:p-24 flex flex-col items-center text-center overflow-hidden shadow-premium">
            {/* Glowing top backdrop filter effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.06)_0%,transparent_70%)] pointer-events-none" />

            {/* Badge Indicator */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Ready to Start?
            </motion.div>

            {/* Main Headlines - merging both concepts */}
            <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-6 max-w-5xl tracking-tighter text-text-primary leading-[1] uppercase">
              STOP WASTING <br />
              YOUR POTENTIAL
            </h2>

            <p className="text-text-secondary text-base sm:text-lg md:text-xl max-w-2xl mb-10 font-medium px-4 leading-relaxed">
              Join thousands of verified earners already maximizing their potential through genuine opportunities.
              Create your account in seconds and start earning rewards today.
            </p>

            {/* Interactive Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
              <button
                onClick={() => navigate('/signup')}
                className="px-10 py-5 rounded-2xl bg-text-primary text-background font-black text-xs uppercase tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 cursor-pointer"
              >
                Get Started Now
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-10 py-5 rounded-2xl bg-surface-glass border border-border-bright text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-glass-hover active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Sparkles size={18} className="text-primary" />
                See Features
              </button>
            </div>

            {/* Unified Trust and Security Badges */}
            <div className="pt-8 border-t border-border w-full max-w-4xl grid grid-cols-2 md:grid-cols-6 gap-y-4 gap-x-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success" />
                 <span>Fully Verified</span>
               </div>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success" />
                 <span>No Card Required</span>
               </div>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success" />
                 <span>Instant Payout</span>
               </div>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                 <span>Secure Account</span>
               </div>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                 <span>Fast Settlements</span>
               </div>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                 <span>24/7 Support</span>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SignupCTA;
