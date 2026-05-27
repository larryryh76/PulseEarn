import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SignupCTA: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative overflow-hidden bg-[#050507]">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[3rem] overflow-hidden group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />

          <div className="relative bg-black border border-white/10 rounded-[inherit] p-12 md:p-24 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-10 border border-primary/20 shadow-2xl">
              <Rocket className="text-primary w-8 h-8" />
            </div>

            <h2 className="text-4xl md:text-7xl font-bold mb-8 max-w-2xl tracking-tighter text-white uppercase leading-[0.9]">
              Initialize Your <br />
              <span className="text-white/20">Growth System.</span>
            </h2>

            <p className="text-white/40 text-lg md:text-xl max-w-xl mb-12 font-medium tracking-tight uppercase leading-relaxed">
              Join the institutional-grade rewards ecosystem and start scaling your digital capital today.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
              <button
                onClick={() => navigate('/signup')}
                className="px-14 py-7 rounded-2xl bg-white text-black font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-4"
              >
                Create Operator ID
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-14 py-7 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                <Sparkles size={18} className="text-primary" />
                Review Specs
              </button>
            </div>

            <div className="mt-16 pt-12 border-t border-white/5 w-full max-w-3xl flex flex-wrap justify-center gap-12 text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">
               <span>ID Verification Required</span>
               <span>Atomic Claim Nonces</span>
               <span>Institutional Grade</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SignupCTA;
