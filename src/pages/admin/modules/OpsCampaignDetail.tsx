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
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { Campaign, Task, TaskClaim } from '../../../types';
import { cn } from '../../../utils';
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
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'TASKS' | 'STATS' | 'LEDGER'>('OVERVIEW');

  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    if (!id) return;

    const unsubCamp = onSnapshot(doc(db, 'campaigns', id), (snap) => {
      if (snap.exists()) setCampaign({ id: snap.id, ...snap.data() } as Campaign);
      else navigate('/admin/campaigns');
    });

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('campaignId', '==', id)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const unsubClaims = onSnapshot(query(collection(db, 'task_claims'), where('campaignId', '==', id), orderBy('createdAt', 'desc')), (snap) => {
       setClaims(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskClaim)));
    });

    setLoading(false);
    return () => { unsubCamp(); unsubTasks(); unsubClaims(); };
  }, [id, navigate]);

  if (loading || !campaign) return <div className="p-20 text-center animate-pulse">Synchronizing Record...</div>;

  const stats = {
    completions: claims.filter(c => c.validationState === 'APPROVED').length,
    pending: claims.filter(c => c.validationState === 'PENDING').length,
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
       <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-surface border border-border p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <Target size={200} />
          </div>

          <div className="flex items-center gap-8 relative z-10">
             <div className="w-24 h-24 rounded-[2rem] bg-surface-bright border border-border overflow-hidden shrink-0">
                {campaign.bannerUrl ? <img src={campaign.bannerUrl} className="w-full h-full object-cover" /> : <Target size={40} className="m-auto mt-7 text-text-tertiary" />}
             </div>
             <div className="space-y-3">
                <div className="flex items-center gap-3">
                   <h1 className="text-4xl font-bold tracking-tight uppercase italic">{campaign.name}</h1>
                   <div className={cn(
                     "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                     campaign.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-tertiary border-border"
                   )}>
                      {campaign.status}
                   </div>
                </div>
                <p className="text-sm font-medium text-text-tertiary max-w-xl line-clamp-1">{campaign.description}</p>
             </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
             <Button variant="outline" className="flex-1 lg:flex-none h-12 px-8 rounded-xl" onClick={() => setIsCampaignModalOpen(true)}>
                <Edit3 size={16} />
                Edit Campaign
             </Button>
             <Button variant="primary" className="flex-1 lg:flex-none h-12 px-8 rounded-xl" onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                <Plus size={16} />
                Add Task
             </Button>
          </div>
       </header>

       {/* NAVIGATION TABS */}
       <div className="flex gap-2 p-1.5 bg-surface-bright/50 border border-border rounded-2xl w-fit">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: BarChart3 },
            { id: 'TASKS', label: 'Task List', icon: Target },
            { id: 'STATS', label: 'Analytics', icon: History },
            { id: 'LEDGER', label: 'Audit Log', icon: ShieldAlert },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
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
                            <span className="text-[10px] font-black text-success uppercase tracking-widest">+12%</span>
                         </div>
                         <p className="text-3xl font-mono font-bold text-text-primary">{campaign.participantsCount?.toLocaleString() || 0}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Unique Participants</p>
                      </Card>
                      <Card className="p-8 border-border">
                         <div className="flex justify-between items-start mb-4">
                            <CheckCircle2 size={20} className="text-success" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{stats.conversion}%</span>
                         </div>
                         <p className="text-3xl font-mono font-bold text-text-primary">{stats.completions.toLocaleString()}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Total Completions</p>
                      </Card>
                      <Card className="p-8 border-border">
                         <div className="flex justify-between items-start mb-4">
                            <Zap size={20} className="text-warning" />
                            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Budget</span>
                         </div>
                         <p className="text-3xl font-mono font-bold text-text-primary">{campaign.remainingPool?.toLocaleString() || 0}</p>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Remaining Points</p>
                      </Card>
                   </div>

                   <Card className="p-10 border-border space-y-8">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full" />
                         <h2 className="text-xl font-bold uppercase italic">Operational Configuration</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-12">
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Internal Category</p>
                               <p className="text-sm font-bold text-text-primary uppercase">{campaign.category}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Validation Mode</p>
                               <p className="text-sm font-bold text-text-primary">{campaign.validationSettings?.manualReview ? 'MANUAL APPROVAL' : 'AUTOMATED'}</p>
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
                <div className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-xl">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-surface-bright/50 border-b border-border">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Task Details</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Rewards</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Validation</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-surface-bright/30 transition-colors group">
                               <td className="px-8 py-6">
                                  <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{task.title}</p>
                                  <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1">ID: {task.id.slice(0,8)}</p>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-2">
                                     <Zap size={12} className="text-primary" />
                                     <span className="text-xs font-mono font-bold">+{task.rewardAmount}</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <span className="px-2 py-0.5 rounded bg-surface-bright border border-border text-[8px] font-black uppercase tracking-widest text-text-secondary">
                                     {task.verificationType}
                                  </span>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <button onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                                     <Edit3 size={14} />
                                  </button>
                               </td>
                            </tr>
                         ))}
                         {tasks.length === 0 && (
                            <tr><td colSpan={4} className="px-8 py-20 text-center text-xs font-bold text-text-tertiary uppercase tracking-widest opacity-30">No execution vectors defined</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             )}

             {activeTab === 'STATS' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-8">
                      <Card className="p-10 border-border">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-8">Performance Curve</h3>
                         <div className="h-48 flex items-end gap-2">
                            {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                               <div key={i} className="flex-1 bg-primary/20 rounded-t-lg transition-all hover:bg-primary" style={{ height: `${h}%` }} />
                            ))}
                         </div>
                      </Card>
                      <Card className="p-10 border-border">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-8">Distribution Breakdown</h3>
                         <div className="space-y-6">
                            {['Validated', 'Pending', 'Rejected'].map((label, i) => (
                               <div key={label} className="space-y-2">
                                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                     <span>{label}</span>
                                     <span>{i === 0 ? '72%' : i === 1 ? '18%' : '10%'}</span>
                                  </div>
                                  <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden">
                                     <div className={cn("h-full rounded-full", i === 0 ? "bg-success" : i === 1 ? "bg-warning" : "bg-danger")} style={{ width: i === 0 ? '72%' : i === 1 ? '18%' : '10%' }} />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </Card>
                   </div>
                </div>
             )}
          </div>

          {/* SIDEBAR OPS */}
          <div className="lg:col-span-4 space-y-8">
             <section className="bg-surface border border-border p-8 rounded-[2.5rem] space-y-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary px-1">Verification Queue</h3>
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

             <section className="bg-surface border border-border p-8 rounded-[2.5rem] space-y-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary px-1">Sponsor Intel</h3>
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center overflow-hidden">
                         {campaign.sponsorLogoUrl ? <img src={campaign.sponsorLogoUrl} /> : <Users size={20} className="text-text-tertiary" />}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-text-primary uppercase tracking-tight">{campaign.sponsorName || 'PulseEarn Internal'}</p>
                         <a href={campaign.sponsorWebsite} target="_blank" className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 mt-1">
                            <ExternalLink size={10} />
                            Portal
                         </a>
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
