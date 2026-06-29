import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Zap,
  Copy,
  Edit3,
  Trash2,
  Play,
  Pause,
  Target
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot
} from 'firebase/firestore';
import { Campaign } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import CampaignBuilderModal from './modals/CampaignBuilderModal';
import DataTable from '../../../components/admin/common/DataTable';

const OpsCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchCampaigns = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'campaigns'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'campaigns'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));

      if (isNext) {
        setCampaigns(prev => [...prev, ...data]);
      } else {
        setCampaigns(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsCampaigns] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCampaigns();
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubTasks();
  }, []);

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaign.id), {
        active: !campaign.active,
        status: !campaign.active ? 'ACTIVE' : 'PAUSED',
        updatedAt: serverTimestamp()
      });
      toast.success(`Campaign ${!campaign.active ? 'Activated' : 'Paused'}`);
      fetchCampaigns();
    } catch (err) {
      toast.error("State transition failed");
    }
  };

  const handleClone = async (campaign: Campaign) => {
    try {
      const { id, ...data } = campaign;
      const newRef = doc(collection(db, 'campaigns'));
      await setDoc(newRef, {
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
      fetchCampaigns();
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
      toast.success("Campaign and child items purged");
      fetchCampaigns();
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic">Campaign Center</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Manage and organize platform reward campaigns and distribution.</p>
          </div>

          <button
            onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
            className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
             <Plus size={18} /> New Campaign
          </button>
       </header>

       <DataTable
         columns={[
           {
             header: 'Campaign',
             accessor: (camp: Campaign) => (
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                     {camp.bannerUrl ? (
                        <img src={camp.bannerUrl} className="w-full h-full object-cover" />
                     ) : <Target size={20} className="text-text-tertiary" />}
                  </div>
                  <div>
                     <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{camp.name}</p>
                     <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-0.5">{camp.id}</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Status',
             accessor: (camp: Campaign) => (
               <div className={cn(
                 "inline-flex px-2 py-0.5 rounded-md font-black uppercase tracking-[0.1em] text-[8px] border",
                 camp.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
               )}>
                  {camp.status}
               </div>
             )
           },
           {
             header: 'Performance',
             accessor: (camp: Campaign) => (
               <div className="flex items-center gap-4">
                  <div>
                     <p className="text-xs font-bold text-text-primary">{tasks.filter(t => t.campaignId === camp.id).length}</p>
                     <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Tasks</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                     <p className="text-xs font-bold text-text-primary">{camp.participantsCount || 0}</p>
                     <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Users</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Reward Pool',
             accessor: (camp: Campaign) => (
               <div className="flex items-center gap-1.5">
                  <Zap size={10} className="text-success" />
                  <span className="text-xs font-mono font-bold text-text-primary">{(camp.totalPrizePool || 0).toLocaleString()}</span>
               </div>
             )
           },
           {
             header: 'Budget',
             accessor: (camp: Campaign) => (
               <div>
                  <div className="w-24 h-1.5 bg-surface-bright rounded-full overflow-hidden border border-border">
                     <div
                       className="h-full bg-primary"
                       style={{ width: `${Math.max(5, ((camp.remainingPool || 0) / (camp.totalPrizePool || 1)) * 100)}%` }}
                     />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mt-1.5">{(camp.remainingPool || 0).toLocaleString()} REMAINING</p>
               </div>
             )
           },
           {
             header: 'Actions',
             className: 'text-right',
             accessor: (camp: Campaign) => (
               <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleToggleStatus(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all">
                     {camp.active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => handleClone(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-success transition-all" title="Clone"><Copy size={14} /></button>
                  <button onClick={() => { setSelectedCampaign(camp); setIsModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all" title="Edit"><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(camp)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-danger transition-all" title="Delete"><Trash2 size={14} /></button>
               </div>
             )
           }
         ]}
         data={filtered}
         isLoading={loading}
         onRowClick={(camp) => navigate(`/admin/campaigns/${camp.id}`)}
         searchTerm={searchTerm}
         onSearchChange={setSearchTerm}
         onLoadMore={() => fetchCampaigns(true)}
         hasMore={hasMore}
       />

       <CampaignBuilderModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setSelectedCampaign(null); }}
         initialCampaign={selectedCampaign}
       />
    </div>
  );
};

export default OpsCampaigns;
