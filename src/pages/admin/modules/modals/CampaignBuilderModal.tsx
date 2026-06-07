import { useState, useEffect } from "react";
import { X, Target, Zap, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../utils';
import { doc, collection, serverTimestamp, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import toast from 'react-hot-toast';
import { Task, TaskCategory } from '../../../../types';

const CampaignBuilderModal = ({ isOpen, onClose, initialCampaign }: any) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    category: 'SOCIAL',
    bannerUrl: '',
    artworkUrl: '',
    sponsorName: 'PulseEarn',
    budget: 0,
    totalPrizePool: 0,
    active: true,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    featured: false,
    taskIds: [],
    participantsCount: 0,
    maxParticipants: 0
  });

  const [campaignTasks, setCampaignTasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
        setAvailableTasks(allTasks);

        if (initialCampaign?.taskIds?.length > 0) {
          const linked = allTasks.filter(t => initialCampaign.taskIds.includes(t.id));
          setCampaignTasks(linked);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (isOpen) {
      fetchTasks();
      if (initialCampaign) {
        setFormData({
          ...initialCampaign,
          startDate: initialCampaign.startDate?.toDate().toISOString().split('T')[0] || '',
          endDate: initialCampaign.endDate?.toDate().toISOString().split('T')[0] || ''
        });
      } else {
        setFormData({
          name: '',
          description: '',
          category: 'SOCIAL',
          bannerUrl: '',
          artworkUrl: '',
          sponsorName: 'PulseEarn',
          budget: 0,
          totalPrizePool: 0,
          active: true,
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          featured: false,
          taskIds: [],
          participantsCount: 0,
          maxParticipants: 0
        });
        setCampaignTasks([]);
      }
    }
  }, [isOpen, initialCampaign]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const campId = initialCampaign?.id || doc(collection(db, 'campaigns')).id;
      const batch = writeBatch(db);

      const campaignData = {
        ...formData,
        id: campId,
        taskIds: campaignTasks.map(t => t.id),
        startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        updatedAt: serverTimestamp(),
        createdAt: initialCampaign?.createdAt || serverTimestamp()
      };

      batch.set(doc(db, 'campaigns', campId), campaignData, { merge: true });

      // Update tasks to reference this campaign
      campaignTasks.forEach(task => {
        batch.update(doc(db, 'tasks', task.id), { campaignId: campId });
      });

      await batch.commit();
      toast.success('Campaign saved');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save campaign');
    }
  };

  const addTask = (task: Task) => {
    if (!campaignTasks.find(t => t.id === task.id)) {
      setCampaignTasks([...campaignTasks, task]);
    }
  };

  const removeTask = (taskId: string) => {
    setCampaignTasks(campaignTasks.filter(t => t.id !== taskId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl bg-surface sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto min-h-screen sm:min-h-0">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">{initialCampaign ? 'Edit' : 'New'} Campaign</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Target size={14} />
                Campaign Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Campaign Title</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Description</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-24 resize-none focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sponsor Name</label>
                  <input value={formData.sponsorName} onChange={e => setFormData({...formData, sponsorName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                    {(['SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'EVENTS', 'SPONSORED'] as TaskCategory[]).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                <Zap size={14} />
                Campaign Budget & Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Prize Pool (PTS)</label>
                  <input type="number" value={formData.totalPrizePool} onChange={e => setFormData({...formData, totalPrizePool: parseInt(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Max Participants</label>
                  <input type="number" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: parseInt(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Start Date</label>
                  <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">End Date (Optional)</label>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-success flex items-center gap-2">
                    <Zap size={14} />
                  Included Tasks ({campaignTasks.length})
                </h3>
              </div>

              <div className="space-y-3">
                {campaignTasks.map(task => (
                  <div key={task.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group">
                    <div>
                      <p className="text-xs font-bold text-white uppercase">{task.title}</p>
                      <p className="text-[9px] font-mono text-white/40 uppercase">+{task.rewardAmount} PTS • {task.category}</p>
                    </div>
                    <button type="button" onClick={() => removeTask(task.id)} className="p-2 text-white/20 hover:text-danger transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <div className="pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3 ml-1">Available Tasks</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
                    {availableTasks.filter(t => !campaignTasks.find(ct => ct.id === t.id)).map(task => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => addTask(task)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 transition-all flex items-center gap-2"
                      >
                        <Plus size={12} />
                        {task.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-4 flex items-center gap-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                  formData.active ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/30"
                )}>
                  {formData.active && <X size={12} className="text-white rotate-45" />}
                </div>
                <input type="checkbox" className="hidden" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Active Marketplace</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                  formData.featured ? "bg-accent border-accent" : "border-white/10 group-hover:border-white/30"
                )}>
                  {formData.featured && <X size={12} className="text-white rotate-45" />}
                </div>
                <input type="checkbox" className="hidden" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Featured</span>
              </label>
            </section>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button type="submit" className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              {initialCampaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CampaignBuilderModal;
