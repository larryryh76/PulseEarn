import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
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
  Globe
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
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
    // Isolated sync for campaigns
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubCamp = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
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
       {/* BUSINESS HEADER */}
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Briefcase size={20} className="text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Sponsored Initiatives</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">B2B campaign management and partner reward distribution hub.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
             <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filter by Sponsor or Campaign..."
                  className="w-full bg-surface-bright border border-border-bright rounded-xl py-3 pl-12 pr-6 text-[11px] focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
             <button
               onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
               className="w-full sm:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
             >
                <Plus size={18} />
                Onboard Campaign
             </button>
          </div>
       </header>

       {/* OPERATIONAL TABLE */}
       <div className="bg-surface border border-border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
             <table className="w-full text-left border-collapse min-w-[1100px] lg:min-w-0">
                <thead>
                   <tr className="border-b border-border bg-surface-bright/50 whitespace-nowrap">
                      <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary">Campaign & Sponsor</th>
                      <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary">Status</th>
                      <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary">Architecture</th>
                      <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary">Reward Pool</th>
                      <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary">Participants</th>
                      <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                   {loading ? (
                      [1,2,3,4,5].map(i => (
                         <tr key={i} className="animate-pulse">
                            <td colSpan={6} className="px-8 py-10"><div className="h-4 bg-surface-bright rounded w-full" /></td>
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
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                     {camp.bannerUrl ? (
                                        <img src={camp.bannerUrl} className="w-full h-full object-cover" />
                                     ) : <Target size={20} className="text-text-tertiary" />}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">{camp.name}</p>
                                     <div className="flex items-center gap-2 mt-1">
                                        <Globe size={10} className="text-text-tertiary" />
                                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest truncate">{camp.sponsorName || 'PulseEarn Internal'}</p>
                                     </div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className={cn(
                                 "inline-flex px-3 py-1 rounded-md font-black uppercase tracking-[0.1em] text-[8px] border whitespace-nowrap",
                                 camp.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                               )}>
                                  {camp.status}
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div>
                                     <p className="text-xs font-bold text-text-primary">{campTasks.length}</p>
                                     <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Tasks</p>
                                  </div>
                                  <div className="w-px h-6 bg-border" />
                                  <div className="flex items-center gap-2">
                                     <Layers size={12} className="text-primary" />
                                     <span className="text-[9px] font-bold text-text-secondary uppercase">{camp.category}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                     <Zap size={10} className="text-primary" />
                                     <span className="text-xs font-mono font-bold text-text-primary">{(camp.totalPrizePool || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="w-24 h-1 bg-surface-bright rounded-full overflow-hidden">
                                     <div
                                       className="h-full bg-primary"
                                       style={{ width: `${Math.max(5, ((camp.remainingPool || 0) / (camp.totalPrizePool || 1)) * 100)}%` }}
                                     />
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-2">
                                  <Users size={14} className="text-text-tertiary" />
                                  <span className="text-xs font-mono font-bold text-text-primary">{camp.participantsCount || 0}</span>
                                  <span className="text-[8px] text-text-tertiary uppercase font-black">/ {camp.maxParticipants || '∞'}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                               <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleToggleStatus(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all">
                                     {camp.active ? <BarChart3 size={14} /> : <TrendingUp size={14} />}
                                  </button>
                                  <button onClick={() => { setSelectedCampaign(camp); setIsModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                                     <MoreVertical size={14} />
                                  </button>
                                  <button onClick={() => navigate(`/admin/sponsored/${camp.id}`)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all">
                                     <ChevronRight size={14} />
                                  </button>
                               </div>
                            </td>
                         </tr>
                      )})
                   ) : (
                      <tr>
                         <td colSpan={6} className="px-8 py-40 text-center">
                            <Briefcase size={48} className="mx-auto text-text-primary/5 mb-6" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">No partner campaigns identified</h3>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* BUSINESS METRICS SUMMARY */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-surface border border-border rounded-[2rem] shadow-xl space-y-6">
             <div className="flex justify-between items-start">
                <TrendingUp size={20} className="text-success" />
                <span className="text-[9px] font-black text-success uppercase tracking-widest">Growth Phase</span>
             </div>
             <div>
                <p className="text-3xl font-mono font-bold text-text-primary">{campaigns.filter(c => c.active).length}</p>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-2">Active Initiatives</p>
             </div>
          </div>
          <div className="p-8 bg-surface border border-border rounded-[2rem] shadow-xl space-y-6">
             <div className="flex justify-between items-start">
                <Zap size={20} className="text-primary" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Economic Flow</span>
             </div>
             <div>
                <p className="text-3xl font-mono font-bold text-text-primary">{campaigns.reduce((acc, c) => acc + (c.totalPrizePool || 0), 0).toLocaleString()}</p>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-2">Total Budget Auth</p>
             </div>
          </div>
          <div className="p-8 bg-surface border border-border rounded-[2rem] shadow-xl space-y-6">
             <div className="flex justify-between items-start">
                <Users size={20} className="text-indigo-400" />
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Network Effect</span>
             </div>
             <div>
                <p className="text-3xl font-mono font-bold text-text-primary">{campaigns.reduce((acc, c) => acc + (c.participantsCount || 0), 0).toLocaleString()}</p>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-2">Unique Task Claims</p>
             </div>
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
