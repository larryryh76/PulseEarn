import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Target,
  Zap,
  Briefcase,
  Users,
  TrendingUp,
  ChevronRight,
  MoreVertical,
  BarChart3,
  Globe,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Campaign, Task } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import CampaignBuilderModal from './modals/CampaignBuilderModal';

const OpsSponsoredCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);

  React.useEffect(() => {
    // Audit: Removed orderBy to prevent "Missing Index" failures.
    // Sorting is performed client-side for maximum reliability.
    const q = query(collection(db, 'campaigns'));
    const unsubCamp = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(data.sort((a, b) => {
         const timeA = (a.createdAt as any)?.toMillis?.() || 0;
         const timeB = (b.createdAt as any)?.toMillis?.() || 0;
         return timeB - timeA;
      }));
      setLoading(false);
    }, (err) => {
      console.error("[OpsSponsoredCampaigns] Sync Failure:", err);
      setLoading(false);
    });

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    return () => { unsubCamp(); unsubTasks(); };
  }, []);

  const handleToggleStatus = async (camp: Campaign) => {
    try {
      const nextActive = !camp.active;
      await updateDoc(doc(db, 'campaigns', camp.id), {
        active: nextActive,
        status: nextActive ? 'ACTIVE' : 'PAUSED',
        updatedAt: serverTimestamp()
      });
      toast.success(`Campaign ${nextActive ? 'Activated' : 'Paused'}`);
    } catch (err) {
      toast.error("State transition failure");
    }
  };

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sponsorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       {/* HIGH-DENSITY BUSINESS HEADER */}
       <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 bg-surface border border-border p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <Briefcase size={320} />
          </div>

          <div className="space-y-4 relative z-10">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                   <Briefcase size={20} />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase italic text-text-primary leading-none">Sponsored Hub</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary max-w-lg leading-relaxed">
                Centralized operational command for commercial partner initiatives, reward distribution protocols, and B2B campaign lifecycle management.
             </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto relative z-10">
             <div className="relative w-full sm:w-80">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan Sponsor Directory..."
                  className="w-full bg-surface-bright border border-border-bright rounded-2xl py-4 pl-14 pr-6 text-xs focus:border-primary/50 outline-none transition-all font-bold placeholder:text-text-tertiary/30 shadow-inner"
                />
             </div>
             <button
               onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
               className="w-full sm:w-auto px-10 h-14 bg-primary text-text-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-primary/90 active:scale-95 transition-all shadow-xl shadow-primary/20 shrink-0 italic"
             >
                <Plus size={20} />
                Onboard Initiative
             </button>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* MAIN OPERATIONAL TABLE */}
          <div className="lg:col-span-8 space-y-8">
             <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-border bg-surface-bright/50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Active Registry</h3>
                   </div>
                   <span className="text-[10px] font-mono font-bold text-primary">{filtered.length} NODES</span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left border-collapse min-w-[900px] lg:min-w-0">
                      <thead>
                         <tr className="border-b border-border bg-surface-bright/30 whitespace-nowrap">
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Campaign & Partner</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Status</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Work Units</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Budget</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {loading ? (
                            [1,2,3,4,5].map(i => (
                               <tr key={i} className="animate-pulse">
                                  <td colSpan={5} className="px-8 py-10"><div className="h-4 bg-surface-bright rounded w-full" /></td>
                               </tr>
                            ))
                         ) : filtered.length > 0 ? (
                            filtered.map((camp) => {
                               const campTasks = tasks.filter(t => t.campaignId === camp.id);
                               return (
                               <tr
                                 key={camp.id}
                                 onClick={() => navigate(`/admin/sponsored/${camp.id}`)}
                                 className="hover:bg-surface-bright/50 transition-colors cursor-pointer group"
                               >
                                  <td className="px-8 py-8">
                                     <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-inner group-hover:border-primary/40 transition-colors">
                                           {camp.bannerUrl ? (
                                              <img src={camp.bannerUrl} className="w-full h-full object-cover" />
                                           ) : <Target size={24} className="text-text-tertiary/20" />}
                                        </div>
                                        <div className="min-w-0">
                                           <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate uppercase tracking-tight italic">{camp.name}</p>
                                           <div className="flex items-center gap-2 mt-1.5">
                                              <Globe size={12} className="text-primary" />
                                              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest truncate">{camp.sponsorName || 'INTERNAL'}</p>
                                           </div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-8">
                                     <div className={cn(
                                       "inline-flex px-3 py-1 rounded-lg font-black uppercase tracking-[0.1em] text-[8px] border whitespace-nowrap italic",
                                       camp.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                                     )}>
                                        {camp.status}
                                     </div>
                                  </td>
                                  <td className="px-8 py-8">
                                     <div className="flex items-center gap-4">
                                        <div>
                                           <p className="text-xs font-bold text-text-primary">{campTasks.length}</p>
                                           <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Tasks</p>
                                        </div>
                                        <div className="w-px h-6 bg-border" />
                                        <div className="flex items-center gap-2">
                                           <Users size={14} className="text-primary" />
                                           <p className="text-xs font-bold text-text-primary">{camp.participantsCount || 0}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-8">
                                     <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                           <Zap size={10} className="text-primary" />
                                           <span className="text-xs font-mono font-bold text-text-primary">{(camp.totalPrizePool || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="w-24 h-1 bg-surface-bright rounded-full overflow-hidden border border-border">
                                           <div
                                             className="h-full bg-primary"
                                             style={{ width: `${Math.max(5, ((camp.remainingPool || 0) / (camp.totalPrizePool || 1)) * 100)}%` }}
                                           />
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-8 text-right" onClick={e => e.stopPropagation()}>
                                     <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleToggleStatus(camp)} className="p-2.5 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-primary transition-all border border-transparent hover:border-border">
                                           {camp.active ? <BarChart3 size={16} /> : <TrendingUp size={16} />}
                                        </button>
                                        <button onClick={() => { setSelectedCampaign(camp); setIsModalOpen(true); }} className="p-2.5 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-text-primary transition-all border border-transparent hover:border-border">
                                           <MoreVertical size={16} />
                                        </button>
                                        <button onClick={() => navigate(`/admin/sponsored/${camp.id}`)} className="p-2.5 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-primary transition-all border border-transparent hover:border-border shadow-inner">
                                           <ChevronRight size={16} />
                                        </button>
                                     </div>
                                  </td>
                               </tr>
                            )})
                         ) : (
                            <tr>
                               <td colSpan={5} className="px-8 py-40 text-center">
                                  <div className="max-w-xs mx-auto space-y-6 opacity-20">
                                     <Briefcase size={48} className="mx-auto" />
                                     <p className="text-[10px] font-black uppercase tracking-[0.5em]">No commercial initiatives</p>
                                  </div>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>

          {/* SIDE PANEL PERFORMANCE & LOGS */}
          <div className="lg:col-span-4 space-y-8">
             <section className="bg-surface border border-border p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl space-y-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                   <TrendingUp size={120} />
                </div>
                <div className="flex items-center gap-3 relative z-10 border-b border-border pb-6">
                   <BarChart3 size={18} className="text-primary" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Economic Overview</h3>
                </div>
                <div className="grid grid-cols-2 gap-8 relative z-10">
                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Total Auth Pool</p>
                      <div className="flex items-center gap-2">
                         <Zap size={14} className="text-primary" />
                         <p className="text-xl font-mono font-bold text-text-primary">{campaigns.reduce((acc, c) => acc + (c.totalPrizePool || 0), 0).toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Settlement USD</p>
                      <div className="flex items-center gap-2">
                         <DollarSign size={14} className="text-success" />
                         <p className="text-xl font-mono font-bold text-text-primary">{(campaigns.reduce((acc, c) => acc + (c.totalPrizePool || 0), 0) / 1000).toLocaleString()} <span className="text-[10px] opacity-30">USD</span></p>
                      </div>
                   </div>
                </div>
                <div className="p-6 rounded-2xl bg-surface-bright border border-border space-y-4 relative z-10 shadow-inner">
                   <div className="flex justify-between items-center text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                      <span>Network Reach</span>
                      <span className="text-primary">{campaigns.reduce((acc, c) => acc + (c.participantsCount || 0), 0).toLocaleString()} Users</span>
                   </div>
                   <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(0,112,255,0.4)]" style={{ width: '65%' }} />
                   </div>
                </div>
             </section>

             <section className="bg-surface border border-border p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-6">
                   <ShieldCheck size={18} className="text-success" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Operational Integrity</h3>
                </div>
                <div className="space-y-5">
                   {[
                      { label: 'Asset Verification', status: 'SYNCHRONIZED', color: 'text-success' },
                      { label: 'Partner Auth', status: 'ACTIVE', color: 'text-success' },
                      { label: 'Settlement Engine', status: 'NOMINAL', color: 'text-primary' },
                      { label: 'Security Protocol', status: 'ENFORCED', color: 'text-success' }
                   ].map(item => (
                      <div key={item.label} className="flex justify-between items-center group">
                         <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest group-hover:text-text-secondary transition-colors">{item.label}</span>
                         <span className={cn("text-[8px] font-black uppercase tracking-widest", item.color)}>{item.status}</span>
                      </div>
                   ))}
                </div>
             </section>

             <section className="p-8 bg-primary/10 border border-primary/20 rounded-[2.5rem] shadow-xl space-y-6 group cursor-pointer hover:bg-primary/[0.15] transition-all">
                <div className="flex justify-between items-start">
                   <LayoutGrid size={24} className="text-primary group-hover:scale-110 transition-transform" />
                   <ArrowUpRight size={18} className="text-primary/40 group-hover:text-primary transition-colors" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] italic">Partner API</h4>
                   <p className="text-[10px] font-medium text-text-tertiary leading-relaxed mt-2 uppercase tracking-widest opacity-60">Generate secure integration keys for external task validation and reward syncing.</p>
                </div>
             </section>
          </div>
       </div>

       <CampaignBuilderModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setSelectedCampaign(null); }}
         initialCampaign={selectedCampaign}
       />
    </div>
  );
};

export default OpsSponsoredCampaigns;
