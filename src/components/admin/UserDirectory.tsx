import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  limit,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  Users,
  ShieldAlert,
  Search,
  Filter,
  MoreVertical,
  History
} from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';
import { UserData } from '../../types';
import { awardPoints } from '../../utils/economy';

const UserDirectory: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userTx, setUserTx] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchUserHistory = async (userId: string) => {
    const q = query(
      collection(db, 'users', userId, 'transactions'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    setUserTx(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleToggleBan = async (user: UserData) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBanned: !user.isBanned
      });
      toast.success(`User ${user.isBanned ? 'unbanned' : 'banned'}`);
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...selectedUser, isBanned: !user.isBanned });
      }
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const handleAdjustPoints = async (userId: string, amount: number) => {
     const res = await awardPoints(userId, amount, 'admin_adjustment', 'Manual adjustment by administrator');
     if (res.success) {
        toast.success(`Adjusted by ${amount} PTS`);
        fetchUserHistory(userId);
     } else {
        toast.error(res.error || 'Failed');
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-primary/50 transition-all w-64"
              />
           </div>
           <button className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white transition-all">
              <Filter size={16} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Table */}
        <div className="lg:col-span-2 overflow-hidden">
          <Card className="p-0 overflow-x-auto border-white/[0.05] bg-[#0A0A0F] custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                  <th className="p-4 text-[9px] font-bold uppercase text-white/20">Identity</th>
                  <th className="p-4 text-[9px] font-bold uppercase text-white/20">Capital</th>
                  <th className="p-4 text-[9px] font-bold uppercase text-white/20">Status</th>
                  <th className="p-4 text-[9px] font-bold uppercase text-white/20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredUsers.map(user => (
                  <tr
                    key={user.uid}
                    className={cn(
                      "hover:bg-white/[0.01] cursor-pointer transition-colors group",
                      selectedUser?.uid === user.uid && "bg-primary/[0.02]"
                    )}
                    onClick={() => {
                      setSelectedUser(user);
                      fetchUserHistory(user.uid);
                    }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{user.username}</p>
                          <p className="text-[9px] text-white/20 font-mono">{user.uid.slice(0,8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-mono font-bold">{user.points.toLocaleString()}</p>
                      <p className="text-[9px] text-white/20 uppercase tracking-tighter">Current PTS</p>
                    </td>
                    <td className="p-4">
                      {user.isBanned ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-bold uppercase">Terminated</span>
                      ) : user.isFlagged ? (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[8px] font-bold uppercase">Flagged</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[8px] font-bold uppercase">Active</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                       <button className="text-white/10 hover:text-white transition-colors">
                          <MoreVertical size={14} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* User Dossier Side Panel */}
        <div className="space-y-6">
          {selectedUser ? (
            <>
              <Card className="p-6 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <ShieldAlert size={40} className={cn("opacity-5", selectedUser.isBanned ? "text-red-500" : "text-primary")} />
                </div>

                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {selectedUser.username[0].toUpperCase()}
                   </div>
                   <div>
                      <h3 className="font-bold text-lg">{selectedUser.username}</h3>
                      <p className="text-xs text-white/40">{selectedUser.email}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                   <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Balance</p>
                      <p className="text-lg font-mono font-bold text-primary">{selectedUser.points.toLocaleString()}</p>
                   </div>
                   <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Streak</p>
                      <p className="text-lg font-mono font-bold text-orange-500">{selectedUser.streak} D</p>
                   </div>
                </div>

                <div className="space-y-2">
                   <button
                     onClick={() => handleToggleBan(selectedUser)}
                     className={cn(
                       "w-full py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                       selectedUser.isBanned
                        ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                        : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                     )}
                   >
                      {selectedUser.isBanned ? 'Revoke Termination' : 'Terminate User Access'}
                   </button>
                   <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAdjustPoints(selectedUser.uid, 100)}
                        className="py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold uppercase hover:bg-white/[0.05]"
                      >
                         Grant +100
                      </button>
                      <button
                        onClick={() => handleAdjustPoints(selectedUser.uid, -100)}
                        className="py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold uppercase hover:bg-white/[0.05]"
                      >
                         Deduct 100
                      </button>
                   </div>
                </div>
              </Card>

              {/* Transaction Logs */}
              <Card className="p-0 overflow-hidden border-white/[0.05] bg-[#0A0A0F]">
                <div className="p-4 border-b border-white/[0.05] flex items-center gap-2">
                   <History size={14} className="text-primary" />
                   <h4 className="text-[10px] font-bold uppercase tracking-widest">Execution Ledger</h4>
                </div>
                <div className="divide-y divide-white/[0.02]">
                   {userTx.map(tx => (
                     <div key={tx.id} className="p-3 flex items-center justify-between group">
                        <div>
                           <p className="text-[10px] font-bold">{tx.type.replace('_', ' ')}</p>
                           <p className="text-[8px] text-white/20 uppercase truncate max-w-[120px]">{tx.source}</p>
                        </div>
                        <div className="text-right">
                           <p className={cn("text-xs font-mono font-bold", tx.amount > 0 ? "text-green-500" : "text-red-500")}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                           </p>
                           <p className="text-[8px] text-white/10">{tx.timestamp?.toDate().toLocaleDateString()}</p>
                        </div>
                     </div>
                   ))}
                   {userTx.length === 0 && (
                     <div className="p-8 text-center text-[10px] font-bold text-white/10 uppercase tracking-widest">
                        No transactions recorded
                     </div>
                   )}
                </div>
              </Card>
            </>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-white/[0.03] rounded-2xl p-12 text-center">
               <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto text-white/10">
                     <Users size={24} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Select a subject for dossier overview</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDirectory;
