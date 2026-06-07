import * as React from "react";
import {
  Zap,
  Plus,
  Search,
  ArrowRight,
  Edit3,
  Trash2
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Task } from '../../../types';
import TaskBuilderModal from './modals/TaskBuilderModal';
import { cn } from "../../../utils";
import toast from "react-hot-toast";

const AdminTasks = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    }, (error) => {
      console.error("Tasks fetch failed:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredTasks = tasks.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    try {
      const { deleteDoc, doc: fireDoc } = await import('firebase/firestore');
      await deleteDoc(fireDoc(db, 'tasks', task.id));
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Deletion failed");
    }
  };

  const handleToggleStatus = async (task: Task) => {
    try {
      const { updateDoc, doc: fireDoc } = await import('firebase/firestore');
      await updateDoc(fireDoc(db, 'tasks', task.id), {
        active: !task.active
      });
      toast.success(`Task ${!task.active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error("Status update failed");
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Task Library</h1>
          <p className="text-text-secondary text-sm font-medium">Define and manage individual reward units and execution vectors.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
            />
          </div>
          <button
            onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
            className="px-8 py-3.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <Plus size={18} />
            Create Task
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-64 bg-white/5 rounded-[2rem] animate-pulse" />)
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id} className="group bg-white/[0.01] border border-white/5 p-8 rounded-[2rem] hover:border-primary/30 transition-all duration-500 flex flex-col">
               <div className="flex justify-between items-start mb-6">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={cn(
                    "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all hover:scale-105",
                    task.active ? "bg-success/5 text-success border-success/10" : "bg-white/5 text-white/20 border-white/10"
                  )}>
                    {task.active ? 'Active' : 'Draft'}
                  </button>
                  <div className="text-right">
                     <p className="text-lg font-mono font-bold text-primary">+{(task.rewardAmount || 0).toLocaleString()}</p>
                     <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Points</p>
                  </div>
               </div>
               <h3 className="text-sm font-bold text-white mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
               <p className="text-[11px] text-white/40 leading-relaxed mb-8 flex-1 line-clamp-2">{task.description}</p>
               <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                        className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all"
                     >
                        <Edit3 size={14} />
                     </button>
                     <button
                        onClick={() => handleDelete(task)}
                        className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-danger hover:bg-danger/10 transition-all"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
                  <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all">
                     View Metrics
                     <ArrowRight size={14} />
                  </button>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
             <Zap size={48} className="mx-auto text-white/5 mb-6" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">No tasks defined</h3>
          </div>
        )}
      </div>
      <TaskBuilderModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedTask(null); }} initialTask={selectedTask} />
    </div>
  );
};

export default AdminTasks;
