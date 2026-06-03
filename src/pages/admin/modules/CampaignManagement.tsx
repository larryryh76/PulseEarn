import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Task, TaskCategory, SocialPlatform, VerificationType } from '../../../types';
import {
  Plus,
  Search,
  Edit2,
  Pause,
  Play,
  Trash2,
  X,
  Zap,
  Image as ImageIcon,
  Calendar,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';

const CampaignManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
  }, []);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTaskStatus = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        active: !task.active,
        status: !task.active ? 'ACTIVE' : 'PAUSED'
      });
      toast.success(`Mission ${!task.active ? 'Activated' : 'Paused'}`);
    } catch (err) { toast.error("Status update failed"); }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm("Permanently delete this mission unit?")) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success("Mission purged from ecosystem");
    } catch (err) { toast.error("Purge failed"); }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Architecture</h1>
          <p className="text-text-secondary text-sm">Deploy and manage strategic earning vectors.</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="btn-system-primary flex items-center gap-2 px-8"
        >
          <Plus size={18} />
          Deploy New Campaign
        </button>
      </header>

      <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Search missions by title or category..."
               className="w-full bg-transparent border-none py-3 pl-12 pr-6 text-sm focus:ring-0 outline-none"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden group hover:border-primary/30 transition-all">
            <div className="h-40 relative bg-black/40">
               {task.campaignArtwork ? (
                 <img src={task.campaignArtwork} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-white/5">
                    <ImageIcon size={48} />
                 </div>
               )}
               <div className="absolute top-4 left-4 flex gap-2">
                  <span className={cn("px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest", task.active ? "bg-success/20 text-success border border-success/20" : "bg-white/10 text-white/40 border border-white/10")}>
                    {task.status}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/5 text-[8px] font-bold uppercase tracking-widest text-primary">
                    {task.category}
                  </span>
               </div>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-lg mb-2 line-clamp-1">{task.title}</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">Yield PT</p>
                    <p className="font-mono font-bold text-primary">+{task.rewardAmount}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">XP Power</p>
                    <p className="font-mono font-bold text-accent">+{task.xpReward}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                 <div className="flex gap-2">
                    <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-secondary hover:text-white"><Edit2 size={14} /></button>
                    <button onClick={() => toggleTaskStatus(task)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-secondary hover:text-white">
                       {task.active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-2 hover:bg-danger/10 rounded-lg transition-colors text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Global Payout</p>
                    <p className="text-[10px] font-mono font-bold text-white/40">{(task.totalDistributed || 0).toLocaleString()} PT</p>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CampaignBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingTask}
      />
    </div>
  );
};

