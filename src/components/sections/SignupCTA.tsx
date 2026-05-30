import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SignupCTA: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-32 relative overflow-hidden bg-[#050507]">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[3rem] overflow-hidden group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />

          <div className="relative bg-black border border-white/10 rounded-3xl md:rounded-[3rem] p-10 md:p-24 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/5 rounded-2xl md:rounded-[2rem] flex items-center justify-center mb-8 md:mb-10 border border-primary/20 shadow-2xl">
              <Rocket className="text-primary w-6 h-6 md:w-8 md:h-8" />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-6 max-w-2xl tracking-tight text-white leading-tight">
              Ready to Start <br className="hidden sm:block" />
              <span className="text-white/20">Earning?</span>
            </h2>

            <p className="text-white/60 text-base sm:text-lg md:text-xl max-w-xl mb-8 md:mb-10 font-medium px-4">
              Join thousands of users who are already earning rewards with PulseEarn. Create your account in minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/signup')}
                className="px-10 py-5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
              >
                Create Account
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-10 py-5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Sparkles size={18} className="text-primary" />
                See Features
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 w-full max-w-3xl flex flex-wrap justify-center gap-8 text-[10px] font-bold text-white/30 uppercase tracking-widest">
               <span>Secure Account</span>
               <span>Fast Payouts</span>
               <span>24/7 Support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SignupCTA;
