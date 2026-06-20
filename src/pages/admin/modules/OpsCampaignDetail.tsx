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
  FileText
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { Campaign, Task, TaskClaim } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import TaskBuilderModal from './modals/TaskBuilderModal';
import CampaignBuilderModal from './modals/CampaignBuilderModal';

const OpsCampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [claims, setClaims] = React.useState<TaskClaim[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'TASKS' | 'PARTICIPANTS' | 'STATS' | 'LEDGER' | 'AUDIT'>('OVERVIEW');

  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        active: !task.active,
        status: !task.active ? 'ACTIVE' : 'INACTIVE'
      });
      toast.success(`Task ${!task.active ? 'Activated' : 'Paused'}`);
    } catch (err) {
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
      else navigate('/admin/campaigns');
    });

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('campaignId', '==', id)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const unsubClaims = onSnapshot(query(collection(db, 'task_claims'), where('campaignId', '==', id)), (snap) => {
       const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskClaim));
       setClaims(data.sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis?.() || 0;
          const timeB = (b.createdAt as any)?.toMillis?.() || 0;
          return timeB - timeA;
       }));
    });

    setLoading(false);
    return () => { unsubCamp(); unsubTasks(); unsubClaims(); };
  }, [id, navigate]);

  if (loading || !campaign) return <div className="p-20 text-center animate-pulse">Synchronizing Record...</div>;

  const stats = {
    completions: claims.filter(c => c.validationState === 'APPROVED').length,
    pending: claims.filter(c => c.validationState === 'PENDING').length,
    rejected: claims.filter(c => c.validationState === 'REJECTED').length,
    conversion: campaign.participantsCount > 0 ? (claims.filter(c => c.validationState === 'APPROVED').length / campaign.participantsCount * 100).toFixed(1) : '0'
  };

  return (
    <div className="space-y-8 pb-20">
       {/* HIERARCHICAL BREADCRUMB */}
       <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
          <button onClick={() => navigate('/admin/campaigns')} className="hover:text-primary transition-colors flex items-center gap-2">
             <ArrowLeft size={14} />
             Campaigns
          </button>
          <span className="opacity-20">/</span>
          <span className="text-text-secondary">{campaign.name}</span>
          <span className="opacity-20">/</span>
          <span className="text-primary italic">{activeTab}</span>
       </nav>

       {/* OPERATIONAL HEADER */}
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
                <p className="text-xs md:text-sm font-medium text-text-tertiary max-w-xl line-clamp-2">{campaign.description}</p>
             </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
             <Button variant="outline" className="flex-1 lg:flex-none h-12 px-6 md:px-8 rounded-xl text-[10px]" onClick={() => setIsCampaignModalOpen(true)}>
                <Edit3 size={16} />
                Edit
             </Button>
             <Button variant="primary" className="flex-1 lg:flex-none h-12 px-6 md:px-8 rounded-xl text-[10px]" onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                <Plus size={16} />
                Add Task
             </Button>
          </div>
       </header>

       {/* NAVIGATION TABS */}
       <div className="flex gap-2 p-1.5 bg-surface-bright/50 border border-border rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: BarChart3 },
            { id: 'TASKS', label: 'Tasks', icon: Target },
            { id: 'PARTICIPANTS', label: 'Users', icon: Users },
            { id: 'STATS', label: 'Analytics', icon: History },
            { id: 'LEDGER', label: 'Activity', icon: ShieldAlert },
            { id: 'AUDIT', label: 'Audit', icon: FileText },
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

       {/* CONTENT VIEWPORT */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
             {activeTab === 'OVERVIEW' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="p-8 border-border">
                         <div className="flex justify-between items-start mb-4">
                            <Users size={20} className="text-primary" />
                         </div>
                         <p className="text-3xl font-mono font-bold text-text-primary">{campaign.participantsCount?.toLocaleString() || 0}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Unique Participants</p>
                      </Card>
                      <Card className="p-8 border-border">
                         <div className="flex justify-between items-start mb-4">
                            <CheckCircle2 size={20} className="text-success" />
                         </div>
                         <p className="text-3xl font-mono font-bold text-text-primary">{stats.completions.toLocaleString()}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Total Completions</p>
                      </Card>
                      <Card className="p-8 border-border">
                         <div className="flex justify-between items-start mb-4">
                            <Zap size={20} className="text-warning" />
                         </div>
                         <p className="text-3xl font-mono font-bold text-text-primary">{campaign.remainingPool?.toLocaleString() || 0}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Remaining Points</p>
                      </Card>
                   </div>

                   <Card className="p-6 md:p-10 border-border space-y-8">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full" />
                         <h2 className="text-xl font-bold uppercase italic">Campaign Configuration</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Internal Category</p>
                               <p className="text-sm font-bold text-text-primary uppercase">{campaign.category}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Validation Mode</p>
                               <p className="text-sm font-bold text-text-primary">{campaign.validationSettings?.manualReview ? 'Manual Review' : 'Automated Approval'}</p>
                            </div>
                         </div>
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Launch Date</p>
                               <p className="text-sm font-bold text-text-primary uppercase">{campaign.startDate?.toDate().toLocaleDateString() || 'Immediate'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Expirations</p>
                               <p className="text-sm font-bold text-text-primary uppercase">{campaign.endDate?.toDate().toLocaleDateString() || 'Continuous'}</p>
                            </div>
                         </div>
                      </div>
                   </Card>
                </div>
             )}

             {activeTab === 'TASKS' && (
                <div className="bg-surface border border-border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left min-w-[700px]">
                      <thead>
                         <tr className="bg-surface-bright/50 border-b border-border whitespace-nowrap">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Task Details</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Rewards</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Validation</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-surface-bright/30 transition-colors group whitespace-nowrap">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                     <div className={cn(
                                        "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                                        task.active ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-bright border-border text-text-tertiary"
                                     )}>
                                        <Zap size={14} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{task.title}</p>
                                        <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1">ID: {task.id.slice(0,8)}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <div>
                                        <p className="text-xs font-mono font-bold text-text-primary">+{task.rewardAmount}</p>
                                        <p className="text-[7px] font-black text-text-tertiary uppercase tracking-widest">Points</p>
                                     </div>
                                     <div className="w-px h-4 bg-border" />
                                     <div>
                                        <p className="text-xs font-mono font-bold text-primary">+{task.xpReward}</p>
                                        <p className="text-[7px] font-black text-text-tertiary uppercase tracking-widest">XP</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <span className="px-2 py-0.5 rounded bg-surface-bright border border-border text-[8px] font-black uppercase tracking-widest text-text-secondary">
                                     {task.verificationType}
                                  </span>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-1">
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
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
                </div>
             )}

             {activeTab === 'STATS' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="p-6 md:p-10 border-border">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-8">Submission Activity</h3>
                         <div className="h-48 flex items-end gap-2">
                            {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                               <div key={i} className="flex-1 bg-primary/20 rounded-t-lg transition-all hover:bg-primary" style={{ height: `${h}%` }} />
                            ))}
                         </div>
                      </Card>
                      <Card className="p-6 md:p-10 border-border">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-8">Distribution Breakdown</h3>
                         <div className="space-y-6">
                            {[
                               { label: 'Validated', count: stats.completions, color: 'bg-success' },
                               { label: 'Pending', count: stats.pending, color: 'bg-warning' },
                               { label: 'Rejected', count: stats.rejected, color: 'bg-danger' }
                            ].map((item) => {
                               const total = Math.max(claims.length, 1);
                               const percent = (item.count / total * 100).toFixed(0);
                               return (
                               <div key={item.label} className="space-y-2">
                                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                     <span>{item.label}</span>
                                     <span>{percent}% ({item.count})</span>
                                  </div>
                                  <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden">
                                     <div className={cn("h-full rounded-full", item.color)} style={{ width: `${percent}%` }} />
                                  </div>
                               </div>
                            )})}
                         </div>
                      </Card>
                   </div>
                </div>
             )}

             {activeTab === 'PARTICIPANTS' && (
                <div className="bg-surface border border-border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl">
                   <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left min-w-[500px]">
                      <thead>
                         <tr className="bg-surface-bright/50 border-b border-border whitespace-nowrap">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">User</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Joined</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {Array.from(new Set(claims.map(c => c.userId))).map(uid => {
                            const userClaims = claims.filter(c => c.userId === uid);
                            const latestClaim = userClaims[0];
                            return (
                               <tr key={uid} className="hover:bg-surface-bright/30 transition-colors group whitespace-nowrap">
                                  <td className="px-8 py-6">
                                     <p className="text-sm font-bold text-text-primary uppercase">{latestClaim.metadata?.username || 'Anonymous'}</p>
                                     <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1">{uid.slice(0, 12)}</p>
                                  </td>
                                  <td className="px-8 py-6">
                                     <span className="text-[10px] font-bold text-primary uppercase">
                                        {userClaims.filter(c => c.validationState === 'APPROVED').length} / {tasks.length} Tasks
                                     </span>
                                  </td>
                                  <td className="px-8 py-6">
                                     <p className="text-[10px] font-mono text-text-secondary uppercase">
                                        {latestClaim.createdAt?.toDate().toLocaleDateString()}
                                     </p>
                                  </td>
                               </tr>
                            )
                         })}
                      </tbody>
                   </table>
                   </div>
                </div>
             )}

             {activeTab === 'LEDGER' && (
                <div className="bg-surface border border-border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl">
                   <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left min-w-[600px]">
                      <thead>
                         <tr className="bg-surface-bright/50 border-b border-border whitespace-nowrap">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Log Entry</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">User</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Time</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {claims.map(claim => (
                            <tr key={claim.id} className="hover:bg-surface-bright/30 transition-colors group whitespace-nowrap">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        claim.validationState === 'APPROVED' ? "bg-success" : claim.validationState === 'REJECTED' ? "bg-danger" : "bg-warning"
                                     )} />
                                     <div>
                                        <p className="text-sm font-bold text-text-primary uppercase tracking-tight italic">Task Claim: {claim.metadata?.taskTitle}</p>
                                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Status: {claim.validationState}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <p className="text-[10px] font-bold text-text-secondary uppercase">{claim.metadata?.username || 'Anonymous'}</p>
                               </td>
                               <td className="px-8 py-6">
                                  <p className="text-[10px] font-mono text-text-tertiary uppercase">
                                     {claim.createdAt?.toDate().toLocaleString()}
                                  </p>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                   </div>
                </div>
             )}

             {activeTab === 'AUDIT' && (
                <div className="space-y-6">
                   <Card className="p-8 border-border bg-danger/[0.02] border-danger/10">
                      <div className="flex items-center gap-4 text-danger mb-6">
                         <ShieldAlert size={24} />
                         <h3 className="text-sm font-black uppercase tracking-widest">Campaign Audit Trail</h3>
                      </div>
                      <div className="space-y-4">
                         <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-text-primary uppercase tracking-tight">Campaign Initialized</p>
                               <p className="text-[9px] text-text-tertiary font-mono">{campaign.createdAt?.toDate().toLocaleString()}</p>
                            </div>
                            <div className="text-[9px] font-black text-primary uppercase">System</div>
                         </div>
                         <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-text-primary uppercase tracking-tight">Status Modification: {campaign.status}</p>
                               <p className="text-[9px] text-text-tertiary font-mono">{campaign.updatedAt?.toDate().toLocaleString()}</p>
                            </div>
                            <div className="text-[9px] font-black text-primary uppercase">Ops User</div>
                         </div>
                      </div>
                   </Card>
                </div>
             )}
          </div>

          {/* SIDEBAR OPS */}
          <div className="lg:col-span-4 space-y-8">
             <section className="bg-surface border border-border p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] space-y-8 shadow-xl">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary px-1">Validation Queue</h3>
                   <span className="px-2 py-1 bg-warning/10 text-warning text-[8px] font-black rounded-lg border border-warning/20">{stats.pending} PENDING</span>
                </div>
                <div className="space-y-3">
                   {claims.filter(c => c.validationState === 'PENDING').slice(0, 5).map(claim => (
                      <div key={claim.id} className="p-4 rounded-xl bg-surface-bright border border-border flex items-center justify-between group hover:border-primary/40 transition-all cursor-pointer">
                         <div className="min-w-0">
                            <p className="text-[11px] font-bold text-text-primary truncate">{claim.metadata?.username || 'Anonymous User'}</p>
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Ref: {claim.id.slice(-8)}</p>
                         </div>
                         <button onClick={() => navigate('/admin/validation')} className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                            <ArrowRight size={14} />
                         </button>
                      </div>
                   ))}
                   {claims.filter(c => c.validationState === 'PENDING').length === 0 && (
                      <div className="py-10 text-center opacity-20 italic text-[10px] font-bold uppercase tracking-widest">Queue Empty</div>
                   )}
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => navigate('/admin/validation')}>
                   Go to Validation Center
                </Button>
             </section>

             <section className="bg-surface border border-border p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] space-y-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary px-1">Campaign Integrity</h3>
                <div className="space-y-6">
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-bright border border-border">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                         <Target size={20} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase">{tasks.length} Tasks Attached</p>
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Operational</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-bright border border-border">
                      <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                         <Zap size={20} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase">{campaign.totalPrizePool?.toLocaleString()}</p>
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1">Initial Budget</p>
                      </div>
                   </div>
                </div>
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

export default OpsCampaignDetail;
