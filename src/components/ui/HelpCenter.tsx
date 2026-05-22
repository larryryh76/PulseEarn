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
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

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

  const articles = [
    {
      id: 'quickstart',
      title: "Quick Start Guide",
      icon: BookOpen,
      color: "text-blue-400",
      content: `
        ### Welcome to PulseEarn
        PulseEarn is a next-generation crypto rewards ecosystem designed for maximum capital yield.

        #### How it Works
        The protocol rewards nodes (users) for participating in network activities:
        1. **Syncing:** Daily login bonuses maintain your uptime streak.
        2. **Directives:** Complete micro-tasks in the Mission Hub to earn Pulse.
        3. **Oracles:** Submit market forecasts to multiply your capital.

        #### Clearance Levels
        Your account level (Clearance) determines your reward multipliers. Earn XP by completing tasks to unlock Elite and Premium sectors.
      `
    },
    {
      id: 'earnings',
      title: "Earning Strategies",
      icon: Zap,
      color: "text-yellow-400",
      content: `
        ### Maximize Your Yield
        PulseEarn is optimized for consistent engagement. Follow these strategies to climb the leaderboard.

        #### Maintain Streaks
        Your Daily Protocol Ping grants increasing bonuses for consecutive days of uptime. Missing a day resets your streak multiplier.

        #### Mission Stacking
        Social and Growth missions often grant the highest XP-to-Time ratio. Complete these first to raise your clearance level quickly.

        #### Referral Networks
        Expand your squad by inviting new nodes. You receive a 10% lifetime commission on all points earned by your direct referrals.
      `
    },
    {
      id: 'oracle',
      title: "Oracle Protocol",
      icon: TrendingUp,
      color: "text-green-400",
      content: `
        ### Advanced Forecasting
        The Oracle Protocol allows users to stake Pulse on real-time market movements.

        #### Settlement Logic
        Orders are settled every 24 hours (00:00 UTC) based on Binance spot prices.
        - **Long (Up):** Profit if the price at settlement is higher than your entry.
        - **Short (Down):** Profit if the price at settlement is lower than your entry.

        #### Risk Mitigation
        Staking is high-risk. Incorrect forecasts result in the complete loss of staked Pulse. Only stake capital you are willing to risk.
      `
    },
    {
      id: 'security',
      title: "Security Best Practices",
      icon: ShieldCheck,
      color: "text-red-400",
      content: `
        ### Protocol Integrity
        Security is the highest priority for the Pulse ecosystem.

        #### Wallet Safety
        Never share your private keys or seed phrases. PulseEarn will only ever request a non-custodial signature to verify node ownership.

        #### Anti-Fraud
        Our system monitors for rapid-fire activity and multiple account usage. Suspicious nodes are automatically flagged and subject to termination.

        #### Withdrawal Awareness
        Legitimate settlements only occur through our official Liquidity Bridge. Beware of phishing sites claiming to offer "instant payouts."
      `
    }
  ];

  return (
    <div className="space-y-8 pb-20 relative">
       <AnimatePresence>
          {selectedArticle && (
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="absolute inset-0 bg-[#050507] z-20 min-h-[500px]"
             >
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest mb-6 hover:text-white transition-colors"
                >
                   <ChevronDown size={14} className="rotate-90" />
                   Back to Documentation
                </button>
                <div className="flex items-center gap-4 mb-8">
                   <div className={cn("p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]", selectedArticle.color)}>
                      <selectedArticle.icon size={24} />
                   </div>
                   <h2 className="text-2xl font-bold">{selectedArticle.title}</h2>
                </div>
                <div className="prose prose-invert max-w-none">
                   <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line bg-white/[0.02] p-6 rounded-3xl border border-white/[0.05]">
                      {selectedArticle.content}
                   </div>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

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
         {articles.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase())).map((article, i) => (
           <Card
            key={i}
            onClick={() => setSelectedArticle(article)}
            className="p-4 border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer group transition-all"
           >
              <div className={cn("w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", article.color)}>
                 <article.icon size={20} />
              </div>
              <h4 className="text-xs font-bold text-white/90 leading-tight mb-2">{article.title}</h4>
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
