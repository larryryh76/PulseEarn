import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Zap,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { Campaign } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import CampaignBuilderModal from './modals/CampaignBuilderModal';
import DataTable from '../../../components/admin/common/DataTable';

const OpsSponsoredCampaigns: React.FC = () => {
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
        where('category', '==', 'SPONSORED'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'campaigns'),
          where('category', '==', 'SPONSORED'),
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
      console.error("[OpsSponsoredCampaigns] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCampaigns();
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTasks(); };
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

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Briefcase size={20} className="text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic">Sponsored Intel</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Manage high-yield commercial campaigns and partner initiatives.</p>
          </div>

          <button
            onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
            className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
             <Plus size={18} /> New Sponsored Campaign
          </button>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-8">
             <DataTable
                columns={[
                  {
                    header: 'Initiative',
                    accessor: (camp: Campaign) => (
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                            {camp.bannerUrl ? (
                               <img src={camp.bannerUrl} className="w-full h-full object-cover" />
                            ) : <Briefcase size={20} className="text-text-tertiary" />}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{camp.name}</p>
                            <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-0.5">{camp.sponsorName || 'Direct'}</p>
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
                    header: 'Inventory',
                    accessor: (camp: Campaign) => (
                      <div className="flex items-center gap-4">
                         <div>
                            <p className="text-xs font-bold text-text-primary">{tasks.filter(t => t.campaignId === camp.id).length}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Tasks</p>
                         </div>
                         <div className="w-px h-6 bg-border" />
                         <div className="flex items-center gap-2">
                            <Users size={14} className="text-primary" />
                            <p className="text-xs font-bold text-text-primary">{camp.participantsCount || 0}</p>
                         </div>
                      </div>
                    )
                  },
                  {
                    header: 'Budget',
                    accessor: (camp: Campaign) => (
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
                    )
                  },
                  {
                    header: 'Actions',
                    className: 'text-right',
                    accessor: (camp: Campaign) => (
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
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
                    )
                  }
                ]}
                data={filtered}
                isLoading={loading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onLoadMore={() => fetchCampaigns(true)}
                hasMore={hasMore}
             />
          </div>

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
