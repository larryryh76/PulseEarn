import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import CardPremium from '../ui/Card';
import { Search, UserCheck, ShieldAlert, MoreVertical, Activity, Ban } from 'lucide-react';
import Button from '../ui/Button';

const UserModeration: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Population Control</h2>
          <h1 className="text-3xl font-bold">User Moderation</h1>
        </div>

        <div className="relative w-full md:w-96">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
           <input
             type="text"
             placeholder="Filter by UUID or Email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
           />
        </div>
      </div>

      <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">User Identity</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Ecosystem Role</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Pulse Balance</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Risk Status</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/30">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {users.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.01] transition-colors">
                       <td className="p-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center overflow-hidden">
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/90">{user.username}</p>
                                <p className="text-[10px] text-white/30 font-medium">{user.email}</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-6">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                             user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-white/5 text-white/40'
                          }`}>
                             {user.role}
                          </span>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             <Activity size={14} className="text-primary/40" />
                             <span className="text-sm font-bold text-white/80">{user.points?.toLocaleString()}</span>
                          </div>
                       </td>
                       <td className="p-6">
                          {user.isFlagged ? (
                            <div className="flex items-center gap-2 text-orange-500">
                               <ShieldAlert size={14} />
                               <span className="text-[10px] font-bold uppercase">FLAGGED</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-success/40">
                               <UserCheck size={14} />
                               <span className="text-[10px] font-bold uppercase">STABLE</span>
                            </div>
                          )}
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-white/5 hover:border-danger hover:text-danger">
                                <Ban size={14} />
                             </Button>
                             <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-white/5">
                                <MoreVertical size={14} />
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
