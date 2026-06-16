import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Search,
  Target,
  Users,
  Zap,
  Copy,
  Edit3,
  Trash2,
  Play,
  Pause,
  ArrowRight
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  where
} from 'firebase/firestore';
import { Campaign } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import CampaignBuilderModal from './modals/CampaignBuilderModal';

const OpsCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubCamp = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
    }, (err) => {
      console.error("[OpsCampaigns] Sync Failure:", err);
      setLoading(false);
    });

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubCamp(); unsubTasks(); };
  }, []);

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaign.id), {
        active: !campaign.active,
        status: !campaign.active ? 'ACTIVE' : 'PAUSED',
        updatedAt: serverTimestamp()
      });
      toast.success(`Campaign ${!campaign.active ? 'Activated' : 'Paused'}`);
    } catch (err) {
      toast.error("State transition failed");
    }
  };

  const handleClone = async (campaign: Campaign) => {
    try {
      const { id, ...data } = campaign;
      const newRef = doc(collection(db, 'campaigns'));
      await updateDoc(newRef, {
        ...data,
        id: newRef.id,
        name: `${data.name} (CLONE)`,
        active: false,
        status: 'DRAFT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participantsCount: 0
      });
      toast.success("Campaign configuration cloned");
    } catch (err) {
      toast.error("Cloning engine failure");
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!window.confirm(`FORCE TERMINATE: "${campaign.name}"? This will delete all associated tasks.`)) return;

    const loadingToast = toast.loading('Executing atomic deletion...');
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'campaigns', campaign.id));
      const tasksQ = query(collection(db, 'tasks'), where('campaignId', '==', campaign.id));
      const tasksSnap = await getDocs(tasksQ);
      tasksSnap.docs.forEach(tDoc => batch.delete(tDoc.ref));
      await batch.commit();
      toast.dismiss(loadingToast);
      toast.success("Campaign and child nodes purged");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Purge sequence failed");
    }
  };

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Layers size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Campaign Center</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Strategic lifecycle management for platform reward distribution.</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filter campaigns by Name or ID..."
                  className="w-full bg-surface-bright border border-border-bright rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
             <button
               onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
               className="px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
             >
                <Plus size={18} />
                New Campaign
             </button>
          </div>
       </header>

       <div className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-border bg-surface-bright/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Campaign</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Performance</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Reward Pool</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Budget</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Last Update</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                   {loading ? (
                      [1,2,3,4,5].map(i => (
                         <tr key={i} className="animate-pulse">
                            <td colSpan={7} className="px-8 py-10"><div className="h-4 bg-surface-bright rounded w-full" /></td>
                         </tr>
                      ))
                   ) : filtered.length > 0 ? (
                      filtered.map((camp) => (
                         <tr
                           key={camp.id}
                           onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
                           className="hover:bg-surface-bright/50 transition-colors cursor-pointer group"
                         >
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                     {camp.bannerUrl ? (
                                        <img src={camp.bannerUrl} className="w-full h-full object-cover" />
                                     ) : <Target size={20} className="text-text-tertiary" />}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{camp.name}</p>
                                     <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-0.5">{camp.id}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className={cn(
                                 "inline-flex px-2 py-0.5 rounded-md font-black uppercase tracking-[0.1em] text-[8px] border",
                                 camp.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                               )}>
                                  {camp.status}
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div>
                                     <p className="text-xs font-bold text-text-primary">{camp.participantsCount || 0}</p>
                                     <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Users</p>
                                  </div>
                                  <div className="w-px h-6 bg-border" />
                                  <div>
                                     <p className="text-xs font-bold text-text-primary">{tasks.filter(t => t.campaignId === camp.id).length}</p>
                                     <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Tasks</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-1.5">
                                  <Zap size={10} className="text-success" />
                                  <span className="text-xs font-mono font-bold text-text-primary">{(camp.totalPrizePool || 0).toLocaleString()}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="w-24 h-1.5 bg-surface-bright rounded-full overflow-hidden border border-border">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.max(5, (camp.remainingPool / (camp.totalPrizePool || 1)) * 100)}%` }}
                                  />
                               </div>
                               <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mt-1.5">{(camp.remainingPool || 0).toLocaleString()} REMAINING</p>
                            </td>
                            <td className="px-8 py-6">
                               <p className="text-[10px] font-bold text-text-secondary uppercase">
                                  {camp.updatedAt?.toDate()?.toLocaleDateString() || 'N/A'}
                               </p>
                            </td>
                            <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                               <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleToggleStatus(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all">
                                     {camp.active ? <Pause size={14} /> : <Play size={14} />}
                                  </button>
                                  <button onClick={() => handleClone(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-success transition-all" title="Clone"><Copy size={14} /></button>
                                  <button onClick={() => { setSelectedCampaign(camp); setIsModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all" title="Edit"><Edit3 size={14} /></button>
                                  <button onClick={() => handleDelete(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-danger transition-all" title="Delete"><Trash2 size={14} /></button>
                               </div>
                            </td>
                         </tr>
                      ))
                   ) : (
                      <tr>
                         <td colSpan={7} className="px-8 py-40 text-center">
                            <Target size={48} className="mx-auto text-text-primary/5 mb-6" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">No campaign entities identified</h3>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
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

export default OpsCampaigns;
