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
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
    }, (err) => {
      console.error("[OpsCampaigns] Sync Failure:", err);
      setLoading(false);
    });
    return unsubscribe;
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filter campaigns by Name or ID..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
             <button
               onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
               className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
             >
                <Plus size={18} />
                New Campaign
             </button>
          </div>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {loading ? (
             [1,2,3,4,5,6].map(i => <div key={i} className="h-[400px] bg-white/[0.02] border border-white/5 rounded-[2rem] animate-pulse" />)
          ) : filtered.length > 0 ? (
             filtered.map((camp) => (
                <div key={camp.id} className="group bg-[#0A0A0F] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-primary/30 transition-all duration-500 flex flex-col shadow-2xl">
                   <div className="h-44 relative overflow-hidden bg-white/5">
                      {camp.bannerUrl ? (
                         <img src={camp.bannerUrl} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 grayscale-[50%] group-hover:grayscale-0" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center">
                            <Target size={40} className="text-white/5" />
                         </div>
                      )}
                      <div className="absolute top-6 left-6">
                         <span className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase tracking-[0.3em] text-white">
                            {camp.category}
                         </span>
                      </div>
                      <div className="absolute top-6 right-6">
                         <div className={cn(
                           "px-3 py-1.5 rounded-lg font-black uppercase tracking-[0.2em] text-[8px] border",
                           camp.active ? "bg-success/10 text-success border-success/20" : "bg-white/5 text-white/20 border-white/10"
                         )}>
                            {camp.status}
                         </div>
                      </div>
                   </div>

                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                         <div className="min-w-0">
                            <h3 className="text-lg font-bold text-white tracking-tight uppercase italic truncate group-hover:text-primary transition-colors">{camp.name}</h3>
                            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-1">ID: {camp.id}</p>
                         </div>
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleClone(camp)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-success transition-all" title="Clone"><Copy size={14} /></button>
                            <button onClick={() => { setSelectedCampaign(camp); setIsModalOpen(true); }} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all" title="Edit"><Edit3 size={14} /></button>
                            <button onClick={() => handleDelete(camp)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-danger transition-all" title="Delete"><Trash2 size={14} /></button>
                         </div>
                      </div>

                      <p className="text-xs text-text-tertiary leading-relaxed font-medium mb-8 line-clamp-2">
                         {camp.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                         <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                               <Users size={12} className="text-primary" />
                               <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Participants</span>
                            </div>
                            <p className="text-lg font-mono font-bold text-white">{camp.participantsCount || 0}</p>
                         </div>
                         <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                               <Zap size={12} className="text-success" />
                               <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Total Prize</span>
                            </div>
                            <p className="text-lg font-mono font-bold text-success">{camp.totalPrizePool?.toLocaleString() || 0}</p>
                         </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                         <button
                           onClick={() => handleToggleStatus(camp)}
                           className={cn(
                             "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                             camp.active ? "bg-warning/5 border-warning/10 text-warning hover:bg-warning/10" : "bg-success/5 text-success border-success/10 hover:bg-success/10"
                           )}
                         >
                            {camp.active ? <Pause size={18} /> : <Play size={18} />}
                         </button>

                         <button
                           onClick={() => navigate(`/admin/tasks?campaignId=${camp.id}`)}
                           className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-primary transition-all group/btn"
                         >
                            Manage Tasks
                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                         </button>
                      </div>
                   </div>
                </div>
             ))
          ) : (
             <div className="col-span-full py-40 text-center border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
                <Target size={48} className="mx-auto text-white/5 mb-6" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">No campaign entities identified</h3>
             </div>
          )}
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
