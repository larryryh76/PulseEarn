import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Zap,
  Search,
  Plus,
  Edit3,
  Trash2,
  MousePointer2
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Task } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import TaskBuilderModal from './modals/TaskBuilderModal';

const OpsTasks: React.FC = () => {
  const [searchParams] = useSearchParams();
  const campaignIdFilter = searchParams.get('campaignId');

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    let q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));

    if (campaignIdFilter) {
       q = query(
         collection(db, 'tasks'),
         where('campaignId', '==', campaignIdFilter),
         orderBy('createdAt', 'desc')
       );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
    return unsubscribe;
  }, [campaignIdFilter]);

  const handleToggleStatus = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        active: !task.active,
        status: !task.active ? 'ACTIVE' : 'INACTIVE'
      });
      toast.success(`Node ${!task.active ? 'Activated' : 'Suspended'}`);
    } catch (err) {
      toast.error("Instruction mutation failed");
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`PERMANENTLY PURGE: "${task.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      toast.success("Execution vector purged");
    } catch (err) {
      toast.error("Purge sequence failed");
    }
  };

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Zap size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">
                  {campaignIdFilter ? 'Campaign Task Nodes' : 'Global Task Library'}
                </h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">
               {campaignIdFilter ? `Viewing execution vectors linked to campaign: ${campaignIdFilter}` : 'Global repository of atomic reward vectors and verification logic.'}
             </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan library by Title or ID..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
             <button
               onClick={() => {
                 setSelectedTask(campaignIdFilter ? { campaignId: campaignIdFilter } as any : null);
                 setIsModalOpen(true);
               }}
               className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
             >
                <Plus size={18} />
                Create Vector
             </button>
          </div>
       </header>

       <div className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-white/[0.02] border-b border-white/5 whitespace-nowrap">
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Instruction Node</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Verification</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Provision</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Status</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4,5].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="p-12"><div className="h-4 bg-white/5 rounded w-full" /></td></tr>)
                   ) : filtered.map((task) => (
                      <tr key={task.id} className="group hover:bg-white/[0.01] transition-colors whitespace-nowrap">
                         <td className="p-8">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-all">
                                  <Zap size={18} />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white uppercase italic group-hover:text-primary transition-colors">{task.title}</p>
                                  <p className="text-[9px] font-mono text-white/20 mt-1">Ref: {task.id.slice(0, 16).toUpperCase()}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <div className="flex items-center gap-2">
                               <MousePointer2 size={12} className="text-indigo-400" />
                               <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{task.verificationType}</span>
                            </div>
                         </td>
                         <td className="p-8">
                            <div className="flex items-center gap-5">
                               <div>
                                  <p className="text-sm font-mono font-bold text-primary">+{task.rewardAmount.toLocaleString()}</p>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-white/10">Points</p>
                               </div>
                               <div className="w-px h-6 bg-white/5" />
                               <div>
                                  <p className="text-sm font-mono font-bold text-indigo-400">+{task.xpReward.toLocaleString()}</p>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-white/10">XP</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <button
                              onClick={() => handleToggleStatus(task)}
                              className={cn(
                                "px-3 py-1 rounded text-[9px] font-black uppercase tracking-[0.2em] border",
                                task.active ? "bg-success/10 text-success border-success/20" : "bg-white/5 text-white/20 border-white/10"
                              )}
                            >
                               {task.active ? 'Active' : 'Suspended'}
                            </button>
                         </td>
                         <td className="p-8 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                               <button
                                 onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                                 className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
                               >
                                  <Edit3 size={16} />
                               </button>
                               <button
                                 onClick={() => handleDelete(task)}
                                 className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-danger transition-all"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {filtered.length === 0 && !loading && (
             <div className="py-32 text-center border-t border-white/5">
                <Zap size={48} className="mx-auto text-white/5 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Empty Vector Registry</p>
             </div>
          )}
       </div>

       <TaskBuilderModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setSelectedTask(null); }}
         initialTask={selectedTask}
       />
    </div>
  );
};

export default OpsTasks;
