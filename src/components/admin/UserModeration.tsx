import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, limit, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, UserCheck, ShieldAlert, Activity, ShieldX, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../engines/points/PointTransactionEngine';
import { cn } from '../../utils';

const UserModeration: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleModeration = async (userId: string, action: 'ban' | 'flag' | 'unflag') => {
    const toastId = toast.loading('Updating Security Status...');
    try {
      const userRef = doc(db, 'users', userId);
      const updates: any = {};
      if (action === 'ban') updates.isBanned = true;
      if (action === 'flag') updates.isFlagged = true;
      if (action === 'unflag') updates.isFlagged = false;

      await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
      toast.success('Account Status Updated', { id: toastId });
    } catch (e) {
      toast.error('Update Failed', { id: toastId });
    }
  };

  const adjustBalance = async (userId: string, amount: number) => {
    const claimId = `admin_corr_${userId}_${Date.now()}`;
    const result = await PointTransactionEngine.execute({
      userId,
      amount,
      type: 'AI_SYSTEM_CORRECTION',
      source: 'Administrative Reconciliation',
      claimId,
      description: 'System balance reconciliation by authorized administrator.'
    });

    if (result.success) toast.success(`Reconciliation complete: ${amount > 0 ? '+' : ''}${amount} PTS`);
    else toast.error(result.error || 'Reconciliation failed');
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20 animate-in">

      {/* Dense Operational Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pr-10 border-r border-white/10">Subject Intelligence</h2>
            <div className="flex items-center gap-2 pl-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <span className="text-[10px] font-bold uppercase text-primary tracking-widest">System Monitoring Active</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Identity Governance</h1>
          <p className="text-sm text-white/40 font-medium">Authoritative lookup and management of ecosystem participant states.</p>
        </div>

        <div className="relative w-full lg:w-[450px] group">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
           <input
             type="text"
             placeholder="Query Subject Identifier (UUID / Global Alias)..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-[#08080a] border border-white/10 rounded-[1.5rem] pl-14 pr-6 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-mono placeholder:text-white/10"
           />
        </div>
      </div>

      <div className="bg-[#08080a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Subject Identity</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Liquid Assets</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Clearance</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Risk Posture</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Intervention Set</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center overflow-hidden grayscale group-hover:grayscale-0 transition-all group-hover:border-primary/20">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={16} className="text-white/10 group-hover:text-primary transition-colors" />
                                )}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{user.username || 'Anonymous'}</p>
                                <p className="text-[10px] text-white/20 font-mono uppercase tracking-tighter mt-0.5 group-hover:text-white/40 transition-colors">{user.id}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <Activity size={12} className="text-primary/40 group-hover:text-primary transition-colors" />
                             <span className="text-sm font-mono font-bold text-white/60 group-hover:text-white transition-colors">
                                {user.points?.toLocaleString() || 0}
                                <span className="text-[9px] font-black ml-1 text-white/20">PTS</span>
                             </span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className="text-[10px] font-mono font-black text-white/20 px-3 py-1 rounded-full border border-white/5 group-hover:border-white/20 transition-all uppercase">LVL {user.level || 1} User</span>
                       </td>
                       <td className="px-8 py-6">
                          {user.isBanned ? (
                            <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full w-fit">
                               <ShieldX size={12} />
                               <span className="text-[9px] font-black uppercase tracking-widest">Terminated</span>
                            </div>
                          ) : user.isFlagged ? (
                            <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full w-fit">
                               <ShieldAlert size={12} />
                               <span className="text-[9px] font-black uppercase tracking-widest">Elevated Risk</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-500/40 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-full w-fit group-hover:text-emerald-500 transition-colors">
                               <UserCheck size={12} />
                               <span className="text-[9px] font-black uppercase tracking-widest">Nominal</span>
                            </div>
                          )}
                       </td>
                       <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-5">
                             <button
                               onClick={(e) => { e.stopPropagation(); adjustBalance(user.id, 500); }}
                               className="text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all"
                             >
                                Reconciliation
                             </button>
                             <div className="w-px h-4 bg-white/5" />
                             <button
                               onClick={(e) => { e.stopPropagation(); handleModeration(user.id, user.isFlagged ? 'unflag' : 'flag'); }}
                               className={cn(
                                 "text-[10px] font-black uppercase tracking-widest transition-all",
                                 user.isFlagged ? "text-emerald-500/60 hover:text-emerald-500" : "text-white/20 hover:text-white"
                               )}
                             >
                                {user.isFlagged ? 'Clear Signal' : 'Flag Signal'}
                             </button>
                             <div className="w-px h-4 bg-white/5" />
                             <button
                               onClick={(e) => { e.stopPropagation(); handleModeration(user.id, 'ban'); }}
                               className="text-[10px] font-black uppercase tracking-widest text-rose-500/40 hover:text-rose-500 transition-all"
                             >
                                Terminate
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default UserModeration;
