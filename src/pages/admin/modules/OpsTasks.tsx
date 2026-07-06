import * as React from 'react';
import { Target, Zap, Plus, Archive, RotateCcw, Eye } from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import { Task } from '../../../types';
import { safeFetch } from '../../../utils/api';

const OpsTasks: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [archived, setArchived] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tab, setTab] = React.useState<'active' | 'archived'>('active');
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  // Real-time listener for ACTIVE tasks (matches user view)
  React.useEffect(() => {
    const q = query(
      collection(db, 'tasks'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    return unsub;
  }, []);

  // Real-time listener for ARCHIVED tasks
  React.useEffect(() => {
    const q = query(
      collection(db, 'tasks'),
      where('active', '==', false),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setArchived(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleArchive = async (taskId: string) => {
    setActioningId(taskId);
    const res = await safeFetch(`/api/admin/tasks/${taskId}/disable`, { method: 'POST' });
    if (res.success) {
      // Real-time listener will update automatically
      console.log('[v0] Task archived:', taskId);
    } else {
      console.error('[v0] Archive failed:', res.error);
    }
    setActioningId(null);
  };

  const handleRestore = async (taskId: string) => {
    setActioningId(taskId);
    const res = await safeFetch(`/api/admin/tasks/${taskId}/enable`, { method: 'POST' });
    if (res.success) {
      // Real-time listener will update automatically
      console.log('[v0] Task restored:', taskId);
    } else {
      console.error('[v0] Restore failed:', res.error);
    }
    setActioningId(null);
  };

  const displayData = tab === 'active' ? tasks : archived;
  const filtered = displayData.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Target size={20} />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Global Task Ledger</h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">Mission Authority v6 - Soft-delete sync verified. Real-time active tasks shown to users.</p>
        </div>

        <button className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          <Plus size={18} /> New Objective
        </button>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
            tab === 'active'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Eye size={14} className="inline mr-2" />
          Active ({tasks.length})
        </button>
        <button
          onClick={() => setTab('archived')}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
            tab === 'archived'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Archive size={14} className="inline mr-2" />
          Archived ({archived.length})
        </button>
      </div>

      {/* Data Table */}
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
          },
          {
            header: 'Action',
            accessor: (task: Task) => (
              tab === 'active' ? (
                <button
                  onClick={() => handleArchive(task.id)}
                  disabled={actioningId === task.id}
                  className="px-3 py-1 text-[9px] font-bold uppercase bg-surface-bright text-warning rounded hover:bg-warning/10 transition-all disabled:opacity-50"
                >
                  {actioningId === task.id ? '...' : <><Archive size={12} className="inline mr-1" />Archive</>}
                </button>
              ) : (
                <button
                  onClick={() => handleRestore(task.id)}
                  disabled={actioningId === task.id}
                  className="px-3 py-1 text-[9px] font-bold uppercase bg-surface-bright text-success rounded hover:bg-success/10 transition-all disabled:opacity-50"
                >
                  {actioningId === task.id ? '...' : <><RotateCcw size={12} className="inline mr-1" />Restore</>}
                </button>
              )
            )
          }
        ]}
        data={filtered}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
};

export default OpsTasks;
