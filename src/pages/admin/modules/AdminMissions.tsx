import * as React from "react";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Edit3,
  Loader2
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { SystemTaskDefinition } from '../../../types';
import toast from 'react-hot-toast';
import { cn } from '../../../utils';

const AdminMissions = () => {
  const [missions, setMissions] = React.useState<SystemTaskDefinition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({ rewardPoints: 0, rewardXp: 0, active: true });

  React.useEffect(() => {
    const q = query(collection(db, 'system_task_definitions'), orderBy('priority', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemTaskDefinition)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (mission: SystemTaskDefinition) => {
    setEditId(mission.id);
    setEditForm({
      rewardPoints: mission.rewardPoints,
      rewardXp: mission.rewardXp,
      active: mission.active
    });
  };

  const handleSave = async (id: string) => {
    try {
      const missionRef = doc(db, 'system_task_definitions', id);
      await updateDoc(missionRef, {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      toast.success('Mission configuration updated');
      setEditId(null);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
       <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Missions</h1>
          <p className="text-text-secondary text-sm font-medium">Configure automatic system tasks and achievement rewards.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
         {missions.map(mission => (
           <div key={mission.id} className={cn(
             "bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 transition-all hover:bg-white/[0.03]",
             !mission.active && "opacity-60 grayscale-[0.5]"
           )}>
              <div className="flex items-start gap-6 max-w-xl">
                 <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Trophy size={28} />
                 </div>
                 <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{mission.category}</span>
                       <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Trigger: {mission.trigger}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{mission.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{mission.description}</p>
                 </div>
              </div>

              {editingId === mission.id ? (
                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4 bg-black/20 p-6 rounded-[2rem] border border-primary/20">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-tertiary uppercase ml-1">Points</label>
                      <input
                        type="number"
                        value={editForm.rewardPoints}
                        onChange={e => setEditForm({...editForm, rewardPoints: parseInt(e.target.value)})}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-24 text-white font-mono text-sm"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-tertiary uppercase ml-1">XP</label>
                      <input
                        type="number"
                        value={editForm.rewardXp}
                        onChange={e => setEditForm({...editForm, rewardXp: parseInt(e.target.value)})}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-24 text-white font-mono text-sm"
                      />
                   </div>
                   <div className="flex items-center gap-2 pt-4 sm:pt-0">
                      <button
                        onClick={() => setEditForm({...editForm, active: !editForm.active})}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                          editForm.active ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
                        )}
                      >
                         {editForm.active ? 'Active' : 'Disabled'}
                      </button>
                      <button onClick={() => handleSave(mission.id)} className="p-2 bg-primary text-white rounded-xl hover:bg-primary/80 transition-all">
                         <CheckCircle2 size={18} />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-2 bg-white/5 text-text-tertiary rounded-xl hover:bg-white/10 transition-all">
                         <XCircle size={18} />
                      </button>
                   </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-6">
                   <div className="text-center">
                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Points Reward</p>
                      <p className="text-xl font-mono font-bold text-white">{mission.rewardPoints.toLocaleString()}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">XP Reward</p>
                      <p className="text-xl font-mono font-bold text-primary">{mission.rewardXp.toLocaleString()}</p>
                   </div>
                   <div className="w-px h-10 bg-white/5 hidden sm:block" />
                   <button onClick={() => handleEdit(mission)} className="p-3 bg-white/5 text-text-tertiary rounded-xl hover:bg-primary/10 hover:text-primary transition-all border border-white/5">
                      <Edit3 size={18} />
                   </button>
                </div>
              )}
           </div>
         ))}
      </div>
    </div>
  );
};

export default AdminMissions;
