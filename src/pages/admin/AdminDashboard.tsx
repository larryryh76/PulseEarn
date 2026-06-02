import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  Users,
  ShieldAlert,
  Terminal,
  Cpu,
  Plus,
  ShieldCheck,
  Layers,
  ArrowRight,
  X,
  Activity,
  BarChart3,
  Globe,
  Search,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Zap,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  getCountFromServer,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { TaskCategory, VerificationType, SocialPlatform, TaskType, Task, SubmissionStatus } from '../../types';
import toast from 'react-hot-toast';

type AdminTab = 'OVERVIEW' | 'CAMPAIGNS' | 'CLAIMS' | 'ANALYTICS' | 'PROVIDERS' | 'USERS' | 'MODERATION' | 'TRANSACTIONS' | 'NOTIFICATIONS' | 'SETTINGS';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingClaims: 0,
    totalCampaigns: 0,
    ecosystemPoints: 0
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const usersCount = await getCountFromServer(collection(db, 'users'));
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('active', '==', true)));
        const claimsSnap = await getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING')));
        const campaignSnap = await getCountFromServer(collection(db, 'campaigns'));

        // Sum total points in ecosystem
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        const totalPoints = usersSnap.docs.reduce((acc, doc) => acc + (doc.data().points || 0), 0);

        setStats({
          totalUsers: usersCount.data().count,
          activeTasks: tasksSnap.size,
          pendingClaims: claimsSnap.data().count,
          totalCampaigns: campaignSnap.data().count,
          ecosystemPoints: totalPoints
        });
      } catch (err) {
        console.error("Stats aggregation error:", err);
      }
    };

    fetchGlobalStats();
  }, []);

  return (
    <AdminLayout>
      <div className="pt-16 pb-24 px-8 max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-12 min-h-[calc(100vh-4rem)]">

        {/* Navigation Sidebar */}
        <aside className="lg:w-72 shrink-0 space-y-10 border-r border-white/5 pr-12 pt-12">
          <div className="space-y-1">
             <p className="data-label px-4 mb-6 text-primary">Operations</p>
             {[
               { id: 'OVERVIEW', label: 'System Console', icon: Terminal },
               { id: 'CAMPAIGNS', label: 'Campaigns', icon: Layers },
               { id: 'CLAIMS', label: 'Claims Review', icon: ShieldCheck },
               { id: 'TRANSACTIONS', label: 'Audit Ledger', icon: Activity },
               { id: 'ANALYTICS', label: 'Economy Stats', icon: BarChart3 },
               { id: 'PROVIDERS', label: 'Sponsors', icon: Globe },
             ].map(item => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id as AdminTab)}
                 className={cn(
                   "w-full flex items-center justify-between px-4 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all",
                   activeTab === item.id
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.1)]"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                 )}
               >
                 <div className="flex items-center gap-4">
                    <item.icon size={16} />
                    {item.label}
                 </div>
                 {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-primary" />}
               </button>
             ))}
          </div>

          <div className="space-y-1 pt-10 border-t border-white/5">
             <p className="data-label px-4 mb-6 text-warning">Security</p>
             {[
               { id: 'USERS', label: 'User Registry', icon: Users },
               { id: 'MODERATION', label: 'Fraud Engine', icon: ShieldAlert },
               { id: 'NOTIFICATIONS', label: 'Broadcasts', icon: Bell },
               { id: 'SETTINGS', label: 'System Settings', icon: Cpu },
             ].map(item => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id as AdminTab)}
                 className={cn(
                   "w-full flex items-center justify-between px-4 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all",
                   activeTab === item.id
                    ? "bg-warning/10 text-warning border border-warning/20"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                 )}
               >
                 <div className="flex items-center gap-4">
                    <item.icon size={16} />
                    {item.label}
                 </div>
               </button>
             ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 pt-12">
          <AnimatePresence mode="wait">
            {activeTab === 'OVERVIEW' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
                <header>
                   <h1 className="text-3xl font-bold tracking-tight mb-2">Operations Terminal</h1>
                   <p className="text-text-secondary text-sm">Real-time infrastructure health and ecosystem velocity.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="system-card">
                      <p className="data-label mb-4">Total Operators</p>
                      <div className="flex items-center justify-between">
                         <span className="text-2xl font-mono font-bold">{stats.totalUsers.toLocaleString()}</span>
                         <Users className="text-primary" size={20} />
                      </div>
                   </div>
                   <div className="system-card">
                      <p className="data-label mb-4">Pending Claims</p>
                      <div className="flex items-center justify-between">
                         <span className={cn("text-2xl font-mono font-bold", stats.pendingClaims > 0 ? "text-warning" : "text-white")}>
                            {stats.pendingClaims}
                         </span>
                         <ShieldCheck className={stats.pendingClaims > 0 ? "text-warning" : "text-text-secondary"} size={20} />
                      </div>
                   </div>
                   <div className="system-card">
                      <p className="data-label mb-4">Active Missions</p>
                      <div className="flex items-center justify-between">
                         <span className="text-2xl font-mono font-bold">{stats.activeTasks}</span>
                         <Layers className="text-success" size={20} />
                      </div>
                   </div>
                   <div className="system-card">
                      <p className="data-label mb-4">Ecosystem Points</p>
                      <div className="flex items-center justify-between">
                         <span className="text-2xl font-mono font-bold">{stats.ecosystemPoints.toLocaleString()}</span>
                         <Zap className="text-accent" size={20} />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                   <section className="system-card">
                      <h2 className="text-sm mb-6 uppercase tracking-widest font-bold flex items-center gap-2">
                         <Cpu size={16} className="text-primary" />
                         Engine Health
                      </h2>
                      <div className="space-y-4">
                         {['PointTransactionEngine', 'ReferralEngine', 'TaskValidator', 'MarketResolver'].map(engine => (
                            <div key={engine} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                               <span className="text-xs font-mono">{engine}</span>
                               <span className="text-[10px] font-bold text-success uppercase tracking-widest">Active</span>
                            </div>
                         ))}
                      </div>
                   </section>

                   <section className="system-card">
                      <h2 className="text-sm mb-6 uppercase tracking-widest font-bold flex items-center gap-2">
                         <ShieldAlert size={16} className="text-warning" />
                         Recent Anomalies
                      </h2>
                      <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-2xl">
                         <Search className="text-white/5 mb-4" size={32} />
                         <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">No anomalies detected in last 24h</p>
                      </div>
                   </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'CAMPAIGNS' && (
              <CampaignsView
                onNewTask={() => setIsTaskModalOpen(true)}
                onEditTask={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }}
                onNewCampaign={() => setIsCampaignModalOpen(true)}
                onEditCampaign={(c) => { setSelectedCampaign(c); setIsCampaignModalOpen(true); }}
              />
            )}
            {activeTab === 'CLAIMS' && <ClaimsView />}
            {activeTab === 'USERS' && <UsersView />}
            {activeTab === 'TRANSACTIONS' && <TransactionsView />}
            {activeTab === 'MODERATION' && <ModerationView />}
            {activeTab === 'ANALYTICS' && <EconomyStatsView stats={stats} />}
            {activeTab === 'NOTIFICATIONS' && <AdminNotificationsView />}
            {activeTab === 'SETTINGS' && <SystemSettingsView />}

            {/* Locked Placeholders for complex operational logic */}
            {(['PROVIDERS'].includes(activeTab)) && (
               <div className="py-40 text-center">
                  <Globe size={48} className="mx-auto text-white/5 mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Partner Management</h2>
                  <p className="text-text-secondary max-w-md mx-auto text-sm">
                     The strategic partner and sponsor management portal is scheduled for deployment in Phase 3.
                     Current system sponsors are managed via the System Registry.
                  </p>
               </div>
            )}
          </AnimatePresence>
        </main>

        {/* Dynamic Modals */}
        <TaskDeploymentModal
          isOpen={isTaskModalOpen}
          onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
          initialTask={selectedTask}
        />
        <CampaignDeploymentModal
          isOpen={isCampaignModalOpen}
          onClose={() => { setIsCampaignModalOpen(false); setSelectedCampaign(null); }}
          initialCampaign={selectedCampaign}
        />
      </div>
    </AdminLayout>
  );
};

