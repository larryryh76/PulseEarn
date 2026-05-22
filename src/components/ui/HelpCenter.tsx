import React, { useState } from 'react';
import Card from '../ui/Card';
import {
  Search,
  HelpCircle,
  BookOpen,
  Zap,
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../utils';
import { motion, AnimatePresence } from 'framer-motion';

const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I earn Pulse points?",
      a: "You can earn Pulse by completing daily missions, watching the terminal feed, participating in market predictions, and referring new users to the platform."
    },
    {
      q: "What are Clearance Levels?",
      a: "Clearance levels represent your seniority in the protocol. Higher levels (unlocked via XP) grant access to premium missions with significantly higher reward yields."
    },
    {
      q: "Is the platform safe?",
      a: "PulseEarn uses end-to-end encryption for all session data. We never store private keys and use advanced fraud detection to maintain a fair ecosystem for all participants."
    },
    {
      q: "How do I reset my cooldowns?",
      a: "Cooldowns are fixed system parameters. Daily tasks reset every 24 hours from completion, while some engagement tasks may have hourly cooldowns."
    }
  ];

  const guides = [
    { title: "Quick Start Guide", icon: BookOpen, color: "text-blue-400" },
    { title: "Earning Strategies", icon: Zap, color: "text-yellow-400" },
    { title: "Oracle Protocol (Predictions)", icon: TrendingUp, color: "text-green-400" },
    { title: "Security Best Practices", icon: ShieldCheck, color: "text-red-400" }
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Search Header */}
      <div className="relative">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
         <input
           type="text"
           placeholder="Search protocol documentation..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all"
         />
      </div>

      {/* Popular Guides */}
      <div className="grid grid-cols-2 gap-4">
         {guides.map((guide, i) => (
           <Card key={i} className="p-4 border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer group transition-all">
              <div className={cn("w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", guide.color)}>
                 <guide.icon size={20} />
              </div>
              <h4 className="text-xs font-bold text-white/90 leading-tight mb-2">{guide.title}</h4>
              <div className="flex items-center gap-1 text-[8px] font-bold text-white/20 uppercase tracking-widest">
                 Read Guide <ExternalLink size={8} />
              </div>
           </Card>
         ))}
      </div>

      {/* FAQ System */}
      <div className="space-y-4">
         <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Frequently Asked</h3>
         <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="overflow-hidden">
                 <button
                   onClick={() => setOpenFaq(openFaq === i ? null : i)}
                   className="w-full p-5 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                 >
                    <span className="text-sm font-bold text-white/80 text-left">{faq.q}</span>
                    <ChevronDown size={16} className={cn("text-white/20 transition-transform", openFaq === i && "rotate-180")} />
                 </button>
                 <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white/[0.02] rounded-b-2xl border-x border-b border-white/[0.05] mx-2"
                      >
                         <div className="p-5 text-xs text-white/40 leading-relaxed">
                            {faq.a}
                         </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>
            ))}
         </div>
      </div>

      {/* Support CTA */}
      <Card className="p-6 border-primary/20 bg-primary/5 text-center">
         <HelpCircle size={32} className="text-primary mx-auto mb-4" />
         <h4 className="font-bold mb-1">Still need assistance?</h4>
         <p className="text-xs text-white/40 mb-6">Our protocol support nodes are available 24/7.</p>
         <button className="px-8 py-3 rounded-xl bg-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_4px_15px_rgba(0,112,255,0.2)]">
            Contact Support
         </button>
      </Card>
    </div>
  );
};

export default HelpCenter;
