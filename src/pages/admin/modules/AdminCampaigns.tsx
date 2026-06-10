import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ArrowRight,
  Image as ImageIcon,
  Edit3,
  Pause,
  Target,
  Trash2
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import CampaignBuilderModal from './modals/CampaignBuilderModal';

const AdminCampaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedCampaign, setSelectedCampaign] = React.useState<any | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Campaigns fetch failed:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleToggleStatus = async (campaign: any) => {
     try {
        await updateDoc(doc(db, 'campaigns', campaign.id), {
           active: !campaign.active
        });
        toast.success(`Campaign ${!campaign.active ? 'activated' : 'deactivated'}`);
     } catch (err) {
        toast.error("Status update failed");
     }
  };

  const handleClone = async (campaign: any) => {
     try {
        const { id, ...data } = campaign;
        const newId = doc(collection(db, 'campaigns')).id;
        await updateDoc(doc(db, 'campaigns', newId), {
           ...data,
           id: newId,
           name: `${data.name} (Copy)`,
           active: false,
           createdAt: new Date()
        });
        toast.success("Campaign cloned");
     } catch (err) {
        // Fallback if updateDoc fails on non-existent doc (standardizing on setDoc for new items)
        try {
           const { id, ...data } = campaign;
           const newId = doc(collection(db, 'campaigns')).id;
           const { doc: fireDoc, setDoc: fireSetDoc, serverTimestamp: fireTS } = await import('firebase/firestore');
           await fireSetDoc(fireDoc(db, 'campaigns', newId), {
              ...data,
              id: newId,
              name: `${data.name} (Copy)`,
              active: false,
              createdAt: fireTS(),
              updatedAt: fireTS()
           });
           toast.success("Campaign cloned");
        } catch (inner) {
           toast.error("Clone failed");
        }
     }
  };

  const handleDelete = async (campaign: any) => {
     if (!window.confirm(`Are you sure you want to delete "${campaign.name}" and all its tasks?`)) return;
     try {
        const { writeBatch, query, collection, where, getDocs } = await import('firebase/firestore');
        const batch = writeBatch(db);

        // Delete the campaign
        batch.delete(doc(db, 'campaigns', campaign.id));

        // Find and delete all child tasks
        const tasksQ = query(collection(db, 'tasks'), where('campaignId', '==', campaign.id));
        const tasksSnap = await getDocs(tasksQ);
        tasksSnap.docs.forEach(tDoc => {
           batch.delete(tDoc.ref);
        });

        await batch.commit();
        toast.success("Campaign and associated tasks terminated");
     } catch (err) {
        console.error(err);
        toast.error("Deletion failed");
     }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Campaigns</h1>
          <p className="text-text-secondary text-sm font-medium">Manage and monitor platform reward campaigns.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
            />
          </div>
          <button
            onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
            className="px-8 py-3.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <Plus size={18} />
            New Campaign
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] h-96 animate-pulse" />
          ))
        ) : filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((camp) => (
            <div key={camp.id} className="group bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-primary/30 transition-all duration-500 flex flex-col">
              <div className="h-48 relative overflow-hidden bg-white/5">
                {camp.bannerUrl ? (
                  <img src={camp.bannerUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="text-white/10" size={40} />
                  </div>
                )}
                <div className="absolute top-6 right-6">
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] backdrop-blur-md border",
                    camp.active ? "bg-success/10 text-success border-success/20" : "bg-white/10 text-white/40 border-white/10"
                  )}>
                    {camp.active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">{camp.name}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClone(camp); }}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-success"
                      title="Clone Campaign"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCampaign(camp); setIsModalOpen(true); }}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white"
                      title="Edit Campaign"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(camp); }}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-danger"
                      title="Delete Campaign"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-text-secondary font-medium leading-relaxed mb-8 flex-1 line-clamp-3">
                  {camp.description}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                   <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleStatus(camp)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all",
                          camp.active ? "bg-warning/5 text-warning border-warning/10 hover:bg-warning/10" : "bg-success/5 text-success border-success/10 hover:bg-success/10"
                        )}
                        title={camp.active ? "Deactivate" : "Activate"}
                      >
                         {camp.active ? <Pause size={16} /> : <Target size={16} />}
                      </button>
                   </div>
                   <button
                      onClick={() => navigate(`/campaigns/${camp.id}`)}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all"
                   >
                      Manage Details
                      <ArrowRight size={14} />
                   </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
             <Target size={48} className="mx-auto text-white/5 mb-6" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">No active campaigns detected</h3>
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

export default AdminCampaigns;
