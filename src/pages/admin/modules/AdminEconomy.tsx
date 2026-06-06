import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Settings,
  Zap,
  DollarSign
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

const AdminEconomy = () => {
  const [stats, setStats] = React.useState({
    ecosystemPoints: 0,
    totalUsers: 0,
    pendingWithdrawals: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      let totalPts = 0;
      usersSnap.forEach(doc => totalPts += (doc.data().points || 0));

      setStats({
        ecosystemPoints: totalPts,
        totalUsers: usersSnap.size,
        pendingWithdrawals: 0
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Economy Architecture</h1>
          <p className="text-text-secondary text-sm font-medium">Control global monetary parameters, reward multipliers, and system liquidity.</p>
        </div>
        <div className="flex items-center gap-4">
           <button className="px-8 py-3.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Settings size={18} />
            Global Override
          </button>
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
           <p className="text-3xl font-mono font-bold text-white mb-2">${(stats.ecosystemPoints / 1000).toLocaleString()}</p>
           <div className="flex items-center gap-2 text-success font-bold text-[10px] uppercase tracking-widest"><DollarSign size={12} /> USD Equivalent</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Avg balance</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{stats.totalUsers > 0 ? Math.floor(stats.ecosystemPoints / stats.totalUsers) : 0}</p>
           <div className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-widest"><TrendingUp size={12} /> PTS / User</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Settlement Floor</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">10,000</p>
           <div className="flex items-center gap-2 text-warning font-bold text-[10px] uppercase tracking-widest"><Wallet size={12} /> PTS Min.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
         <section className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-10 flex items-center gap-3"><Settings size={18} className="text-primary" /> Monetary Constants</h2>
            <div className="space-y-8">
               {[
                 { label: 'Base Reward Ratio', value: '1000 PTS : $1.00' },
                 { label: 'Referral Incentive', value: '50 PTS / User' },
                 { label: 'Daily Earning Cap', value: '500 PTS' },
                 { label: 'Withdrawal Threshold', value: '10,000 PTS' },
               ].map((item) => (
                 <div key={item.label} className="flex items-center justify-between group">
                    <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors mb-1 uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-mono font-bold text-white">{item.value}</p>
                 </div>
               ))}
            </div>
         </section>
         <section className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-10 flex items-center gap-3"><TrendingUp size={18} className="text-success" /> Reward Distribution</h2>
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-black/20">
               <BarChart3 size={48} className="text-white/5 mb-6" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Ecosystem distribution charts initializing...</p>
            </div>
         </section>
      </div>
    </div>
  );
};

export default AdminEconomy;
