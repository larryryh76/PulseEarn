import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import {
  collection,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import {
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle,
  XCircle,
  Zap,
  Star
} from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';
import { Campaign, Task } from '../../types';

const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '',
    description: '',
    bannerUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1000',
    active: true,
    featured: false,
    taskIds: [],
    totalPrizePool: 100000
  });

  useEffect(() => {
    const unsubCampaigns = onSnapshot(query(collection(db, 'campaigns'), orderBy('startDate', 'desc')), (snapshot) => {
      setCampaigns(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    return () => {
      unsubCampaigns();
      unsubTasks();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        startDate: serverTimestamp(),
        endDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Default 7 days
      };

      if (isEditing) {
        await updateDoc(doc(db, 'campaigns', isEditing), data);
        toast.success('Campaign Updated');
      } else {
        await addDoc(collection(db, 'campaigns'), data);
        toast.success('Campaign Launched');
      }
      setIsEditing(null);
      setFormData({ name: '', description: '', active: true, featured: false, taskIds: [], totalPrizePool: 100000 });
    } catch (e) {
      toast.error('Campaign Operation Failed');
    }
  };

  const toggleTask = (taskId: string) => {
    const current = formData.taskIds || [];
    if (current.includes(taskId)) {
      setFormData({ ...formData, taskIds: current.filter(id => id !== taskId) });
    } else {
      setFormData({ ...formData, taskIds: [...current, taskId] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Campaign Orchestrator</h1>
           <p className="text-white/40 text-sm mt-1">Design and deploy high-visibility mission clusters.</p>
        </div>
        <button
          onClick={() => { setIsEditing(null); setFormData({ name: '', description: '', active: true, featured: false, taskIds: [] }); }}
          className="px-6 py-3 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={14} /> Assemble Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           {campaigns.map(camp => (
             <Card key={camp.id} className={cn(
               "p-0 overflow-hidden border-white/[0.05] bg-[#0A0A0F] group",
               !camp.active && "opacity-50 grayscale"
             )}>
                <div className="h-32 w-full relative">
                   <img src={camp.bannerUrl} alt="" className="w-full h-full object-cover opacity-40" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
                   {camp.featured && (
                     <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-[8px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <Star size={10} fill="currentColor" /> Featured Campaign
                     </div>
                   )}
                </div>
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-2">
                      <h3 className="text-xl font-bold">{camp.name}</h3>
                      <p className="text-xs text-white/40 max-w-md">{camp.description}</p>
                      <div className="flex items-center gap-4 pt-2">
                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/20 uppercase">
                            <Zap size={12} className="text-primary" />
                            {camp.taskIds?.length || 0} Connected Tasks
                         </div>
                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/20 uppercase">
                            <Calendar size={12} />
                            Ends {camp.endDate?.toDate().toLocaleDateString()}
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => { setIsEditing(camp.id); setFormData(camp); }} className="p-3 rounded-xl bg-white/[0.03] text-white/20 hover:text-white transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => updateDoc(doc(db, 'campaigns', camp.id), { active: !camp.active })} className={cn("p-3 rounded-xl transition-all", camp.active ? "bg-green-500/10 text-green-500" : "bg-white/[0.03] text-white/20")}>
                         {camp.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      </button>
                      <button onClick={() => deleteDoc(doc(db, 'campaigns', camp.id))} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 size={16} /></button>
                   </div>
                </div>
             </Card>
           ))}
        </div>

        <Card className="p-8 border-white/[0.05] bg-[#0A0A0F] sticky top-24">
           <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-white/20">Assembly Panel</h3>
           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                 <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase block mb-2 px-1">Campaign Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-xs focus:border-primary/50" required />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase block mb-2 px-1">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-xs focus:border-primary/50 h-24 resize-none" required />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase block mb-2 px-1">Prize Pool (PTS)</label>
                    <input type="number" value={formData.totalPrizePool} onChange={e => setFormData({...formData, totalPrizePool: Number(e.target.value)})} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-xs focus:border-primary/50" />
                 </div>

                 <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase block mb-2 px-1">Connect Tasks</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                       {tasks.map(t => (
                         <button
                           key={t.id}
                           type="button"
                           onClick={() => toggleTask(t.id)}
                           className={cn(
                             "w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all",
                             formData.taskIds?.includes(t.id) ? "bg-primary/10 border-primary/20" : "bg-white/[0.02] border-white/[0.05]"
                           )}
                         >
                            <span className={cn("text-[10px] font-bold", formData.taskIds?.includes(t.id) ? "text-primary" : "text-white/40")}>{t.title}</span>
                            {formData.taskIds?.includes(t.id) && <CheckCircle size={14} className="text-primary" />}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured}
                      onChange={e => setFormData({...formData, featured: e.target.checked})}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary"
                    />
                    <label htmlFor="featured" className="text-[10px] font-bold text-white/40 uppercase tracking-widest cursor-pointer">Feature on Homepage</label>
                 </div>
              </div>

              <button type="submit" className="w-full py-4 rounded-2xl bg-primary text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(0,112,255,0.3)] mt-4">{isEditing ? 'Confirm Update' : 'Launch Campaign'}</button>
           </form>
        </Card>
      </div>
    </div>
  );
};

export default CampaignManager;
