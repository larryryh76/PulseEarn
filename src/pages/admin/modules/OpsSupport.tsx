import * as React from 'react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where
} from 'firebase/firestore';
import {
  SupportTicket,
  SupportMessage,
  TicketStatus
} from '../../../types';
import { SupportEngine } from '../../../engines/system/SupportEngine';
import { useAuth } from '../../../contexts/AuthContext';
import {
  MessageSquare,
  Search,
  User,
  Mail,
  Shield,
  Paperclip,
  Send,
  X
} from 'lucide-react';
import { cn } from '../../../utils';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

const OpsSupport: React.FC = () => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [filter, setFilter] = React.useState<TicketStatus | 'ALL'>('ALL');
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = filter === 'ALL'
      ? query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc'))
      : query(collection(db, 'support_tickets'), where('status', '==', filter), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => doc.data() as SupportTicket));
    });

    return unsubscribe;
  }, [filter]);

  React.useEffect(() => {
    if (!selectedTicket) return;
    const q = query(
      collection(db, 'support_messages'),
      where('ticketId', '==', selectedTicket.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as SupportMessage));
    });

    return unsubscribe;
  }, [selectedTicket]);

  const handleSendReply = async () => {
    if (!currentUser || !selectedTicket || !replyText.trim()) return;

    try {
      const result = await SupportEngine.sendMessage({
        ticketId: selectedTicket.id,
        senderId: currentUser.uid,
        senderName: 'OPS_AUTHORITY',
        senderType: 'ADMIN',
        text: replyText
      });

      if (result.success) {
        setReplyText('');
        toast.success('Communication Dispatched');
      } else {
        toast.error('Dispatch Failure');
      }
    } catch (err) {
      toast.error('Integrity Protocol Failure');
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      await SupportEngine.updateStatus(selectedTicket.id, status);
      toast.success(`Ticket Status: ${status}`);
    } catch (err) {
      toast.error('Adjustment Failed');
    }
  };

  const filteredTickets = tickets.filter(t =>
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-primary border-primary/20 bg-primary/5';
      case 'PENDING': return 'text-warning border-warning/20 bg-warning/5';
      case 'AWAITING_USER': return 'text-blue-400 border-blue-400/20 bg-blue-400/5';
      case 'RESOLVED': return 'text-success border-success/20 bg-success/5';
      case 'CLOSED': return 'text-text-tertiary border-border bg-surface-bright';
      default: return 'text-text-primary border-border-bright bg-surface-bright';
    }
  };

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-text-primary">Support Desk</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Platform integrity management and user inquiry resolution center.</p>
          </div>

          <div className="flex gap-4">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan queue by Subject, User or UID..."
                  className="bg-surface-bright border border-border-bright rounded-xl pl-12 pr-6 py-3 text-sm text-text-primary focus:border-primary/50 w-80"
                />
             </div>
             <select
               value={filter}
               onChange={e => setFilter(e.target.value as any)}
               className="bg-surface-bright border border-border-bright rounded-xl px-6 py-3 text-sm text-text-secondary focus:border-primary/50 outline-none appearance-none font-bold uppercase tracking-widest cursor-pointer"
             >
                <option value="ALL">ALL STATUS</option>
                <option value="OPEN">OPEN</option>
                <option value="PENDING">PENDING</option>
                <option value="AWAITING_USER">AWAITING USER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
             </select>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[800px]">
          <div className="lg:col-span-4 flex flex-col bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
             <div className="p-6 border-b border-border flex items-center justify-between bg-surface-bright/50">
                <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Queue Hub</h3>
                <span className="text-[10px] font-mono text-primary font-bold">{filteredTickets.length} NODES</span>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar">
                {filteredTickets.map((ticket) => (
                   <div
                     key={ticket.id}
                     onClick={() => setSelectedTicket(ticket)}
                     className={cn(
                       "p-6 border-b border-border cursor-pointer transition-all hover:bg-surface-bright group relative",
                       selectedTicket?.id === ticket.id ? "bg-surface-accent border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                     )}
                   >
                      <div className="flex justify-between items-start mb-3">
                         <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border", getStatusColor(ticket.status))}>
                            {ticket.status}
                         </span>
                         <span className="text-[9px] font-mono text-text-tertiary/50 uppercase tracking-widest">{ticket.updatedAt?.toDate?.()?.toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight italic truncate group-hover:text-primary transition-colors">{ticket.subject}</h4>
                      <div className="flex items-center gap-2 mt-2">
                         <User size={10} className="text-text-tertiary" />
                         <p className="text-[10px] text-text-tertiary truncate">{ticket.username} ({ticket.email})</p>
                      </div>
                      <p className="text-[10px] text-text-tertiary/50 mt-3 truncate italic leading-relaxed">{ticket.lastMessagePreview}</p>
                   </div>
                ))}
             </div>
          </div>

          <div className="lg:col-span-8 flex flex-col bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl relative">
             {selectedTicket ? (
                <>
                   <div className="p-8 border-b border-border flex items-center justify-between bg-surface-bright/50 z-10">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary shadow-inner">
                            <Mail size={24} />
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-text-primary uppercase tracking-tighter italic leading-none mb-2">{selectedTicket.subject}</h3>
                            <div className="flex items-center gap-4 text-xs font-medium">
                               <div className="flex items-center gap-2 text-primary uppercase tracking-widest">
                                  <User size={12} />
                                  <span>{selectedTicket.username}</span>
                               </div>
                               <div className="w-1 h-1 rounded-full bg-surface-bright" />
                               <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">ID: {selectedTicket.id}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <select
                           value={selectedTicket.status}
                           onChange={(e) => handleUpdateStatus(e.target.value as any)}
                           className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl border appearance-none outline-none cursor-pointer shadow-xl", getStatusColor(selectedTicket.status))}
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

                   <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar bg-background/20 shadow-inner">
                      {messages.map((msg) => (
                         <div key={msg.id} className={cn("flex gap-6 max-w-[85%]", msg.senderType === 'ADMIN' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                            <div className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-2xl",
                               msg.senderType === 'ADMIN' ? "bg-primary border-primary/20 text-text-primary shadow-primary/10" : "bg-white/[0.05] border-border-bright text-text-secondary"
                            )}>
                               {msg.senderType === 'ADMIN' ? <Shield size={20} /> : <User size={20} />}
                            </div>
                            <div className="space-y-3">
                               <div className={cn(
                                  "p-8 rounded-[2.5rem] text-sm font-medium leading-relaxed shadow-[0_20px_50px_rgba(0,0,0,0.5)] border transition-all",
                                  msg.senderType === 'ADMIN' ? "bg-primary border-primary/20 text-text-primary" : "bg-surface-accent border-border text-text-secondary"
                               )}>
                                  {msg.text}

                                  {msg.attachments && msg.attachments.length > 0 && (
                                     <div className="mt-8 pt-8 border-t border-border flex flex-wrap gap-3">
                                        {msg.attachments.map((at, i) => (
                                           <a key={i} href={at.storageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/40 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-all border border-border shadow-inner">
                                              <Paperclip size={14} />
                                              {at.fileName}
                                           </a>
                                        ))}
                                     </div>
                                  )}
                               </div>
                               <div className={cn("flex items-center gap-3 px-4", msg.senderType === 'ADMIN' ? "justify-end" : "justify-start")}>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary/50">{msg.senderName}</span>
                                  <span className="text-text-primary/5">•</span>
                                  <span className="text-[10px] font-bold text-text-tertiary/50">{msg.createdAt?.toDate?.()?.toLocaleString()}</span>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>

                   <div className="p-8 bg-background/40 border-t border-border space-y-6">
                      <div className="relative group">
                         <textarea
                           rows={4}
                           value={replyText}
                           onChange={e => setReplyText(e.target.value)}
                           placeholder="Authorized Administrative Response Action..."
                           className="w-full bg-surface-bright border border-border-bright rounded-[2rem] px-8 py-6 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-medium resize-none shadow-2xl"
                         />
                         <div className="absolute right-6 bottom-6 flex items-center gap-4">
                            <button className="w-12 h-12 rounded-xl bg-surface-bright flex items-center justify-center text-text-tertiary/50 hover:text-text-primary transition-all border border-border">
                               <Paperclip size={20} />
                            </button>
                            <Button
                              onClick={handleSendReply}
                              className="h-12 px-10 rounded-xl flex items-center gap-3 font-black uppercase tracking-widest text-[11px] italic shadow-2xl"
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
                   <X size={80} className="text-text-primary" />
                   <div className="text-center space-y-3">
                      <h3 className="text-2xl font-bold text-text-primary uppercase tracking-widest italic">Select </h3>
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.6em]">System Submission Pending Analysis</p>
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default OpsSupport;
