import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { cn } from '../../utils';

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "How do I start earning on PulseEarn?",
      answer: "Simply connect your Web3 wallet (MetaMask, Coinbase Wallet, or WalletConnect). Once connected, you can browse available tasks in the 'Earn' section or start making price predictions immediately."
    },
    {
      question: "Which crypto tokens can I earn?",
      answer: "PulseEarn currently supports rewards in USDT, USDC, ETH, and our native PULSE token. We're constantly adding new partner tokens through our seasonal reward drops."
    },
    {
      question: "Is there a minimum withdrawal amount?",
      answer: "No. At PulseEarn, we believe in true ownership. Your earnings are credited to your platform balance and can be claimed to your wallet at any time, subject only to network gas fees."
    },
    {
      question: "How accurate are the price predictions?",
      answer: "We use high-fidelity Chainlink oracles to fetch real-time price data. Predictions are settled on-chain once the specified time period (e.g., 5m, 1h, 24h) has elapsed."
    },
    {
      question: "Is PulseEarn secure?",
      answer: "Security is our top priority. Our smart contracts are audited by leading firms, and we utilize multi-signature cold storage for the majority of our liquidity pools. Users always maintain custody of their funds."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-white/[0.01]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20"
            >
              <HelpCircle className="text-primary w-8 h-8" />
            </motion.div>
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-white/40">Everything you need to know about PulseEarn.</p>
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
      transition={{ delay: index * 0.1 }}
      className={cn(
        "border rounded-2xl transition-all duration-300",
        isOpen ? "bg-white/[0.04] border-white/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-6 flex items-center justify-between text-left"
      >
        <span className="text-lg font-bold">{faq.question}</span>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-primary text-white rotate-0" : "bg-white/5 text-white/40 rotate-180"
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
            className="overflow-hidden"
          >
            <div className="px-8 pb-6 text-white/60 leading-relaxed border-t border-white/5 pt-4 mt-2">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FAQ;
