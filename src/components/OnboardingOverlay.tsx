import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Shield,
  Users,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Gift
} from 'lucide-react';
import { cn } from '../utils';
import Button from './ui/ButtonLegacy';

interface Step {
  title: string;
  description: string;
  icon: any;
  color: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to PulseEarn",
    description: "You've just entered the premium hub for attention rewards. Your activity here converts directly into value.",
    icon: Gift,
    color: "text-primary"
  },
  {
    title: "How Rewards Work",
    description: "PTS (PTS) are your currency. 1,000 PTS = $1. XP builds your reputation and unlocks higher tier campaigns.",
    icon: Zap,
    color: "text-accent"
  },
  {
    title: "The Quest Hub",
    description: "Complete daily tasks, social missions, and sponsored campaigns to grow your balance. Every action is verified.",
    icon: Shield,
    color: "text-success"
  },
  {
    title: "Grow Your Network",
    description: "Invite friends using your unique code. Earn 50 PTS for every verified referral plus 5% of their lifetime earnings.",
    icon: Users,
    color: "text-blue-400"
  },
  {
    title: "Fast Withdrawals",
    description: "Reach 10,000 PTS to unlock withdrawals. We support Crypto, Gift Cards, and more with 24-72h processing.",
    icon: Wallet,
    color: "text-orange-400"
  }
];

interface OnboardingOverlayProps {
  onComplete: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) onComplete();
    else setCurrentStep(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-surface border border-border-bright rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-surface-bright">
           <motion.div
             className="h-full bg-primary"
             initial={{ width: 0 }}
             animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
           />
        </div>

        <button
          onClick={onComplete}
          className="absolute top-6 right-6 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className={cn(
              "w-20 h-20 rounded-[2rem] bg-surface-bright flex items-center justify-center border border-border shadow-inner mx-auto",
              STEPS[currentStep].color
            )}>
              {React.createElement(STEPS[currentStep].icon, { size: 40 })}
            </div>

            <div className="text-center space-y-4">
               <h2 className="text-2xl font-black uppercase tracking-tight italic text-text-primary">
                 {STEPS[currentStep].title}
               </h2>
               <p className="text-sm text-text-secondary font-medium leading-relaxed">
                 {STEPS[currentStep].description}
               </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 space-y-4">
           <Button onClick={handleNext} className="w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl">
              {isLast ? "Begin My Journey" : "Next Briefing"}
              {isLast ? <CheckCircle2 className="ml-2" size={16} /> : <ArrowRight className="ml-2" size={16} />}
           </Button>

           <div className="flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i === currentStep ? "w-8 bg-primary" : "w-2 bg-surface-bright"
                  )}
                />
              ))}
           </div>
        </div>

        <p className="mt-8 text-center text-[9px] font-bold text-text-tertiary uppercase tracking-widest opacity-50">
           Briefing {currentStep + 1} of {STEPS.length}
        </p>
      </motion.div>
    </div>
  );
};

export default OnboardingOverlay;
