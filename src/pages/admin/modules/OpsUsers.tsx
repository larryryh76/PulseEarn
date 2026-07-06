import * as React from 'react';
import { safeFetch } from '../../../utils/api';
import {
  Users,
  MoreVertical,
  TrendingUp,
  ArrowLeft,
  Activity,
  CheckCircle,
  Ban,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import {
  collection,
  query,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDocs,
  where,
  deleteDoc,
  writeBatch,
  orderBy,
  startAfter
} from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatUSD } from '../../../utils/finance';
import { calculateLevel } from '../../../utils/progression';
import { EconomyConfigEngine } from '../../../engines/system/EconomyConfigEngine';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import DataTable from '../../../components/admin/common/DataTable';

const OpsUsers: React.FC = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [xpPerLevel, setXpPerLevel] = React.useState(1000);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const [userActivity, setUserActivity] = React.useState<any[]>([]);
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
     username: '',
     email: '',
     role: 'user',
     emailVerified: false
  });

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchUsers = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const newUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isNext) {
        setUsers(prev => [...prev, ...newUsers.filter((u: any) => u.status !== 'archived')]);
      } else {
        setUsers(newUsers.filter((u: any) => u.status !== 'archived'));
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsUsers] Fetch Error:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const fetchConfig = async () => {
       try {
          const config = await EconomyConfigEngine.getConfig();
          if (config.thresholds?.xpPerLevel) {
             setXpPerLevel(config.thresholds.xpPerLevel);
          }
       } catch (err) {
          console.warn("[OpsUsers] Failed to fetch economy config, using default thresholds.");
       }
    };
    fetchConfig();
    fetchUsers();
  }, []);

  React.useEffect(() => {
    if (!selectedUser) return;
    const fetchUserHistory = async () => {
       try {
          const q = query(
            collection(db, 'system_claims'),
            where('userId', '==', selectedUser.id),
            limit(50)
          );
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a: any, b: any) => {
             const timeA = a.executedAt?.toMillis?.() || 0;
             const timeB = b.executedAt?.toMillis?.() || 0;
             return timeB - timeA;
          });
          setUserActivity(data);
       } catch (err) {
          console.error("[OpsUsers] Ledger Sync Failure:", err);
       }
    };
    fetchUserHistory();
  }, [selectedUser]);

   const handleArchiveUser = async (user: any) => {
      if (!window.confirm(`AUTHORIZED ACTION: Archive user "${user.username}"? Their data will be hidden but preserved.`)) return;
      const loadingToast = toast.loading('Archiving user profile...');
      try {
          await updateDoc(doc(db, 'users', user.id), {
              status: 'archived',
              archivedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          });

          await setDoc(doc(collection(db, 'system_audit')), {
              action: 'USER_ARCHIVED_SOFT_DELETE',
              targetId: user.id,
              timestamp: serverTimestamp(),
              performedBy: 'OPS_AUTHORITY',
              metadata: { username: user.username }
          });

          toast.dismiss(loadingToast);
          toast.success('User archived and removed from active directory');
          setSelectedUser(null);
          fetchUsers(); // Refresh list
      } catch (err: any) {
          console.error("[OpsUsers] Archive Error:", err);
          toast.dismiss(loadingToast);
          toast.error(`Archive failed: ${err.message}`);
      }
   };

   const handleDeleteUser = async (user: any) => {
      if (!window.confirm(`CRITICAL ACTION: Deep purge user "${user.username}"? This permanently deletes ALL ledger and activity data.`)) return;
      if (!window.confirm(`FINAL WARNING: This action is irreversible. Proceed with permanent deletion?`)) return;

      const loadingToast = toast.loading('Executing deep recursive deletion...');
      try {
          const userId = user.id;

          // 1. Purge from Firebase Auth
          const idToken = await auth.currentUser?.getIdToken();
          const resData = await safeFetch('/api/admin/delete-user', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({ userId })
          });
          if (!resData.success) {
              console.warn("[OpsUsers] Auth deletion failed, continuing with Firestore purge:", resData.message || resData.error);
          }

          // 2. Purge Linked Top-Level Records
          const collectionsToPurge = [
             { name: 'referrals', field: 'referrerId' },
             { name: 'referrals', field: 'refereeId' },
             { name: 'user_predictions', field: 'userId' },
             { name: 'withdrawals', field: 'userId' },
             { name: 'task_claims', field: 'userId' },
             { name: 'system_anomalies', field: 'userId' },
             { name: 'system_audit', field: 'targetId' }
          ];

          const deleteInChunks = async (docs: any[]) => {
             for (let i = 0; i < docs.length; i += 500) {
                const batch = writeBatch(db);
                docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
                await batch.commit();
             }
          };

          for (const col of collectionsToPurge) {
             const q = query(collection(db, col.name), where(col.field, '==', userId));
             const snap = await getDocs(q);
             await deleteInChunks(snap.docs);
          }

          // 3. Purge User Sub-collections
          const subCols = ['transactions', 'notifications', 'task_history', 'activities', 'user_tasks'];
          for (const sc of subCols) {
             const scSnap = await getDocs(collection(db, 'users', userId, sc));
             await deleteInChunks(scSnap.docs);
          }

          // 4. Purge User Document
          await deleteDoc(doc(db, 'users', userId));

          await setDoc(doc(collection(db, 'system_audit')), {
              action: 'USER_PERMANENT_DELETION_RECURSIVE',
              targetId: userId,
              timestamp: serverTimestamp(),
              performedBy: 'ROOT_AUTHORITY',
              metadata: { username: user.username, email: user.email }
          });

          toast.dismiss(loadingToast);
          toast.success('User and all associated data purged');
          setSelectedUser(null);
          fetchUsers(); // Refresh list
      } catch (err: any) {
          console.error("[OpsUsers] Deletion Error:", err);
          toast.dismiss(loadingToast);
          toast.error(`Deletion failed: ${err.message}`);
      }
   };

   const handleManualAdjustment = async (isXp: boolean, amount: number) => {
      if (!selectedUser) return;
      const action = amount >= 0 ? 'GRANT' : 'REVOKE';
      if (!window.confirm(`AUTHORIZE: ${action} ${Math.abs(amount)} ${isXp ? 'XP' : 'PTS'} for user "${selectedUser.username}"?`)) return;

      const loadingToast = toast.loading('Synchronizing adjustment...');
      try {
         const claimId = `admin_${Date.now()}_${selectedUser.id.slice(0, 8)}`;

         const result = await PointTransactionEngine.execute({
            userId: selectedUser.id,
            amount: isXp ? 0 : amount,
            xpReward: isXp ? amount : 0,
            type: 'admin_adjustment',
            source: 'Manual Adjustment',
            claimId,
            description: `Administrative ${isXp ? 'XP' : 'Point'} adjustment`,
            bypassLock: true
         });

         if (result.success) {
            toast.dismiss(loadingToast);
            toast.success('Ledger Updated');
         } else {
            toast.dismiss(loadingToast);
            toast.error(result.error);
         }
      } catch (err) {
         toast.dismiss(loadingToast);
         toast.error('Failed to update ledger');
      }
   };

  const handleStatusToggle = async (user: any, action: 'BAN' | 'REINSTATE') => {
     if (!window.confirm(`AUTHORIZED ACTION: ${action} user "${user.username}"?`)) return;
     try {
        const isBanned = action === 'BAN';
        await updateDoc(doc(db, 'users', user.id), {
           isBanned,
           updatedAt: serverTimestamp(),
           status: isBanned ? 'restricted' : 'active'
        });

        await setDoc(doc(collection(db, 'system_audit')), {
           action: isBanned ? 'USER_SUSPENDED' : 'USER_REINSTATED',
           targetId: user.id,
           timestamp: serverTimestamp(),
           performedBy: 'OPS_AUTHORITY',
           reason: 'ADMIN_MANUAL_ADJUSTMENT'
        });

        toast.success(`Account status updated`);
        if (selectedUser?.id === user.id) {
           setSelectedUser({...selectedUser, isBanned, status: isBanned ? 'restricted' : 'active'});
        }
     } catch (err) {
        toast.error("Account status update failed");
     }
  };

   const handleSyncUserLevel = async () => {
      if (!selectedUser) return;
      const expectedLevel = calculateLevel(selectedUser.xp || 0, xpPerLevel);
      if (selectedUser.level === expectedLevel) {
         toast.success("User level is already synchronized");
         return;
      }

      const load = toast.loading("Recalculating level...");
      try {
         await updateDoc(doc(db, 'users', selectedUser.id), {
            level: expectedLevel,
            updatedAt: serverTimestamp()
         });

         await setDoc(doc(collection(db, 'system_audit')), {
            action: 'USER_LEVEL_RECONCILED',
            targetId: selectedUser.id,
            timestamp: serverTimestamp(),
            performedBy: 'ADMIN_HUB',
            metadata: {
               oldLevel: selectedUser.level || 1,
               newLevel: expectedLevel,
               xp: selectedUser.xp || 0
            }
         });

         toast.dismiss(load);
         toast.success(`Level synchronized to ${expectedLevel}`);
         setSelectedUser({ ...selectedUser, level: expectedLevel });
      } catch (err) {
         toast.dismiss(load);
         toast.error("Reconciliation failed");
      }
   };

  const handleUpdateProfile = async () => {
      if (!selectedUser) return;

      // SEC-008: Enforce role enum — only known valid values may be written directly.
      // Admin promotion is intentionally allowed here (admin editing another user) but the
      // value must be one of the defined roles to prevent arbitrary string injection.
      const VALID_ROLES = ['user', 'moderator', 'admin'] as const;
      if (!VALID_ROLES.includes(editForm.role as typeof VALID_ROLES[number])) {
          toast.error(`Invalid role value: "${editForm.role}". Must be user, moderator, or admin.`);
          return;
      }

      const loadingToast = toast.loading('Updating user profile...');
      try {
          if (editForm.emailVerified && !selectedUser.emailVerified) {
              const idToken = await auth.currentUser?.getIdToken();
              const resData = await safeFetch('/api/admin/verify-user', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({ userId: selectedUser.id })
              });
              if (!resData.success) throw new Error(resData.message || resData.error);
          }

          // Only write the safe subset of fields — never allow client to write arbitrary keys.
          await updateDoc(doc(db, 'users', selectedUser.id), {
              username: editForm.username,
              email: editForm.email,
              role: editForm.role,
              updatedAt: serverTimestamp()
          });

          await setDoc(doc(collection(db, 'system_audit')), {
              action: 'USER_PROFILE_UPDATED',
              targetId: selectedUser.id,
              timestamp: serverTimestamp(),
              performedBy: 'ADMIN_HUB',
              changes: editForm
          });

          toast.dismiss(loadingToast);
          toast.success('User profile updated');
          setSelectedUser({ ...selectedUser, ...editForm });
          setIsEditing(false);
      } catch (err: any) {
          toast.dismiss(loadingToast);
          toast.error(`Update failed: ${err.message}`);
      }
  };

  const startEditing = () => {
      setEditForm({
          username: selectedUser.username || '',
          email: selectedUser.email || '',
          role: selectedUser.role || 'user',
          emailVerified: selectedUser.emailVerified || false
      });
      setIsEditing(true);
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term) {
       fetchUsers();
       return;
    }

    if (term.length > 2) {
       setLoading(true);
       try {
          // Server-side exact match search as requested (full collection query)
          const qUsername = query(collection(db, 'users'), where('username', '==', term));
          const qEmail = query(collection(db, 'users'), where('email', '==', term));

          const [snapU, snapE] = await Promise.all([getDocs(qUsername), getDocs(qEmail)]);
          const results = [...snapU.docs, ...snapE.docs].map(d => ({ id: d.id, ...d.data() }));

          // Also try partial match (prefix search)
          const qUsernamePrefix = query(collection(db, 'users'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), limit(20));
          const snapUPrefix = await getDocs(qUsernamePrefix);
          results.push(...snapUPrefix.docs.map(d => ({ id: d.id, ...d.data() })));

          const unique = Array.from(new Map(results.map(u => [u.id, u])).values());
          setUsers(unique.filter((u: any) => u.status !== 'archived'));
          setHasMore(false); // Search results are not paginated here
       } catch (err) {
          toast.error("Search failed");
       } finally {
          setLoading(false);
       }
    } else if (term.length > 0) {
       // Reset to paginated list for short terms to avoid stale search results
       fetchUsers();
    }
  };

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Users size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-text-primary">User Directory</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Platform user base management and account integrity auditing.</p>
          </div>
       </header>

       <DataTable
         columns={[
           {
             header: 'User',
             accessor: (user: any) => (
               <div className="flex items-center gap-4">
                  <img src={user.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-bright border border-border-bright" />
                  <div>
                     <p className="text-xs md:text-sm font-bold text-text-primary group-hover:text-primary transition-colors italic">{user.username || 'ANONYMOUS'}</p>
                     <p className="text-[9px] md:text-[10px] font-mono text-text-tertiary mt-1 uppercase tracking-widest">{user.email}</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Balance',
             accessor: (user: any) => (
               <div>
                  <p className="text-xs md:text-sm font-mono font-bold text-text-primary">{(user.points || 0).toLocaleString()} <span className="text-[8px] md:text-[9px] opacity-40">PTS</span></p>
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-success mt-1">&asymp; {formatUSD((user.points || 0) / 1000)}</p>
               </div>
             )
           },
           {
             header: 'Progression',
             accessor: (user: any) => (
               <div>
                  <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                     <TrendingUp size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                     <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-secondary">LVL {user.level || 1}</span>
                  </div>
                  <p className="text-[9px] md:text-[10px] font-mono text-text-tertiary uppercase">{(user.xp || 0).toLocaleString()} XP</p>
               </div>
             )
           },
           {
             header: 'Sync Status',
             accessor: (user: any) => {
               const expectedLevel = calculateLevel(user.xp || 0, xpPerLevel);
               const isSynced = (user.level || 1) === expectedLevel;
               return (
                  <div className="space-y-2">
                     <div className={cn(
                        "px-2 md:px-3 py-1 rounded text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] border w-fit",
                        isSynced ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20 animate-pulse"
                     )}>
                        {isSynced ? 'Synced' : `Mismatch (Exp: ${expectedLevel})`}
                     </div>
                     <div className={cn(
                        "px-2 md:px-3 py-1 rounded text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] border w-fit",
                        user.isBanned ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
                     )}>
                        {user.isBanned ? 'Restricted' : 'Authenticated'}
                     </div>
                  </div>
               )
             }
           },
           {
             header: 'Actions',
             className: 'text-right',
             accessor: () => (
               <button className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                  <MoreVertical size={16} />
               </button>
             )
           }
         ]}
         data={users}
         isLoading={loading}
         onRowClick={(user) => setSelectedUser(user)}
         searchTerm={searchTerm}
         onSearchChange={handleSearch}
         searchPlaceholder="Scan directory by Email, Username..."
         onLoadMore={() => fetchUsers(true)}
         hasMore={hasMore}
       />

       <AnimatePresence>
          {selectedUser && (
             <div className="fixed inset-0 z-[100] flex justify-end">
                <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   onClick={() => setSelectedUser(null)}
                   className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                />
                <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="relative w-full max-w-2xl bg-surface border-l border-border shadow-2xl flex flex-col"
                >
                   <div className="p-8 border-b border-border flex items-center justify-between bg-surface-bright/50">
                      <div className="flex items-center gap-4">
                         <button onClick={() => { setSelectedUser(null); setIsEditing(false); }} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary mr-2"><ArrowLeft size={20} /></button>
                         <h2 className="text-xl font-bold uppercase italic tracking-tighter text-text-primary">User Details</h2>
                      </div>
                      <div className="flex items-center gap-3">
                         {!isEditing && (
                            <>
                               <button
                                 onClick={() => setIsAssigning(true)}
                                 className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all shadow-lg"
                               >
                                  Assign Work
                               </button>
                               <button
                                 onClick={startEditing}
                                 className="px-6 py-2.5 rounded-xl bg-surface-bright border border-border text-text-primary text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent transition-all"
                               >
                                  Edit Identity
                               </button>
                               <button
                                 onClick={handleSyncUserLevel}
                                 className="px-4 py-2.5 rounded-xl bg-surface-bright border border-border text-text-primary hover:bg-surface-accent transition-all shadow-sm"
                                 title="Repair Level Sync"
                               >
                                  <RefreshCw size={16} className={cn((selectedUser.level || 1) !== calculateLevel(selectedUser.xp || 0, xpPerLevel) && "text-danger animate-pulse")} />
                               </button>
                            </>
                         )}
                         {selectedUser.role !== 'admin' && selectedUser.role !== 'ADMIN' && selectedUser.role !== 'moderator' && !selectedUser.isRoot && (
                            <button
                              onClick={async () => {
                                 if(!window.confirm(`Promote ${selectedUser.username} to MODERATOR?`)) return;
                                 const load = toast.loading("Executing Promotion...");
                                 const data = await safeFetch('/api/admin/promote-moderator', {
                                    method: 'POST',
                                    headers: {
                                       'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
                                       'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ userId: selectedUser.id })
                                 });
                                 toast.dismiss(load);
                                 if(data.success) {
                                    toast.success("User Promoted");
                                    setSelectedUser({...selectedUser, role: 'moderator'});
                                 } else toast.error(data.message || data.error);
                              }}
                              className="px-6 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all shadow-lg"
                            >
                               <ShieldCheck size={14} className="mr-2 inline" />
                               Promote
                            </button>
                         )}
                         {selectedUser.isBanned ? (
                            <button
                              onClick={() => handleStatusToggle(selectedUser, 'REINSTATE')}
                              className="px-6 py-2.5 rounded-xl bg-success text-text-primary text-[10px] font-black uppercase tracking-widest shadow-lg shadow-success/20 italic"
                            >
                               Reinstate
                            </button>
                         ) : (
                            <button
                              onClick={() => handleStatusToggle(selectedUser, 'BAN')}
                              className="px-6 py-2.5 rounded-xl bg-danger text-text-primary text-[10px] font-black uppercase tracking-widest shadow-lg shadow-danger/20 italic"
                            >
                               Terminate Access
                            </button>
                         )}
                         <button
                           onClick={() => handleArchiveUser(selectedUser)}
                           className="p-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all shadow-xl"
                           title="Archive User"
                         >
                            <Ban size={18} />
                         </button>
                         <button
                           onClick={() => handleDeleteUser(selectedUser)}
                           className="p-2.5 rounded-xl bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all shadow-xl"
                           title="Permanent Deletion"
                         >
                            <Trash2 size={18} />
                         </button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                      {isAssigning ? (
                          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Work Authorization Hub</h4>
                             <p className="text-xs text-text-tertiary font-medium">Select a designated task to forcibly assign and reward this user.</p>

                             <div className="space-y-3">
                                {users.filter(u => u.role === 'admin' && false).length === 0 && (
                                   <div className="p-8 rounded-2xl bg-surface-bright border border-border text-center opacity-50 space-y-4">
                                      <TrendingUp size={24} className="mx-auto" />
                                      <p className="text-[9px] font-black uppercase tracking-widest">Task Library Synchronizing...</p>
                                      <button
                                        onClick={async () => {
                                           const ts = await getDocs(collection(db, 'tasks'));
                                           const tList = ts.docs.map(d => ({ id: d.id, ...d.data() }));
                                           (window as any).adminTaskList = tList;
                                           toast.success("Task Library Loaded");
                                        }}
                                        className="text-[8px] text-primary underline"
                                      >Manual Load</button>
                                   </div>
                                )}

                                <div className="max-h-96 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                                   {((window as any).adminTaskList || []).map((t: any) => (
                                      <button
                                        key={t.id}
                                        onClick={async () => {
                                           if(!window.confirm(`ASSIGN AND REWARD: "${t.title}" to ${selectedUser.username}?`)) return;
                                           setIsAssigning(false);
                                           const load = toast.loading("Executing Force Reward...");
                                           const res = await PointTransactionEngine.execute({
                                              userId: selectedUser.id,
                                              amount: t.rewardAmount,
                                              type: 'task_reward',
                                              source: `Admin Assign: ${t.title}`,
                                              claimId: `adm_force_${Date.now()}`,
                                              xpReward: t.xpReward,
                                              referenceId: t.id
                                           });
                                           toast.dismiss(load);
                                           if(res.success) toast.success("User Rewarded Successfully");
                                           else toast.error(res.error);
                                        }}
                                        className="w-full p-4 rounded-xl bg-surface-bright border border-border hover:border-primary/40 text-left transition-all group flex items-center justify-between"
                                      >
                                         <div>
                                            <p className="text-[11px] font-bold text-text-primary uppercase group-hover:text-primary transition-colors">{t.title}</p>
                                            <p className="text-[9px] font-mono text-text-tertiary mt-1">+{t.rewardAmount} PTS | {t.category}</p>
                                         </div>
                                         <Plus size={14} className="text-text-tertiary group-hover:text-primary" />
                                      </button>
                                   ))}
                                </div>
                             </div>

                             <button
                               onClick={() => setIsAssigning(false)}
                               className="w-full py-4 bg-surface-bright border border-border text-text-tertiary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-text-primary transition-all"
                             >
                                Return to Details
                             </button>
                          </section>
                      ) : isEditing ? (
                          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="space-y-6">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Username Authority</label>
                                   <input
                                      value={editForm.username}
                                      onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm"
                                      placeholder="Enter new username..."
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Email Directive</label>
                                   <input
                                      value={editForm.email}
                                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                      className="w-full font-mono bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm"
                                      placeholder="Enter active email..."
                                   />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Access Role</label>
                                      <select
                                         value={editForm.role}
                                         onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                         className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm appearance-none"
                                      >
                                         <option value="user">USER</option>
                                         <option value="moderator">MODERATOR</option>
                                         <option value="admin">ADMIN</option>
                                      </select>
                                   </div>
                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Verification Status</label>
                                      <div className="flex items-center gap-4 h-[48px] bg-surface-bright border border-border rounded-xl px-5">
                                         <input
                                            type="checkbox"
                                            checked={editForm.emailVerified}
                                            onChange={e => setEditForm({ ...editForm, emailVerified: e.target.checked })}
                                            className="w-5 h-5 accent-primary"
                                         />
                                         <span className="text-[10px] font-black uppercase tracking-widest">Mark Verified</span>
                                      </div>
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-4 pt-4">
                                <button
                                   onClick={handleUpdateProfile}
                                   className="flex-1 py-4 bg-primary text-text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                                >
                                   Save Changes
                                </button>
                                <button
                                   onClick={() => setIsEditing(false)}
                                   className="flex-1 py-4 bg-surface-bright border border-border text-text-tertiary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-text-primary transition-all"
                                >
                                   Abort
                                </button>
                             </div>
                          </section>
                      ) : (
                          <>
                             <section className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-3xl border border-border p-1 mb-6 relative">
                                   <img src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${selectedUser.id}`} alt="" className="w-full h-full rounded-2xl" />
                                   <div className={cn("absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border border-border-bright flex items-center justify-center shadow-2xl", selectedUser.isBanned ? "bg-danger text-text-primary" : "bg-success text-text-primary")}>
                                      {selectedUser.isBanned ? <Ban size={16} /> : <CheckCircle size={16} />}
                                   </div>
                                </div>
                                <h3 className="text-2xl font-bold text-text-primary uppercase tracking-tighter italic leading-none">{selectedUser.username}</h3>
                                <p className="text-[10px] font-mono text-text-tertiary mt-3 uppercase tracking-[0.2em]">{selectedUser.id}</p>
                                <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-primary">{selectedUser.role || 'USER'}</span>
                                </div>
                             </section>

                      <div className="grid grid-cols-3 gap-4">
                         <div className="bg-surface-bright rounded-2xl p-6 border border-border text-center shadow-inner group relative overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-2">Liquid Balance</p>
                            <p className="text-xl font-mono font-bold text-text-primary">{selectedUser.points?.toLocaleString()}</p>
                            <div className="mt-4 flex justify-center gap-2">
                               <button onClick={(e) => { e.stopPropagation(); handleManualAdjustment(false, 100); }} className="p-1.5 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-all"><Plus size={12} /></button>
                               <button onClick={(e) => { e.stopPropagation(); handleManualAdjustment(false, -100); }} className="p-1.5 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-all"><Minus size={12} /></button>
                            </div>
                         </div>
                         <div className="bg-surface-bright rounded-2xl p-6 border border-border text-center shadow-inner group relative overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-2">Progression</p>
                            <p className="text-xl font-mono font-bold text-primary">LVL {selectedUser.level || 1}</p>
                            <div className="mt-4 flex justify-center gap-2">
                               <button onClick={(e) => { e.stopPropagation(); handleManualAdjustment(true, 50); }} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"><Plus size={12} /></button>
                               <button onClick={(e) => { e.stopPropagation(); handleManualAdjustment(true, -50); }} className="p-1.5 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-all"><Minus size={12} /></button>
                            </div>
                         </div>
                         <div className="bg-surface-bright rounded-2xl p-6 border border-border text-center shadow-inner">
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-2">Streak</p>
                            <p className="text-xl font-mono font-bold text-warning">{selectedUser.streak || 0} D</p>
                         </div>
                      </div>

                      <section className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3">
                            <Activity size={14} className="text-primary" />
                            Ledger
                         </h4>
                         <div className="space-y-1 bg-surface-bright/50 border border-border rounded-2xl overflow-hidden shadow-inner">
                            {userActivity.map(tx => (
                               <div key={tx.id} className="p-4 flex justify-between items-center border-b border-border last:border-0 hover:bg-surface-bright transition-colors">
                                  <div>
                                     <p className="text-[11px] font-bold text-text-primary uppercase italic">{tx.source}</p>
                                     <p className="text-[9px] font-mono text-text-tertiary mt-1">{(tx.executedAt?.toDate?.() || new Date()).toLocaleDateString()}</p>
                                  </div>
                                  <p className={cn("text-xs font-mono font-bold", tx.amount > 0 ? "text-success" : "text-text-primary")}>
                                     {tx.amount > 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                                  </p>
                               </div>
                            ))}
                         </div>
                      </section>
                          </>
                      )}
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};

export default OpsUsers;
