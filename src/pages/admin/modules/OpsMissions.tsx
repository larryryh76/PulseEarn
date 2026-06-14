import * as React from 'react';
import {
  Trophy,
  Zap,
  Edit3
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { SystemTaskDefinition } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import MissionBuilderModal from './modals/MissionBuilderModal';
import { Plus } from 'lucide-react';

const OpsMissions: React.FC = () => {
  const [missions, setMissions] = React.useState<SystemTaskDefinition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedMission, setSelectedMission] = React.useState<SystemTaskDefinition | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'system_task_definitions'), orderBy('priority', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemTaskDefinition)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleToggleStatus = async (mission: SystemTaskDefinition) => {
     try {
        await updateDoc(doc(db, 'system_task_definitions', mission.id), {
           active: !mission.active
        });
        toast.success(`Mission Node ${!mission.active ? 'Activated' : 'Suspended'}`);
     } catch (err) {
        toast.error("Instruction Mutation Failure");
     }
  };

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Trophy size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-text-primary">Global Missions</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Strategic platform-wide objectives and automated progression logic.</p>
          </div>

          <button
            onClick={() => { setSelectedMission(null); setIsModalOpen(true); }}
            className="px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
             <Plus size={18} /> New Mission Node
          </button>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             [1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-surface-bright border border-border rounded-[2rem] animate-pulse" />)
          ) : missions.map((mission) => (
             <div key={mission.id} className="bg-surface border border-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col group hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Trophy size={80} /></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                     mission.active ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-bright border-border-bright text-text-tertiary"
                   )}>
                      <Zap size={24} />
                   </div>
                   <button
                     onClick={() => handleToggleStatus(mission)}
                     className={cn(
                       "px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.2em] border transition-all",
                       mission.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-secondary border-border-bright"
                     )}
                   >
                      {mission.active ? 'ACTIVE' : 'SUSPENDED'}
                   </button>
                </div>

                <div className="space-y-2 mb-8 relative z-10">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{mission.category}</p>
                   <h3 className="text-lg font-bold text-text-primary uppercase italic truncate group-hover:text-primary transition-colors leading-none">{mission.title}</h3>
                   <p className="text-[11px] text-text-tertiary leading-relaxed font-medium line-clamp-2">{mission.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-border relative z-10">
                   <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mb-1">Provision</p>
                      <p className="text-sm font-mono font-bold text-text-primary">+{(mission.rewardPoints || 0).toLocaleString()} PTS</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mb-1">Logic Node</p>
                      <p className="text-sm font-mono font-bold text-indigo-400">THR: {mission.targetValue}</p>
                   </div>
                </div>

                <div className="mt-auto flex items-center justify-between relative z-10 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                   <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">Hash: {mission.id.slice(0, 12).toUpperCase()}</p>
                   <button
                     onClick={() => { setSelectedMission(mission); setIsModalOpen(true); }}
                     className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all"
                   >
                      <Edit3 size={16} />
                   </button>
                </div>
             </div>
          ))}
       </div>

       <MissionBuilderModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setSelectedMission(null); }}
         initialMission={selectedMission}
       />
    </div>
  );
};

export default OpsMissions;
