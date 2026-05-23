import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const SignupCTA: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-white/[0.08] to-transparent p-[1px] rounded-3xl overflow-hidden"
        >
          <div className="bg-[#050507] rounded-[inherit] p-10 md:p-20 flex flex-col items-center text-center overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.08)_0%,transparent_60%)] pointer-events-none" />

            <div className="w-14 h-14 bg-primary/5 rounded-xl flex items-center justify-center mb-8 border border-white/[0.05]">
              <Rocket className="text-primary w-6 h-6 opacity-80" />
            </div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6 max-w-xl leading-tight">
              Start Your Journey <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">With PulseEarn</span>
            </h2>

            <p className="text-white/40 text-sm md:text-lg max-w-md mb-10 leading-relaxed">
              Join thousands of users already earning daily rewards. It only takes a few seconds to get started.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button size="lg" glow className="px-10 text-xs uppercase tracking-widest font-bold" onClick={() => navigate('/signup')}>
                Create Account
                <ArrowRight size={16} className="ml-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-10 text-xs uppercase tracking-widest font-bold"
                onClick={() => {
                  document.getElementById('rewards')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Sparkles size={16} className="text-accent mr-1" />
                View Rewards
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SignupCTA;
