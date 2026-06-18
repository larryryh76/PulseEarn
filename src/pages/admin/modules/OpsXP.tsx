import * as React from 'react';
import {
  Trophy,
  Settings,
  RefreshCw,
  Zap,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Info,
  Database,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { db } from '../../../firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { calculateLevel } from '../../../utils/progression';

const OpsXP: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    xpPerLevel: 1000,
    predictionUnlockLevel: 5,
    minWithdrawalPoints: 10000
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system_config', 'global_v1');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            xpPerLevel: data.thresholds?.xpPerLevel || 1000,
            predictionUnlockLevel: data.thresholds?.predictionUnlockLevel || 5,
            minWithdrawalPoints: data.thresholds?.minWithdrawalPoints || 10000
          });
        }
      } catch (err) {
        toast.error("Failed to load progression config");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const docRef = doc(db, 'system_config', 'global_v1');
      await updateDoc(docRef, {
        'thresholds.xpPerLevel': formData.xpPerLevel,
        'thresholds.predictionUnlockLevel': formData.predictionUnlockLevel,
        'thresholds.minWithdrawalPoints': formData.minWithdrawalPoints,
        updatedAt: serverTimestamp()
      });
      toast.success("Economy configuration updated");
    } catch (err) {
      toast.error("Configuration sync failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScanAndSync = async () => {
     if (!window.confirm("CRITICAL OPERATION: Re-calculate all user levels and sync missing referral points? This affects the global user database.")) return;

     setIsSyncing(true);
     const syncToast = toast.loading("Initializing Global Integrity Scan...");

     try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const { PointTransactionEngine } = await import('../../../engines/points/PointTransactionEngine');

        let levelUpdates = 0;
        let referralRewards = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        const commitBatch = async () => {
           if (batchCount > 0) {
              await batch.commit();
              batch = writeBatch(db);
              batchCount = 0;
           }
        };

        for (let i = 0; i < usersSnap.docs.length; i++) {
           const userDoc = usersSnap.docs[i];
           const userData = userDoc.data();
           const userRef = userDoc.ref;

           toast.loading(`Processing User ${i + 1}/${usersSnap.docs.length}...`, { id: syncToast });

           // 1. Progression Sync
           const correctLevel = calculateLevel(userData.xp || 0, formData.xpPerLevel);
           if (correctLevel !== userData.level) {
              batch.update(userRef, {
                level: correctLevel,
                updatedAt: serverTimestamp()
              });
              batchCount++;
              levelUpdates++;
           }

           // 1.5 Stats Reconciliation (Referral Count Check)
           const actualReferralsQuery = query(collection(db, 'referrals'), where('referrerId', '==', userDoc.id), where('status', '==', 'REWARDED'));
           const actualReferralsSnap = await getDocs(actualReferralsQuery);
           const actualCount = actualReferralsSnap.size;

           if ((userData.stats?.referralsCount || 0) !== actualCount) {
              batch.update(userRef, {
                 'stats.referralsCount': actualCount
              });
              batchCount++;
           }

           // 1.7 Task Stats Reconciliation
           const historyQuery = query(collection(db, 'users', userDoc.id, 'task_history'), where('status', '==', 'COMPLETED'));
           const historySnap = await getDocs(historyQuery);
           const actualTasksCount = historySnap.size;

           if ((userData.stats?.tasksCompleted || 0) !== actualTasksCount) {
              batch.update(userRef, {
                 'stats.tasksCompleted': actualTasksCount
              });
              batchCount++;
           }

           // Commit if batch is getting large (limit is 500)
           if (batchCount >= 400) await commitBatch();

           // 2. Referral Bounty Sync (Referrer 50, Referee 30)
           // Note: Referral bounty sync uses PointTransactionEngine.execute which performs its own transactions.
           // We do not add these to the batch.
           if (userData.referredBy) {
              const referrerId = userData.referredBy;
              const refereeId = userDoc.id;

              const syncClaimReferrer = `ref_sync_rr_${referrerId}_${refereeId}`;
              const legacyClaimReferrer = `referral_${referrerId}_${refereeId}`;

              const [cSnapR, lcSnapR] = await Promise.all([
                 getDoc(doc(db, 'system_claims', syncClaimReferrer)),
                 getDoc(doc(db, 'system_claims', legacyClaimReferrer))
              ]);

              if (!cSnapR.exists() && !lcSnapR.exists()) {
                 const result = await PointTransactionEngine.execute({
                    userId: referrerId,
                    amount: 50,
                    type: 'referral_bonus',
                    source: `Legacy Referral (Referrer): ${userData.username}`,
                    claimId: syncClaimReferrer,
                    xpReward: 100
                 });
                 if (result.success) referralRewards++;
              }

              const syncClaimReferee = `ref_sync_re_${refereeId}`;
              const legacyClaimReferee = `welcome_${refereeId}`;

              const [cSnapE, lcSnapE] = await Promise.all([
                 getDoc(doc(db, 'system_claims', syncClaimReferee)),
                 getDoc(doc(db, 'system_claims', legacyClaimReferee))
              ]);

              if (!cSnapE.exists() && !lcSnapE.exists()) {
                 const result = await PointTransactionEngine.execute({
                    userId: refereeId,
                    amount: 30,
                    type: 'referral_bonus',
                    source: `Legacy Referral (Referee)`,
                    claimId: syncClaimReferee,
                    xpReward: 50
                 });
                 if (result.success) referralRewards++;
              }
           }
        }

        await commitBatch();
        toast.dismiss(syncToast);
        toast.success(`Integrity Scan Complete: ${levelUpdates} levels adjusted, ${referralRewards} rewards issued.`);
     } catch (err) {
        console.error(err);
        toast.dismiss(syncToast);
        toast.error("Integrity Scan Failure");
     } finally {
        setIsSyncing(false);
     }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
       <RefreshCw className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Trophy size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">XP Engine</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Configure user progression, level thresholds, and asset unlock parameters.</p>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
             <section className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl space-y-10">
                <div className="flex items-center gap-3">
                   <Settings size={18} className="text-primary" />
                   <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Core Thresholds</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 flex justify-between">
                         XP per Level
                         <span className="text-primary opacity-50 italic">Linear Scaling</span>
                      </label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.xpPerLevel}
                           onChange={e => setFormData({...formData, xpPerLevel: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <TrendingUp className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Market Unlock Level</label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.predictionUnlockLevel}
                           onChange={e => setFormData({...formData, predictionUnlockLevel: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <Zap className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Min Withdrawal PTS</label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.minWithdrawalPoints}
                           onChange={e => setFormData({...formData, minWithdrawalPoints: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <ShieldCheck className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>
                </div>

                <div className="pt-6">
                   <Button
                     onClick={handleUpdate}
                     isLoading={isUpdating}
                     className="w-full md:w-auto px-12 py-5 rounded-2xl shadow-xl font-black uppercase tracking-[0.2em] text-[10px] italic"
                   >
                      Synchronize Engine State
                   </Button>
                </div>
             </section>

             <section className="bg-danger/[0.02] border border-danger/10 rounded-[2.5rem] p-10 shadow-2xl space-y-10">
                <div className="flex items-center gap-3">
                   <ShieldAlert size={18} className="text-danger" />
                   <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-danger">Maintenance Hub</h2>
                </div>

                <div className="space-y-4">
                   <p className="text-xs text-text-tertiary font-medium leading-relaxed">
                      Initialize a global scan to reconcile user levels with the current x3 exponential curve and distribute missing referral bonuses.
                   </p>
                   <Button
                     onClick={handleScanAndSync}
                     disabled={isSyncing}
                     className="bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none"
                   >
                      {isSyncing ? (
                         <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Scanning Database...</div>
                      ) : (
                         <div className="flex items-center gap-2"><Database size={14} /> Scan & Sync Integrity</div>
                      )}
                   </Button>
                </div>
             </section>

             <section className="p-10 rounded-[2.5rem] bg-primary/[0.02] border border-primary/10 space-y-6 shadow-inner">
                <div className="flex items-center gap-3 text-primary">
                   <Info size={16} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Operational Briefing</h3>
                </div>
                <p className="text-xs text-text-tertiary leading-relaxed font-medium">
                   Modifying the <span className="text-primary font-bold italic">XP per Level</span> constant will immediately shift the leveling curve for all active users.
                   The <span className="text-primary font-bold italic">Market Unlock Level</span> restricts capital execution access to users who have reached the designated tier.
                </p>
             </section>
          </div>

          <div className="space-y-8">
             <div className="p-8 rounded-[2rem] bg-surface border border-border shadow-2xl space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Progression Matrix</h3>
                <div className="space-y-4">
                   {[1, 2, 3, 4, 5].map((lvl) => (
                      <div key={lvl} className="p-5 rounded-2xl bg-surface-bright/50 border border-border flex items-center justify-between group">
                         <div>
                            <p className="text-[9px] font-black text-text-tertiary uppercase mb-1">Level {lvl} Requirement</p>
                            <p className="text-sm font-mono font-bold text-text-primary">
                               {lvl === 1 ? '0' : (formData.xpPerLevel * Math.pow(3, lvl - 2)).toLocaleString()} XP
                            </p>
                         </div>
                         <ChevronRight size={14} className="opacity-20 group-hover:translate-x-1 group-hover:opacity-100 transition-all text-primary" />
                      </div>
                   ))}
                   <div className="pt-4 p-5 rounded-2xl bg-warning/5 border border-warning/20">
                      <p className="text-[8px] font-black text-warning uppercase tracking-widest mb-1">Architecture Note</p>
                      <p className="text-[10px] text-text-tertiary font-medium">The system now enforces an <span className="text-text-primary font-bold italic">Exponential x3 Curve</span>. Each level requires 3x more XP than the previous.</p>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default OpsXP;
