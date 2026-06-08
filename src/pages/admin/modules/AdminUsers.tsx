import * as React from "react";
import {
  Users,
  Search,
  MoreVertical,
  Award,
  CheckCircle,
  Ban
} from 'lucide-react';
import {
  collection,
  query,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'users'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Users fetch failed:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleStatusToggle = async (user: any) => {
     try {
        const newStatus = !user.isBanned;
        await updateDoc(doc(db, 'users', user.id), {
           isBanned: newStatus,
           updatedAt: serverTimestamp()
        });

        await setDoc(doc(collection(db, 'system_audit')), {
           action: newStatus ? 'USER_SUSPENDED' : 'USER_REINSTATED',
           targetId: user.id,
           timestamp: serverTimestamp(),
           performedBy: 'ADMIN_PANEL',
           reason: 'ADMIN_MANUAL_ACTION'
        });

        toast.success(`User ${newStatus ? 'suspended' : 'reinstated'}`);
     } catch (err) {
        toast.error("Account status update failed");
     }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
          <p className="text-text-secondary text-sm font-medium">Manage platform users and maintain account integrity.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="UID, Email, Username..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
            />
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {loading ? (
          [1,2,3,4,5].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-[2rem] animate-pulse" />
          ))
        ) : filteredUsers.length > 0 ? (
          <>
            <div className="hidden lg:block bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">User</th>
                    <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Balance</th>
                    <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Level & XP</th>
                    <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                           <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10" />
                           <div>
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{user.username || 'Anonymous'}</p>
                              <p className="text-[10px] font-mono text-white/40 mt-1">{user.email}</p>
                           </div>
                        </div>
                      </td>
                      <td className="p-8">
                         <p className="text-sm font-mono font-bold text-white">{(user.points || 0)?.toLocaleString()} <span className="text-[9px] opacity-40">PTS</span></p>
                         <p className="text-[10px] text-text-secondary mt-1 tracking-widest uppercase font-bold">&asymp; ${(user.points || 0) / 1000} USD</p>
                      </td>
                      <td className="p-8">
                         <div className="flex items-center gap-2 mb-1">
                            <Award size={14} className="text-accent" />
                            <span className="text-xs font-bold uppercase tracking-widest">Level {user.level || 1}</span>
                         </div>
                         <p className="text-[10px] font-mono text-text-secondary">{(user.xp || 0)?.toLocaleString()} XP Total</p>
                      </td>
                      <td className="p-8 text-right">
                         <div className="flex items-center justify-end gap-3">
                            <span className={cn(
                              "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                              user.isBanned ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
                            )}>
                               {user.isBanned ? 'Suspended' : 'Active'}
                            </span>
                            <div className="relative group/menu">
                               <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-white">
                                  <MoreVertical size={16} />
                               </button>
                               <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50">
                                  <button
                                    onClick={() => handleStatusToggle(user)}
                                    className={cn(
                                      "w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-white/5 transition-colors",
                                      user.isBanned ? "text-success" : "text-danger"
                                    )}
                                  >
                                     {user.isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                                     {user.isBanned ? 'Reinstate' : 'Suspend Account'}
                                  </button>
                               </div>
                            </div>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10" />
                         <div>
                            <p className="font-bold text-white">{user.username || 'Anonymous'}</p>
                            <p className="text-[10px] font-mono text-white/40">{user.email}</p>
                         </div>
                      </div>
                      <button
                        onClick={() => handleStatusToggle(user)}
                        className={cn("p-2 rounded-xl transition-all", user.isBanned ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}
                      >
                         {user.isBanned ? <CheckCircle size={18} /> : <Ban size={18} />}
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-2xl p-4">
                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Balance</p>
                         <p className="text-sm font-mono font-bold">{(user.points || 0)?.toLocaleString() || 0} PTS</p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4">
                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Rank</p>
                         <p className="text-sm font-bold uppercase">LVL {user.level || 1}</p>
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                        user.isBanned ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
                      )}>
                        {user.isBanned ? 'Suspended' : 'Active'}
                      </span>
                      <p className="text-[9px] font-mono text-white/20 uppercase">ID: {user.id.slice(0, 8)}</p>
                   </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-24 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
            <Users size={48} className="mx-auto text-white/5 mb-6" />
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
