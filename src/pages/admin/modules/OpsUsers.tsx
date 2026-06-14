import * as React from 'react';
import {
  Users,
  Search,
  MoreVertical,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Smartphone,
  Activity,
  CheckCircle,
  Ban,
  Plus,
  Minus
} from 'lucide-react';
import {
  collection,
  query,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDocs,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatUSD } from '../../../utils/finance';

const OpsUsers: React.FC = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const [userActivity, setUserActivity] = React.useState<any[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, 'users'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    if (!selectedUser) return;
    const fetchUserHistory = async () => {
       const q = query(
         collection(db, 'system_claims'),
         where('userId', '==', selectedUser.id),
         orderBy('executedAt', 'desc'),
         limit(20)
       );
       const snap = await getDocs(q);
       setUserActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchUserHistory();
  }, [selectedUser]);

   const handleManualAdjustment = async (isXp: boolean, amount: number) => {
      if (!selectedUser) return;
      const action = amount >= 0 ? 'GRANT' : 'REVOKE';
      if (!window.confirm(`AUTHORIZE: ${action} ${Math.abs(amount)} ${isXp ? 'XP' : 'PTS'} for node "${selectedUser.username}"?`)) return;

      const loadingToast = toast.loading('Synchronizing manual mutation...');
      try {
         const { PointTransactionEngine } = await import('../../../engines/points/PointTransactionEngine');
         const claimId = `admin_${Date.now()}_${selectedUser.id.slice(0, 8)}`;

         const result = await PointTransactionEngine.execute({
            userId: selectedUser.id,
            amount: isXp ? 0 : amount,
            xpReward: isXp ? amount : 0,
            type: 'admin_adjustment',
            source: 'Manual Ops Mutation',
            claimId,
            description: `Administrative ${isXp ? 'XP' : 'Point'} adjustment`,
            bypassLock: true
         });

         if (result.success) {
            toast.dismiss(loadingToast);
            toast.success('Mutation Ledger Synchronized');
            // Refresh local user state if needed (snapshot will handle it normally)
         } else {
            toast.dismiss(loadingToast);
            toast.error(result.error);
         }
      } catch (err) {
         toast.dismiss(loadingToast);
         toast.error('Integrity Protocol Failure');
      }
   };

  const handleStatusToggle = async (user: any, action: 'BAN' | 'REINSTATE') => {
     if (!window.confirm(`AUTHORIZED ACTION: ${action} user "${user.username}"?`)) return;
     try {
        const isBanned = action === 'BAN';
        await updateDoc(doc(db, 'users', user.id), {
           isBanned,
           updatedAt: serverTimestamp(),
           status: isBanned ? 'restricted' : 'active'
        });

        await setDoc(doc(collection(db, 'system_audit')), {
           action: isBanned ? 'USER_SUSPENDED' : 'USER_REINSTATED',
           targetId: user.id,
           timestamp: serverTimestamp(),
           performedBy: 'OPS_AUTHORITY',
           reason: 'ADMIN_MANUAL_MUTATION'
        });

        toast.success(`Account status mutation synchronized`);
        if (selectedUser?.id === user.id) {
           setSelectedUser({...selectedUser, isBanned, status: isBanned ? 'restricted' : 'active'});
        }
     } catch (err) {
        toast.error("Integrity Protocol Failure");
     }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Users size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-white">User Directory</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Platform user base management and account integrity auditing.</p>
          </div>

          <div className="relative group w-full md:w-96">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
             <input
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Scan directory by UID, Email, Username..."
               className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
             />
          </div>
       </header>

       <div className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Identity Node</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Asset Balance</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Progression</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Status</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4,5,6].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="p-12"><div className="h-4 bg-white/5 rounded w-full" /></td></tr>)
                   ) : filtered.map((user) => (
                      <tr key={user.id} className="group hover:bg-white/[0.01] transition-colors whitespace-nowrap cursor-pointer" onClick={() => setSelectedUser(user)}>
                         <td className="p-8">
                            <div className="flex items-center gap-4">
                               <img src={user.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`} alt="" className="w-12 h-12 rounded-xl bg-white/5 border border-white/10" />
                               <div>
                                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors italic">{user.username || 'ANONYMOUS'}</p>
                                  <p className="text-[10px] font-mono text-white/20 mt-1 uppercase tracking-widest">{user.email}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <p className="text-sm font-mono font-bold text-white">{(user.points || 0).toLocaleString()} <span className="text-[9px] opacity-40">PTS</span></p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-success mt-1">&asymp; {formatUSD((user.points || 0) / 1000)}</p>
                         </td>
                         <td className="p-8">
                            <div className="flex items-center gap-2 mb-1.5">
                               <TrendingUp size={14} className="text-primary" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">LVL {user.level || 1}</span>
                            </div>
                            <p className="text-[10px] font-mono text-white/20 uppercase">{(user.xp || 0).toLocaleString()} XP Provisioned</p>
                         </td>
                         <td className="p-8">
                            <div className={cn(
                              "px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.2em] border w-fit",
                              user.isBanned ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
                            )}>
                               {user.isBanned ? 'Restricted' : 'Authenticated'}
                            </div>
                         </td>
                         <td className="p-8 text-right">
                            <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                               <MoreVertical size={16} />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       <AnimatePresence>
          {selectedUser && (
             <div className="fixed inset-0 z-[100] flex justify-end">
                <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   onClick={() => setSelectedUser(null)}
                   className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="relative w-full max-w-2xl bg-[#08080C] border-l border-white/5 shadow-2xl flex flex-col"
                >
                   <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                         <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary mr-2"><ArrowLeft size={20} /></button>
                         <h2 className="text-xl font-bold uppercase italic tracking-tighter text-white">Identity Inspection</h2>
                      </div>
                      <div className="flex items-center gap-3">
                         {selectedUser.isBanned ? (
                            <button
                              onClick={() => handleStatusToggle(selectedUser, 'REINSTATE')}
                              className="px-6 py-2.5 rounded-xl bg-success text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-success/20 italic"
                            >
                               Reinstate Node
                            </button>
                         ) : (
                            <button
                              onClick={() => handleStatusToggle(selectedUser, 'BAN')}
                              className="px-6 py-2.5 rounded-xl bg-danger text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-danger/20 italic"
                            >
                               Terminate Access
                            </button>
                         )}
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                      <section className="flex flex-col items-center text-center">
                         <div className="w-24 h-24 rounded-3xl border border-white/5 p-1 mb-6 relative">
                            <img src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${selectedUser.id}`} alt="" className="w-full h-full rounded-2xl" />
                            <div className={cn("absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center shadow-2xl", selectedUser.isBanned ? "bg-danger text-white" : "bg-success text-white")}>
                               {selectedUser.isBanned ? <Ban size={16} /> : <CheckCircle size={16} />}
                            </div>
                         </div>
                         <h3 className="text-2xl font-bold text-white uppercase tracking-tighter italic leading-none">{selectedUser.username}</h3>
                         <p className="text-[10px] font-mono text-white/20 mt-3 uppercase tracking-[0.2em]">{selectedUser.id}</p>
                      </section>

                      <div className="grid grid-cols-3 gap-4">
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center shadow-inner group relative overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Liquid Balance</p>
                            <p className="text-xl font-mono font-bold text-white">{selectedUser.points?.toLocaleString()}</p>
                            <div className="mt-4 flex justify-center gap-2">
                               <button onClick={() => handleManualAdjustment(false, 100)} className="p-1.5 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-all"><Plus size={12} /></button>
                               <button onClick={() => handleManualAdjustment(false, -100)} className="p-1.5 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-all"><Minus size={12} /></button>
                            </div>
                         </div>
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center shadow-inner group relative overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Progression</p>
                            <p className="text-xl font-mono font-bold text-primary">LVL {selectedUser.level || 1}</p>
                            <div className="mt-4 flex justify-center gap-2">
                               <button onClick={() => handleManualAdjustment(true, 50)} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"><Plus size={12} /></button>
                               <button onClick={() => handleManualAdjustment(true, -50)} className="p-1.5 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-all"><Minus size={12} /></button>
                            </div>
                         </div>
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center shadow-inner">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Login Streak</p>
                            <p className="text-xl font-mono font-bold text-warning">{selectedUser.streak || 0} D</p>
                         </div>
                      </div>

                      <section className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
                            <Activity size={14} className="text-primary" />
                            Administrative Ledger
                         </h4>
                         <div className="space-y-1 bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden shadow-inner">
                            {userActivity.map(tx => (
                               <div key={tx.id} className="p-4 flex justify-between items-center border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                  <div>
                                     <p className="text-[11px] font-bold text-white uppercase italic">{tx.source}</p>
                                     <p className="text-[9px] font-mono text-white/20 mt-1">{(tx.executedAt?.toDate?.() || new Date()).toLocaleDateString()}</p>
                                  </div>
                                  <p className={cn("text-xs font-mono font-bold", tx.amount > 0 ? "text-success" : "text-white")}>
                                     {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                  </p>
                               </div>
                            ))}
                            {userActivity.length === 0 && (
                               <div className="p-12 text-center text-white/10 uppercase font-black text-[10px] tracking-widest">
                                  No Ledger Events Identified
                               </div>
                            )}
                         </div>
                      </section>

                      <section className="grid grid-cols-2 gap-4 pt-8 border-t border-white/5">
                         <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/20">
                               <Calendar size={12} /> Joined Platform
                            </div>
                            <p className="text-xs font-bold text-white uppercase italic">{selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || 'PRE-MIGRATION'}</p>
                         </div>
                         <div className="space-y-2 text-right">
                            <div className="flex items-center justify-end gap-2 text-[9px] font-black uppercase tracking-widest text-white/20">
                               <Smartphone size={12} /> Device Authority
                            </div>
                            <p className="text-xs font-bold text-white uppercase italic">Active Session Linked</p>
                         </div>
                      </section>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};

export default OpsUsers;
