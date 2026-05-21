import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import { collection, getDocs, updateDoc, doc, query, limit } from 'firebase/firestore';
import { Users, ShieldAlert, Ban, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const UserManagementPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    const q = query(collection(db, 'users'), limit(50));
    const snap = await getDocs(q);
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: !currentStatus
      });
      toast.success(`User ${currentStatus ? 'unbanned' : 'banned'}`);
      fetchUsers();
    } catch (e) {
      toast.error('Action failed');
    }
  };

  return (
    <Card className="p-0 overflow-hidden border-white/[0.05] bg-white/[0.01]">
      <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest">User Management</h3>
        </div>
        <button onClick={fetchUsers} className="text-[10px] text-white/40 hover:text-white uppercase font-bold transition-colors">Refresh</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.02] bg-white/[0.01]">
              <th className="p-4 text-[9px] font-bold uppercase text-white/20">User</th>
              <th className="p-4 text-[9px] font-bold uppercase text-white/20">Points</th>
              <th className="p-4 text-[9px] font-bold uppercase text-white/20">Status</th>
              <th className="p-4 text-[9px] font-bold uppercase text-white/20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                <td className="p-4">
                  <p className="text-xs font-bold">{user.username}</p>
                  <p className="text-[9px] text-white/30">{user.email}</p>
                </td>
                <td className="p-4 font-mono text-xs">{user.points?.toLocaleString()}</td>
                <td className="p-4">
                  {user.isFlagged && (
                    <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full w-fit">
                      <ShieldAlert size={10} />
                      <span className="text-[8px] font-bold uppercase">Flagged</span>
                    </div>
                  )}
                  {user.isBanned && (
                    <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full w-fit mt-1">
                      <Ban size={10} />
                      <span className="text-[8px] font-bold uppercase">Banned</span>
                    </div>
                  )}
                  {!user.isFlagged && !user.isBanned && (
                    <div className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full w-fit">
                      <CheckCircle2 size={10} />
                      <span className="text-[8px] font-bold uppercase">Active</span>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleBan(user.id, user.isBanned)}
                    className={cn(
                      "text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all",
                      user.isBanned ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    )}
                  >
                    {user.isBanned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UserManagementPanel;
