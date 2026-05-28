import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Search,
  ChevronDown,
  FileText,
  AlertCircle,
  ShieldQuestion,
  LifeBuoy,
  Plus,
  Send,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { SupportEngine } from '../../engines/support/SupportEngine';
import toast from 'react-hot-toast';

const FAQS = [
  {
    category: 'REWARDS',
    questions: [
      { q: "Why is my mission status 'Pending'?", a: "Manual verification missions require a security audit by our moderation team. This typically takes 12-24 hours." },
      { q: "Can I earn Pulse without verifying my identity?", a: "Basic missions are available to all users, but high-yield rewards and withdrawals require account authorization." }
    ]
  },
  {
    category: 'SECURITY',
    questions: [
      { q: "What should I do if my account is restricted?", a: "Account restrictions occur when the security engine detects suspicious earning velocity. Submit a support ticket for recovery." },
      { q: "How do I secure my Pulse balance?", a: "Ensure 2FA is enabled in settings and never share your recovery email with third parties." }
    ]
  }
];

const SupportPortal: React.FC = () => {
  const { userData } = useAuth();
  const [activeCategory, setActiveCategory] = useState('REWARDS');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket Form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState<any>('REWARD');

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    const res = await SupportEngine.createTicket({
      userId: userData.uid,
      category: ticketCategory,
      priority: 'MEDIUM',
      subject: ticketSubject,
      description: ticketDescription,
      attachedLogIds: []
    });

    if (res.success) {
      toast.success('Support ticket authorized and queued.');
      setShowTicketModal(false);
      setTicketSubject('');
      setTicketDescription('');
    } else {
      toast.error(`Ticket Failure: ${res.error}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        {/* Header section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Intelligence & Support</h2>
            <h1 className="text-4xl font-bold tracking-tight">Support Terminal</h1>
            <p className="text-sm text-white/40">Authorized resource center for ecosystem troubleshooting.</p>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => setShowTicketModal(true)}
               className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all"
             >
                <Plus size={14} />
                New Support Ticket
             </button>
          </div>
        </section>

        {/* Search Matrix */}
        <div className="relative group">
           <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
           <input
              type="text"
              placeholder="Search intelligence database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none"
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left: FAQ Matrix */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
                 {FAQS.map(cat => (
                    <button
                       key={cat.category}
                       onClick={() => setActiveCategory(cat.category)}
                       className={`px-5 py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                          activeCategory === cat.category ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/30 hover:text-white/60'
                       }`}
                    >
                       {cat.category}
                    </button>
                 ))}
              </div>

              <div className="space-y-4">
                 {FAQS.find(c => c.category === activeCategory)?.questions.map((faq, i) => (
                    <div key={i} className="glass-card border-white/[0.05] rounded-3xl p-8 hover:border-white/10 transition-all group">
                       <h4 className="text-lg font-bold mb-4 flex items-center justify-between">
                          {faq.q}
                          <ChevronDown size={18} className="text-white/20 group-hover:text-white transition-all" />
                       </h4>
                       <p className="text-sm text-white/40 leading-relaxed font-medium">
                          {faq.a}
                       </p>
                    </div>
                 ))}
              </div>
           </div>

           {/* Right: Support Insights */}
           <div className="space-y-8">
              <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
                 <div className="flex items-center gap-3">
                    <LifeBuoy size={18} className="text-primary" />
                    <h4 className="text-base font-bold">System Health</h4>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Reward Engine Online</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Withdrawal Gateway</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
                 <h4 className="text-base font-bold">Documentation</h4>
                 <div className="space-y-3">
                    {[
                      { icon: FileText, title: 'Reward Policy' },
                      { icon: ShieldQuestion, title: 'Verification Guide' },
                      { icon: AlertCircle, title: 'Fraud Prevention' }
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
                         <div className="flex items-center gap-3">
                            <doc.icon size={16} className="text-white/20 group-hover:text-primary transition-colors" />
                            <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">{doc.title}</span>
                         </div>
                         <ExternalLink size={14} className="text-white/10 group-hover:text-white/40 transition-colors" />
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Ticket Modal */}
      <AnimatePresence>
         {showTicketModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
               <motion.form
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onSubmit={handleSubmitTicket}
                  className="w-full max-w-xl bg-[#0a0a0c] border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl"
               >
                  <div className="flex items-center justify-between">
                     <h3 className="text-2xl font-bold tracking-tight">Incident Submission</h3>
                     <button type="button" onClick={() => setShowTicketModal(false)} className="text-white/20 hover:text-white transition-colors">
                        <Plus size={24} className="rotate-45" />
                     </button>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Incident Category</label>
                        <select
                           value={ticketCategory}
                           onChange={(e) => setTicketCategory(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white appearance-none focus:border-primary outline-none"
                        >
                           <option value="REWARD">Reward Verification Issue</option>
                           <option value="REFERRAL">Referral Missing Reward</option>
                           <option value="PAYOUT">Withdrawal Delay</option>
                           <option value="ACCOUNT">Security / Identity Lock</option>
                           <option value="OTHER">Other System Incident</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Subject</label>
                        <input
                           type="text"
                           required
                           value={ticketSubject}
                           onChange={(e) => setTicketSubject(e.target.value)}
                           placeholder="Short summary of the issue"
                           className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary outline-none"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Operational Details</label>
                        <textarea
                           required
                           value={ticketDescription}
                           onChange={(e) => setTicketDescription(e.target.value)}
                           placeholder="Describe the incident in detail..."
                           className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium focus:border-primary outline-none min-h-[150px] resize-none"
                        />
                     </div>
                  </div>

                  <button className="w-full py-5 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                     <Send size={16} />
                     Authorize Submission
                  </button>
               </motion.form>
            </div>
         )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SupportPortal;
