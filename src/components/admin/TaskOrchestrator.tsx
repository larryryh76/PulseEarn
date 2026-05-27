import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileText,
  User,
  Shield,
  Zap
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

const TaskOrchestrator: React.FC = () => {
  const { currentUser: user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'SUBMISSIONS' | 'PROVIDERS'>('SUBMISSIONS');
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
        providerId: 'SYSTEM', // Default for now
        providerName: 'PulseEarn Internal',
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Campaign Infrastructure</h2>
          <h1 className="text-3xl font-bold">Task Orchestrator</h1>
        </div>

        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-1.5 rounded-2xl">
          {(['SUBMISSIONS', 'MANAGEMENT', 'PROVIDERS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'SUBMISSIONS' && (
        <div className="space-y-6">
          {/* Submissions Filter */}
          <div className="flex items-center justify-between">
             <div className="flex gap-2">
                {(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-4 py-2 text-[10px] font-bold rounded-lg border transition-all ${
                      filter === s
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-transparent border-white/5 text-white/40 hover:border-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
             </div>
             <div className="text-[10px] font-mono text-white/20">
               {claims.length} RECORDS IN BUFFER
             </div>
          </div>

          {/* Submissions Grid */}
          <div className="grid grid-cols-1 gap-3">
            {loading ? (
               <div className="p-20 text-center animate-pulse">
                 <Zap className="mx-auto mb-4 text-primary opacity-20" size={32} />
                 <p className="text-xs text-white/20 uppercase tracking-widest">Syncing with blockchain claims...</p>
               </div>
            ) : claims.length === 0 ? (
              <div className="p-20 text-center glass-card border-white/[0.05] rounded-[2.5rem]">
                 <AlertCircle className="mx-auto mb-6 opacity-10" size={48} />
                 <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/20">Queue Cleared</p>
              </div>
            ) : (
              claims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`group flex items-center justify-between p-4 glass-card border-white/[0.05] rounded-2xl hover:border-white/10 transition-all cursor-pointer ${selectedClaim?.id === claim.id ? 'ring-2 ring-primary/50' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                      <User size={18} className="text-white/40" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white/90">User: {claim.userId.substring(0, 8)}</span>
                        <span className="text-[10px] font-mono text-white/20">#{claim.id.split('_')[1]}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        Submitted {claim.createdAt instanceof Timestamp ? claim.createdAt.toDate().toLocaleString() : 'Recent'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                     <div className="hidden md:block text-right">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Task Ref</span>
                        <p className="text-xs font-mono text-white/40">{claim.taskId.substring(0, 12)}...</p>
                     </div>
                     <div className="w-px h-8 bg-white/5" />
                     <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        claim.validationState === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        claim.validationState === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-500'
                     }`}>
                        {claim.validationState}
                     </div>
                     <ChevronRight size={16} className="text-white/10 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'PROVIDERS' && (
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Partner Network</h3>
              <button
                className="px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                onClick={async () => {
                   const name = prompt("Provider Name:");
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
                Onboard Provider
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((p) => (
                <div key={p.id} className="glass-card border-white/[0.05] rounded-[2rem] p-6">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                            <Shield size={18} className="text-white/40" />
                         </div>
                         <h4 className="font-bold">{p.name}</h4>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${p.providerStatus === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                   </div>

                   <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex justify-between">
                         <span className="text-[10px] text-white/20 uppercase font-bold">Total Payouts</span>
                         <span className="text-xs font-mono text-emerald-400">{p.totalPaid} PTS</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-[10px] text-white/20 uppercase font-bold">Budget Authority</span>
                         <span className="text-xs font-mono text-white/60">{p.campaignBudget} PTS</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'MANAGEMENT' && (
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Active Missions</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                <Plus size={14} />
                Generate Mission
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <div key={task.id} className="glass-card border-white/[0.05] rounded-[2rem] p-6 hover:border-white/10 transition-all group">
                   <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Zap size={24} fill="currentColor" className="opacity-50" />
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-white/40 uppercase">
                        {task.category}
                      </div>
                   </div>
                   <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{task.title}</h4>
                   <p className="text-xs text-white/40 mb-6 line-clamp-2">{task.description}</p>

                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div>
                         <span className="text-[9px] font-bold uppercase text-white/20 tracking-tighter">Reward</span>
                         <p className="text-sm font-bold text-emerald-400">+{task.rewardAmount} PTS</p>
                      </div>
                      <div>
                         <span className="text-[9px] font-bold uppercase text-white/20 tracking-tighter">Claims</span>
                         <p className="text-sm font-bold text-white/80">{task.totalClaims} / {task.maxClaims || '∞'}</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Claim Detail Modal / Slide-over */}
      {selectedClaim && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 space-y-6 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-bold">Submission Intelligence</h3>
                   <p className="text-xs text-white/40 mt-1">Reviewing Request ID: {selectedClaim.id}</p>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                       <span className="text-[9px] font-bold text-white/20 uppercase">Proof Document</span>
                       {selectedClaim.submittedProof ? (
                         <div className="mt-2 p-4 bg-black/40 rounded-xl border border-white/5 text-xs text-white/60 font-mono break-all">
                           {selectedClaim.submittedProof.startsWith('http') ? (
                              <a href={selectedClaim.submittedProof} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                <FileText size={14} />
                                View External Proof <ExternalLink size={12} />
                              </a>
                           ) : selectedClaim.submittedProof}
                         </div>
                       ) : (
                         <p className="mt-2 text-xs text-white/20 italic">No proof provided.</p>
                       )}
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                       <span className="text-[9px] font-bold text-white/20 uppercase">Security Risk Scan</span>
                       <div className="mt-2 space-y-2">
                          {selectedClaim.fraudFlags && selectedClaim.fraudFlags.length > 0 ? (
                            selectedClaim.fraudFlags.map((flag, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-rose-400 bg-rose-400/10 p-2 rounded-lg border border-rose-400/20">
                                 <AlertCircle size={14} />
                                 {flag}
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">
                               <Shield size={14} />
                               Clear: No security flags
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                       <span className="text-[9px] font-bold text-white/20 uppercase">Resolution Notes</span>
                       <textarea
                          value={adminFeedback}
                          onChange={(e) => setAdminFeedback(e.target.value)}
                          placeholder="Provide reasoning for user..."
                          className="w-full h-24 mt-2 bg-transparent border-none text-xs text-white/80 focus:ring-0 resize-none p-0"
                       />
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/5">
                 <button
                   onClick={() => handleResolve('APPROVED')}
                   className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                 >
                   <CheckCircle2 size={18} />
                   Approve & Release
                 </button>
                 <button
                   onClick={() => handleResolve('REJECTED')}
                   className="flex-1 py-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold rounded-2xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                 >
                   <XCircle size={18} />
                   Reject Submission
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <form onSubmit={handleCreateTask} className="w-full max-w-lg bg-[#0c0c0c] border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl">
             <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight">Mission Generator</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-white/20 hover:text-white/60 transition-colors">
                  <XCircle size={24} />
                </button>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Mission Title</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="e.g. Join the Telegram Community"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Reward (PTS)</label>
                    <input
                      type="number"
                      required
                      value={newTask.rewardAmount}
                      onChange={(e) => setNewTask({...newTask, rewardAmount: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">XP Value</label>
                    <input
                      type="number"
                      required
                      value={newTask.xpReward}
                      onChange={(e) => setNewTask({...newTask, xpReward: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Verification Strategy</label>
                    <select
                      value={newTask.verificationType}
                      onChange={(e) => setNewTask({...newTask, verificationType: e.target.value as VerificationType})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white appearance-none focus:border-primary"
                    >
                      <option value="proof">MANUAL: Proof</option>
                      <option value="automated">AUTOMATED: Instant</option>
                      <option value="timer">TIME: Delay</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Provider ID</label>
                    <select
                      required
                      value={newTask.providerId}
                      onChange={(e) => {
                        const prov = providers.find(p => p.id === e.target.value);
                        setNewTask({...newTask, providerId: e.target.value, providerName: prov?.name || 'Unknown'});
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white appearance-none focus:border-primary"
                    >
                      <option value="">Select Provider</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
             </div>

             <button
               type="submit"
               className="w-full py-5 bg-primary text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-xs"
             >
               <Zap size={18} fill="currentColor" />
               Deploy Mission
             </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskOrchestrator;
