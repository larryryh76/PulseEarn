import * as React from 'react';
import { Shield, UserPlus, UserMinus, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { db, auth } from '../../../firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { safeFetch } from '../../../utils/api';
import { cn } from '../../../utils';

const OpsModerators: React.FC = () => {
  const [mods, setMods] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'moderator'));
    return onSnapshot(q, snap => {
      setMods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const callRoleEndpoint = async (endpoint: string, userId: string, successMsg: string) => {
    setActioningId(userId);
    const load = toast.loading('Updating role...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ userId }),
      });
      if (res.success) {
        toast.success(`${successMsg} — they must sign out and back in.`);
      } else {
        toast.error(res.error || res.message || 'Operation failed.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setActioningId(null);
      toast.dismiss(load);
    }
  };

  const handlePromote = async () => {
    const email = window.prompt('Enter the email address of the user to promote:');
    if (!email?.trim()) return;
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email.trim())));
    if (snap.empty) return toast.error('No user found with that email.');
    const user = snap.docs[0];
    if (user.data().role === 'admin') return toast.error('Cannot demote an admin.');
    if (user.data().role === 'moderator') return toast.error('User is already a moderator.');
    await callRoleEndpoint('/api/admin/promote-moderator', user.id, `${user.data().username || email} promoted to Moderator`);
  };

  const handleDemote = async (mod: any) => {
    if (!window.confirm(`Demote ${mod.username || mod.email} back to user?`)) return;
    await callRoleEndpoint('/api/admin/demote-moderator', mod.id, `${mod.username || mod.email} demoted to User`);
  };

  const filtered = mods.filter(m =>
    (m.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary" />
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">Moderator Authority</h1>
          </div>
          <p className="text-xs text-white/40 font-medium">
            Promoted users receive Firebase Auth custom claims — role takes effect after they sign out and back in.
          </p>
        </div>
        <button
          onClick={handlePromote}
          className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <UserPlus size={16} /> Promote Moderator
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 font-medium leading-relaxed">
          After promotion or demotion, the affected user <strong>must sign out and sign back in</strong> for the role change to take effect. This is required because Firebase Auth tokens are refreshed on login.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search moderators..."
          className="w-full md:w-80 bg-[#12121A] border border-[#1E1E2E] rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1E1E2E]">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Moderator</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Auth Claim</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    {[1,2,3,4].map(j => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-4 bg-white/5 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-white/20 text-xs font-black uppercase tracking-widest">
                    No moderators assigned
                  </td>
                </tr>
              ) : (
                filtered.map(mod => (
                  <tr key={mod.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Shield size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{mod.username || 'Unknown'}</p>
                          <p className="text-[9px] font-mono text-white/30 mt-0.5">{mod.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Active</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border",
                        "bg-primary/10 text-primary border-primary/20"
                      )}>
                        role: moderator
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleDemote(mod)}
                        disabled={actioningId === mod.id}
                        className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        {actioningId === mod.id ? (
                          <div className="w-3 h-3 border border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <UserMinus size={12} />
                        )}
                        Demote
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center gap-2 text-[10px] text-white/30 font-medium">
        <CheckCircle size={12} className="text-green-400" />
        <span>{mods.length} moderator{mods.length !== 1 ? 's' : ''} active on platform</span>
      </div>
    </div>
  );
};

export default OpsModerators;