const CampaignBuilderModal = ({ isOpen, onClose, initialData }: { isOpen: boolean, onClose: () => void, initialData: Task | null }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    instructions: '',
    category: 'SOCIAL',
    type: 'once',
    platform: 'NONE',
    rewardAmount: 0,
    xpReward: 0,
    budget: 0,
    maxClaims: 0,
    verificationType: 'automated',
    status: 'DRAFT',
    visibility: 'PUBLIC',
    cooldownPeriod: 0,
    minLevel: 1,
    campaignArtwork: '',
    actionUrl: '',
    active: false,
    fraudProtection: {
       duplicatePrevention: true,
       abuseDetection: true,
       multiAccountDetection: true
    }
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        startDate: initialData.startDate ? (initialData.startDate as any).toDate().toISOString().split('T')[0] : '',
        endDate: initialData.endDate ? (initialData.endDate as any).toDate().toISOString().split('T')[0] : ''
      } as any);
    } else {
      setFormData({
        title: '',
        description: '',
        instructions: '',
        category: 'SOCIAL',
        type: 'once',
        platform: 'NONE',
        rewardAmount: 0,
        xpReward: 0,
        budget: 0,
        maxClaims: 0,
        verificationType: 'automated',
        status: 'DRAFT',
        visibility: 'PUBLIC',
        cooldownPeriod: 0,
        minLevel: 1,
        campaignArtwork: '',
        actionUrl: '',
        active: false,
        fraudProtection: {
          duplicatePrevention: true,
          abuseDetection: true,
          multiAccountDetection: true
       }
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskId = initialData?.id || doc(collection(db, 'tasks')).id;
      const taskData = {
        ...formData,
        id: taskId,
        active: formData.status === 'ACTIVE',
        startDate: (formData as any).startDate ? Timestamp.fromDate(new Date((formData as any).startDate)) : null,
        endDate: (formData as any).endDate ? Timestamp.fromDate(new Date((formData as any).endDate)) : null,
        updatedAt: serverTimestamp(),
        createdAt: initialData?.createdAt || serverTimestamp(),
        providerId: 'SYSTEM',
        providerName: 'PulseEarn'
      };

      await setDoc(doc(db, 'tasks', taskId), taskData, { merge: true });
      toast.success(initialData ? 'Protocol Synchronized' : 'Mission Deployed Successfully');
      onClose();
    } catch (err) { toast.error("Deployment failed"); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl bg-surface border border-white/10 rounded-[3rem] p-12 overflow-y-auto max-h-[90vh] no-scrollbar">
          <header className="flex justify-between items-center mb-10">
             <div>
                <h2 className="text-2xl font-bold">{initialData ? 'Refine Mission Protocol' : 'Initialize Mission Unit'}</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Operational Tier // Security: High</p>
             </div>
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
          </header>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">

             {/* Section 1: Identification */}
             <div className="space-y-6">
                <p className="data-label text-white/20 flex items-center gap-2"><Eye size={14} /> Basic Config</p>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Mission Title</label>
                   <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-system" />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Category Cluster</label>
                   <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})} className="input-system">
                      <option value="SOCIAL">SOCIAL</option>
                      <option value="ENGAGEMENT">ENGAGEMENT</option>
                      <option value="REFERRAL">REFERRAL</option>
                      <option value="PREDICTION">PREDICTION</option>
                      <option value="EDUCATION">EDUCATION</option>
                      <option value="EVENTS">EVENTS</option>
                      <option value="SPONSORED">SPONSORED</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Platform Node</label>
                   <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value as SocialPlatform})} className="input-system">
                      <option value="NONE">SYSTEM DIRECT</option>
                      <option value="TELEGRAM">TELEGRAM</option>
                      <option value="TWITTER">X / TWITTER</option>
                      <option value="TIKTOK">TIKTOK</option>
                      <option value="YOUTUBE">YOUTUBE</option>
                      <option value="DISCORD">DISCORD</option>
                      <option value="WEBSITE">WEBSITE</option>
                   </select>
                </div>
             </div>

             {/* Section 2: Monetary & Limits */}
             <div className="space-y-6">
                <p className="data-label text-white/20 flex items-center gap-2"><Zap size={14} /> Reward Payload</p>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Yield PT</label>
                      <input type="number" value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: parseInt(e.target.value)})} className="input-system font-mono" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">XP Boost</label>
                      <input type="number" value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value)})} className="input-system font-mono" />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Global Budget (PT)</label>
                   <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: parseInt(e.target.value)})} className="input-system font-mono" />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Validation Matrix</label>
                   <select value={formData.verificationType} onChange={e => setFormData({...formData, verificationType: e.target.value as VerificationType})} className="input-system">
                      <option value="automated">AUTOMATED (LINK)</option>
                      <option value="manual">MANUAL REVIEW</option>
                      <option value="proof">SCREENSHOT PROOF</option>
                      <option value="referral">REFERRAL TRACKING</option>
                      <option value="prediction">MARKET FORECAST</option>
                   </select>
                </div>
             </div>

             {/* Section 3: Scheduling & Status */}
             <div className="space-y-6">
                <p className="data-label text-white/20 flex items-center gap-2"><Calendar size={14} /> Lifecycle</p>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Current Status</label>
                   <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="input-system">
                      <option value="DRAFT">DRAFT (OFFLINE)</option>
                      <option value="ACTIVE">ACTIVE (DEPLOYED)</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="EXPIRED">EXPIRED</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Artwork Assets (URL)</label>
                   <input value={formData.campaignArtwork || ''} onChange={e => setFormData({...formData, campaignArtwork: e.target.value})} className="input-system" placeholder="https://..." />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Execution Target (URL)</label>
                   <input value={formData.actionUrl || ''} onChange={e => setFormData({...formData, actionUrl: e.target.value})} className="input-system" placeholder="https://..." />
                </div>
             </div>

             <div className="lg:col-span-3 pt-6 border-t border-white/5">
                <div className="flex flex-col md:flex-row gap-8">
                   <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Public Briefing</label>
                      <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-system h-24 resize-none" />
                   </div>
                   <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Operator Instructions</label>
                      <textarea required value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} className="input-system h-24 resize-none" />
                   </div>
                   <div className="w-full md:w-72 flex flex-col justify-end">
                      <button type="submit" className="w-full py-5 bg-primary text-white font-bold uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/10">
                         {initialData ? 'Authorize Update' : 'Initialize Deployment'}
                      </button>
                   </div>
                </div>
             </div>
          </form>
       </motion.div>
    </div>
  );
};

export default CampaignManagement;
