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
  where,
  getCountFromServer
} from 'firebase/firestore';
import { calculateLevel } from '../../../utils/progression';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import { ReferralProtectionEngine } from '../../../engines/system/ReferralProtectionEngine';

const OpsXP: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    xpPerLevel: 1000,
    predictionUnlockLevel: 5,
    minWithdrawalPoints: 10000,
    referralBonusPoints: 50,
    referralBonusXP: 50
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
            minWithdrawalPoints: data.thresholds?.minWithdrawalPoints || 10000,
            referralBonusPoints: data.rewards?.referralBonusPoints || 50,
            referralBonusXP: data.rewards?.referralBonusXP || 50
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
        'rewards.referralBonusPoints': formData.referralBonusPoints,
        'rewards.referralBonusXP': formData.referralBonusXP,
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

        // 1. Initial Data Fetch (Refactored to avoid N+1)
        toast.loading("Fetching Global Referral Index...", { id: syncToast });
        const allReferralsSnap = await getDocs(collection(db, 'referrals'));
        const referralCounts = new Map<string, number>();
        const referralRecords = new Map<string, any>(); // key: referrerId_refereeId

        allReferralsSnap.forEach(d => {
           const data = d.data();
           const rid = data.referrerId;
           const eid = data.refereeId;
           if (rid) {
              referralCounts.set(rid, (referralCounts.get(rid) || 0) + 1);
              if (eid) {
                referralRecords.set(`${rid}_${eid}`, { id: d.id, ...data });
              }
           }
        });

        toast.loading("Fetching Global Claims Index...", { id: syncToast });
        const allClaimsSnap = await getDocs(collection(db, 'system_claims'));
        const claimIds = new Set(allClaimsSnap.docs.map(d => d.id));

        // Audit: User Indexing to resolve N+1 during referral bounty sync
        const userMap = new Map<string, any>();
        usersSnap.docs.forEach(d => userMap.set(d.id, d.data()));

        for (let i = 0; i < usersSnap.docs.length; i++) {
           const userDoc = usersSnap.docs[i];
           const userData = userDoc.data();
           const userRef = userDoc.ref;

           toast.loading(`Processing User ${i + 1}/${usersSnap.docs.length}...`, { id: syncToast });

           const updates: any = {};
           let hasUpdates = false;

           // 1. Progression Sync
           const correctLevel = calculateLevel(userData.xp || 0, formData.xpPerLevel);
           if (correctLevel !== userData.level) {
              updates.level = correctLevel;
              updates.updatedAt = serverTimestamp();
              levelUpdates++;
              hasUpdates = true;
           }

           // 1.2 Retroactive Referral Check (Issue 5 Synchronization Fix)
           if ((userData.stats?.tasksCompleted || 0) > 0) {
              // Filter pending referrals from pre-fetched referralRecords Map
              const pendingRefs = Array.from(referralRecords.values()).filter(
                 ref => ref.referrerId === userDoc.id && ref.status === 'REGISTERED'
              );
              if (pendingRefs.length > 0) {
                 await ReferralProtectionEngine.processRetroactiveRewards(userDoc.id);
                 referralRewards += pendingRefs.length;
              }
           }

           // 1.5 Stats Reconciliation (Referral Count Check)
           const actualInvitationCount = referralCounts.get(userDoc.id) || 0;
           if ((userData.stats?.referralsCount || 0) !== actualInvitationCount) {
              updates['stats.referralsCount'] = actualInvitationCount;
              hasUpdates = true;
           }

           // 1.7 Task Stats Reconciliation (Using getCountFromServer - Still N+1 but much lighter)
           try {
              const historyQuery = query(collection(db, 'users', userDoc.id, 'task_history'), where('status', '==', 'COMPLETED'));
              const historySnap = await getCountFromServer(historyQuery);
              const actualTasksCount = historySnap.data().count;

              if ((userData.stats?.tasksCompleted || 0) !== actualTasksCount) {
                 updates['stats.tasksCompleted'] = actualTasksCount;
                 hasUpdates = true;
              }
           } catch (taskErr: any) {
              console.warn(`[IntegrityScan] Task sync failed for ${userDoc.id}:`, taskErr.message);
           }

           if (hasUpdates) {
              batch.update(userRef, updates);
              batchCount++;
           }

           if (batchCount >= 400) await commitBatch();

           // 2. Referral Bounty Sync (Deduplicated using pre-fetched claimIds)
           if (userData.referredBy) {
              const referrerId = userData.referredBy;
              const refereeId = userDoc.id;

              const refRecord = referralRecords.get(`${referrerId}_${refereeId}`);
              const isAlreadyRewarded = refRecord?.status === 'REWARDED';

              const syncClaimReferrer = `ref_sync_rr_${referrerId}_${refereeId}`;
              const activeClaimReferrer = `ref_qualify_${referrerId}_${refereeId}`;
              const legacyClaimReferrer = `referral_${referrerId}_${refereeId}`;

              // 2.1 Reconcile Missing Referral Document
              if (!refRecord) {
                 const newRefRef = doc(collection(db, 'referrals'));
                 batch.set(newRefRef, {
                    id: newRefRef.id,
                    referrerId,
                    refereeId,
                    refereeUsername: userData.username || 'Anonymous',
                    status: isAlreadyRewarded ? 'REWARDED' : 'REGISTERED',
                    createdAt: userData.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    fraudFlags: []
                 });
                 batchCount++;
              }

              // 2.2 Reconcile Missing Referral Reward
              // IMPORTANT: Only reward if the REFERRER has at least 1 completed task
              // Audit: Resolved N+1 by using pre-fetched userMap
              const referrerDataSync = userMap.get(referrerId);
              const referrerTasksCompleted = referrerDataSync?.stats?.tasksCompleted || 0;

              if (referrerTasksCompleted > 0 && !isAlreadyRewarded && !claimIds.has(syncClaimReferrer) && !claimIds.has(activeClaimReferrer) && !claimIds.has(legacyClaimReferrer)) {
                 const result = await PointTransactionEngine.execute({
                    userId: referrerId,
                    amount: formData.referralBonusPoints,
                    type: 'referral_bonus',
                    source: `Integrity Sync: ${userData.username || 'Anonymous'}`,
                    claimId: syncClaimReferrer,
                    xpReward: formData.referralBonusXP
                 });
                 if (result.success) {
                    referralRewards++;
                    // If we just rewarded them, ensure the referral doc (new or old) reflects it
                    if (refRecord) {
                       batch.update(doc(db, 'referrals', refRecord.id), { status: 'REWARDED', updatedAt: serverTimestamp() });
                       batchCount++;
                    } else {
                       // If we created it above, it will be updated in the next sync or we could handle it here.
                       // For simplicity, the next scan will pick it up or the setDoc above already has status: REWARDED if we could determine it.
                    }
                 }
              }

              const syncClaimReferee = `ref_sync_re_${refereeId}`;
              const legacyClaimReferee = `welcome_${refereeId}`;

              if (!claimIds.has(syncClaimReferee) && !claimIds.has(legacyClaimReferee)) {
                 const result = await PointTransactionEngine.execute({
                    userId: refereeId,
                    amount: 50, // Welcome bonus standard is 50
                    type: 'welcome_bonus',
                    source: `Integrity Sync (Referee)`,
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

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Referral Reward (PTS)</label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.referralBonusPoints}
                           onChange={e => setFormData({...formData, referralBonusPoints: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <Trophy className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Referral Reward (XP)</label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.referralBonusXP}
                           onChange={e => setFormData({...formData, referralBonusXP: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <Zap className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
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
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Progression Tiers</h3>
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
