import * as React from 'react';
import {
  Trophy,
  Zap,
  Edit3,
  MoreVertical
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { SystemTaskDefinition } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import MissionBuilderModal from './modals/MissionBuilderModal';
import { Plus } from 'lucide-react';
import DataTable from '../../../components/admin/common/DataTable';

const OpsMissions: React.FC = () => {
  const [missions, setMissions] = React.useState<SystemTaskDefinition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedMission, setSelectedMission] = React.useState<SystemTaskDefinition | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'system_task_definitions'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemTaskDefinition));
      setMissions(data.sort((a, b) => (b.priority || 0) - (a.priority || 0)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleToggleStatus = async (mission: SystemTaskDefinition) => {
     const loadingToast = toast.loading('Adjusting mission status...');
     try {
        await updateDoc(doc(db, 'system_task_definitions', mission.id), {
           active: !mission.active
        });
        toast.dismiss(loadingToast);
        toast.success(`Mission  ${!mission.active ? 'Activated' : 'Suspended'}`);
     } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Instruction Adjustment Failure");
     }
  };

   const filtered = missions.filter(m =>
     m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     m.id.toLowerCase().includes(searchTerm.toLowerCase())
   );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Trophy size={20} />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Global Missions</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Strategic platform-wide objectives and automated progression logic.</p>
          </div>

          <button
            onClick={() => { setSelectedMission(null); setIsModalOpen(true); }}
            className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 shrink-0"
          >
             <Plus size={18} /> New Mission
          </button>
       </header>

       <DataTable
         columns={[
           {
             header: 'Mission Details',
             accessor: (mission: SystemTaskDefinition) => (
               <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-all",
                    mission.active ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-bright border-border-bright text-text-tertiary"
                  )}>
                     <Zap size={20} />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors italic">{mission.title}</p>
                     <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-0.5">{mission.category}</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Configuration',
             accessor: (mission: SystemTaskDefinition) => (
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Trigger: {mission.trigger}</p>
                  <p className="text-[9px] font-mono text-indigo-400">Target: {mission.targetValue}</p>
               </div>
             )
           },
           {
             header: 'Rewards',
             accessor: (mission: SystemTaskDefinition) => (
               <div className="flex items-center gap-5">
                  <div>
                     <p className="text-xs font-mono font-bold text-text-primary">+{mission.rewardPoints.toLocaleString()}</p>
                     <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">Points</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                     <p className="text-xs font-mono font-bold text-primary">+{mission.rewardXp.toLocaleString()}</p>
                     <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">XP</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Status',
             accessor: (mission: SystemTaskDefinition) => (
               <button
                 onClick={(e) => { e.stopPropagation(); handleToggleStatus(mission); }}
                 className={cn(
                   "px-3 py-1 rounded text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border transition-all",
                   mission.active ? "bg-success/10 text-success border-success/20" : "bg-surface-accent text-text-secondary border-border-bright"
                 )}
               >
                  {mission.active ? 'ACTIVE' : 'SUSPENDED'}
               </button>
             )
           },
           {
             header: 'Actions',
             className: 'text-right',
             accessor: (mission: SystemTaskDefinition) => (
               <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setSelectedMission(mission); setIsModalOpen(true); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                     <Edit3 size={16} />
                  </button>
                  <button className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                     <MoreVertical size={16} />
                  </button>
               </div>
             )
           }
         ]}
         data={filtered}
         isLoading={loading}
         onRowClick={(m) => { setSelectedMission(m); setIsModalOpen(true); }}
         searchTerm={searchTerm}
         onSearchChange={setSearchTerm}
       />

       <MissionBuilderModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setSelectedMission(null); }}
         initialMission={selectedMission}
       />
    </div>
  );
};

export default OpsMissions;