/* --- CAMPAIGNS VIEW --- */
const CampaignsView: React.FC<{
   onNewTask: () => void;
   onEditTask: (t: Task) => void;
   onNewCampaign: () => void;
   onEditCampaign: (c: any) => void;
}> = ({ onNewTask, onEditTask, onNewCampaign, onEditCampaign }) => {
   const [tasks, setTasks] = useState<Task[]>([]);
   const [campaigns, setCampaigns] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const unsubTasks = onSnapshot(qTasks, (snap) => {
         setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });

      const qCamps = query(collection(db, 'campaigns'), orderBy('startDate', 'desc'));
      const unsubCamps = onSnapshot(qCamps, (snap) => {
         setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         setLoading(false);
      });

      return () => { unsubTasks(); unsubCamps(); };
   }, []);

   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
         {/* Campaigns Section */}
         <section className="space-y-8">
            <header className="flex justify-between items-end">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Active Campaigns</h1>
                  <p className="text-text-secondary text-sm">Strategic marketing initiatives and seasonal event grouping.</p>
               </div>
               <button onClick={onNewCampaign} className="btn-system-primary flex items-center gap-2 px-8">
                  <Plus size={18} />
                  Initiate Campaign
               </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {campaigns.map(camp => (
                  <div key={camp.id} onClick={() => onEditCampaign(camp)} className="system-card bg-black/40 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group">
                     <div className="h-24 -mx-10 -mt-10 mb-8 overflow-hidden rounded-t-[2rem]">
                        {camp.bannerUrl ? (
                           <img src={camp.bannerUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                        ) : (
                           <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <ImageIcon className="text-primary/20" size={32} />
                           </div>
                        )}
                     </div>
                     <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold">{camp.name}</h3>
                        <span className={cn("badge-system", camp.active ? "text-success border-success/20" : "text-text-secondary border-white/5")}>{camp.active ? 'ACTIVE' : 'DORMANT'}</span>
                     </div>
                     <p className="text-[11px] text-text-secondary line-clamp-2 mb-6">{camp.description}</p>
                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] font-bold uppercase text-white/40">{camp.taskIds?.length || 0} Mission Vectors</span>
                        <ArrowRight size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-all" />
                     </div>
                  </div>
               ))}
               {campaigns.length === 0 && !loading && (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-3xl">
                     <p className="text-text-secondary text-xs uppercase tracking-widest font-bold">Zero active campaigns detected</p>
                  </div>
               )}
            </div>
         </section>

         {/* Tasks Section */}
         <section className="space-y-8">
            <header className="flex justify-between items-end">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Mission Registry</h1>
                  <p className="text-text-secondary text-sm">Manage individual reward units and execution parameters.</p>
               </div>
               <button onClick={onNewTask} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                  <Plus size={14} />
                  New Mission Unit
               </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tasks.map(task => (
               <div key={task.id} className="system-card group hover:border-primary/40 transition-all cursor-pointer" onClick={() => onEditTask(task)}>
                  <div className="flex justify-between items-start mb-6">
                     <span className={cn(
                        "badge-system",
                        task.active ? "text-success border-success/20" : "text-text-secondary border-white/5"
                     )}>
                        {task.active ? 'ACTIVE' : 'DRAFT'}
                     </span>
                     <div className="text-right">
                        <p className="text-lg font-mono font-bold">+{task.rewardAmount}</p>
                        <p className="text-[10px] font-bold text-text-secondary uppercase">PTS</p>
                     </div>
                  </div>
                  <h3 className="text-sm font-bold mb-2">{task.title}</h3>
                  <div className="flex gap-4 mb-6">
                     <div>
                        <p className="text-[9px] text-text-secondary uppercase font-bold">Completions</p>
                        <p className="text-xs font-mono font-bold">{task.completionCount || 0}</p>
                     </div>
                     <div>
                        <p className="text-[9px] text-text-secondary uppercase font-bold">Distributed</p>
                        <p className="text-xs font-mono font-bold">{(task.totalDistributed || 0).toLocaleString()} PT</p>
                     </div>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2 mb-6">{task.description}</p>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5">{task.category}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5">{task.verificationType}</span>
                     </div>
                     <ArrowRight size={14} className="text-text-secondary group-hover:text-primary transition-colors" />
                  </div>
               </div>
            ))}

            {tasks.length === 0 && !loading && (
               <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-3xl">
                  <Layers className="mx-auto text-white/5 mb-4" size={48} />
                  <p className="text-text-secondary text-sm">No campaigns currently deployed</p>
               </div>
            )}
         </div>
         </section>
      </motion.div>
   );
};

