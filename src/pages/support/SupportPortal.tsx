import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Search,
  ChevronDown,
  FileText,
  ShieldQuestion,
  LifeBuoy,
  Plus,
  Send,
  ExternalLink,
  ShieldAlert,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { SupportEngine } from '../../engines/support/SupportEngine';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

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
      <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in">

        {/* Support Leadership Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.05] pb-10">
          <div className="space-y-1">
            <h2 className="section-label">Ecosystem Intelligence</h2>
            <h1 className="text-4xl font-bold tracking-tight">Support Terminal</h1>
            <p className="text-sm text-white/40 font-medium">Authorized resource center for troubleshooting and infrastructure signals.</p>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => setShowTicketModal(true)}
               className="btn-primary flex items-center gap-2 px-8"
             >
                <Plus size={14} />
                Generate Ticket
             </button>
          </div>
        </section>

        {/* Global Intelligence Search */}
        <div className="relative group max-w-3xl">
           <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
           <input
              type="text"
              placeholder="Query ecosystem documentation and FAQ database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-sm font-bold focus:border-primary outline-none transition-all"
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

           {/* FAQ Intelligence Matrix (8 cols) */}
           <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center gap-2 bg-white/[0.03] p-1 rounded-2xl border border-white/10 w-fit">
                 {FAQS.map(cat => (
                    <button
                       key={cat.category}
                       onClick={() => setActiveCategory(cat.category)}
                       className={cn(
                          "px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                          activeCategory === cat.category ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-white/30 hover:text-white/60"
                       )}
                    >
                       {cat.category}
                    </button>
                 ))}
              </div>

              <div className="space-y-4">
                 {FAQS.find(c => c.category === activeCategory)?.questions.map((faq, i) => (
                    <div key={i} className="glass-panel rounded-[2.5rem] p-10 hover:border-white/20 transition-all group">
                       <h4 className="text-xl font-bold mb-6 flex items-center justify-between group-hover:text-primary transition-colors">
                          {faq.q}
                          <ChevronDown size={20} className="text-white/10 group-hover:text-primary transition-all" />
                       </h4>
                       <p className="text-base text-white/40 leading-relaxed font-medium pr-12">
                          {faq.a}
                       </p>
                    </div>
                 ))}
              </div>
           </div>

           {/* Operational Context Sidebar (4 cols) */}
           <div className="lg:col-span-4 space-y-8">

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <LifeBuoy size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Infrastructure Health</h4>
                 </div>
                 <div className="space-y-3">
                    {[
                       { label: 'Reward Engine', status: 'Operational' },
                       { label: 'Withdrawal Gateway', status: 'Operational' },
                       { label: 'Validation Oracle', status: 'Operational' }
                    ].map((sys, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{sys.label}</span>
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                             <span className="text-[10px] font-bold uppercase text-emerald-500">{sys.status}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <h4 className="text-base font-bold">Incident Documentation</h4>
                 <div className="space-y-2">
                    {[
                      { icon: FileText, title: 'Pulse Reward Policy' },
                      { icon: ShieldQuestion, title: 'Verification Procedures' },
                      { icon: ShieldAlert, title: 'Fraud & Integrity' }
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
                         <div className="flex items-center gap-4">
                            <doc.icon size={16} className="text-white/20 group-hover:text-primary transition-colors" />
                            <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">{doc.title}</span>
                         </div>
                         <ExternalLink size={14} className="text-white/10 group-hover:text-white/40" />
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 border border-white/5 rounded-[2.5rem] bg-primary/[0.01] space-y-4">
                 <div className="flex items-center gap-3">
                    <History size={16} className="text-primary/40" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Operational History</span>
                 </div>
                 <p className="text-xs text-white/30 leading-relaxed font-medium">
                    View and manage your active and archived support incidents in the dashboard timeline.
                 </p>
              </div>

           </div>
        </div>
      </div>

      {/* Incident Submission Modal */}
      <AnimatePresence>
         {showTicketModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
               <motion.form
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onSubmit={handleSubmitTicket}
                  className="w-full max-w-2xl bg-[#08080a] border border-white/10 rounded-[3rem] p-12 space-y-10 shadow-2xl"
               >
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-tight">Signal Incident</h3>
                        <p className="text-xs text-white/30">Submit an authoritative report to the system administrators.</p>
                     </div>
                     <button type="button" onClick={() => setShowTicketModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors">
                        <Plus size={24} className="rotate-45" />
                     </button>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Incident Category</label>
                        <select
                           value={ticketCategory}
                           onChange={(e) => setTicketCategory(e.target.value)}
                           className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white appearance-none focus:border-primary outline-none"
                        >
                           <option value="REWARD">Reward Verification Anomaly</option>
                           <option value="REFERRAL">Referral Linkage Failure</option>
                           <option value="PAYOUT">Withdrawal Settlement Delay</option>
                           <option value="ACCOUNT">Identity / Clearance Lock</option>
                           <option value="OTHER">System Operational Incident</option>
                        </select>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Subject</label>
                        <input
                           type="text"
                           required
                           value={ticketSubject}
                           onChange={(e) => setTicketSubject(e.target.value)}
                           placeholder="Operational summary..."
                           className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary outline-none"
                        />
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Evidence & Details</label>
                        <textarea
                           required
                           value={ticketDescription}
                           onChange={(e) => setTicketDescription(e.target.value)}
                           placeholder="Provide granular details regarding the incident..."
                           className="w-full bg-black border border-white/10 rounded-[2rem] p-8 text-sm font-medium focus:border-primary outline-none min-h-[180px] resize-none leading-relaxed"
                        />
                     </div>
                  </div>

                  <button className="w-full py-5 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all">
                     <Send size={16} />
                     Authorize Transmission
                  </button>
               </motion.form>
            </div>
         )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SupportPortal;
