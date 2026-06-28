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
  ShieldAlert,
  ArrowRight,
  Trash2,
  Pause,
  Play,
  Activity,
  ShieldCheck,
  Info,
  TrendingUp
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
  orderBy,
  limit,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { Campaign, Task, TaskClaim } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import TaskBuilderModal from './modals/TaskBuilderModal';
import CampaignBuilderModal from './modals/CampaignBuilderModal';
import DataTable from '../../../components/admin/common/DataTable';

const OpsSponsoredCampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [claims, setClaims] = React.useState<TaskClaim[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'TASKS' | 'LEDGER' | 'INTELLIGENCE'>('OVERVIEW');

  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const [hasMoreClaims, setHasMoreClaims] = React.useState(true);
  const [lastClaimDoc, setLastClaimDoc] = React.useState<any>(null);

  const fetchClaims = async (isNext = false) => {
    if (!id) return;
    try {
      let q = query(
        collection(db, 'task_claims'),
        where('campaignId', '==', id),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (isNext && lastClaimDoc) {
        q = query(
          collection(db, 'task_claims'),
          where('campaignId', '==', id),
          orderBy('createdAt', 'desc'),
          startAfter(lastClaimDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskClaim));

      if (isNext) {
        setClaims(prev => [...prev, ...data]);
      } else {
        setClaims(data);
      }

      setLastClaimDoc(snap.docs[snap.docs.length - 1]);
      setHasMoreClaims(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsSponsoredCampaignDetail] Claims Fetch Error:", err);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const loadingToast = toast.loading('Updating task status...');
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        active: !task.active,
        status: !task.active ? 'ACTIVE' : 'INACTIVE'
      });
      toast.dismiss(loadingToast);
      toast.success(`Task ${!task.active ? 'Activated' : 'Paused'}`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete: "${task.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      toast.success("Task deleted successfully");
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  React.useEffect(() => {
    if (!id) return;

    const unsubCamp = onSnapshot(doc(db, 'campaigns', id), (snap) => {
      if (snap.exists()) setCampaign({ id: snap.id, ...snap.data() } as Campaign);
      else navigate('/admin/sponsored');
    });

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('campaignId', '==', id)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    fetchClaims();

    setLoading(false);
    return () => { unsubCamp(); unsubTasks(); };
  }, [id, navigate]);

  if (loading || !campaign) return <div className="p-20 text-center animate-pulse">Synchronizing Record...</div>;

  const stats = {
    completions: claims.filter(c => c.validationState === 'APPROVED').length,
    pending: claims.filter(c => c.validationState === 'PENDING').length,
    rejections: claims.filter(c => c.validationState === 'REJECTED').length,
    roi: campaign.totalPrizePool && claims.length > 0 ? ((claims.filter(c => c.validationState === 'APPROVED').length * 100) / claims.length).toFixed(1) : '0'
  };

  return (
    <div className="space-y-8 pb-20">
       <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
          <button onClick={() => navigate('/admin/sponsored')} className="hover:text-primary transition-colors flex items-center gap-2">
             <ArrowLeft size={14} />
             Sponsored
          </button>
          <span className="opacity-20">/</span>
          <span className="text-text-secondary">{campaign.name}</span>
          <span className="opacity-20">/</span>
          <span className="text-primary italic">{activeTab}</span>
       </nav>

       <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-surface border border-border p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <Target size={200} />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 relative z-10 w-full md:w-auto">
             <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] bg-surface-bright border border-border overflow-hidden shrink-0">
                {campaign.bannerUrl ? <img src={campaign.bannerUrl} className="w-full h-full object-cover" /> : <Target size={32} className="m-auto mt-6 md:mt-7 text-text-tertiary" />}
             </div>
             <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                   <h1 className="text-2xl md:text-4xl font-bold tracking-tight uppercase italic">{campaign.name}</h1>
                   <div className={cn(
                     "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                     campaign.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                   )}>
                      {campaign.status}
                   </div>
                </div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{campaign.sponsorName || 'Institutional Partner'}</p>
             </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
             <Button variant="outline" className="flex-1 lg:flex-none h-12 px-6 md:px-8 rounded-xl text-[10px]" onClick={() => setIsCampaignModalOpen(true)}>
                <Edit3 size={16} />
                Manage
             </Button>
             <Button variant="primary" className="flex-1 lg:flex-none h-12 px-6 md:px-8 rounded-xl text-[10px]" onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                <Plus size={16} />
                Deploy Task
             </Button>
          </div>
       </header>

       <div className="flex gap-2 p-1.5 bg-surface-bright/50 border border-border rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: BarChart3 },
            { id: 'TASKS', label: 'Inventory', icon: Target },
            { id: 'LEDGER', label: 'Traffic', icon: ShieldAlert },
            { id: 'INTELLIGENCE', label: 'ROI', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-text-primary hover:bg-surface-bright"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
             {activeTab === 'OVERVIEW' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="p-8 border-border">
                         <p className="text-3xl font-mono font-bold text-text-primary">{campaign.participantsCount?.toLocaleString() || 0}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Global Reach</p>
                      </Card>
                      <Card className="p-8 border-border">
                         <p className="text-3xl font-mono font-bold text-text-primary">{stats.completions.toLocaleString()}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Conversions</p>
                      </Card>
                      <Card className="p-8 border-border">
                         <p className="text-3xl font-mono font-bold text-text-primary">{campaign.remainingPool?.toLocaleString() || 0}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Budget Headroom</p>
                      </Card>
                   </div>

                   <Card className="p-10 border-border space-y-10">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full" />
                         <h2 className="text-xl font-bold uppercase italic">Operational Parameters</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-12">
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Offer Provider</p>
                               <p className="text-sm font-bold text-text-primary uppercase">{campaign.provider || 'Internal'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Provider ID</p>
                               <p className="text-sm font-mono font-bold text-text-primary">{campaign.providerId || 'SYSTEM'}</p>
                            </div>
                         </div>
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Partner Website</p>
                               <a href={campaign.sponsorWebsite} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary flex items-center gap-2 hover:underline">
                                  Access Partner <ArrowRight size={14} />
                               </a>
                            </div>
                         </div>
                      </div>
                   </Card>
                </div>
             )}

             {activeTab === 'TASKS' && (
                <DataTable
                  columns={[
                     {
                        header: 'Mission Unit',
                        accessor: (task: Task) => (
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                 "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors",
                                 task.active ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-bright border-border text-text-tertiary"
                              )}>
                                 <Zap size={18} />
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors italic">{task.title}</p>
                                 <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1">ID: {task.id.slice(0,12).toUpperCase()}</p>
                              </div>
                           </div>
                        )
                     },
                     {
                        header: 'Authorized Yield',
                        accessor: (task: Task) => (
                           <div className="flex items-center gap-4">
                              <div>
                                 <p className="text-xs font-mono font-bold text-text-primary">+{task.rewardAmount}</p>
                                 <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">PTS</p>
                              </div>
                              <div className="w-px h-6 bg-border" />
                              <div>
                                 <p className="text-xs font-mono font-bold text-primary">+{task.xpReward}</p>
                                 <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">XP</p>
                              </div>
                           </div>
                        )
                     },
                     {
                        header: 'Actions',
                        className: 'text-right',
                        accessor: (task: Task) => (
                           <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleToggleTaskStatus(task)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all">
                                 {task.active ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              <button onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                                 <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleDeleteTask(task)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-danger transition-all">
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        )
                     }
                  ]}
                  data={tasks}
                  isLoading={false}
                />
             )}

             {activeTab === 'LEDGER' && (
                <DataTable
                  columns={[
                     {
                        header: 'Network Signal',
                        accessor: (claim: TaskClaim) => (
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                 "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]",
                                 claim.validationState === 'APPROVED' ? "bg-success" : claim.validationState === 'REJECTED' ? "bg-danger" : "bg-warning"
                              )} />
                              <div>
                                 <p className="text-sm font-bold text-text-primary uppercase tracking-tight italic">Claim: {claim.metadata?.taskTitle}</p>
                                 <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Status: {claim.validationState}</p>
                              </div>
                           </div>
                        )
                     },
                     {
                        header: 'Node Identity',
                        accessor: (claim: TaskClaim) => (
                           <p className="text-[10px] font-bold text-text-secondary uppercase">{claim.metadata?.username || 'Anonymous'}</p>
                        )
                     },
                     {
                        header: 'Timestamp',
                        className: 'text-right',
                        accessor: (claim: TaskClaim) => (
                           <div className="text-right">
                              <p className="text-[10px] font-mono font-bold text-text-secondary">{claim.createdAt?.toDate?.().toLocaleDateString()}</p>
                              <p className="text-[9px] font-mono text-text-tertiary mt-0.5 uppercase">{claim.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                        )
                     }
                  ]}
                  data={claims}
                  isLoading={false}
                  onLoadMore={() => fetchClaims(true)}
                  hasMore={hasMoreClaims}
                />
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
                         </div>
                         <p className="text-[10px] text-text-tertiary/60 leading-relaxed max-w-[180px] uppercase font-bold tracking-widest">Efficiency ratio based on reward distribution vs task adoption.</p>
                      </Card>
                   </div>
                </div>
             )}
          </div>

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
