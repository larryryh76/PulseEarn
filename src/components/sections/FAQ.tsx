import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { cn } from '../../utils';

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "How do I start earning?",
      answer: "Simply create an account and browse available tasks in your dashboard. You can start earning points immediately by completing missions or making price predictions."
    },
    {
      question: "What rewards can I earn?",
      answer: "You earn points for every activity, which can be converted into popular cryptocurrencies like USDT, BTC, and ETH during our scheduled reward drops."
    },
    {
      question: "Is there a minimum withdrawal?",
      answer: "We have a low minimum threshold for withdrawals to ensure everyone can access their rewards. Check the 'Wallet' section in your dashboard for your current progress."
    },
    {
      question: "How do price predictions work?",
      answer: "We use live market data to settle predictions. If your forecast for an asset's direction is correct within the timeframe, you win a share of the reward pool."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use industry-standard encryption and security protocols to protect your account and data. You maintain control over your wallet connections at all times."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-white/[0.01]">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6 border border-primary/20"
            >
              <HelpCircle className="text-primary w-6 h-6" />
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">FAQ</h2>
            <p className="text-white/40 text-sm md:text-base">Everything you need to know about PulseEarn.</p>
          </div>

          <div className="space-y-3">
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
      transition={{ delay: index * 0.1 }}
      className={cn(
        "border rounded-2xl transition-all duration-300",
        isOpen ? "bg-white/[0.04] border-white/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="text-base font-bold">{faq.question}</span>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-primary text-white" : "bg-white/5 text-white/40"
        )}>
          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 text-white/40 text-sm leading-relaxed border-t border-white/5 pt-4">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FAQ;
