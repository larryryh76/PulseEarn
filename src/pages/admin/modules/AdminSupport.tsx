import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { SupportTicket, SupportMessage, TicketStatus } from '../../../types';
import { SupportEngine } from '../../../engines/system/SupportEngine';
import { useAuth } from '../../../contexts/AuthContext';
import {
  MessageSquare,
  Search,
  User,
  Shield,
  Send,
  Paperclip,
  Mail
} from 'lucide-react';
import { cn } from '../../../utils';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

const AdminSupport: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Subscription for All Tickets
  useEffect(() => {
    const q = filter === 'ALL'
      ? query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc'))
      : query(collection(db, 'support_tickets'), where('status', '==', filter), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => doc.data() as SupportTicket));
    });

    return () => unsubscribe();
  }, [filter]);

  // Subscription for Thread
  useEffect(() => {
    if (!selectedTicket) return;
    const q = query(
      collection(db, 'support_messages'),
      where('ticketId', '==', selectedTicket.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as SupportMessage));
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  const handleSendReply = async () => {
    if (!currentUser || !userData || !selectedTicket || !replyText.trim()) return;

    try {
      const result = await SupportEngine.sendMessage({
        ticketId: selectedTicket.id,
        senderId: currentUser.uid,
        senderName: 'ADMIN_PULSE',
        senderType: 'ADMIN',
        text: replyText
      });

      if (result.success) {
        setReplyText('');
        toast.success('Reply Authorized');
      } else {
        toast.error('Dispatch Failed');
      }
    } catch (err) {
      toast.error('System error');
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      await SupportEngine.updateStatus(selectedTicket.id, status);
      toast.success(`Status updated: ${status}`);
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const filteredTickets = tickets.filter(t =>
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-primary bg-primary/10 border-primary/20';
      case 'PENDING': return 'text-warning bg-warning/10 border-warning/20';
      case 'AWAITING_USER': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'RESOLVED': return 'text-success bg-success/10 border-success/20';
      case 'CLOSED': return 'text-text-tertiary bg-white/5 border-white/10';
      default: return 'text-white bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-bold text-white tracking-tight uppercase italic mb-2">Support Operations</h2>
           <p className="text-text-tertiary text-sm font-medium">Manage user inquiries and platform integrity tickets.</p>
        </div>
        <div className="flex gap-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search tickets, users, emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/[0.02] border border-white/10 rounded-xl pl-12 pr-6 py-3 text-sm text-white focus:outline-none focus:border-primary/50 w-80"
              />
           </div>
           <select
             value={filter}
             onChange={(e) => setFilter(e.target.value as any)}
             className="bg-white/[0.02] border border-white/10 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none"
           >
              <option value="ALL">All States</option>
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending</option>
              <option value="AWAITING_USER">Awaiting User</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
           </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[800px]">
        {/* TICKET LIST */}
        <div className="lg:col-span-4 flex flex-col bg-[#0A0A0F] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
           <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Queue Feed</h3>
              <span className="text-[10px] font-bold text-primary">{filteredTickets.length} Active</span>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar">
              {filteredTickets.map((ticket) => (
                 <div
                   key={ticket.id}
                   onClick={() => setSelectedTicket(ticket)}
                   className={cn(
                     "p-6 border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.02] group relative",
                     selectedTicket?.id === ticket.id ? "bg-white/[0.03] border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                   )}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", getStatusColor(ticket.status))}>
                          {ticket.status}
                       </span>
                       <span className="text-[9px] font-mono text-white/10">{ticket.updatedAt?.toDate?.().toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight italic truncate mb-1 group-hover:text-primary transition-colors">{ticket.subject}</h4>
                    <div className="flex items-center gap-2">
                       <User size={10} className="text-white/20" />
                       <p className="text-[10px] text-white/40 truncate">{ticket.username} ({ticket.email})</p>
                    </div>
                    <p className="text-[10px] text-white/10 mt-2 truncate italic">{ticket.lastMessagePreview}</p>
                 </div>
              ))}
           </div>
        </div>

        {/* THREAD VIEW */}
        <div className="lg:col-span-8 flex flex-col bg-[#08080C] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
           {selectedTicket ? (
              <>
                 <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] z-10">
                    <div className="flex items-center gap-6">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                          <Mail size={20} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-tight italic leading-none mb-2">{selectedTicket.subject}</h3>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2">
                                <User size={12} className="text-primary" />
                                <span className="text-xs font-bold text-white/60">{selectedTicket.username}</span>
                             </div>
                             <div className="w-1 h-1 rounded-full bg-white/5" />
                             <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">ID: {selectedTicket.id}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <select
                         value={selectedTicket.status}
                         onChange={(e) => handleUpdateStatus(e.target.value as any)}
                         className={cn("text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border appearance-none outline-none cursor-pointer", getStatusColor(selectedTicket.status))}
                       >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="PENDING">PENDING</option>
                          <option value="AWAITING_USER">AWAITING USER</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                       </select>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                    {messages.map((msg) => (
                       <div key={msg.id} className={cn("flex gap-5 max-w-[85%]", msg.senderType === 'ADMIN' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                          <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-xl",
                             msg.senderType === 'ADMIN' ? "bg-primary border-primary/20 text-white" : "bg-white/[0.05] border-white/10 text-white/40"
                          )}>
                             {msg.senderType === 'ADMIN' ? <Shield size={20} /> : <User size={20} />}
                          </div>
                          <div className="space-y-3">
                             <div className={cn(
                                "p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-2xl",
                                msg.senderType === 'ADMIN' ? "bg-primary text-white" : "bg-white/[0.03] border border-white/10 text-text-secondary"
                             )}>
                                {msg.text}

                                {msg.attachments && msg.attachments.length > 0 && (
                                   <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-3">
                                      {msg.attachments.map((at, i) => (
                                         <a key={i} href={at.storageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 text-[10px] font-bold text-white/60 hover:text-white transition-all border border-white/5">
                                            <Paperclip size={12} />
                                            {at.fileName}
                                         </a>
                                      ))}
                                   </div>
                                )}
                             </div>
                             <div className={cn("flex items-center gap-3 px-2", msg.senderType === 'ADMIN' ? "justify-end" : "justify-start")}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{msg.senderName}</span>
                                <span className="text-white/5">•</span>
                                <span className="text-[10px] font-bold text-white/10">{msg.createdAt?.toDate?.().toLocaleString()}</span>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>

                 <div className="p-8 bg-black border-t border-white/5 space-y-6">
                    <div className="relative group">
                       <textarea
                         rows={4}
                         placeholder="Authorized Administrative Response..."
                         value={replyText}
                         onChange={(e) => setReplyText(e.target.value)}
                         className="w-full bg-white/[0.02] border border-white/[0.08] rounded-3xl px-8 py-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium resize-none shadow-inner"
                       />
                       <div className="absolute right-6 bottom-6 flex items-center gap-4">
                          <button className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors border border-white/5">
                             <Paperclip size={20} />
                          </button>
                          <Button
                            onClick={handleSendReply}
                            className="h-12 px-8 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[11px] italic"
                          >
                             <Send size={16} />
                             Dispatch
                          </Button>
                       </div>
                    </div>
                 </div>
              </>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-8 opacity-20">
                 <div className="w-32 h-32 rounded-[3rem] border border-dashed border-white/10 flex items-center justify-center">
                    <MessageSquare size={64} className="text-white" />
                 </div>
                 <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-white uppercase tracking-[0.2em]">Select an Influx</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Operations Pending Authorization</p>
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
