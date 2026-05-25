import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, limit, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import CardPremium from '../ui/Card';
import { Search, UserCheck, ShieldAlert, Activity, ShieldX } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../engines/points/PointTransactionEngine';

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
    const toastId = toast.loading('Applying protocol...');
    try {
      const userRef = doc(db, 'users', userId);
      const updates: any = {};
      if (action === 'ban') updates.isBanned = true;
      if (action === 'flag') updates.isFlagged = true;
      if (action === 'unflag') updates.isFlagged = false;

      await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
      toast.success('Security policy updated', { id: toastId });
    } catch (e) {
      toast.error('Policy update failed', { id: toastId });
    }
  };

  const adjustBalance = async (userId: string, amount: number) => {
    const claimId = `admin_adjust_${userId}_${Date.now()}`;
    const result = await PointTransactionEngine.execute({
      userId,
      amount,
      type: 'admin_adjustment',
      source: 'Administrative Correction',
      claimId,
      description: 'Manual balance adjustment by administrator.'
    });

    if (result.success) toast.success(`Balance adjusted by ${amount} PTS`);
    else toast.error(result.error || 'Adjustment failed');
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Moderation Infrastructure</h2>
          <h1 className="text-3xl font-bold tracking-tight">Identity Management</h1>
        </div>

        <div className="relative w-full md:w-96">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
           <input
             type="text"
             placeholder="Search by UUID or Email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
           />
        </div>
      </div>

      <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Entity Identity</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Points</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Level</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Risk Factor</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right">Operational Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {users.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.01] transition-colors">
                       <td className="p-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center overflow-hidden">
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/90">{user.username}</p>
                                <p className="text-[10px] text-white/20 font-mono">{user.id.slice(0, 16)}...</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             <Activity size={14} className="text-primary/40" />
                             <span className="text-sm font-bold text-white/80">{user.points?.toLocaleString()}</span>
                          </div>
                       </td>
                       <td className="p-6 font-mono text-xs font-bold text-white/40">LVL {user.level || 1}</td>
                       <td className="p-6">
                          {user.isBanned ? (
                            <div className="flex items-center gap-2 text-danger">
                               <ShieldX size={14} />
                               <span className="text-[10px] font-bold uppercase">Banned</span>
                            </div>
                          ) : user.isFlagged ? (
                            <div className="flex items-center gap-2 text-orange-500">
                               <ShieldAlert size={14} />
                               <span className="text-[10px] font-bold uppercase">Flagged</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-success/40">
                               <UserCheck size={14} />
                               <span className="text-[10px] font-bold uppercase">Stable</span>
                            </div>
                          )}
                       </td>
                       <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button size="sm" variant="outline" className="px-3 text-[9px] border-white/5" onClick={() => adjustBalance(user.id, 100)}>
                                +100
                             </Button>
                             <Button size="sm" variant="outline" className="px-3 text-[9px] border-white/5" onClick={() => handleModeration(user.id, user.isFlagged ? 'unflag' : 'flag')}>
                                {user.isFlagged ? 'Unflag' : 'Flag'}
                             </Button>
                             <Button size="sm" variant="outline" className="px-3 text-[9px] border-white/5 text-danger hover:bg-danger/10" onClick={() => handleModeration(user.id, 'ban')}>
                                Ban
                             </Button>
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
