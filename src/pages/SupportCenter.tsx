import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SupportTicket, SupportMessage, TicketCategory } from '../types';
import { SupportEngine } from '../engines/system/SupportEngine';
import {
  LifeBuoy,
  MessageSquare,
  Plus,
  Search,
  Send,
  Paperclip,
  CheckCircle2,
  ChevronRight,
  User,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'GENERAL', label: 'General Support' },
  { value: 'ACCOUNT', label: 'Account Issue' },
  { value: 'CAMPAIGN', label: 'Campaign Issue' },
  { value: 'VERIFICATION', label: 'Task Verification' },
  { value: 'PREDICTION', label: 'Prediction Issue' },
  { value: 'WITHDRAWAL', label: 'Withdrawal Issue' },
  { value: 'BUG_REPORT', label: 'Bug Report' },
  { value: 'FEEDBACK', label: 'Feedback / Suggestion' }
];

const SupportCenter: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [view, setView] = useState<'EXPLORE' | 'CREATE' | 'THREAD'>('EXPLORE');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  // Create Form State
  const [formData, setFormData] = useState({
    category: 'GENERAL' as TicketCategory,
    subject: '',
    message: '',
    attachments: [] as { url: string; name: string; type: string; size: number }[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<{ url: string; name: string; type: string; size: number }[]>([]);

  // Subscription for User Tickets
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as SupportTicket);
      setTickets(docs.sort((a, b) => {
        const timeA = (a.updatedAt as any)?.toMillis?.() || 0;
        const timeB = (b.updatedAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscription for Thread Messages - Nested Path (Satisfies Rules)
  useEffect(() => {
    if (!selectedTicket) return;
    const q = collection(db, 'support_tickets', selectedTicket.id, 'support_messages');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as SupportMessage).sort((a, b) => {
         const timeA = (a.createdAt as any)?.toMillis?.() || 0;
         const timeB = (b.createdAt as any)?.toMillis?.() || 0;
         return timeA - timeB;
      }));
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  const handleCreateTicket = async () => {
    if (!currentUser || !userData) return;
    if (!formData.subject || !formData.message) return toast.error('Please fill in all required fields.');

    setIsSubmitting(true);
    try {
      const result = await SupportEngine.createTicket({
        userId: currentUser.uid,
        username: userData.username,
        email: userData.email || '',
        ...formData
      });

      if (result.success) {
        toast.success('Support Ticket Created');
        setView('EXPLORE');
        setFormData({ category: 'GENERAL', subject: '', message: '', attachments: [] });
      } else {
        toast.error(result.error || 'Failed to create ticket');
      }
    } catch (err) {
      toast.error('System error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!currentUser || !userData || !selectedTicket || (!replyText.trim() && replyAttachments.length === 0)) return;

    try {
      const result = await SupportEngine.sendMessage({
        ticketId: selectedTicket.id,
        senderId: currentUser.uid,
        senderName: userData.username,
        senderType: 'USER',
        text: replyText,
        attachments: replyAttachments
      });

      if (result.success) {
        setReplyText('');
        setReplyAttachments([]);
      } else {
        toast.error('Failed to send reply');
      }
    } catch (err) {
      toast.error('System error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-primary bg-primary/10 border-primary/20';
      case 'PENDING': return 'text-warning bg-warning/10 border-warning/20';
      case 'AWAITING_USER': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'RESOLVED': return 'text-success bg-success/10 border-success/20';
      case 'CLOSED': return 'text-text-tertiary bg-surface-bright border-border-bright';
      default: return 'text-text-primary bg-surface-bright border-border-bright';
    }
  };

  return (
    <>
      <div className="pt-32 pb-32 px-6 max-w-6xl mx-auto min-h-screen">

        {/* HEADER */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <Shield size={14} className="text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/30">Operations & Support</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-text-primary tracking-tighter leading-none uppercase">
                 Support Hub
              </h1>
           </div>

           <div className="flex bg-surface-accent p-1 rounded-xl border border-border shrink-0">
               <button
                 onClick={() => { setView('EXPLORE'); setSelectedTicket(null); }}
                 className={cn(
                   "px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                   view === 'EXPLORE' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-text-primary"
                 )}
               >
                 Explore
               </button>
               <button
                 onClick={() => setView('CREATE')}
                 className={cn(
                   "px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                   view === 'CREATE' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-text-primary"
                 )}
               >
                 New Ticket
               </button>
            </div>
        </header>

        <AnimatePresence mode="wait">
           {view === 'EXPLORE' && (
              <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* TICKETS LIST */}
                    <div className="md:col-span-2 space-y-6">
                       <div className="flex items-center gap-3 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Active Inquiries</h4>
                          <div className="h-px flex-1 bg-surface-accent" />
                       </div>

                       <div className="space-y-2">
                          {loading ? (
                             Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-20 bg-surface-bright border border-border rounded-xl animate-pulse" />
                             ))
                          ) : tickets.length > 0 ? (
                             tickets.map((ticket) => (
                                <div
                                  key={ticket.id}
                                  onClick={() => { setSelectedTicket(ticket); setView('THREAD'); }}
                                  className="p-5 rounded-2xl bg-surface border border-border hover:border-border-bright transition-all cursor-pointer group flex items-center justify-between"
                                >
                                   <div className="flex items-center gap-5 min-w-0">
                                      <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner shrink-0",
                                        getStatusColor(ticket.status).split(' ').slice(1).join(' ')
                                      )}>
                                         <MessageSquare size={20} className={getStatusColor(ticket.status).split(' ')[0]} />
                                      </div>
                                      <div className="min-w-0">
                                         <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight italic truncate group-hover:text-primary transition-colors">
                                            {ticket.subject}
                                         </h3>
                                         <div className="flex items-center gap-3 mt-1">
                                            <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border", getStatusColor(ticket.status))}>
                                               {ticket.status.replace(/_/g, ' ')}
                                            </span>
                                            <div className="w-1 h-1 rounded-full bg-surface-accent" />
                                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{ticket.category.replace(/_/g, ' ')}</span>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-8 text-right shrink-0">
                                      <div className="hidden sm:block">
                                         <p className="text-[8px] font-black text-text-tertiary/50 uppercase tracking-widest">Updated</p>
                                         <p className="text-[10px] font-mono text-text-secondary">{ticket.updatedAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                      </div>
                                      <ChevronRight size={16} className="text-text-tertiary/50 group-hover:text-primary transition-colors" />
                                   </div>
                                </div>
                             ))
                          ) : (
                             <div className="py-32 text-center border border-dashed border-border rounded-[2rem] opacity-20">
                                <Search size={48} className="mx-auto mb-6 text-text-tertiary/50" />
                                <p className="text-[11px] font-black uppercase tracking-[0.5em]">No Support Records Found</p>
                             </div>
                          )}
                       </div>
                    </div>

                    {/* QUICK ACTIONS / INFO */}
                    <div className="space-y-8">
                       <div className="p-8 rounded-[2rem] bg-primary/[0.02] border border-primary/10 space-y-6">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                             <LifeBuoy size={24} />
                          </div>
                          <div className="space-y-2">
                             <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight italic">Operations Hub</h3>
                             <p className="text-xs text-text-tertiary leading-relaxed font-medium">Our integrity team is available to assist with account, withdrawal, and verification queries. Response times vary by load.</p>
                          </div>
                          <Button onClick={() => setView('CREATE')} className="w-full py-4 text-[10px] uppercase tracking-widest font-black italic shadow-2xl">
                             Open New Signal
                          </Button>
                       </div>

                    </div>
                 </div>
              </motion.div>
           )}

           {view === 'CREATE' && (
              <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto">
                 <div className="glass-card p-8 md:p-12 rounded-[2.5rem] space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                          <Plus size={32} />
                       </div>
                       <div>
                          <h2 className="text-3xl font-bold text-text-primary tracking-tighter uppercase italic leading-none mb-2">Initiate Ticket</h2>
                          <p className="text-text-secondary text-sm font-medium">Please provide accurate details for efficient resolution.</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Inquiry Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TicketCategory }))}
                            className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium appearance-none"
                          >
                             {CATEGORIES.map(cat => <option key={cat.value} value={cat.value} className="bg-surface">{cat.label}</option>)}
                          </select>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Subject</label>
                          <input
                            type="text"
                            placeholder="Brief summary of your inquiry"
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium"
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Full Message</label>
                          <textarea
                            rows={6}
                            placeholder="Describe your issue in detail. Include IDs, dates, and amounts if applicable."
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium resize-none"
                          />
                       </div>


                       <div className="pt-4 flex gap-4">
                          <Button
                            className="flex-1 py-5 rounded-2xl shadow-xl italic font-black uppercase tracking-[0.2em] text-[11px]"
                            onClick={handleCreateTicket}
                            isLoading={isSubmitting}
                          >
                             Submit Request
                          </Button>
                          <button
                            onClick={() => setView('EXPLORE')}
                            className="px-8 py-5 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-bold uppercase tracking-widest text-[9px]"
                          >
                             Cancel
                          </button>
                       </div>
                    </div>
                 </div>
              </motion.div>
           )}

           {view === 'THREAD' && selectedTicket && (
              <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 {/* CONVERSATION RAIL */}
                 <div className="lg:col-span-8 flex flex-col h-[700px] bg-surface border border-border-bright rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-border flex items-center justify-between bg-surface-bright/50">
                       <div className="flex items-center gap-4">
                          <button onClick={() => setView('EXPLORE')} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                             <ArrowLeft size={18} />
                          </button>
                          <div>
                             <h2 className="text-base font-bold text-text-primary uppercase tracking-tight italic leading-none mb-1">{selectedTicket.subject}</h2>
                             <div className="flex items-center gap-3">
                                <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border", getStatusColor(selectedTicket.status))}>
                                   {selectedTicket.status}
                                </span>
                                <span className="text-[9px] font-black text-text-tertiary/50 uppercase tracking-widest">#{selectedTicket.id.slice(-8).toUpperCase()}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* MESSAGES FEED */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                       {messages.map((msg) => (
                          <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.senderType === 'ADMIN' ? "mr-auto" : "ml-auto flex-row-reverse")}>
                             <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-lg",
                                msg.senderType === 'ADMIN' ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-glass border-border-bright text-text-secondary"
                             )}>
                                {msg.senderType === 'ADMIN' ? <Shield size={18} /> : <User size={18} />}
                             </div>
                             <div className="space-y-2">
                                <div className={cn(
                                   "p-5 rounded-2xl text-sm font-medium leading-relaxed shadow-inner",
                                   msg.senderType === 'ADMIN' ? "bg-surface-accent border border-border text-text-secondary" : "bg-primary text-text-primary"
                                )}>
                                   {msg.text}

                                   {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                                         {msg.attachments.map((at, i) => (
                                            <a key={i} href={at.storageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/20 text-[9px] font-bold text-text-secondary hover:text-text-primary hover:bg-background/40 transition-all">
                                               <Paperclip size={10} />
                                               {at.fileName}
                                            </a>
                                         ))}
                                      </div>
                                   )}
                                </div>
                                <div className={cn("flex items-center gap-2 px-1", msg.senderType === 'ADMIN' ? "justify-start" : "justify-end")}>
                                   <span className="text-[9px] font-black uppercase tracking-widest text-text-tertiary/50">{msg.senderName}</span>
                                   <span className="text-text-primary/5">•</span>
                                   <span className="text-[9px] font-bold text-text-tertiary/50">{msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>

                    {/* REPLY ZONE */}
                    {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' ? (
                       <div className="p-6 bg-background border-t border-border space-y-6">
                          <div className="relative group">
                             <textarea
                               rows={3}
                               placeholder="Draft your reply..."
                               value={replyText}
                               onChange={(e) => setReplyText(e.target.value)}
                               className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium resize-none"
                             />
                             <div className="absolute right-4 bottom-4 flex items-center gap-3">
                                <Button
                                  onClick={handleSendReply}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center p-0"
                                >
                                   <Send size={16} />
                                </Button>
                             </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border pt-4">
                             <p className="text-[9px] font-bold text-text-tertiary/50 uppercase tracking-widest italic">Security: Thread is encrypted and immutable</p>
                             <p className="text-[9px] font-bold text-text-tertiary/30 uppercase tracking-widest">Attachments Disabled</p>
                          </div>
                       </div>
                    ) : (
                       <div className="p-12 text-center bg-background border-t border-border">
                          <div className="w-16 h-16 rounded-full bg-surface-bright flex items-center justify-center text-text-tertiary/50 mx-auto mb-4 border border-dashed border-border-bright">
                             <CheckCircle2 size={32} />
                          </div>
                          <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Inquiry Successfully Resolved</h4>
                          <p className="text-[10px] text-text-tertiary mt-2 uppercase tracking-widest">This ticket is now closed for comments.</p>
                       </div>
                    )}
                 </div>

                 {/* TICKET DETAILS SIDEBAR */}
                 <div className="lg:col-span-4 space-y-8">
                    <div className="p-8 rounded-[2.5rem] bg-surface border border-border-bright space-y-10">
                       <div className="space-y-6">
                          <h3 className="text-sm font-black text-text-tertiary uppercase tracking-[0.3em]">Ledger Details</h3>
                          <div className="space-y-5">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-text-tertiary uppercase">Inquiry ID</span>
                                <span className="text-[10px] font-mono font-bold text-text-primary">{selectedTicket.id.slice(-12).toUpperCase()}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-text-tertiary uppercase">Category</span>
                                <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">{selectedTicket.category.replace(/_/g, ' ')}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-text-tertiary uppercase">Priority</span>
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                   selectedTicket.priority === 'URGENT' ? "text-danger border-danger/20 bg-danger/5" : "text-text-secondary border-border-bright bg-surface-bright")}>
                                   {selectedTicket.priority}
                                </span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-text-tertiary uppercase">Created</span>
                                <span className="text-[10px] font-mono font-bold text-text-primary">{selectedTicket.createdAt?.toDate?.().toLocaleDateString()}</span>
                             </div>
                          </div>
                       </div>

                       <div className="h-px bg-surface-bright" />

                       <div className="space-y-6">
                          <h3 className="text-sm font-black text-text-tertiary uppercase tracking-[0.3em]">Integrity Status</h3>
                          <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="text-[10px] font-bold text-text-primary uppercase italic">Valid User Match</span>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="text-[10px] font-bold text-text-primary uppercase italic">Thread Immutable</span>
                             </div>
                             <div className="flex items-center gap-3 opacity-20">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <span className="text-[10px] font-bold text-text-primary uppercase italic">Audit Required</span>
                             </div>
                          </div>
                       </div>

                       <div className="pt-4">
                          <p className="text-[10px] text-text-tertiary italic leading-relaxed">Tickets are monitored by our Platform Integrity team. Please do not submit duplicate inquiries for the same issue.</p>
                       </div>
                    </div>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>

      </div>
    </>
  );
};

export default SupportCenter;