/* --- CLAIMS VIEW --- */
const ClaimsView: React.FC = () => {
   const [claims, setClaims] = useState<any[]>([]);

   useEffect(() => {
      const q = query(
         collection(db, 'task_claims'),
         where('validationState', '==', 'PENDING'),
         orderBy('createdAt', 'desc'),
         limit(20)
      );
      return onSnapshot(q, (snap) => {
         setClaims(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
   }, []);

   const handleReview = async (claimId: string, status: SubmissionStatus) => {
      try {
         await updateDoc(doc(db, 'task_claims', claimId), {
            validationState: status,
            resolvedAt: serverTimestamp()
         });
         toast.success(`Claim ${status.toLowerCase()}`);
      } catch (err) {
         toast.error("Review operation failed");
      }
   };

   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Claims Review</h1>
            <p className="text-text-secondary text-sm">Verify operator submissions and finalize reward settlement.</p>
         </header>

         <div className="system-card bg-black/20 p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                     <th className="p-6 data-label">Operator</th>
                     <th className="p-6 data-label">Mission</th>
                     <th className="p-6 data-label">Proof Assets</th>
                     <th className="p-6 data-label text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {claims.map(claim => (
                     <tr key={claim.id} className="hover:bg-white/[0.02]">
                        <td className="p-6">
                           <p className="text-xs font-bold">{claim.userId.slice(0, 8)}</p>
                           <p className="text-[10px] text-text-secondary mt-1">{claim.createdAt?.toDate().toLocaleString()}</p>
                        </td>
                        <td className="p-6">
                           <p className="text-xs font-mono text-primary font-bold">{claim.taskId}</p>
                        </td>
                        <td className="p-6">
                           {claim.submittedProof ? (
                              <a href={claim.submittedProof} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary hover:underline">
                                 <ExternalLink size={12} /> View Proof
                              </a>
                           ) : <span className="text-[10px] text-text-secondary italic">No proof attached</span>}
                        </td>
                        <td className="p-6 text-right space-x-2">
                           <button onClick={() => handleReview(claim.id, 'REJECTED')} className="px-4 py-2 rounded-lg bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-widest hover:bg-danger/20 transition-all">Reject</button>
                           <button onClick={() => handleReview(claim.id, 'APPROVED')} className="px-4 py-2 rounded-lg bg-success/10 text-success text-[10px] font-bold uppercase tracking-widest hover:bg-success/20 transition-all">Approve</button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>

            {claims.length === 0 && (
               <div className="py-24 text-center">
                  <CheckCircle className="mx-auto text-success/20 mb-4" size={48} />
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-widest">Queue Clear - All claims settled</p>
               </div>
            )}
         </div>
      </motion.div>
   );
};

/* --- TASK DEPLOYMENT MODAL --- */
const TaskDeploymentModal: React.FC<{ isOpen: boolean; onClose: () => void; initialTask: Task | null }> = ({ isOpen, onClose, initialTask }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    instructions: '',
    campaignId: null,
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
    perUserLimit: 1,
    regionRestrictions: [],
    targetTiers: [],
    fraudProtection: {
       duplicatePrevention: true,
       abuseDetection: true,
       multiAccountDetection: true
    }
  });

  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
     getDocs(collection(db, 'campaigns')).then(snap => {
        setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
     });

     if (initialTask) {
        setFormData({
           ...initialTask,
           startDate: initialTask.startDate ? (initialTask.startDate as any).toDate().toISOString().split('T')[0] : '',
           endDate: initialTask.endDate ? (initialTask.endDate as any).toDate().toISOString().split('T')[0] : ''
        } as any);
     } else {
        setFormData({
           title: '',
           description: '',
           instructions: '',
           campaignId: null,
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
           perUserLimit: 1,
           regionRestrictions: [],
           targetTiers: [],
           fraudProtection: {
            duplicatePrevention: true,
            abuseDetection: true,
            multiAccountDetection: true
         }
        });
     }
  }, [initialTask, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskId = initialTask?.id || doc(collection(db, 'tasks')).id;
      const taskData = {
        ...formData,
        id: taskId,
        active: formData.status === 'ACTIVE',
        startDate: (formData as any).startDate ? Timestamp.fromDate(new Date((formData as any).startDate)) : null,
        endDate: (formData as any).endDate ? Timestamp.fromDate(new Date((formData as any).endDate)) : null,
        updatedAt: serverTimestamp(),
        createdAt: initialTask?.createdAt || serverTimestamp(),
        totalClaims: initialTask?.totalClaims || 0,
        completionCount: initialTask?.completionCount || 0,
        totalDistributed: initialTask?.totalDistributed || 0,
        providerId: 'SYSTEM',
        providerName: 'PulseEarn'
      };

      await setDoc(doc(db, 'tasks', taskId), taskData, { merge: true });
      toast.success(initialTask ? 'Mission parameters updated' : 'New mission deployed to terminal');
      onClose();
    } catch (err) {
      toast.error('Mission deployment failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto bg-black/90 backdrop-blur-xl">
       <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-5xl bg-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl my-auto">

          <div className="flex justify-between items-center mb-10">
             <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">{initialTask ? 'Edit Mission' : 'New Mission Deployment'}</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Strategic Asset Creation Layer</p>
             </div>
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">

             {/* Section: Basic Info */}
             <div className="space-y-6">
                <p className="data-label text-white/20 flex items-center gap-2"><ImageIcon size={14} /> Basic Identification</p>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Title</label>
                   <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Designation" className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Link to Campaign</label>
                   <select value={formData.campaignId ?? ''} onChange={e => setFormData({...formData, campaignId: e.target.value || null})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                      <option value="">STANDALONE MISSION</option>
                      {campaigns.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Category</label>
                   <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                      <option value="SOCIAL">SOCIAL</option>
                      <option value="ENGAGEMENT">ENGAGEMENT</option>
                      <option value="REFERRAL">REFERRAL</option>
                      <option value="PREDICTION">PREDICTION</option>
                      <option value="EDUCATION">EDUCATION</option>
                      <option value="EVENTS">EVENTS</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Mission Type</label>
                   <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TaskType})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                      <option value="once">ONCE (EXECUTION)</option>
                      <option value="daily">DAILY (RECURRING)</option>
                      <option value="referral">REFERRAL</option>
                      <option value="prediction">PREDICTION</option>
                      <option value="education">LEARN & EARN</option>
                      <option value="event">SEASONAL EVENT</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Platform Hub</label>
                   <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value as SocialPlatform})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                      <option value="NONE">NONE / SYSTEM</option>
                      <option value="TELEGRAM">TELEGRAM</option>
                      <option value="TWITTER">X / TWITTER</option>
                      <option value="TIKTOK">TIKTOK</option>
                      <option value="DISCORD">DISCORD</option>
                      <option value="WEBSITE">WEBSITE</option>
                      <option value="APP_STORE">APP STORE</option>
                   </select>
                </div>
             </div>

             {/* Section: Rewards & Limits */}
             <div className="space-y-6">
                <p className="data-label text-white/20 flex items-center gap-2"><Zap size={14} /> Yield & Bounds</p>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">PT Reward</label>
                      <input type="number" required value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">XP Reward</label>
                      <input type="number" required value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Total Budget</label>
                      <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Max Claims</label>
                      <input type="number" value={formData.maxClaims ?? 0} onChange={e => setFormData({...formData, maxClaims: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Validation Engine</label>
                   <select value={formData.verificationType} onChange={e => setFormData({...formData, verificationType: e.target.value as VerificationType})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                      <option value="automated">AUTOMATED (CLICK)</option>
                      <option value="manual">MANUAL (REVIEW)</option>
                      <option value="proof">PROOF (SCREENSHOT)</option>
                      <option value="link">LINK SUBMISSION</option>
                      <option value="api">API VERIFICATION</option>
                      <option value="prediction">PREDICTION ENGINE</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Visibility Status</label>
                   <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                      <option value="DRAFT">DRAFT (OFFLINE)</option>
                      <option value="ACTIVE">ACTIVE (DEPLOYED)</option>
                      <option value="PAUSED">PAUSED (SUSPENDED)</option>
                      <option value="EXPIRED">EXPIRED (COMPLETED)</option>
                   </select>
                </div>
             </div>

             {/* Section: Advanced & Fraud */}
             <div className="space-y-6">
                <p className="data-label text-white/20 flex items-center gap-2"><ShieldAlert size={14} /> Integrity Layers</p>

                <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                   <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Duplicate Check</span>
                      <input type="checkbox" checked={formData.fraudProtection?.duplicatePrevention} onChange={e => setFormData({...formData, fraudProtection: {...formData.fraudProtection!, duplicatePrevention: e.target.checked}})} />
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Abuse Detection</span>
                      <input type="checkbox" checked={formData.fraudProtection?.abuseDetection} onChange={e => setFormData({...formData, fraudProtection: {...formData.fraudProtection!, abuseDetection: e.target.checked}})} />
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Multi-Account</span>
                      <input type="checkbox" checked={formData.fraudProtection?.multiAccountDetection} onChange={e => setFormData({...formData, fraudProtection: {...formData.fraudProtection!, multiAccountDetection: e.target.checked}})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Min Level</label>
                      <input type="number" value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Cooldown (Hrs)</label>
                      <input type="number" value={formData.cooldownPeriod} onChange={e => setFormData({...formData, cooldownPeriod: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2"><ImageIcon size={12} /> Banner Image (URL)</label>
                   <input value={formData.campaignArtwork || ''} onChange={e => setFormData({...formData, campaignArtwork: e.target.value})} placeholder="https://..." className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2"><ExternalLink size={12} /> Action Target (URL)</label>
                   <input value={formData.actionUrl || ''} onChange={e => setFormData({...formData, actionUrl: e.target.value})} placeholder="https://..." className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
                </div>
             </div>

             <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Start Date</label>
                   <input type="date" value={formData.startDate as any} onChange={e => setFormData({...formData, startDate: e.target.value as any})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">End Date</label>
                   <input type="date" value={formData.endDate as any} onChange={e => setFormData({...formData, endDate: e.target.value as any})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
                </div>
             </div>

             <div className="md:col-span-3 pt-10 border-t border-white/5">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                   <div className="flex-1 space-y-1.5 w-full">
                      <label className="data-label text-white/40">Mission Description</label>
                      <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium h-24 focus:border-primary/50 transition-all resize-none" placeholder="Explain the objective to the operator..." />
                   </div>
                   <div className="w-full md:w-80">
                      <button type="submit" className="w-full py-6 bg-primary text-white font-bold uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-primary/90 transition-all shadow-[0_0_40px_rgba(0,102,255,0.2)]">
                         {initialTask ? 'Re-Sync Mission' : 'Initiate Deployment'}
                      </button>
                   </div>
                </div>
             </div>

          </form>
       </motion.div>
    </div>
  );
};

export default AdminDashboard;

/* --- USERS VIEW --- */
const UsersView: React.FC = () => {
   const [users, setUsers] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState('');

   useEffect(() => {
      const q = query(collection(db, 'users'), limit(50));
      return onSnapshot(q, (snap) => {
         setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
   }, []);

   const filteredUsers = users.filter(u =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id?.includes(searchTerm)
   );

   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header className="flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-bold tracking-tight mb-2">User Registry</h1>
               <p className="text-text-secondary text-sm">Manage platform operators and account statuses.</p>
            </div>
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
               <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search UID, Email, Username..."
                  className="bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm w-80 focus:border-primary/50 outline-none transition-all"
               />
            </div>
         </header>

         <div className="system-card bg-black/20 p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                     <th className="p-6 data-label">Operator</th>
                     <th className="p-6 data-label">Balance</th>
                     <th className="p-6 data-label">Level / XP</th>
                     <th className="p-6 data-label">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {filteredUsers.map(user => (
                     <tr key={user.id} className="hover:bg-white/[0.02]">
                        <td className="p-6">
                           <p className="text-xs font-bold text-white">{user.username || 'Anonymous'}</p>
                           <p className="text-[10px] text-text-secondary mt-1 font-mono">{user.email}</p>
                        </td>
                        <td className="p-6">
                           <p className="text-sm font-mono font-bold text-primary">{user.points?.toLocaleString()} PTS</p>
                        </td>
                        <td className="p-6">
                           <p className="text-xs font-bold">LVL {user.level || 1}</p>
                           <p className="text-[10px] text-text-secondary mt-1">{user.xp?.toLocaleString()} XP</p>
                        </td>
                        <td className="p-6">
                           <div className="flex items-center gap-3">
                              <span className={cn(
                                 "badge-system",
                                 user.isBanned ? "text-danger border-danger/20" : "text-success border-success/20"
                              )}>
                                 {user.isBanned ? 'BANNED' : 'ACTIVE'}
                              </span>
                              <button
                                 onClick={async () => {
                                    try {
                                       await updateDoc(doc(db, 'users', user.id), { isBanned: !user.isBanned });
                                       toast.success(`Operator ${user.isBanned ? 'reinstated' : 'suspended'}`);
                                    } catch (err) {
                                       toast.error("Status update failed");
                                    }
                                 }}
                                 className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-secondary hover:text-white"
                              >
                                 <ShieldAlert size={14} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </motion.div>
   );
};

/* --- TRANSACTIONS VIEW --- */
const TransactionsView: React.FC = () => {
   const [txs, setTxs] = useState<any[]>([]);

   useEffect(() => {
      // Real-time listener for ALL global transactions would be heavy,
      // but for admin we pull latest 50 across all user sub-collections if possible,
      // or we use a global 'transactions' mirror if we had one.
      // Since we don't have a global mirror yet, we'll pull from system_claims for now
      // as they mirror all successful point injections.
      const q = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(50));
      return onSnapshot(q, (snap) => {
         setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
   }, []);

   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Ledger</h1>
            <p className="text-text-secondary text-sm">Global record of all economic injections and settlements.</p>
         </header>

         <div className="system-card bg-black/20 p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                     <th className="p-6 data-label">Type</th>
                     <th className="p-6 data-label">Operator</th>
                     <th className="p-6 data-label">Amount</th>
                     <th className="p-6 data-label">Timestamp</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {txs.map(tx => (
                     <tr key={tx.id} className="hover:bg-white/[0.02]">
                        <td className="p-6">
                           <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5">{tx.type}</span>
                        </td>
                        <td className="p-6">
                           <p className="text-xs font-mono text-text-secondary">{tx.userId?.slice(0, 12)}...</p>
                        </td>
                        <td className="p-6">
                           <p className={cn("text-sm font-mono font-bold", tx.amount >= 0 ? "text-success" : "text-danger")}>
                              {tx.amount >= 0 ? '+' : ''}{tx.amount} PTS
                           </p>
                        </td>
                        <td className="p-6 text-text-secondary text-[10px] font-mono">
                           {tx.executedAt?.toDate().toLocaleString()}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </motion.div>
   );
};

/* --- MODERATION VIEW --- */
const ModerationView: React.FC = () => {
   const [anomalies, setAnomalies] = useState<any[]>([]);

   useEffect(() => {
      const q = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(30));
      return onSnapshot(q, (snap) => {
         setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
   }, []);

   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Fraud Engine</h1>
            <p className="text-text-secondary text-sm">Automated anomaly detection and system validation failures.</p>
         </header>

         <div className="space-y-4">
            {anomalies.map(ano => (
               <div key={ano.id} className="system-card border-danger/20 bg-danger/5 flex items-center justify-between p-6">
                  <div className="flex items-center gap-6">
                     <div className="p-3 bg-danger/10 text-danger rounded-xl">
                        <ShieldAlert size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-white">{ano.error}</p>
                        <div className="flex gap-4 mt-1.5">
                           <p className="text-[10px] font-mono text-text-secondary uppercase">Operator: {ano.userId?.slice(0, 8)}</p>
                           <p className="text-[10px] font-mono text-text-secondary uppercase">Severity: {ano.severity}</p>
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] text-text-secondary font-mono uppercase">{ano.timestamp?.toDate().toLocaleString()}</p>
                  </div>
               </div>
            ))}

            {anomalies.length === 0 && (
               <div className="py-32 text-center border border-dashed border-white/5 rounded-3xl bg-black/20">
                  <CheckCircle className="mx-auto text-success/20 mb-4" size={48} />
                  <p className="text-text-secondary text-sm">No security anomalies detected</p>
               </div>
            )}
         </div>
      </motion.div>
   );
};

/* --- CAMPAIGN DEPLOYMENT MODAL --- */
const CampaignDeploymentModal: React.FC<{ isOpen: boolean; onClose: () => void; initialCampaign: any | null }> = ({ isOpen, onClose, initialCampaign }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bannerUrl: '',
    active: true,
    featured: false,
    taskIds: [] as string[],
    totalPrizePool: 0,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
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
           bannerUrl: '',
           active: true,
           featured: false,
           taskIds: [],
           totalPrizePool: 0,
           startDate: new Date().toISOString().split('T')[0],
           endDate: ''
        });
     }
  }, [initialCampaign, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campId = initialCampaign?.id || doc(collection(db, 'campaigns')).id;
      const campData = {
        ...formData,
        id: campId,
        startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : serverTimestamp(),
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        participantsCount: initialCampaign?.participantsCount || 0,
        remainingPool: initialCampaign?.remainingPool || formData.totalPrizePool
      };

      await setDoc(doc(db, 'campaigns', campId), campData, { merge: true });
      toast.success('Campaign strategy deployed');
      onClose();
    } catch (err) {
      toast.error('Campaign initiation failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
       <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-2xl font-bold">{initialCampaign ? 'Modify Campaign' : 'Initiate New Campaign'}</h2>
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="data-label text-white/40">Campaign Name</label>
                   <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
                </div>
                <div className="space-y-1.5">
                   <label className="data-label text-white/40">Banner Signal (URL)</label>
                   <input value={formData.bannerUrl} onChange={e => setFormData({...formData, bannerUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="data-label text-white/40">Strategic Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-24 resize-none" />
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="data-label text-white/40">Activation Date</label>
                   <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
                </div>
                <div className="space-y-1.5">
                   <label className="data-label text-white/40">Termination Date</label>
                   <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
                </div>
             </div>

             <div className="flex gap-8">
                <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 rounded bg-primary" />
                   <span className="text-xs font-bold uppercase tracking-widest text-white/60">Operational Status (Active)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} className="w-4 h-4 rounded bg-primary" />
                   <span className="text-xs font-bold uppercase tracking-widest text-white/60">Featured Broadcast</span>
                </label>
             </div>

             <button type="submit" className="w-full py-5 bg-primary text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/10">
                {initialCampaign ? 'Update Strategic parameters' : 'Confirm Campaign Initiation'}
             </button>
          </form>
       </motion.div>
    </div>
  );
};

/* --- ECONOMY STATS VIEW --- */
const EconomyStatsView: React.FC<{ stats: any }> = ({ stats }) => {
   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
         <header>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Economy Intelligence</h1>
            <p className="text-text-secondary text-sm">Aggregate metrics of system-wide point distribution and conversion.</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="system-card">
               <p className="data-label mb-4 text-primary">Circulating Supply</p>
               <p className="text-4xl font-mono font-bold">{stats.ecosystemPoints.toLocaleString()} <span className="text-sm">PTS</span></p>
               <p className="text-[10px] text-text-secondary mt-4 uppercase tracking-widest font-bold">Total Liability across {stats.totalUsers} Operators</p>
            </div>
            <div className="system-card">
               <p className="data-label mb-4 text-success">USD Equivalent</p>
               <p className="text-4xl font-mono font-bold">$ {(stats.ecosystemPoints / 1000).toLocaleString()}</p>
               <p className="text-[10px] text-text-secondary mt-4 uppercase tracking-widest font-bold">Based on 1000:1 Conversion Ratio</p>
            </div>
            <div className="system-card">
               <p className="data-label mb-4 text-accent">Active Missions</p>
               <p className="text-4xl font-mono font-bold">{stats.activeTasks}</p>
               <p className="text-[10px] text-text-secondary mt-4 uppercase tracking-widest font-bold">Currently deployed reward vectors</p>
            </div>
         </div>

         <section className="system-card border-white/10">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-8">Supply Distribution</h2>
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex">
               <div className="h-full bg-primary" style={{ width: '65%' }} />
               <div className="h-full bg-accent" style={{ width: '25%' }} />
               <div className="h-full bg-white/20" style={{ width: '10%' }} />
            </div>
            <div className="grid grid-cols-3 mt-6">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Active Operators (65%)</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Reserve Liquidity (25%)</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Pending Settlement (10%)</span>
               </div>
            </div>
         </section>
      </motion.div>
   );
};

/* --- ADMIN NOTIFICATIONS VIEW --- */
const AdminNotificationsView: React.FC = () => {
   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header className="flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-bold tracking-tight mb-2">System Broadcasts</h1>
               <p className="text-text-secondary text-sm">Deploy platform-wide notifications and urgent alerts.</p>
            </div>
            <button className="btn-system-primary px-8">Create Broadcast</button>
         </header>

         <div className="system-card border-white/5 bg-black/20 py-24 text-center">
            <Bell className="mx-auto text-white/5 mb-6" size={48} />
            <p className="text-text-secondary text-sm">No active system broadcasts</p>
         </div>
      </motion.div>
   );
};

/* --- SYSTEM SETTINGS VIEW --- */
const SystemSettingsView: React.FC = () => {
   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Control</h1>
            <p className="text-text-secondary text-sm">Global system parameters and maintenance protocols.</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="system-card">
               <h2 className="text-sm font-bold uppercase tracking-widest mb-6">Economy Base</h2>
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <span className="text-xs text-text-secondary uppercase font-bold">Base Conversion</span>
                     <span className="font-mono text-white text-sm">1000 PT : $1.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-xs text-text-secondary uppercase font-bold">Withdrawal Floor</span>
                     <span className="font-mono text-white text-sm">10,000 PTS</span>
                  </div>
               </div>
            </div>

            <div className="system-card">
               <h2 className="text-sm font-bold uppercase tracking-widest mb-6">Service Status</h2>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                     <span className="text-xs font-bold uppercase">Maintenance Mode</span>
                     <div className="w-10 h-5 bg-white/10 rounded-full relative">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white/20 rounded-full" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </motion.div>
   );
};
