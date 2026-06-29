import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  MousePointer2
} from 'lucide-react';
import {
  collection,
  query,
  doc,
  updateDoc,
  deleteDoc,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Task } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import TaskBuilderModal from './modals/TaskBuilderModal';
import DataTable from '../../../components/admin/common/DataTable';

const OpsTasks: React.FC = () => {
  const [searchParams] = useSearchParams();
  const campaignIdFilter = searchParams.get('campaignId');

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchTasks = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'tasks'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (campaignIdFilter) {
         q = query(
           collection(db, 'tasks'),
           where('campaignId', '==', campaignIdFilter),
           orderBy('createdAt', 'desc'),
           limit(20)
         );
      }

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'tasks'),
          ...(campaignIdFilter ? [where('campaignId', '==', campaignIdFilter)] : []),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));

      if (isNext) {
        setTasks(prev => [...prev, ...data]);
      } else {
        setTasks(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsTasks] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTasks();
  }, [campaignIdFilter]);

  const handleToggleStatus = async (task: Task) => {
    const loadingToast = toast.loading('Updating task status...');
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        active: !task.active,
        status: !task.active ? 'ACTIVE' : 'INACTIVE'
      });
      toast.dismiss(loadingToast);
      toast.success(`Task ${!task.active ? 'Activated' : 'Paused'}`);
      fetchTasks();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update task status");
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete: "${task.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      toast.success("Task deleted successfully");
      fetchTasks();
    } catch (err) {
      toast.error("Failed to delete task");
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
                  {campaignIdFilter ? 'Campaign Tasks' : 'Global Task Library'}
                </h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">
               {campaignIdFilter ? `Viewing tasks linked to campaign ID: ${campaignIdFilter}` : 'Manage and organize the platform task library.'}
             </p>
          </div>

          <button
            onClick={() => {
              setSelectedTask(campaignIdFilter ? { campaignId: campaignIdFilter } as any : null);
              setIsModalOpen(true);
            }}
            className="px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
             <Plus size={18} />
             Create Task
          </button>
       </header>

       <DataTable
         columns={[
           {
             header: 'Task Details',
             accessor: (task: Task) => (
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-all">
                     <Zap size={18} />
                  </div>
                  <div>
                     <p className="text-xs md:text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{task.title}</p>
                     <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-0.5">ID: {task.id.slice(0, 16).toUpperCase()}</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Verification',
             accessor: (task: Task) => (
               <div className="flex items-center gap-2">
                  <MousePointer2 size={12} className="text-indigo-400" />
                  <span className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase tracking-widest">{task.verificationType}</span>
               </div>
             )
           },
           {
             header: 'Rewards',
             accessor: (task: Task) => (
               <div className="flex items-center gap-5">
                  <div>
                     <p className="text-xs md:text-sm font-mono font-bold text-primary">+{(task.rewardAmount || 0).toLocaleString()}</p>
                     <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-tertiary/50">PTS</p>
                  </div>
                  <div className="w-px h-6 bg-surface-bright" />
                  <div>
                     <p className="text-xs md:text-sm font-mono font-bold text-indigo-400">+{(task.xpReward || 0).toLocaleString()}</p>
                     <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-tertiary/50">XP</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Status',
             accessor: (task: Task) => (
               <button
                 onClick={(e) => { e.stopPropagation(); handleToggleStatus(task); }}
                 className={cn(
                   "px-3 py-1 rounded text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border",
                   task.active ? "bg-success/10 text-success border-success/20" : "bg-surface-bright text-text-tertiary border-border-bright"
                 )}
               >
                  {task.active ? 'Active' : 'Suspended'}
               </button>
             )
           },
           {
             header: 'Actions',
             className: 'text-right',
             accessor: (task: Task) => (
               <div className="flex justify-end gap-2 group-hover:translate-x-0 transition-all" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                    className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all"
                  >
                     <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-danger transition-all"
                  >
                     <Trash2 size={16} />
                  </button>
               </div>
             )
           }
         ]}
         data={filtered}
         isLoading={loading}
         onRowClick={(task) => { setSelectedTask(task); setIsModalOpen(true); }}
         searchTerm={searchTerm}
         onSearchChange={setSearchTerm}
         onLoadMore={() => fetchTasks(true)}
         hasMore={hasMore}
       />

       <TaskBuilderModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setSelectedTask(null); }}
         initialTask={selectedTask}
       />
    </div>
  );
};

export default OpsTasks;
