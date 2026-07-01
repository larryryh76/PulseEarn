import * as React from 'react';
import { Shield, User, CheckCircle } from 'lucide-react';
import { db, auth } from '../../../firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import toast from 'react-hot-toast';

const OpsModerators: React.FC = () => {
  const [mods, setModerators] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'moderator'));
    const unsub = onSnapshot(q, (snap) => {
      setModerators(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePromote = async () => {
     const email = window.prompt("Enter user email to promote to Moderator:");
     if (!email) return;

     const q = query(collection(db, 'users'), where('email', '==', email));
     const snap = await getDocs(q);
     if (snap.empty) return toast.error("User not found.");

     const user = snap.docs[0];
     const load = toast.loading("Executing promotion...");

     try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/promote-moderator', {
           method: 'POST',
           headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
           },
           body: JSON.stringify({ userId: user.id })
        });
        const data = await res.json();
        if (data.success) toast.success("User promoted to Moderator.");
        else toast.error(data.error);
     } catch (err) {
        toast.error("Promotion failed.");
     } finally {
        toast.dismiss(load);
     }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Shield size={20} />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Moderator Authority</h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">Manage limited administrative access for platform operations.</p>
        </div>

        <button onClick={handlePromote} className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 shadow-lg shadow-primary/20">
          <User size={18} /> Promote Moderator
        </button>
      </header>

      <DataTable
        columns={[
          {
            header: 'Moderator',
            accessor: (mod: any) => (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary">
                   <Shield size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary uppercase italic">{mod.username}</p>
                  <p className="text-[9px] font-mono text-text-tertiary mt-1 uppercase tracking-widest">{mod.email}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Access Level',
            accessor: () => (
               <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-black uppercase tracking-widest">
                  Standard Moderator
               </span>
            )
          },
          {
             header: 'Status',
             accessor: () => (
                <div className="flex items-center gap-2 text-success">
                   <CheckCircle size={12} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
             )
          }
        ]}
        data={mods.filter(m => m.username?.toLowerCase().includes(searchTerm.toLowerCase()) || m.email?.toLowerCase().includes(searchTerm.toLowerCase()))}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
};

export default OpsModerators;
