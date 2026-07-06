import * as React from 'react';
import { Shield, UserPlus, UserMinus, CheckCircle, Search, X, Loader2 } from 'lucide-react';
import { db, auth } from '../../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { safeFetch } from '../../../utils/api';
import { cn } from '../../../utils';

interface ModeratorRecord {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

const OpsModerators: React.FC = () => {
  const [mods, setModerators] = React.useState<ModeratorRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Promote modal
  const [promoteOpen, setPromoteOpen] = React.useState(false);
  const [promoteEmail, setPromoteEmail] = React.useState('');
  const [promoting, setPromoting] = React.useState(false);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = React.useState<ModeratorRecord | null>(null);
  const [revoking, setRevoking] = React.useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'moderator'));
    const unsub = onSnapshot(q, (snap) => {
      setModerators(snap.docs.map(d => ({ id: d.id, ...d.data() } as ModeratorRecord)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePromote = async () => {
    const email = promoteEmail.trim().toLowerCase();
    if (!email) return toast.error('Enter a valid email address.');
    setPromoting(true);
    const load = toast.loading('Looking up user...');
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const data = await safeFetch('/api/admin/promote-moderator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ email }),
      });
      toast.dismiss(load);
      if (data.success) {
        toast.success(data.message || 'User promoted to Moderator.');
        setPromoteEmail('');
        setPromoteOpen(false);
      } else {
        const msg: Record<string, string> = {
          USER_NOT_FOUND: 'No account found with that email.',
          ALREADY_MODERATOR: 'This user is already a Moderator.',
          FORBIDDEN: 'You do not have permission to perform this action.',
        };
        toast.error(msg[data.error] || data.message || 'Promotion failed.');
      }
    } catch {
      toast.dismiss(load);
      toast.error('Network error. Please try again.');
    } finally {
      setPromoting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    const load = toast.loading(`Revoking ${revokeTarget.username}...`);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const data = await safeFetch('/api/admin/demote-moderator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ userId: revokeTarget.id }),
      });
      toast.dismiss(load);
      if (data.success) {
        toast.success(data.message || `${revokeTarget.username} removed from Moderators.`);
        setRevokeTarget(null);
      } else {
        const msg: Record<string, string> = {
          NOT_A_MODERATOR: 'This user is no longer a Moderator.',
          FORBIDDEN: 'You do not have permission to perform this action.',
        };
        toast.error(msg[data.error] || data.message || 'Revocation failed.');
      }
    } catch {
      toast.dismiss(load);
      toast.error('Network error. Please try again.');
    } finally {
      setRevoking(false);
    }
  };

  const filtered = mods.filter(m =>
    m.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Shield size={20} />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">
              Moderator Authority
            </h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">
            Manage limited administrative access. All promotions and revocations are logged and the user is notified immediately.
          </p>
        </div>
        <button
          onClick={() => setPromoteOpen(true)}
          className="w-full md:w-auto px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
        >
          <UserPlus size={16} /> Promote Moderator
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-[11px] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <Shield size={40} className="text-text-tertiary/30" />
          <p className="text-sm font-bold uppercase tracking-widest text-text-tertiary">
            {searchTerm ? 'No moderators match your search' : 'No moderators assigned'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-bright">
                <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary">Moderator</th>
                <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary hidden md:table-cell">Email</th>
                <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary">Access Level</th>
                <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(mod => (
                <tr key={mod.id} className="bg-surface hover:bg-surface-bright transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={mod.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${mod.id}`}
                        alt=""
                        className="w-9 h-9 rounded-lg border border-border"
                      />
                      <div>
                        <p className="text-sm font-bold text-text-primary uppercase italic">{mod.username}</p>
                        <p className="text-[9px] font-mono text-text-tertiary md:hidden mt-0.5">{mod.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-[11px] font-mono text-text-secondary">{mod.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-black uppercase tracking-widest">
                      Standard Moderator
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setRevokeTarget(mod)}
                      className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-danger/60 hover:text-danger hover:bg-danger/5 border border-danger/10 hover:border-danger/30 rounded-lg transition-all"
                    >
                      <UserMinus size={12} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promote Modal */}
      {promoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-black uppercase tracking-widest text-text-primary">Promote Moderator</h2>
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  Enter the email address of the user to grant Moderator access. They will be notified immediately and the action is logged.
                </p>
              </div>
              <button
                onClick={() => { setPromoteOpen(false); setPromoteEmail(''); }}
                className="p-2 hover:bg-surface-glass rounded-lg text-text-tertiary hover:text-text-primary shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">User Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={promoteEmail}
                onChange={e => setPromoteEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) handlePromote();
                }}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[12px] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary/60 transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPromoteOpen(false); setPromoteEmail(''); }}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-border rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-glass transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting || !promoteEmail.trim()}
                className={cn(
                  'flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all',
                  promoting || !promoteEmail.trim()
                    ? 'bg-primary/40 text-text-primary/40 cursor-not-allowed'
                    : 'bg-primary text-text-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                )}
              >
                {promoting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {promoting ? 'Promoting...' : 'Promote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-black uppercase tracking-widest text-text-primary">Revoke Moderator Access</h2>
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  This will remove <span className="text-text-primary font-bold">{revokeTarget.username}</span> from the Moderator role and return them to standard user access. The user will be notified.
                </p>
              </div>
              <button
                onClick={() => setRevokeTarget(null)}
                className="p-2 hover:bg-surface-glass rounded-lg text-text-tertiary hover:text-text-primary shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-danger/80">
                This action is permanently logged and cannot be undone from this panel.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRevokeTarget(null)}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-border rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-glass transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className={cn(
                  'flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all',
                  revoking
                    ? 'bg-danger/30 text-danger/40 cursor-not-allowed'
                    : 'bg-danger text-white hover:bg-danger/90 shadow-lg shadow-danger/20'
                )}
              >
                {revoking ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                {revoking ? 'Revoking...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsModerators;
