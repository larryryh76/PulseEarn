import * as React from 'react';
import { Shield, User, CheckCircle, UserMinus, AlertTriangle } from 'lucide-react';
import { db, auth } from '../../../firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import toast from 'react-hot-toast';
import { safeFetch } from '../../../utils/api';

const OpsModerators: React.FC = () => {
  const [mods, setModerators] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [confirmDemote, setConfirmDemote] = React.useState<{ id: string; username: string } | null>(null);

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
    const userData = user.data();
    if (userData.role === 'moderator') return toast.error("User is already a Moderator.");
    if (userData.role === 'admin') return toast.error("Cannot demote an Admin to Moderator.");

    const load = toast.loading("Executing promotion...");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const data = await safeFetch('/api/admin/promote-moderator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (data.success) {
        // Write audit log
        await addDoc(collection(db, 'system_audit'), {
          action: 'MODERATOR_PROMOTED',
          targetUserId: user.id,
          targetUsername: userData.username || email,
          performedBy: auth.currentUser?.uid,
          timestamp: serverTimestamp()
        });

        // Write in-app notification to the promoted user
        await setDoc(doc(collection(db, 'users', user.id, 'notifications')), {
          type: 'moderator_promoted',
          title: 'Moderator Access Granted',
          description: 'You have been granted Moderator access to PulseEarn Operations.',
          timestamp: serverTimestamp(),
          read: false
        });

        toast.success("User promoted to Moderator.");
      } else {
        toast.error(data.message || data.error || "Promotion failed.");
      }
    } catch (err) {
      toast.error("Promotion failed.");
    } finally {
      toast.dismiss(load);
    }
  };

  const handleDemote = async (userId: string, username: string) => {
    setConfirmDemote({ id: userId, username });
  };

  const confirmDemotion = async () => {
    if (!confirmDemote) return;
    const { id: userId, username } = confirmDemote;
    setConfirmDemote(null);

    const load = toast.loading("Revoking moderator access...");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const data = await safeFetch('/api/admin/demote-moderator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId })
      });

      if (data.success) {
        // Write audit log
        await addDoc(collection(db, 'system_audit'), {
          action: 'MODERATOR_DEMOTED',
          targetUserId: userId,
          targetUsername: username,
          performedBy: auth.currentUser?.uid,
          timestamp: serverTimestamp()
        });

        // Notify the demoted user
        await setDoc(doc(collection(db, 'users', userId, 'notifications')), {
          type: 'moderator_demoted',
          title: 'Moderator Access Revoked',
          description: 'Your Moderator access to PulseEarn Operations has been revoked.',
          timestamp: serverTimestamp(),
          read: false
        });

        toast.success("Moderator access revoked.");
      } else {
        toast.error(data.message || data.error || "Demotion failed.");
      }
    } catch (err) {
      toast.error("Demotion failed.");
    } finally {
      toast.dismiss(load);
    }
  };

  return (
    <div className="space-y-12">
      {/* Confirm Demote Modal */}
      {confirmDemote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
          <div className="w-full max-w-md bg-surface border border-danger/20 rounded-[2rem] p-10 space-y-8 shadow-2xl">
            <div className="flex items-center gap-4 text-danger">
              <AlertTriangle size={28} />
              <h2 className="text-xl font-bold uppercase tracking-tight">Revoke Moderator Access</h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              You are about to revoke Moderator access for{' '}
              <span className="font-bold text-text-primary">{confirmDemote.username}</span>. They will
              lose all Ops Control access immediately. This action is logged.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDemote(null)}
                className="flex-1 py-4 rounded-xl border border-border font-bold text-[10px] uppercase tracking-widest text-text-secondary hover:bg-surface-bright transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDemotion}
                className="flex-1 py-4 rounded-xl bg-danger text-white font-bold text-[10px] uppercase tracking-widest hover:bg-danger/90 transition-all shadow-lg shadow-danger/20"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

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
          },
          {
            header: 'Actions',
            className: 'text-right',
            accessor: (mod: any) => (
              <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleDemote(mod.id, mod.username)}
                  className="flex items-center gap-2 px-5 py-2 bg-danger/10 text-danger rounded-xl hover:bg-danger/20 transition-all border border-danger/20 text-[9px] font-black uppercase tracking-widest"
                  title="Revoke Moderator Access"
                >
                  <UserMinus size={14} />
                  Revoke
                </button>
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
