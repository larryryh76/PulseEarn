import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Settings,
  Zap,
  DollarSign,
  Save,
  ShieldCheck
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  limit,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import toast from 'react-hot-toast';

const AdminEconomy = () => {
  const [stats, setStats] = React.useState({
    ecosystemPoints: 0,
    totalUsers: 0,
  });
  const [settings, setSettings] = React.useState({
    pointsPerDollar: 1000,
    referralReward: 50,
    dailyCap: 500,
    minWithdrawal: 10000
  });
  const [isSaving, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // 1. Fetch Global Stats
    const fetchGlobalStats = async () => {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      let totalPts = 0;
      usersSnap.forEach(doc => totalPts += (doc.data().points || 0));
      setStats({
        ecosystemPoints: totalPts,
        totalUsers: usersSnap.size,
      });
    };

    // 2. Listen to System Settings
    const unsub = onSnapshot(doc(db, 'system', 'economy'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as any);
      }
    });

    fetchGlobalStats();
    return unsub;
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'system', 'economy'), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(collection(db, 'system_audit')), {
        action: 'ECONOMY_POLICY_UPDATE',
        timestamp: serverTimestamp(),
        performedBy: 'ADMIN_TERMINAL',
        metadata: settings
      });

      toast.success("Economic policy synchronized");
    } catch (err) {
      toast.error("Failed to update economy");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Economy Architecture</h1>
          <p className="text-text-secondary text-sm font-medium">Control global monetary parameters, reward multipliers, and system liquidity.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-4 py-2 rounded-lg bg-success/5 border border-success/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase tracking-widest">Market Feed Active</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Total Supply</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{stats.ecosystemPoints.toLocaleString()}</p>
           <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest"><Zap size={12} /> Pulse Points</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Global Liability</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">${(stats.ecosystemPoints / settings.pointsPerDollar).toLocaleString()}</p>
           <div className="flex items-center gap-2 text-success font-bold text-[10px] uppercase tracking-widest"><DollarSign size={12} /> USD Equivalent</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Avg balance</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{stats.totalUsers > 0 ? Math.floor(stats.ecosystemPoints / stats.totalUsers) : 0}</p>
           <div className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-widest"><TrendingUp size={12} /> PTS / Operator</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Settlement Floor</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{settings.minWithdrawal.toLocaleString()}</p>
           <div className="flex items-center gap-2 text-warning font-bold text-[10px] uppercase tracking-widest"><Wallet size={12} /> PTS Min.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
         <section className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-10 flex items-center gap-3"><Settings size={18} className="text-primary" /> Monetary Constants</h2>
            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Conversion (PTS per $1)</label>
                     <input
                        type="number"
                        value={settings.pointsPerDollar}
                        onChange={e => setSettings({...settings, pointsPerDollar: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Referral Reward (PTS)</label>
                     <input
                        type="number"
                        value={settings.referralReward}
                        onChange={e => setSettings({...settings, referralReward: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Daily Cap (PTS)</label>
                     <input
                        type="number"
                        value={settings.dailyCap}
                        onChange={e => setSettings({...settings, dailyCap: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Withdrawal Floor (PTS)</label>
                     <input
                        type="number"
                        value={settings.minWithdrawal}
                        onChange={e => setSettings({...settings, minWithdrawal: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono"
                     />
                  </div>
               </div>
               <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 bg-primary text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 mt-4"
               >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                  Commit Policy Changes
               </button>
            </div>
         </section>

         <section className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-10 flex items-center gap-3"><ShieldCheck size={18} className="text-success" /> Integrity Shield</h2>
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-black/20 p-8 text-center">
               <BarChart3 size={48} className="text-white/5 mb-6" />
               <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Real-time Monitoring</p>
               <p className="text-[10px] text-white/20 max-w-xs leading-relaxed">
                  Platform economic activity is monitored for sybil attacks and reward manipulation.
               </p>
            </div>
         </section>
      </div>
    </div>
  );
};

export default AdminEconomy;
