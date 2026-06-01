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
  Lock,
  Activity,
  BarChart3,
  Globe,
  Search,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Zap
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
  doc,
  setDoc,
  getCountFromServer,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { TaskCategory, VerificationType, SocialPlatform, TaskType, Task, SubmissionStatus } from '../../types';
import toast from 'react-hot-toast';

type AdminTab = 'OVERVIEW' | 'CAMPAIGNS' | 'CLAIMS' | 'ANALYTICS' | 'PROVIDERS' | 'USERS' | 'MODERATION';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingClaims: 0,
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const usersCount = await getCountFromServer(collection(db, 'users'));
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('status', '==', 'ACTIVE')));
        const claimsSnap = await getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING')));

        setStats({
          totalUsers: usersCount.data().count,
          activeTasks: tasksSnap.size,
          pendingClaims: claimsSnap.data().count
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
                      <p className="data-label mb-4">System Status</p>
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold text-success uppercase tracking-widest">Nominal</span>
                         <Activity className="text-success animate-pulse" size={20} />
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

            {activeTab === 'CAMPAIGNS' && <CampaignsView onNewTask={() => setIsTaskModalOpen(true)} onEditTask={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }} />}
            {activeTab === 'CLAIMS' && <ClaimsView />}

            {/* Locked Placeholders for complex operational logic */}
            {(['ANALYTICS', 'PROVIDERS', 'USERS', 'MODERATION'].includes(activeTab)) && (
               <div className="py-40 text-center">
                  <Lock size={48} className="mx-auto text-white/5 mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
                  <p className="text-text-secondary max-w-md mx-auto text-sm">
                     This module is currently undergoing security hardening.
                     Check administrative bulletins for deployment status.
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
      </div>
    </AdminLayout>
  );
};

/* --- CAMPAIGNS VIEW --- */
const CampaignsView: React.FC<{ onNewTask: () => void; onEditTask: (t: Task) => void }> = ({ onNewTask, onEditTask }) => {
   const [tasks, setTasks] = useState<Task[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
         setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
         setLoading(false);
      });
      return unsub;
   }, []);

   return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
         <header className="flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-bold tracking-tight mb-2">Campaign Registry</h1>
               <p className="text-text-secondary text-sm">Design, deploy, and monitor mission reward vectors.</p>
            </div>
            <button onClick={onNewTask} className="btn-system-primary flex items-center gap-2 px-8">
               <Plus size={18} />
               Deploy New Mission
            </button>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tasks.map(task => (
               <div key={task.id} className="system-card group hover:border-primary/40 transition-all cursor-pointer" onClick={() => onEditTask(task)}>
                  <div className="flex justify-between items-start mb-6">
                     <span className={cn(
                        "badge-system",
                        task.status === 'ACTIVE' ? "text-success border-success/20" : "text-text-secondary border-white/5"
                     )}>
                        {task.status}
                     </span>
                     <div className="text-right">
                        <p className="text-lg font-mono font-bold">+{task.rewardAmount}</p>
                        <p className="text-[10px] font-bold text-text-secondary uppercase">PTS</p>
                     </div>
                  </div>
                  <h3 className="text-sm font-bold mb-2">{task.title}</h3>
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
    category: 'SOCIAL',
    type: 'once',
    platform: 'NONE',
    rewardAmount: 0,
    xpReward: 0,
    bonusReward: 0,
    referralBonus: 0,
    verificationType: 'automated',
    status: 'DRAFT',
    visibility: 'PUBLIC',
    cooldownPeriod: 0,
    minLevel: 1,
    maxClaims: 0,
    dailyLimit: 0,
    perUserLimit: 1,
    regionRestrictions: [],
    tags: [],
    fraudProtection: {
       duplicatePrevention: true,
       abuseDetection: true,
       multiAccountDetection: true
    }
  });

  useEffect(() => {
     if (initialTask) {
        setFormData(initialTask);
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
           verificationType: 'automated',
           status: 'DRAFT',
           visibility: 'PUBLIC',
           cooldownPeriod: 0,
           minLevel: 1,
           perUserLimit: 1,
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
        updatedAt: serverTimestamp(),
        createdAt: initialTask?.createdAt || serverTimestamp(),
        totalClaims: initialTask?.totalClaims || 0,
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
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Min Level</label>
                      <input type="number" value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Cooldown (Hrs)</label>
                      <input type="number" value={formData.cooldownPeriod} onChange={e => setFormData({...formData, cooldownPeriod: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
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

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2"><ImageIcon size={12} /> Banner Image (URL)</label>
                   <input value={formData.campaignArtwork || ''} onChange={e => setFormData({...formData, campaignArtwork: e.target.value})} placeholder="https://..." className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2"><ExternalLink size={12} /> Action Target (URL)</label>
                   <input value={formData.actionUrl || ''} onChange={e => setFormData({...formData, actionUrl: e.target.value})} placeholder="https://..." className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
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
