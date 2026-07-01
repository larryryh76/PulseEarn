import * as React from 'react';
import { Target, Zap, Plus } from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import { Task } from '../../../types';

const OpsTasks: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Target size={20} />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Global Task Ledger</h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">Mission Authority v6 - Server-side validation enabled.</p>
        </div>

        <button className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          <Plus size={18} /> New Objective
        </button>
      </header>

      <DataTable
        columns={[
          {
            header: 'Objective',
            accessor: (task: Task) => (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary">
                   <Target size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary uppercase italic">{task.title}</p>
                  <p className="text-[9px] font-mono text-text-tertiary mt-1 uppercase tracking-widest">{task.id}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Bounty',
            accessor: (task: Task) => (
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-success" />
                <span className="text-xs font-mono font-bold text-text-primary">{task.rewardAmount.toLocaleString()}</span>
              </div>
            )
          },
          {
            header: 'Completions',
            accessor: (task: Task) => (
               <p className="text-xs font-mono font-bold text-text-secondary">{task.completionCount || 0}</p>
            )
          }
        ]}
        data={tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
};

export default OpsTasks;
