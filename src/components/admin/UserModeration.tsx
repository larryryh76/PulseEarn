import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, limit, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import CardPremium from '../ui/Card';
import { Search, UserCheck, ShieldAlert, Activity, ShieldX, User, Shield } from 'lucide-react';
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
      description: 'System balance reconciliation by authorized operator.'
    });

    if (result.success) toast.success(`Reconciliation complete: ${amount > 0 ? '+' : ''}${amount} PTS`);
    else toast.error(result.error || 'Reconciliation failed');
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white/40">
            <Shield size={20} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Governance Hub</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white">Identity Governance</h1>
        </div>

        <div className="relative w-full md:w-[400px]">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
           <input
             type="text"
             placeholder="Search Entity Identifier (UUID/Handle)..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-black border border-white/[0.1] rounded-lg pl-11 pr-4 py-3.5 text-[13px] text-white focus:outline-none focus:border-primary/50 transition-all font-mono"
           />
        </div>
      </div>

      <CardPremium className="p-0 overflow-hidden bg-black border-white/[0.05] rounded-xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Subject Identity</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Credit Balance</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Tier</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Risk Posture</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 text-right">Intervention</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                       <td className="p-6">
                          <div className="flex items-center gap-4">
                             <div className="w-9 h-9 rounded bg-white/[0.03] border border-white/[0.08] flex items-center justify-center overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={14} className="text-white/20" />
                                )}
                             </div>
                             <div>
                                <p className="text-[13px] font-bold text-white/80">{user.username || 'Anonymous'}</p>
                                <p className="text-[10px] text-white/20 font-mono uppercase tracking-tighter">{user.id}</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             <Activity size={12} className="text-primary/40" />
                             <span className="text-[13px] font-mono font-bold text-white/60">{user.points?.toLocaleString() || 0} <span className="text-[10px] opacity-40">PTS</span></span>
                          </div>
                       </td>
                       <td className="p-6">
                          <span className="text-[11px] font-mono font-bold text-white/30 px-2 py-0.5 rounded border border-white/5">LVL {user.level || 1}</span>
                       </td>
                       <td className="p-6">
                          {user.isBanned ? (
                            <div className="flex items-center gap-2 text-danger">
                               <ShieldX size={12} />
                               <span className="text-[10px] font-bold uppercase tracking-widest">Banned</span>
                            </div>
                          ) : user.isFlagged ? (
                            <div className="flex items-center gap-2 text-orange-500">
                               <ShieldAlert size={12} />
                               <span className="text-[10px] font-bold uppercase tracking-widest">Elevated Risk</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-success/40">
                               <UserCheck size={12} />
                               <span className="text-[10px] font-bold uppercase tracking-widest">Compliant</span>
                            </div>
                          )}
                       </td>
                       <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                             <button
                               onClick={() => adjustBalance(user.id, 500)}
                               className="text-[9px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                             >
                                Correct +500
                             </button>
                             <div className="w-px h-3 bg-white/5" />
                             <button
                               onClick={() => handleModeration(user.id, user.isFlagged ? 'unflag' : 'flag')}
                               className={cn(
                                 "text-[9px] font-bold uppercase tracking-widest transition-colors",
                                 user.isFlagged ? "text-success/60 hover:text-success" : "text-white/20 hover:text-white"
                               )}
                             >
                                {user.isFlagged ? 'Clear Flag' : 'Flag'}
                             </button>
                             <div className="w-px h-3 bg-white/5" />
                             <button
                               onClick={() => handleModeration(user.id, 'ban')}
                               className="text-[9px] font-bold uppercase tracking-widest text-danger/40 hover:text-danger transition-colors"
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
      </CardPremium>
    </div>
  );
};

export default UserModeration;
