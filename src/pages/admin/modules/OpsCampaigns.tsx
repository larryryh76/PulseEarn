import * as React from 'react';
import { Target, Zap, Plus, Edit, Trash2, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import { Campaign } from '../../../types';
import toast from 'react-hot-toast';

const OpsCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleToggleStatus = async (campaign: Campaign) => {
     try {
        await updateDoc(doc(db, 'campaigns', campaign.id), {
           active: !campaign.active,
           updatedAt: serverTimestamp()
        });
        toast.success(`Campaign ${!campaign.active ? 'Activated' : 'Paused'}`);
     } catch (err) {
        toast.error("Status update failure");
     }
  };

  const handleDelete = async (id: string) => {
     if (!window.confirm("CRITICAL: Permanently delete this campaign?")) return;
     try {
        await deleteDoc(doc(db, 'campaigns', id));
        toast.success("Campaign Purged");
     } catch (err) {
        toast.error("Deletion failure");
     }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Target size={20} />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Campaign Operations</h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">Strategic Deployment Hub v2 - Manage Sponsored Reward Clusters.</p>
        </div>

        <button className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          <Plus size={18} /> New Campaign
        </button>
      </header>

      <DataTable
        columns={[
          {
            header: 'Campaign Identifier',
            accessor: (c: Campaign) => (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary overflow-hidden shadow-inner">
                   {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-cover" /> : <Target size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary uppercase italic">{c.name}</p>
                  <p className="text-[9px] font-mono text-text-tertiary mt-1 uppercase tracking-widest">{c.id}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Rewards',
            accessor: (c: Campaign) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <Zap size={10} className="text-success" />
                   <span className="text-[10px] font-mono font-bold text-text-primary">{c.totalPrizePool?.toLocaleString() || 0} PTS</span>
                </div>
                <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">{c.taskIds?.length || 0} Objectives</p>
              </div>
            )
          },
          {
            header: 'Metrics',
            accessor: (c: Campaign) => (
               <div className="space-y-1">
                  <div className="flex items-center gap-2">
                     <ShieldCheck size={10} className="text-primary" />
                     <span className="text-[10px] font-mono font-bold text-text-primary">{c.participantsCount || 0} Agents</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Clock size={10} className="text-warning" />
                     <span className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">End: {c.endDate?.toDate?.().toLocaleDateString() || 'N/A'}</span>
                  </div>
               </div>
            )
          },
          {
            header: 'State',
            accessor: (c: Campaign) => (
               <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit ${c.active ? 'bg-success/5 text-success border-success/20' : 'bg-danger/5 text-danger border-danger/20'}`}>
                  {c.active ? 'Live' : 'Paused'}
               </div>
            )
          },
          {
            header: 'Actions',
            className: 'text-right',
            accessor: (c: Campaign) => (
              <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                 <button onClick={() => handleToggleStatus(c)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary transition-all" title="Toggle Status">
                    <ExternalLink size={16} />
                 </button>
                 <button className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary transition-all" title="Edit">
                    <Edit size={16} />
                 </button>
                 <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-surface-bright rounded-lg text-danger transition-all" title="Delete">
                    <Trash2 size={16} />
                 </button>
              </div>
            )
          }
        ]}
        data={campaigns.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
};

export default OpsCampaigns;
