import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  Users,
  CheckCircle2,
  BarChart3,
  History,
  Target,
  Plus,
  Edit3,
  Briefcase,
  ArrowRight,
  Trash2,
  Pause,
  Play,
  Settings,
  FileText,
  Globe
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Campaign, Task, TaskClaim } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import TaskBuilderModal from './modals/TaskBuilderModal';
import CampaignBuilderModal from './modals/CampaignBuilderModal';

const OpsSponsoredCampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [claims, setClaims] = React.useState<TaskClaim[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'TASKS' | 'ANALYTICS'>('OVERVIEW');

  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    if (!id) return;

    const unsubCamp = onSnapshot(doc(db, 'campaigns', id), (snap) => {
      if (snap.exists()) setCampaign({ id: snap.id, ...snap.data() } as Campaign);
      else navigate('/admin/sponsored');
    });

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('campaignId', '==', id), orderBy('createdAt', 'asc')), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const unsubClaims = onSnapshot(query(collection(db, 'task_claims'), where('campaignId', '==', id)), (snap) => {
       setClaims(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskClaim)));
    });

    setLoading(false);
    return () => { unsubCamp(); unsubTasks(); unsubClaims(); };
  }, [id, navigate]);

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      const nextActive = !task.active;
      await updateDoc(doc(db, 'tasks', task.id), {
        active: nextActive,
        status: nextActive ? 'ACTIVE' : 'PAUSED',
        updatedAt: serverTimestamp()
      });
      toast.success(`Task ${nextActive ? 'Activated' : 'Paused'}`);
    } catch (err) {
      toast.error("Status update failure");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`FORCE DELETE task "${task.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      toast.success("Task purged from campaign");
    } catch (err) {
      toast.error("Deletion sequence failed");
    }
  };

  if (loading || !campaign) return <div className="p-20 text-center animate-pulse">Syncing Campaign Data...</div>;

  return (
    <div className="space-y-8 pb-20">
       {/* HIERARCHICAL NAVIGATION */}
       <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
          <button onClick={() => navigate('/admin/sponsored')} className="hover:text-primary transition-colors flex items-center gap-2">
             <ArrowLeft size={14} />
             Sponsored Campaigns
          </button>
          <span className="opacity-20">/</span>
          <span className="text-text-secondary">{campaign.name}</span>
       </nav>

       {/* OPERATIONAL HUB HEADER */}
       <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-surface border border-border p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <Briefcase size={240} />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 relative z-10 w-full md:w-auto">
             <div className="w-24 h-24 rounded-[2rem] bg-surface-bright border border-border overflow-hidden shrink-0 flex items-center justify-center">
                {campaign.bannerUrl ? <img src={campaign.bannerUrl} className="w-full h-full object-cover" /> : <Briefcase size={40} className="text-text-tertiary" />}
             </div>
             <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                   <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase italic text-text-primary leading-none">{campaign.name}</h1>
                   <div className={cn(
                     "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                     campaign.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                   )}>
                      {campaign.status}
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <Globe size={14} className="text-primary" />
                   <p className="text-[11px] font-black text-text-tertiary uppercase tracking-widest">Partner: {campaign.sponsorName || 'PulseEarn'}</p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
             <Button variant="outline" className="flex-1 lg:flex-none h-14 px-8 rounded-xl text-[10px] uppercase font-black tracking-widest italic" onClick={() => setIsCampaignModalOpen(true)}>
                <Settings size={18} />
                Campaign Config
             </Button>
             <Button variant="primary" className="flex-1 lg:flex-none h-14 px-8 rounded-xl text-[10px] uppercase font-black tracking-widest italic shadow-lg shadow-primary/20" onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                <Plus size={18} />
                Inject Task
             </Button>
          </div>
       </header>

       {/* TABBED INTERFACE */}
       <div className="flex gap-2 p-1.5 bg-surface-bright/50 border border-border rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: 'Architecture', icon: BarChart3 },
            { id: 'TASKS', label: 'Work Units', icon: Target },
            { id: 'ANALYTICS', label: 'Performance', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-text-primary hover:bg-surface-bright"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
       </div>

       {/* CONTENT MODULES */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
             {activeTab === 'OVERVIEW' && (
                <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="p-8 border-border bg-surface-bright/30">
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6">Budget Authorized</p>
                         <div className="flex items-center gap-3">
                            <Zap size={20} className="text-primary" />
                            <p className="text-3xl font-mono font-bold text-text-primary">{campaign.totalPrizePool?.toLocaleString()}</p>
                         </div>
                      </Card>
                      <Card className="p-8 border-border bg-surface-bright/30">
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6">Total Work Units</p>
                         <div className="flex items-center gap-3">
                            <Target size={20} className="text-success" />
                            <p className="text-3xl font-mono font-bold text-text-primary">{tasks.length}</p>
                         </div>
                      </Card>
                      <Card className="p-8 border-border bg-surface-bright/30">
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6">User Adoption</p>
                         <div className="flex items-center gap-3">
                            <Users size={20} className="text-indigo-400" />
                            <p className="text-3xl font-mono font-bold text-text-primary">{campaign.participantsCount?.toLocaleString() || 0}</p>
                         </div>
                      </Card>
                   </div>

                   <Card className="p-10 border-border space-y-10">
                      <div className="flex items-center gap-3 border-b border-border pb-6">
                         <FileText size={20} className="text-text-tertiary" />
                         <h2 className="text-lg font-bold uppercase italic">Operational Manifesto</h2>
                      </div>
                      <p className="text-base text-text-secondary leading-relaxed font-medium italic">
                         {campaign.description}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-10 border-t border-border">
                         <div className="space-y-2">
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Lifecycle Strategy</p>
                            <p className="text-xs font-bold text-text-primary uppercase tracking-widest">
                               {campaign.startDate?.toDate().toLocaleDateString()} &rarr; {campaign.endDate?.toDate().toLocaleDateString() || 'UNRESTRICTED'}
                            </p>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Partner Infrastructure</p>
                            <p className="text-xs font-bold text-text-primary uppercase tracking-widest">{campaign.category} INITIATIVE</p>
                         </div>
                      </div>
                   </Card>
                </div>
             )}

             {activeTab === 'TASKS' && (
                <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                   <div className="p-8 border-b border-border bg-surface-bright/50 flex justify-between items-center">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Work Unit Registry</h3>
                      <span className="text-[10px] font-mono font-bold text-primary">{tasks.length} ACTIVE</span>
                   </div>
                   <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-surface-bright/30 border-b border-border">
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Work Unit</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Incentive</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Validation</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-text-tertiary text-right">Ops</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-surface-bright/30 transition-colors group whitespace-nowrap">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                     <div className={cn(
                                        "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors",
                                        task.active ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-bright border-border text-text-tertiary"
                                     )}>
                                        <Target size={18} />
                                     </div>
                                     <div className="min-w-0">
                                        <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors italic">{task.title}</p>
                                        <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1">ID: {task.id.slice(0,12).toUpperCase()}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <div>
                                        <p className="text-xs font-mono font-bold text-text-primary">+{task.rewardAmount}</p>
                                        <p className="text-[7px] font-black text-text-tertiary uppercase tracking-widest">Points</p>
                                     </div>
                                     <div className="w-px h-6 bg-border" />
                                     <div>
                                        <p className="text-xs font-mono font-bold text-primary">+{task.xpReward}</p>
                                        <p className="text-[7px] font-black text-text-tertiary uppercase tracking-widest">XP</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <span className="px-2.5 py-1 rounded bg-surface-bright border border-border text-[8px] font-black uppercase tracking-widest text-text-secondary">
                                     {task.verificationType}
                                  </span>
                               </td>
                               <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                  <div className="flex justify-end gap-1">
                                     <button onClick={() => handleToggleTaskStatus(task)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all">
                                        {task.active ? <Pause size={16} /> : <Play size={16} />}
                                     </button>
                                     <button onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                                        <Edit3 size={16} />
                                     </button>
                                     <button onClick={() => handleDeleteTask(task)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-danger transition-all">
                                        <Trash2 size={16} />
                                     </button>
                                  </div>
                               </td>
                            </tr>
                         ))}
                         {tasks.length === 0 && (
                            <tr>
                               <td colSpan={4} className="px-8 py-24 text-center">
                                  <div className="max-w-xs mx-auto space-y-8">
                                     <div className="w-16 h-16 rounded-[2rem] bg-surface-bright border border-border flex items-center justify-center text-text-tertiary/20 mx-auto">
                                        <Plus size={32} />
                                     </div>
                                     <div className="space-y-2">
                                        <p className="text-sm font-bold text-text-primary uppercase italic">No Work Units</p>
                                        <p className="text-xs text-text-tertiary leading-relaxed font-medium">This campaign structure is empty. Inject work units to begin user engagement.</p>
                                     </div>
                                     <Button variant="primary" className="h-14 px-8 rounded-xl mx-auto uppercase italic font-black tracking-widest text-[9px]" onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                                        Inject First Task
                                     </Button>
                                  </div>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                   </div>
                </div>
             )}

             {activeTab === 'ANALYTICS' && (
                <div className="py-40 text-center border border-dashed border-border rounded-[2.5rem] opacity-20 bg-surface">
                   <BarChart3 size={48} className="mx-auto mb-6 text-text-tertiary/50" />
                   <p className="text-[11px] font-black uppercase tracking-[0.5em]">Real-time Performance Metrics Pending</p>
                </div>
             )}
          </div>

          {/* OPERATIONAL SIDEBAR */}
          <div className="lg:col-span-4 space-y-10">
             <section className="bg-surface border border-border p-10 rounded-[3rem] space-y-10 shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary px-1 border-b border-border pb-6">Integrity Check</h3>
                <div className="space-y-8">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-success/5 border border-success/10 flex items-center justify-center text-success shadow-inner">
                         <CheckCircle2 size={24} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase italic">Budget Auth</p>
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Status: SECURED</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-5">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner", tasks.length > 0 ? "bg-primary/5 border-primary/10 text-primary" : "bg-warning/5 border-warning/10 text-warning")}>
                         <Target size={24} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase italic">Payload Ready</p>
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Architecture: {tasks.length > 0 ? 'NOMINAL' : 'EMPTY'}</p>
                      </div>
                   </div>
                </div>
                <div className="pt-6 border-t border-border">
                   <p className="text-[9px] text-text-tertiary font-medium italic leading-relaxed">System monitoring confirms campaign parameters are synchronized with partner requirements.</p>
                </div>
             </section>

             <section className="bg-surface border border-border p-10 rounded-[3rem] space-y-8 shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary px-1">Performance Feed</h3>
                <div className="space-y-4">
                   {claims.length > 0 ? claims.slice(0, 5).map(claim => (
                      <div key={claim.id} className="p-4 rounded-xl bg-surface-bright border border-border flex items-center justify-between group hover:border-primary/40 transition-all cursor-pointer">
                         <div className="min-w-0">
                            <p className="text-[11px] font-bold text-text-primary truncate uppercase italic">{claim.metadata?.username || 'User'}</p>
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">{claim.validationState}</p>
                         </div>
                         <button onClick={() => navigate('/admin/validation')} className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                            <ArrowRight size={14} />
                         </button>
                      </div>
                   )) : (
                      <div className="py-12 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">No Activity Stream</div>
                   )}
                </div>
                <Button variant="outline" className="w-full h-14 rounded-2xl text-[9px] font-black uppercase tracking-widest italic" onClick={() => navigate('/admin/validation')}>
                   Audit Queue
                </Button>
             </section>
          </div>
       </div>

       <TaskBuilderModal
         isOpen={isTaskModalOpen}
         onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
         initialTask={selectedTask ? { ...selectedTask, campaignId: campaign.id } : { campaignId: campaign.id } as any}
       />

       <CampaignBuilderModal
         isOpen={isCampaignModalOpen}
         onClose={() => setIsCampaignModalOpen(false)}
         initialCampaign={campaign}
       />
    </div>
  );
};

export default OpsSponsoredCampaignDetail;
