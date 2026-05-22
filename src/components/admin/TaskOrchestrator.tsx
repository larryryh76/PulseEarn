import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import {
  collection,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import {
  Plus,
  Trash2,
  Power,
  Edit3,
  Zap,
  Clock,
  CheckSquare,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';
import { Task } from '../../types';

const TaskOrchestrator: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    rewardPoints: 50,
    type: 'once',
    active: true,
    cooldown: 24
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'tasks', isEditing), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Task updated');
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...formData,
          createdAt: serverTimestamp(),
          active: true
        });
        toast.success('New task deployed');
      }
      setIsEditing(null);
      setFormData({ title: '', description: '', rewardPoints: 50, type: 'once', active: true });
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  const toggleStatus = async (task: Task) => {
    await updateDoc(doc(db, 'tasks', task.id), { active: !task.active });
  };

  const deleteTask = async (id: string) => {
    if (confirm('Permanently decommission this task?')) {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('Task decommissioned');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Task Orchestrator</h1>
        <button
          onClick={() => {
            setIsEditing(null);
            setFormData({ title: '', description: '', rewardPoints: 50, type: 'once', active: true });
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/80 transition-all"
        >
          <Plus size={14} />
          Create New Mission
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Task List */}
        <div className="lg:col-span-2 space-y-4">
          {tasks.map(task => (
            <Card key={task.id} className={cn(
              "p-5 border-white/[0.05] bg-[#0A0A0F] group",
              !task.active && "opacity-60 grayscale-[0.5]"
            )}>
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border",
                    task.active ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/20"
                  )}>
                    {task.type === 'timer' ? <Clock size={20} /> : <CheckSquare size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">{task.title}</h3>
                    <p className="text-xs text-white/40 mb-3">{task.description}</p>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-500 uppercase">
                          <Zap size={10} />
                          {task.rewardPoints} PTS
                       </div>
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                          <RefreshCw size={10} />
                          {task.type}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <button
                    onClick={() => {
                      setIsEditing(task.id);
                      setFormData(task);
                    }}
                    className="p-2 rounded-lg bg-white/[0.03] text-white/20 hover:text-white transition-colors"
                   >
                      <Edit3 size={14} />
                   </button>
                   <button
                    onClick={() => toggleStatus(task)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      task.active ? "bg-green-500/10 text-green-500" : "bg-white/[0.03] text-white/20"
                    )}
                   >
                      <Power size={14} />
                   </button>
                   <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                   >
                      <Trash2 size={14} />
                   </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Editor Panel */}
        <Card className="p-6 border-white/[0.05] bg-[#0A0A0F] sticky top-24">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-white/20">
            {isEditing ? 'Edit Mission Parameters' : 'Mission Deployment'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-white/40 uppercase mb-2">Mission Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-primary/50"
                placeholder="e.g. Follow Pulse on X"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-white/40 uppercase mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-primary/50 h-20 resize-none"
                placeholder="Details of the mission..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[9px] font-bold text-white/40 uppercase mb-2">Reward (PTS)</label>
                  <input
                    type="number"
                    value={formData.rewardPoints}
                    onChange={e => setFormData({...formData, rewardPoints: Number(e.target.value)})}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs"
                    required
                  />
               </div>
               <div>
                  <label className="block text-[9px] font-bold text-white/40 uppercase mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs appearance-none"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="timer">Timer</option>
                  </select>
               </div>
            </div>
            {formData.type === 'timer' && (
               <div>
                  <label className="block text-[9px] font-bold text-white/40 uppercase mb-2">Duration (Sec)</label>
                  <input
                    type="number"
                    value={formData.duration || 30}
                    onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs"
                  />
               </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-[10px] font-bold uppercase tracking-widest mt-4 shadow-[0_4px_15px_rgba(0,112,255,0.2)]"
            >
              {isEditing ? 'Confirm Update' : 'Deploy Mission'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(null)}
                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default TaskOrchestrator;
