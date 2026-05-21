import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const SignupCTA: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-white/[0.08] to-transparent p-[1px] rounded-[3rem] overflow-hidden"
        >
          <div className="bg-[#050507] rounded-[2.95rem] p-12 md:p-24 flex flex-col items-center text-center overflow-hidden relative">
            {/* Extremely subtle background gradient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.08)_0%,transparent_60%)] pointer-events-none" />

            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-10 border border-white/[0.05] relative group transition-transform duration-700 hover:rotate-[360deg]">
              <Rocket className="text-primary w-8 h-8 opacity-80" />
            </div>

            <h2 className="text-4xl md:text-6xl font-bold mb-8 max-w-2xl leading-[1.1] tracking-tight">
              Pulse into the <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Next Era</span> of Crypto.
            </h2>

            <p className="text-white/40 text-lg md:text-xl max-w-xl mb-14 font-medium leading-relaxed">
              Join 120,000+ users building the future of decentralized earning. Secure, transparent, and rewarding.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
              <Button size="lg" glow className="px-14" onClick={() => navigate('/signup')}>
                Create Account
                <ArrowRight size={18} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-14"
                onClick={() => {
                  document.getElementById('rewards')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Sparkles size={18} className="text-accent" />
                View Rewards
              </Button>
            </div>

            <div className="mt-20 flex items-center gap-10 text-white/20">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Network Online</span>
              </div>
              <div className="h-4 w-px bg-white/5" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">No Hidden Fees</span>
              </div>
              <div className="h-4 w-px bg-white/5 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Audited Contracts</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SignupCTA;
