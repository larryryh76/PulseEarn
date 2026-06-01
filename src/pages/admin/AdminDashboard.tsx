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
  Activity
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
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { TaskCategory, VerificationType, SocialPlatform } from '../../types';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [activeView, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'USERS' | 'HEALTH'>('OVERVIEW');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('active', '==', true)));
        const usersSnap = await getCountFromServer(collection(db, 'users'));

        setStats({
          activeTasks: tasksSnap.size,
          totalUsers: usersSnap.data().count
        });
      } catch (err) {
        console.error("Admin aggregation error:", err);
      }
    };

    const logsQuery = query(collection(db, 'task_claims'), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribeLogs = onSnapshot(logsQuery, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    fetchStats();
    return () => unsubscribeLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="pt-16 pb-24 px-8 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-12 min-h-[calc(100-4rem)]">

        {/* Sidebar Operations Nav */}
        <aside className="lg:w-72 space-y-10 border-r border-white/5 pr-12 pt-12">
          <div className="space-y-1">
             <p className="data-label px-4 mb-6 text-primary">Core Modules</p>
             {[
               { id: 'OVERVIEW', label: 'System Status', icon: Terminal },
               { id: 'TASKS', label: 'Missions Core', icon: Layers },
               { id: 'USERS', label: 'Operator Registry', icon: Users },
               { id: 'HEALTH', label: 'Infrastructure', icon: ShieldCheck }
             ].map(item => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id as any)}
                 className={cn(
                   "w-full flex items-center justify-between px-4 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all",
                   activeView === item.id
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.1)]"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                 )}
               >
                 <div className="flex items-center gap-4">
                    <item.icon size={16} />
                    {item.label}
                 </div>
                 {activeView === item.id && <div className="w-1 h-1 rounded-full bg-primary" />}
               </button>
             ))}
          </div>

          <div className="space-y-6">
             <div className="px-4">
                <p className="data-label mb-4">Internal Telemetry</p>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-secondary uppercase">API Latency</span>
                      <span className="text-[10px] font-mono text-success">14ms</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-secondary uppercase">Firestore</span>
                      <span className="text-[10px] font-mono text-success">Healthy</span>
                   </div>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Console Area */}
        <main className="flex-1 pt-12">
          <AnimatePresence mode="wait">
            {activeView === 'OVERVIEW' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <header>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">System Console</h1>
                  <p className="text-text-secondary text-sm">Monitoring infrastructure health and global economy velocity.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Registered Operators', value: stats.totalUsers, icon: Users, color: 'text-primary' },
                    { label: 'Active Missions', value: stats.activeTasks, icon: Layers, color: 'text-success' },
                    { label: 'Node Status', value: 'NOMINAL', icon: ShieldCheck, color: 'text-success' },
                    { label: 'Uptime', value: '99.9%', icon: Activity, color: 'text-primary' }
                  ].map((stat) => (
                    <div key={stat.label} className="system-card bg-black/40">
                      <p className="data-label mb-6">{stat.label}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-mono font-bold text-white">{stat.value}</p>
                        <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                           <stat.icon size={18} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <section className="xl:col-span-2 system-card bg-black/20">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="flex items-center gap-3">
                        <Terminal size={18} className="text-primary" />
                        Operation Ledger
                      </h2>
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                         <span className="text-[10px] font-bold uppercase tracking-widest text-success">Live Syncing</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-4 data-label">Operator ID</th>
                            <th className="pb-4 data-label">Mission Path</th>
                            <th className="pb-4 data-label text-right">Yield</th>
                            <th className="pb-4 data-label text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 font-mono text-[10px] text-text-secondary">{log.userId?.slice(0, 16)}</td>
                              <td className="py-4">
                                 <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                                    {log.taskId?.replace(/_/g, ' ') || 'SYSTEM_SIGNAL'}
                                 </span>
                              </td>
                              <td className="py-4 text-right">
                                 <span className="text-sm font-mono font-bold text-success">+{log.rewardAmount || 0}</span>
                              </td>
                              <td className="py-4 text-right">
                                 <span className="text-[10px] font-mono text-text-secondary">
                                    {log.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                 </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-6">
                     <div className="system-card border-warning/20 bg-warning/[0.02]">
                        <h2 className="text-sm mb-4 flex items-center gap-2 text-warning font-bold uppercase tracking-widest">
                           <ShieldAlert size={16} />
                           Moderation Core
                        </h2>
                        <p className="text-xs mb-8 text-text-secondary leading-relaxed">No suspicious earning velocity detected in the current cycle. All claims are within variance.</p>
                        <button className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                           Review Thresholds
                        </button>
                     </div>

                     <div className="system-card bg-black/40">
                        <h2 className="text-sm mb-8 flex items-center gap-2 font-bold uppercase tracking-widest text-white/40">
                           <Cpu size={16} />
                           Engine Controls
                        </h2>
                        <div className="space-y-3">
                           {['Flush Session Cache', 'Recalculate Yields', 'Emergency Halt'].map(action => (
                             <button key={action} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all text-[10px] font-bold uppercase tracking-widest group">
                                {action}
                                <ArrowRight size={14} className="text-text-secondary group-hover:translate-x-1 transition-transform" />
                             </button>
                           ))}
                        </div>
                     </div>
                  </section>
                </div>
              </motion.div>
            )}

            {activeView === 'TASKS' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                 <header className="flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight mb-2">Mission Deployment</h1>
                      <p className="text-text-secondary text-sm">Strategic campaign configuration and yield management.</p>
                    </div>
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className="btn-system-primary px-8 py-4 flex items-center gap-3"
                    >
                       <Plus size={16} />
                       New Mission
                    </button>
                 </header>

                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="system-card flex flex-col items-center justify-center py-32 border-dashed bg-transparent">
                       <Layers size={40} className="text-white/5 mb-6" />
                       <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em]">Querying Active Records...</p>
                    </div>
                 </div>
              </motion.div>
            )}

            {(activeView === 'USERS' || activeView === 'HEALTH') && (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-40 text-center"
              >
                 <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-8">
                    <Lock size={32} className="text-white/10" />
                 </div>
                 <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
                 <p className="text-text-secondary max-w-md mx-auto mt-4 leading-relaxed">
                    This strategic sub-system requires elevated clearance.
                    Re-verify administrative credentials to bypass the security layer.
                 </p>
                 <button className="mt-8 px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                    Request Bypass
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Task Creation Modal */}
        <TaskDeploymentModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
      </div>
    </AdminLayout>
  );
};

const TaskDeploymentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SOCIAL' as TaskCategory,
    rewardAmount: 0,
    xpReward: 0,
    instructions: '',
    verificationType: 'automated' as VerificationType,
    providerId: 'SYSTEM',
    providerName: 'PulseEarn',
    platform: 'NONE' as SocialPlatform,
    actionUrl: '',
    cooldownPeriod: 0,
    minLevel: 1,
    maxClaims: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskRef = doc(collection(db, 'tasks'));
      await setDoc(taskRef, {
        ...formData,
        id: taskRef.id,
        active: true,
        status: 'ACTIVE',
        totalClaims: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        maxClaims: formData.maxClaims || null
      });
      toast.success('Mission deployed to terminal');
      onClose();
    } catch (err) {
      toast.error('Mission deployment failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
       <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-[2.5rem] p-10 shadow-2xl my-auto overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />

          <div className="flex justify-between items-center mb-10">
             <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">New Mission</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Strategic Asset Deployment</p>
             </div>
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="md:col-span-2 space-y-2">
                <label className="data-label text-white/40">Mission Designation</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Protocol Infiltration" className="w-full bg-white/[0.02] border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary/50 transition-all" />
             </div>
             <div className="md:col-span-2 space-y-2">
                <label className="data-label text-white/40">Operation Summary</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the mission objective..." className="w-full bg-white/[0.02] border-white/10 rounded-xl p-4 text-sm font-medium h-28 focus:border-primary/50 transition-all resize-none" />
             </div>
             <div className="space-y-2">
                <label className="data-label text-white/40">Sector</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full bg-white/[0.02] border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                   <option value="SOCIAL">SOCIAL</option>
                   <option value="ENGAGEMENT">ENGAGEMENT</option>
                   <option value="REFERRAL">REFERRAL</option>
                   <option value="PREDICTION">PREDICTION</option>
                   <option value="EDUCATION">EDUCATION</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="data-label text-white/40">Verification Layer</label>
                <select value={formData.verificationType} onChange={e => setFormData({...formData, verificationType: e.target.value as any})} className="w-full bg-white/[0.02] border-white/10 rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:border-primary/50 transition-all">
                   <option value="automated">AUTOMATED (LINK)</option>
                   <option value="proof">MANUAL (PROOF)</option>
                   <option value="timer">TIMER BASED</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="data-label text-white/40">Yield Magnitude (PTS)</label>
                <input type="number" required value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
             </div>
             <div className="space-y-2">
                <label className="data-label text-white/40">XP Magnitude</label>
                <input type="number" required value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value)})} className="w-full bg-white/[0.02] border-white/10 rounded-xl p-4 text-sm font-mono font-bold focus:border-primary/50 transition-all" />
             </div>
             <div className="md:col-span-2 pt-6">
                <button type="submit" className="w-full py-5 bg-primary text-white font-bold uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(0,102,255,0.2)]">
                   Initiate Strategic Deployment
                </button>
             </div>
          </form>
       </motion.div>
    </div>
  );
};

export default AdminDashboard;
