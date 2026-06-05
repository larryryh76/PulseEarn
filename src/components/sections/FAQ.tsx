import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../../utils';

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "How do I start earning?",
      answer: "Simply create an account and log in. You can start earning points immediately by completing available tasks or making market predictions."
    },
    {
      question: "How are rewards paid out?",
      answer: "Points you earn can be redeemed for various rewards, including popular cryptocurrencies like USDT, Bitcoin, and Ethereum, once you reach the minimum balance."
    },
    {
      question: "What is the minimum for withdrawal?",
      answer: "To ensure a smooth experience for all users, a minimum of 10,000 points is required for your first withdrawal. You can track your progress on your dashboard."
    },
    {
      question: "How do market predictions work?",
      answer: "You can predict whether the price of an asset like Bitcoin will go up or down over a set period. If your prediction is correct, you earn bonus points."
    },
    {
      question: "Is PulseEarn secure?",
      answer: "Yes, we use advanced security systems and verification to ensure that your account and earnings are always protected."
    }
  ];

  return (
    <section id="faq" className="py-20 md:py-32 bg-[#050507] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[160px] rounded-full -z-10" />

      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 md:mb-20 px-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-6"
            >
              FAQ
            </motion.div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight">Got <span className="text-white/20">Questions?</span></h2>
            <p className="text-white/60 text-base sm:text-lg font-medium">Everything you need to know about getting started with PulseEarn.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem key={index} faq={faq} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FAQItem = ({ faq, index }: { faq: any, index: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "border rounded-[2rem] transition-all duration-500 overflow-hidden",
        isOpen ? "bg-white/[0.04] border-white/20 shadow-2xl" : "bg-white/[0.01] border-white/5 hover:border-white/10"
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 md:px-8 py-6 md:py-7 flex items-center justify-between text-left group"
      >
        <span className={cn(
          "text-base md:text-lg font-bold tracking-tight transition-colors pr-4",
          isOpen ? "text-primary" : "text-white/80 group-hover:text-white"
        )}>{faq.question}</span>
        <div className={cn(
          "w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-500 border shrink-0",
          isOpen ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40"
        )}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-6 md:px-8 pb-6 md:pb-8 text-white/50 text-sm md:text-base leading-relaxed font-medium border-t border-white/5 pt-5 md:pt-6">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FAQ;
