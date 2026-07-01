import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  Users,
  Target,
  Plus,
  Edit3,
  Briefcase,
  ArrowRight,
  Trash2,
  Pause,
  Play,
  Settings,
  Globe,
  ShieldCheck,
  TrendingUp,
  Activity,
  History,
  Info,
  LayoutGrid
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
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
  const [activeTab, setActiveTab] = React.useState<'ARCHITECTURE' | 'OPERATIONS' | 'INTELLIGENCE'>('ARCHITECTURE');

  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    if (!id) return;

    const unsubCamp = onSnapshot(doc(db, 'campaigns', id), (snap) => {
      if (snap.exists()) setCampaign({ id: snap.id, ...snap.data() } as Campaign);
      else navigate('/admin/sponsored');
    });

    const unsubTasks = onSnapshot(query(
      collection(db, 'tasks'),
      where('campaignId', '==', id),
      orderBy('createdAt', 'asc')
    ), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setTasks(data);
    });

    const unsubClaims = onSnapshot(query(
      collection(db, 'task_claims'),
      where('campaignId', '==', id),
      orderBy('createdAt', 'asc')
    ), (snap) => {
       const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskClaim));
       setClaims(data);
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

  if (loading || !campaign) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
       <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary animate-pulse">Syncing Mission Parameters</p>
    </div>
  );

  const stats = {
     completions: claims.filter(c => c.validationState === 'APPROVED').length,
     pending: claims.filter(c => c.validationState === 'PENDING').length,
     rejections: claims.filter(c => c.validationState === 'REJECTED').length,
     roi: campaign.totalPrizePool > 0 ? ((claims.filter(c => c.validationState === 'APPROVED').length * 100) / (campaign.totalPrizePool / 100)).toFixed(1) : '0'
  };

  return (
    <div className="space-y-12 pb-32">
       {/* HIERARCHICAL BREADCRUMB */}
       <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
          <button onClick={() => navigate('/admin/sponsored')} className="hover:text-primary transition-colors flex items-center gap-2 group">
             <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
             Sponsored Campaigns
          </button>
          <span className="opacity-20">/</span>
          <span className="text-text-secondary">{campaign.name}</span>
          <span className="opacity-20">/</span>
          <span className="text-primary italic tracking-[0.2em]">{activeTab}</span>
       </nav>

       {/* MISSION CONTROL HEADER */}
       <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 bg-surface border border-border p-10 md:p-14 rounded-[3rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <Target size={360} />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 relative z-10 w-full md:w-auto">
             <div className="w-28 h-28 rounded-[2.5rem] bg-surface-bright border border-border overflow-hidden shrink-0 flex items-center justify-center shadow-inner group-hover:border-primary/40 transition-colors">
                {campaign.bannerUrl ? <img src={campaign.bannerUrl} className="w-full h-full object-cover" /> : <Briefcase size={48} className="text-text-tertiary/20" />}
             </div>
             <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-5">
                   <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase italic text-text-primary leading-none">{campaign.name}</h1>
                   <div className={cn(
                     "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm italic",
                     campaign.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                   )}>
                      {campaign.status}
                   </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                   <div className="flex items-center gap-3">
                      <Globe size={16} className="text-primary" />
                      <p className="text-xs font-black text-text-tertiary uppercase tracking-widest italic">{campaign.sponsorName || 'PulseEarn Authority'}</p>
                   </div>
                   <div className="w-1.5 h-1.5 rounded-full bg-border" />
                   <div className="flex items-center gap-3">
                      <ShieldCheck size={16} className="text-success" />
                      <p className="text-xs font-black text-text-tertiary uppercase tracking-widest italic">Asset Verified</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full lg:w-auto">
             <Button variant="outline" className="w-full sm:w-auto h-16 px-10 rounded-2xl text-[10px] uppercase font-black tracking-widest italic shadow-xl" onClick={() => setIsCampaignModalOpen(true)}>
                <Settings size={20} />
                Parameters
             </Button>
             <Button variant="primary" className="w-full sm:w-auto h-16 px-10 rounded-2xl text-[10px] uppercase font-black tracking-widest italic shadow-xl shadow-primary/20" onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                <Plus size={20} />
                Inject Work Unit
             </Button>
          </div>
       </header>

       {/* HUB NAVIGATION */}
       <div className="flex gap-2.5 p-2 bg-surface-bright/50 border border-border rounded-[1.5rem] w-full md:w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'ARCHITECTURE', label: 'Architecture', icon: LayoutGrid },
            { id: 'OPERATIONS', label: 'Operations', icon: Activity },
            { id: 'INTELLIGENCE', label: 'Intelligence', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-4 px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap italic",
                activeTab === tab.id ? "bg-white text-black shadow-2xl scale-[1.02]" : "text-text-tertiary hover:text-text-primary hover:bg-surface-bright"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
       </div>

       {/* CONTENT VIEWPORT */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
             {activeTab === 'ARCHITECTURE' && (
                <div className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="p-10 border-border bg-surface-bright/30 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <Zap size={80} />
                         </div>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8">Authorized Bounty</p>
                         <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-mono font-bold text-text-primary">{campaign.totalPrizePool?.toLocaleString()}</p>
                            <span className="text-xs font-black text-primary uppercase">PTS</span>
                         </div>
                      </Card>
                      <Card className="p-10 border-border bg-surface-bright/30 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <Target size={80} />
                         </div>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8">Deployment Units</p>
                         <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-mono font-bold text-text-primary">{tasks.length}</p>
                            <span className="text-xs font-black text-success uppercase">TASKS</span>
                         </div>
                      </Card>
                      <Card className="p-10 border-border bg-surface-bright/30 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <Users size={80} />
                         </div>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8">User Adoption</p>
                         <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-mono font-bold text-text-primary">{campaign.participantsCount?.toLocaleString() || 0}</p>
                            <span className="text-xs font-black text-indigo-400 uppercase">USERS</span>
                         </div>
                      </Card>
                   </div>

                   <div className="bg-surface border border-border rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-border bg-surface-bright/50 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <Target size={18} className="text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Work Unit Registry</h3>
                         </div>
                         <span className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 tracking-widest uppercase italic">Operational</span>
                      </div>
                      <div className="overflow-x-auto no-scrollbar">
                         <table className="w-full text-left">
                            <thead>
                               <tr className="bg-surface-bright/30 border-b border-border">
                                  <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Module</th>
                                  <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Economic Value</th>
                                  <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-text-tertiary">Protocol</th>
                                  <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-text-tertiary text-right">Ops</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                               {tasks.map(task => (
                                  <tr key={task.id} className="hover:bg-surface-bright/30 transition-colors group whitespace-nowrap cursor-pointer">
                                     <td className="px-8 py-8">
                                        <div className="flex items-center gap-5">
                                           <div className={cn(
                                              "w-12 h-12 rounded-xl border flex items-center justify-center transition-all shadow-inner group-hover:scale-105",
                                              task.active ? "bg-primary/5 border-primary/10 text-primary shadow-primary/5" : "bg-surface-bright border-border text-text-tertiary"
                                           )}>
                                              <Target size={20} />
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors uppercase italic tracking-tight">{task.title}</p>
                                              <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1.5 opacity-50">UID: {task.id.slice(0,12).toUpperCase()}</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td className="px-8 py-8">
                                        <div className="flex items-center gap-4">
                                           <div className="space-y-1">
                                              <p className="text-sm font-mono font-bold text-text-primary">+{task.rewardAmount}</p>
                                              <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest opacity-40">PTS Bounty</p>
                                           </div>
                                           <div className="w-px h-8 bg-border" />
                                           <div className="space-y-1">
                                              <p className="text-sm font-mono font-bold text-primary">+{task.xpReward}</p>
                                              <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest opacity-40">XP Reward</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td className="px-8 py-8">
                                        <span className="px-3 py-1.5 rounded-lg bg-surface-bright border border-border text-[9px] font-black uppercase tracking-[0.15em] text-text-secondary italic">
                                           {task.verificationType}
                                        </span>
                                     </td>
                                     <td className="px-8 py-8 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                           <button onClick={() => handleToggleTaskStatus(task)} className="p-3 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-primary transition-all border border-transparent hover:border-border">
                                              {task.active ? <Pause size={18} /> : <Play size={18} />}
                                           </button>
                                           <button onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }} className="p-3 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-text-primary transition-all border border-transparent hover:border-border">
                                              <Edit3 size={18} />
                                           </button>
                                           <button onClick={() => handleDeleteTask(task)} className="p-3 hover:bg-surface-bright rounded-xl text-text-tertiary hover:text-danger transition-all border border-transparent hover:border-border">
                                              <Trash2 size={18} />
                                           </button>
                                        </div>
                                     </td>
                                  </tr>
                               ))}
                               {tasks.length === 0 && (
                                  <tr>
                                     <td colSpan={4} className="px-8 py-32 text-center border-t border-border">
                                        <div className="max-w-xs mx-auto space-y-8 opacity-20">
                                           <Target size={48} className="mx-auto" />
                                           <p className="text-[10px] font-black uppercase tracking-[0.5em]">No active work units defined</p>
                                        </div>
                                     </td>
                                  </tr>
                               )}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             )}

             {activeTab === 'OPERATIONS' && (
                <div className="space-y-12">
                   <Card className="p-10 border-border bg-surface shadow-2xl space-y-10">
                      <div className="flex items-center gap-4 border-b border-border pb-6">
                         <Activity size={20} className="text-primary" />
                         <h2 className="text-lg font-bold uppercase italic tracking-tighter">Real-time Submission Stream</h2>
                      </div>
                      <div className="space-y-2">
                         {claims.slice(0, 15).map(claim => (
                            <div key={claim.id} className="p-5 rounded-2xl bg-surface-bright/50 border border-border hover:bg-surface-accent transition-all flex items-center justify-between group">
                               <div className="flex items-center gap-5 min-w-0">
                                  <div className={cn(
                                     "w-2 h-2 rounded-full shadow-sm",
                                     claim.validationState === 'APPROVED' ? "bg-success" : claim.validationState === 'REJECTED' ? "bg-danger" : "bg-warning animate-pulse"
                                  )} />
                                  <div className="min-w-0">
                                     <p className="text-sm font-bold text-text-primary truncate uppercase italic">{claim.metadata?.username || 'ANONYMOUS'}</p>
                                     <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Claim Type: {claim.metadata?.taskTitle || 'SECURED OBJECTIVE'}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-6 shrink-0">
                                  <div className="text-right hidden sm:block">
                                     <p className="text-[10px] font-mono font-bold text-text-secondary">{claim.createdAt?.toDate?.().toLocaleDateString()}</p>
                                     <p className="text-[9px] font-mono text-text-tertiary mt-0.5 uppercase">{claim.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <button onClick={() => navigate('/admin/validation')} className="p-2.5 rounded-xl bg-surface-bright border border-border text-text-tertiary group-hover:text-primary transition-all">
                                     <ArrowRight size={16} />
                                  </button>
                               </div>
                            </div>
                         ))}
                         {claims.length === 0 && (
                            <div className="py-32 text-center opacity-20">
                               <Activity size={48} className="mx-auto mb-6" />
                               <p className="text-[10px] font-black uppercase tracking-[0.5em]">No operational flow detected</p>
                            </div>
                         )}
                      </div>
                   </Card>
                </div>
             )}

             {activeTab === 'INTELLIGENCE' && (
                <div className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="p-10 border-border bg-surface shadow-2xl space-y-10">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary">Distribution Dynamics</h3>
                         <div className="space-y-8">
                            {[
                               { label: 'Validated', count: stats.completions, color: 'bg-success', total: claims.length },
                               { label: 'Review Active', count: stats.pending, color: 'bg-warning', total: claims.length },
                               { label: 'Filtered', count: stats.rejections, color: 'bg-danger', total: claims.length }
                            ].map(item => {
                               const percent = item.total > 0 ? (item.count / item.total * 100).toFixed(0) : '0';
                               return (
                               <div key={item.label} className="space-y-3">
                                  <div className="flex justify-between items-end">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-text-primary italic">{item.label}</span>
                                     <span className="text-[10px] font-mono font-bold text-text-secondary">{percent}% ({item.count})</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-surface-bright rounded-full overflow-hidden border border-border shadow-inner">
                                     <div className={cn("h-full rounded-full transition-all duration-1000", item.color)} style={{ width: `${percent}%` }} />
                                  </div>
                               </div>
                            )})}
                         </div>
                      </Card>

                      <Card className="p-10 border-border bg-surface shadow-2xl flex flex-col justify-center items-center text-center space-y-6">
                         <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                            <TrendingUp size={32} />
                         </div>
                         <div className="space-y-2">
                            <p className="text-4xl font-mono font-bold text-text-primary">{stats.roi}%</p>
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Campaign ROI Index</p>
                                              <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest opacity-40">XP Reward</p>
                         </div>
                         <p className="text-[10px] text-text-tertiary/60 leading-relaxed max-w-[180px] uppercase font-bold tracking-widest">Efficiency ratio based on reward distribution vs task adoption.</p>
                      </Card>
                   </div>
                </div>
             )}
          </div>

          {/* OPERATIONAL SIDEBAR */}
          <div className="lg:col-span-4 space-y-12">
             <section className="bg-surface border border-border p-10 rounded-[3rem] md:rounded-[3.5rem] shadow-2xl space-y-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
                   <ShieldCheck size={140} />
                </div>
                <div className="flex items-center gap-4 relative z-10 border-b border-border pb-6">
                   <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary">Integrity Protocol</h3>
                </div>
                <div className="space-y-8 relative z-10">
                   <div className="flex items-center gap-5 p-6 rounded-2xl bg-surface-bright/50 border border-border shadow-inner group/item hover:border-primary/30 transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-success/5 border border-success/10 flex items-center justify-center text-success shadow-inner group-hover/item:scale-105 transition-transform">
                         <ShieldCheck size={24} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase italic">Budget Auth</p>
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Status: SECURED</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-5 p-6 rounded-2xl bg-surface-bright/50 border border-border shadow-inner group/item hover:border-primary/30 transition-all">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner group-hover/item:scale-105 transition-transform", tasks.length > 0 ? "bg-primary/5 border-primary/10 text-primary shadow-primary/5" : "bg-warning/5 border-warning/10 text-warning shadow-warning/5")}>
                         <Target size={24} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase italic">Mission Logic</p>
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Units: {tasks.length > 0 ? 'SYNCHRONIZED' : 'NULL'}</p>
                      </div>
                   </div>
                </div>
                <div className="pt-6 border-t border-border">
                   <p className="text-[10px] text-text-tertiary font-bold italic leading-relaxed uppercase tracking-widest opacity-60">System monitoring confirms mission parameters are currently synchronized with partner requirements.</p>
                </div>
             </section>

             <section className="bg-surface border border-border p-10 rounded-[3rem] md:rounded-[3.5rem] shadow-2xl space-y-10">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                   <History size={18} className="text-primary" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary">Mission Audit</h3>
                </div>
                <div className="space-y-6">
                   <div className="flex gap-5 group">
                      <div className="w-1 h-auto bg-primary/20 rounded-full group-hover:bg-primary transition-colors" />
                      <div className="space-y-2">
                         <p className="text-[11px] font-bold text-text-primary uppercase italic tracking-tight">Mission Initialized</p>
                         <p className="text-[9px] font-mono text-text-tertiary uppercase">{campaign.createdAt?.toDate?.().toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="flex gap-5 group">
                      <div className="w-1 h-auto bg-primary/20 rounded-full group-hover:bg-primary transition-colors" />
                      <div className="space-y-2">
                         <p className="text-[11px] font-bold text-text-primary uppercase italic tracking-tight">Status Update: {campaign.status}</p>
                         <p className="text-[9px] font-mono text-text-tertiary uppercase">{campaign.updatedAt?.toDate?.().toLocaleString()}</p>
                      </div>
                   </div>
                </div>
                <Button variant="outline" className="w-full h-14 rounded-xl text-[9px] font-black uppercase tracking-widest italic group" onClick={() => navigate('/admin/audit')}>
                   Full System Audit <Info size={14} className="ml-2 opacity-30 group-hover:opacity-100 transition-opacity" />
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
