import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserSystemTask, SystemTaskDefinition } from '../../types';
import {
  Trophy,
  Zap,
  Star,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { SystemTaskEngine } from '../../engines/tasks/SystemTaskEngine';

const Missions: React.FC = () => {
  const { currentUser } = useAuth();
  const [userMissions, setUserMissions] = useState<UserSystemTask[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, SystemTaskDefinition>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // 1. Fetch all mission definitions first
    const defQ = query(collection(db, 'system_task_definitions'), where('active', '==', true));
    const unsubscribeDefs = onSnapshot(defQ, (snap) => {
      const defs: Record<string, SystemTaskDefinition> = {};
      snap.docs.forEach(d => defs[d.id] = { id: d.id, ...d.data() } as SystemTaskDefinition);
      setDefinitions(defs);
    });

    // 2. Fetch user's personal mission progress
    const userQ = query(collection(db, 'user_system_tasks'), where('userId', '==', currentUser.uid));
    const unsubscribeUser = onSnapshot(userQ, (snap) => {
      setUserMissions(snap.docs.map(d => d.data() as UserSystemTask));
      setLoading(false);
    });

    return () => {
      unsubscribeDefs();
      unsubscribeUser();
    };
  }, [currentUser]);

  const handleClaim = async (taskId: string) => {
    if (!currentUser) return;
    setClaimingId(taskId);
    try {
      const result = await SystemTaskEngine.claimReward(currentUser.uid, taskId);
      if (result.success) {
        toast.success('Reward Claimed Successfully!', { icon: '🎁' });
      } else {
        toast.error(result.error || 'Claim failed');
      }
    } catch (err) {
      toast.error('Reward processing error');
    } finally {
      setClaimingId(null);
    }
  };

  const activeMissions = userMissions.filter(m => m.status !== 'CLAIMED');
  const completedMissions = userMissions.filter(m => m.status === 'CLAIMED');

  const filteredMissions = activeTab === 'ACTIVE'
    ? activeMissions.sort((a, b) => (b.status === 'COMPLETED' ? 1 : 0) - (a.status === 'COMPLETED' ? 1 : 0))
    : completedMissions.sort((a, b) => (b.claimedAt?.toMillis() || 0) - (a.claimedAt?.toMillis() || 0));

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.3em]">Operational Readiness</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white leading-none">
                   Platform <span className="text-primary">Missions</span>
                </h1>
                <p className="text-lg text-text-secondary font-medium max-w-xl">
                   Continuous platform objectives designed to accelerate your PulseEarn progression.
                </p>
             </div>

             <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {['ACTIVE', 'COMPLETED'].map(tab => (
                   <button
                     key={tab}
                     onClick={() => setActiveTab(tab as any)}
                     className={cn(
                        "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                        activeTab === tab ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                     )}
                   >
                      {tab}
                   </button>
                ))}
             </div>
          </div>
        </header>

        {loading ? (
           <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/[0.02] border border-white/5 rounded-[2.5rem] animate-pulse" />)}
           </div>
        ) : (
           <div className="grid grid-cols-1 gap-4">
              {filteredMissions.map((mission) => {
                 const def = definitions[mission.systemTaskId];
                 if (!def) return null;

                 const isCompleted = mission.status === 'COMPLETED' || mission.status === 'CLAIMED';
                 const progressPercent = Math.min((mission.progress / mission.target) * 100, 100);

                 return (
                    <div
                      key={mission.id}
                      className={cn(
                        "group relative overflow-hidden rounded-[2.5rem] border transition-all p-8 md:p-10",
                        isCompleted && activeTab === 'ACTIVE'
                          ? "bg-primary/[0.03] border-primary/20 shadow-premium"
                          : "bg-white/[0.02] border-white/5"
                      )}
                    >
                       <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                          <div className="flex items-start gap-6 max-w-2xl">
                             <div className={cn(
                               "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                               isCompleted ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 text-text-tertiary border-white/5"
                             )}>
                                {mission.category === 'WELCOME' && <Star size={28} />}
                                {mission.category === 'REFERRAL' && <Award size={28} />}
                                {mission.category === 'PREDICTION' && <TrendingUp size={28} />}
                                {mission.category === 'CAMPAIGN' && <ShieldCheck size={28} />}
                                {mission.category === 'LEVEL' && <Trophy size={28} />}
                             </div>

                             <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{def.category}</span>
                                   <div className="h-1 w-1 rounded-full bg-white/10" />
                                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{mission.target} Goal</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight leading-none uppercase">{def.title}</h3>
                                <p className="text-sm text-text-secondary font-medium leading-relaxed italic">{def.description}</p>
                             </div>
                          </div>

                          <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between gap-6 shrink-0">
                             <div className="text-left md:text-right">
                                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Authorization Reward</p>
                                <div className="flex items-center gap-2 md:justify-end">
                                   <Zap size={14} className="text-primary" />
                                   <span className="text-lg font-mono font-bold text-white">{def.rewardPoints.toLocaleString()} <span className="text-xs uppercase text-text-tertiary">pts</span></span>
                                </div>
                             </div>

                             {mission.status === 'COMPLETED' ? (
                                <Button
                                  className="rounded-xl px-10 h-12 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-widest text-[10px]"
                                  onClick={() => handleClaim(mission.systemTaskId)}
                                  isLoading={claimingId === mission.systemTaskId}
                                >
                                   Claim Reward
                                </Button>
                             ) : mission.status === 'CLAIMED' ? (
                                <div className="flex items-center gap-2 text-success px-4 py-2 bg-success/5 border border-success/10 rounded-xl">
                                   <CheckCircle2 size={16} />
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-4">
                                   <div className="text-right hidden md:block">
                                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Status</p>
                                      <p className="text-[10px] font-bold text-white uppercase">{mission.progress} / {mission.target}</p>
                                   </div>
                                   <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        className="h-full bg-primary"
                                      />
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 );
              })}

              {filteredMissions.length === 0 && (
                 <div className="py-32 text-center border border-dashed border-white/5 rounded-[3.5rem] bg-white/[0.01]">
                    <Clock size={48} className="mx-auto text-text-tertiary mb-6 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-tertiary">Zero missions found in this cycle</p>
                 </div>
              )}
           </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Missions;
