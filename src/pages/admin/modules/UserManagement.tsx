import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  limit,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { UserData } from '../../../types';
import { Search, ShieldAlert, ShieldCheck, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../../utils';

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(100));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
    });
  }, []);

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusToggle = async (user: UserData) => {
    try {
      const newBannedState = !user.isBanned;
      await updateDoc(doc(db, 'users', user.uid), {
        isBanned: newBannedState,
        status: newBannedState ? 'frozen' : 'active'
      });

      // Audit Log
      await setDoc(doc(collection(db, 'system_audit')), {
        action: newBannedState ? 'USER_BANNED' : 'USER_UNBANNED',
        targetId: user.uid,
        timestamp: serverTimestamp(),
        performedBy: 'ADMIN_OPERATOR'
      });

      toast.success(`Operator ${newBannedState ? 'Frozen' : 'Activated'}`);
    } catch (err) { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operator Registry</h1>
          <p className="text-text-secondary text-sm">Oversee ecosystem participants and manage permissions.</p>
        </div>
        <div className="relative w-96">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
           <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by UID, Email, or Username..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all"
           />
        </div>
      </header>

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
           <thead>
              <tr className="bg-white/5 border-b border-white/10">
                 <th className="p-6 data-label">Operator Identity</th>
                 <th className="p-6 data-label">Vault Balance</th>
                 <th className="p-6 data-label">Progress</th>
                 <th className="p-6 data-label">Security Tier</th>
                 <th className="p-6 data-label text-right">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.uid} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-6">
                     <div className="flex items-center gap-4">
                        <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-xl border border-white/5" />
                        <div>
                           <p className="text-sm font-bold text-white mb-0.5">{user.username || 'Anonymous'}</p>
                           <p className="text-[10px] font-mono text-text-secondary uppercase">{user.email}</p>
                        </div>
                     </div>
                  </td>
                  <td className="p-6">
                     <p className="font-mono font-bold text-primary">{user.points?.toLocaleString()} PT</p>
                     <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-widest font-bold">~${(user.points || 0) / 1000} USD</p>
                  </td>
                  <td className="p-6">
                     <p className="text-xs font-bold text-white">LVL {user.level || 1}</p>
                     <p className="text-[10px] text-text-secondary mt-1 font-mono uppercase">{user.xp?.toLocaleString()} XP</p>
                  </td>
                  <td className="p-6">
                     <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded", user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text-secondary')}>
                        {user.role || 'USER'}
                     </span>
                  </td>
                  <td className="p-6 text-right">
                     <div className="flex justify-end gap-2">
                        <button
                           onClick={() => handleStatusToggle(user)}
                           className={cn(
                              "p-2.5 rounded-xl transition-all border",
                              user.isBanned
                                 ? "bg-success/10 text-success border-success/20 hover:bg-success/20"
                                 : "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20"
                           )}
                           title={user.isBanned ? "Unfreeze Account" : "Freeze Account"}
                        >
                           {user.isBanned ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                        </button>
                        <button className="p-2.5 rounded-xl bg-white/5 text-text-secondary hover:text-white border border-white/5 transition-all"><MoreVertical size={18} /></button>
                     </div>
                  </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
