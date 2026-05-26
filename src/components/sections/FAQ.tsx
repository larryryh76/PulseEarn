import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../../utils';

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "How do I initiate earning sequences?",
      answer: "Create an account to gain access to the Pulse ecosystem. Once authorized, you can browse active mission campaigns or engage in market forecasting via the Execution Hub."
    },
    {
      question: "What is the settlement protocol for rewards?",
      answer: "All rewards are logged as points on your immutable ledger. These points can be converted into established digital assets (USDT, BTC, ETH) once the protocol threshold is met."
    },
    {
      question: "Is there a clearance threshold for withdrawals?",
      answer: "To ensure ecosystem stability, a minimum clearance of 10,000 PTS is required for initial settlement. You can track your progression in the Settlement Hub."
    },
    {
      question: "How does the forecasting engine work?",
      answer: "The protocol utilizes high-fidelity oracles to compare your entry forecasts against real-time market data. Successful predictions result in atomic point distributions based on pool weight."
    },
    {
      question: "What security measures protect the ledger?",
      answer: "PulseEarn utilizes multi-layer verification, atomic transactional nonces, and systematic anomaly detection to ensure every reward claim is legitimate and secure."
    }
  ];

  return (
    <section id="faq" className="py-32 bg-[#050507] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[160px] rounded-full -z-10" />

      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-primary text-[10px] font-bold tracking-[0.4em] uppercase mb-6"
            >
              Common Questions
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tighter uppercase">Knowledge <span className="text-white/20">Base.</span></h2>
            <p className="text-white/40 text-lg font-medium tracking-tight">Technical specifications and operational guidance for the PulseEarn ecosystem.</p>
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
        className="w-full px-8 py-7 flex items-center justify-between text-left group"
      >
        <span className={cn(
          "text-lg font-bold tracking-tight uppercase transition-colors",
          isOpen ? "text-primary" : "text-white/80 group-hover:text-white"
        )}>{faq.question}</span>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border",
          isOpen ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40"
        )}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
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
            <div className="px-8 pb-8 text-white/40 text-[15px] leading-relaxed font-medium uppercase tracking-tighter border-t border-white/5 pt-6">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FAQ;
