import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  Shield,
  Zap,
  Network,
  Briefcase,
  Database,
  XCircle,
  Search
} from 'lucide-react';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Task, TaskClaim, SubmissionStatus, VerificationType } from '../../types';
import { TaskEngine } from '../../engines/tasks/TaskEngine';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';

const TaskOrchestrator: React.FC = () => {
  const { currentUser: user } = useAuth();
  const [activeTab, setActiveTab] = useState<'SUBMISSIONS' | 'MANAGEMENT' | 'PARTNERS'>('SUBMISSIONS');
  const [claims, setClaims] = useState<TaskClaim[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus>('PENDING');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<TaskClaim | null>(null);
  const [adminFeedback, setAdminFeedback] = useState('');

  // Form State for New Task
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    rewardAmount: 100,
    xpReward: 10,
    category: 'SOCIAL',
    platform: 'TWITTER',
    verificationType: 'proof',
    status: 'ACTIVE',
    minLevel: 1,
    cooldownPeriod: 0
  });

  useEffect(() => {
    const claimsQuery = query(
      collection(db, 'task_claims'),
      where('validationState', '==', filter),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const tasksQuery = query(
      collection(db, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    const unsubClaims = onSnapshot(claimsQuery, (snap) => {
      setClaims(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskClaim)));
      setLoading(false);
    });

    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const unsubProviders = onSnapshot(collection(db, 'task_providers'), (snap) => {
      setProviders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubClaims();
      unsubTasks();
      unsubProviders();
    };
  }, [filter]);

  const handleResolve = async (status: SubmissionStatus) => {
    if (!selectedClaim || !user) return;

    const result = await TaskEngine.resolveClaim(
      selectedClaim.id,
      status,
      user.uid,
      adminFeedback
    );

    if (result.success) {
      setSelectedClaim(null);
      setAdminFeedback('');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const taskData = {
        ...newTask,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalClaims: 0,
        visibility: 'PUBLIC'
      };

      await addDoc(collection(db, 'tasks'), taskData);
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-24 animate-in">

      {/* Orchestration Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.05] pb-10">
         <div className="space-y-2">
            <div className="flex items-center gap-3">
               <Network size={20} className="text-primary" />
               <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 pr-10 border-r border-white/10">Mission Infrastructure</h2>
               <div className="flex items-center gap-2 pl-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Active Orchestration</span>
               </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Campaign Orchestrator</h1>
            <p className="text-sm text-white/40 font-medium">Authoritative mission lifecycle management and provider oversight.</p>
         </div>

         <div className="flex bg-white/[0.03] border border-white/[0.08] p-1.5 rounded-2xl">
            {(['SUBMISSIONS', 'MANAGEMENT', 'PARTNERS'] as const).map(tab => (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                     "px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                     activeTab === tab ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-white/30 hover:text-white/60"
                  )}
               >
                  {tab}
               </button>
            ))}
         </div>
      </section>

      {activeTab === 'SUBMISSIONS' && (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* Submissions Queue (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     {(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'] as const).map(s => (
                        <button
                           key={s}
                           onClick={() => setFilter(s)}
                           className={cn(
                              "px-4 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all",
                              filter === s ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/30 hover:border-white/10"
                           )}
                        >
                           {s}
                        </button>
                     ))}
                  </div>
                  <span className="text-[10px] font-mono text-white/20 uppercase">{claims.length} Records in buffer</span>
               </div>

               <div className="glass-panel rounded-[2rem] overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01]">
                           <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-white/20">Subject Entity</th>
                           <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-white/20">Mission Reference</th>
                           <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-white/20 text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {loading ? (
                           [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={3} className="h-20" /></tr>)
                        ) : claims.length === 0 ? (
                           <tr>
                              <td colSpan={3} className="py-24 text-center">
                                 <AlertCircle size={40} className="mx-auto mb-4 opacity-5" />
                                 <p className="text-sm font-bold opacity-10 uppercase tracking-widest">Queue Purged</p>
                              </td>
                           </tr>
                        ) : (
                           claims.map(claim => (
                              <tr
                                key={claim.id}
                                onClick={() => setSelectedClaim(claim)}
                                className={cn(
                                   "group hover:bg-white/[0.02] transition-colors cursor-pointer",
                                   selectedClaim?.id === claim.id && "bg-primary/[0.03]"
                                )}
                              >
                                 <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 group-hover:scale-110 transition-transform">
                                          <User size={18} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-bold text-white/80">Agent: {claim.userId.substring(0, 10)}</p>
                                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter mt-0.5">Submitted {claim.createdAt instanceof Timestamp ? claim.createdAt.toDate().toLocaleString() : 'Recent'}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <p className="text-xs font-mono text-white/40">{claim.taskId}</p>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                       <span className={cn(
                                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.1em] border",
                                          claim.validationState === 'PENDING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                          claim.validationState === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                          "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                       )}>
                                          {claim.validationState}
                                       </span>
                                       <ChevronRight size={14} className="text-white/10 group-hover:text-primary transition-colors" />
                                    </div>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Claim Inspector (4 cols) */}
            <div className="lg:col-span-4">
               <AnimatePresence mode="wait">
                  {selectedClaim ? (
                     <motion.div
                        key={selectedClaim.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="glass-panel p-8 rounded-[2rem] border-white/10 space-y-8 sticky top-32 shadow-2xl"
                     >
                        <div className="flex items-center justify-between border-b border-white/5 pb-6">
                           <div className="space-y-1">
                              <h3 className="text-xl font-bold tracking-tight">Claim Inspector</h3>
                              <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">ID: {selectedClaim.id}</p>
                           </div>
                           <button onClick={() => setSelectedClaim(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                              <XCircle size={20} className="text-white/20" />
                           </button>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-3">
                              <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest flex items-center gap-2">
                                 <Briefcase size={12} /> Evidence Provided
                              </span>
                              <div className="p-5 rounded-2xl bg-black/60 border border-white/5">
                                 {selectedClaim.submittedProof ? (
                                    selectedClaim.submittedProof.startsWith('http') ? (
                                       <a href={selectedClaim.submittedProof} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-primary hover:underline text-xs font-bold">
                                          <ExternalLink size={16} /> View Authorization Proof
                                       </a>
                                    ) : <p className="text-xs font-mono text-white/60 leading-relaxed break-all">{selectedClaim.submittedProof}</p>
                                 ) : <p className="text-xs italic text-white/20">No evidence submitted.</p>}
                              </div>
                           </div>

                           <div className="space-y-3">
                              <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest flex items-center gap-2">
                                 <Shield size={12} /> Security Analysis
                              </span>
                              <div className="space-y-2">
                                 {selectedClaim.fraudFlags && selectedClaim.fraudFlags.length > 0 ? (
                                    selectedClaim.fraudFlags.map((flag, idx) => (
                                       <div key={idx} className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500">
                                          <AlertCircle size={14} />
                                          <span className="text-[10px] font-bold uppercase tracking-widest">{flag}</span>
                                       </div>
                                    ))
                                 ) : (
                                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                                       <Shield size={14} />
                                       <span className="text-[10px] font-bold uppercase tracking-widest">No anomalies identified</span>
                                    </div>
                                 )}
                              </div>
                           </div>

                           <div className="space-y-3">
                              <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Resolution Notes</span>
                              <textarea
                                 value={adminFeedback}
                                 onChange={(e) => setAdminFeedback(e.target.value)}
                                 placeholder="Enter authoritative justification..."
                                 className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-medium focus:border-primary outline-none min-h-[100px] resize-none leading-relaxed"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                           <button
                             onClick={() => handleResolve('APPROVED')}
                             className="py-4 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                           >
                              <CheckCircle2 size={14} />
                              Approve
                           </button>
                           <button
                             onClick={() => handleResolve('REJECTED')}
                             className="py-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                           >
                              <XCircle size={14} />
                              Reject
                           </button>
                        </div>
                     </motion.div>
                  ) : (
                     <div className="p-16 text-center glass-panel rounded-[2rem] border-dashed border-white/10">
                        <Search size={32} className="mx-auto mb-4 opacity-5" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">Select an entity for inspection</p>
                     </div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      )}

      {activeTab === 'MANAGEMENT' && (
         <div className="space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Briefcase size={20} className="text-primary" />
                  <h3 className="text-xl font-bold tracking-tight">Active Deployments</h3>
               </div>
               <button
                 onClick={() => setShowCreateModal(true)}
                 className="btn-primary flex items-center gap-2 px-8"
               >
                  <Plus size={14} />
                  Deploy Mission
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
               {tasks.map(task => (
                  <div key={task.id} className="glass-panel p-8 rounded-[2.5rem] border-white/10 flex flex-col justify-between hover:border-primary/20 transition-all group">
                     <div className="space-y-5">
                        <div className="flex items-start justify-between">
                           <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Zap size={24} fill="currentColor" className="opacity-30" />
                           </div>
                           <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/30 tracking-widest">{task.category}</span>
                        </div>
                        <div>
                           <h4 className="text-lg font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">{task.title}</h4>
                           <p className="text-xs text-white/40 line-clamp-2 leading-relaxed font-medium">{task.description}</p>
                        </div>
                     </div>
                     <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                        <div>
                           <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Yield</p>
                           <p className="text-sm font-bold text-emerald-400 font-mono">+{task.rewardAmount} PTS</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Saturation</p>
                           <p className="text-sm font-bold text-white/60 font-mono">{task.totalClaims} / {task.maxClaims || '∞'}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {activeTab === 'PARTNERS' && (
         <div className="space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Database size={20} className="text-primary" />
                  <h3 className="text-xl font-bold tracking-tight">Partner Gateway</h3>
               </div>
               <button
                 className="btn-secondary flex items-center gap-2"
                 onClick={async () => {
                   const name = prompt("Enter Provider Authority Name:");
                   if (name) {
                     await addDoc(collection(db, 'task_providers'), {
                        name,
                        providerStatus: 'ACTIVE',
                        totalPaid: 0,
                        campaignBudget: 1000000,
                        createdAt: serverTimestamp()
                     });
                   }
                 }}
               >
                  <Plus size={14} />
                  Authorize Provider
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
               {providers.map(p => (
                  <div key={p.id} className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6 hover:border-emerald-500/20 transition-all">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                              <Shield size={24} />
                           </div>
                           <div>
                              <h4 className="font-bold text-white/80">{p.name}</h4>
                              <p className="text-[9px] font-mono text-white/20 uppercase">Auth: {p.id.substring(0, 10)}</p>
                           </div>
                        </div>
                        <div className={cn(
                           "w-2 h-2 rounded-full",
                           p.providerStatus === 'ACTIVE' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500"
                        )} />
                     </div>

                     <div className="space-y-3 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Ecosystem Yield</span>
                           <span className="text-xs font-bold font-mono text-emerald-400">{p.totalPaid.toLocaleString()} PTS</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Budget Authority</span>
                           <span className="text-xs font-bold font-mono text-white/40 pr-1">{p.campaignBudget.toLocaleString()} PTS</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* Mission Generator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onSubmit={handleCreateTask}
            className="w-full max-w-2xl bg-[#08080a] border border-white/10 rounded-[3rem] p-12 space-y-10 shadow-2xl"
          >
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <h3 className="text-2xl font-bold tracking-tight">Mission Generator</h3>
                   <p className="text-xs text-white/30">Deploy an authoritative earning objective to the global marketplace.</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors">
                  <XCircle size={24} className="rotate-45" />
                </button>
             </div>

             <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Objective Title</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="e.g. Community Identity Verification"
                    className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Reward Yield (PTS)</label>
                    <input
                      type="number"
                      required
                      value={newTask.rewardAmount}
                      onChange={(e) => setNewTask({...newTask, rewardAmount: Number(e.target.value)})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono font-bold focus:border-primary outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Clearance Gains (XP)</label>
                    <input
                      type="number"
                      required
                      value={newTask.xpReward}
                      onChange={(e) => setNewTask({...newTask, xpReward: Number(e.target.value)})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono font-bold focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Category</label>
                    <select
                        value={newTask.category}
                        onChange={(e) => setNewTask({...newTask, category: e.target.value as TaskCategory})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white appearance-none focus:border-primary outline-none"
                    >
                        <option value="SOCIAL">SOCIAL</option>
                        <option value="ENGAGEMENT">ENGAGEMENT</option>
                        <option value="REFERRAL">REFERRAL</option>
                        <option value="PREDICTION">PREDICTION</option>
                        <option value="EDUCATION">EDUCATION</option>
                        <option value="STREAK">STREAK</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Verification Strategy</label>
                    <select
                      value={newTask.verificationType}
                      onChange={(e) => setNewTask({...newTask, verificationType: e.target.value as VerificationType})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white appearance-none focus:border-primary outline-none"
                    >
                      <option value="proof">MANUAL: Proof Audit</option>
                      <option value="automated">AUTOMATED: Instant</option>
                      <option value="timer">TEMPORAL: Delay-based</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Provider Authority</label>
                    <select
                      required
                      value={newTask.providerId}
                      onChange={(e) => {
                        const prov = providers.find(p => p.id === e.target.value);
                        setNewTask({...newTask, providerId: e.target.value, providerName: prov?.name || 'Unknown'});
                      }}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white appearance-none focus:border-primary outline-none"
                    >
                      <option value="">Select Authority</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
             </div>

             <button
               type="submit"
               className="w-full py-5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all"
             >
               <Zap size={18} fill="currentColor" />
               Authorize Deployment
             </button>
          </motion.form>
        </div>
      )}
    </div>
  );
};

export default TaskOrchestrator;
