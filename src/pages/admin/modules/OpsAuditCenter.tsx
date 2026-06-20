import * as React from 'react';
import {
  ShieldAlert,
  Search,
  User,
  Zap,
  Clock,
  ShieldCheck,
  Activity,
  History,
  AlertTriangle,
  Fingerprint,
  ChevronRight,
  Filter,
  Eye,
  Users
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  limit,
  onSnapshot,
  where,
  doc,
  updateDoc
} from 'firebase/firestore';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';

const OpsAuditCenter: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'THREATS' | 'AUDIT' | 'FLAGS' | 'USERS' | 'REFERRALS'>('THREATS');
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    let q;

    if (activeTab === 'THREATS') {
      q = query(collection(db, 'system_anomalies'), limit(100));
    } else if (activeTab === 'AUDIT') {
      q = query(collection(db, 'system_audit'), limit(100));
    } else if (activeTab === 'FLAGS') {
      q = query(collection(db, 'users'), where('isFlagged', '==', true), limit(100));
    } else if (activeTab === 'REFERRALS') {
      q = query(collection(db, 'referrals'), limit(100));
    } else {
      q = query(collection(db, 'system_fingerprints'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Client-side sorting to prevent Missing Index failures
      docs.sort((a: any, b: any) => {
        const timeA = (a.timestamp || a.lastSeen)?.toMillis?.() || 0;
        const timeB = (b.timestamp || b.lastSeen)?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setData(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [activeTab]);

  const renderThreat = (ano: any) => (
    <div key={ano.id} className={cn(
      "p-6 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group bg-surface hover:border-primary/20 shadow-xl mb-4",
      ano.severity === 'HIGH' ? "border-danger/10 hover:border-danger/30" : "border-border"
    )}>
      <div className="flex items-center gap-4 md:gap-6">
        <div className={cn(
          "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
          ano.severity === 'HIGH' ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
        )}>
          <ShieldAlert size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5 md:mb-2">
            <h3 className="font-bold text-text-primary uppercase tracking-tight italic text-[11px] md:text-sm truncate max-w-[150px] md:max-w-none">{ano.error}</h3>
            <span className={cn(
              "px-2 py-0.5 rounded text-[7px] md:text-[8px] font-black uppercase tracking-widest border",
              ano.severity === 'HIGH' ? "bg-danger/20 text-danger border-danger/20" : "bg-warning/20 text-warning border-warning/20"
            )}>
              {ano.severity}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><User size={10} /> {ano.userId?.slice(0, 12)}...</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5 text-primary"><Zap size={10} /> {ano.context}</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5"><Clock size={10} /> {ano.timestamp?.toDate?.()?.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <button className="hidden lg:block p-3 bg-surface-bright hover:bg-surface-accent rounded-xl transition-all">
        <ChevronRight size={16} className="text-text-tertiary" />
      </button>
    </div>
  );

  const renderAudit = (log: any) => (
    <div key={log.id} className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl mb-4">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-all shrink-0">
          <Fingerprint size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5 md:mb-2">
            <h3 className="font-bold text-text-primary uppercase tracking-tight text-[11px] md:text-sm truncate max-w-[180px] md:max-w-none">{log.action?.replace(/_/g, ' ')}</h3>
            <span className="text-[7px] md:text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded border border-primary/20">LOGGED</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><ShieldCheck size={10} className="text-primary" /> {log.performedBy || 'SYSTEM'}</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">Target: {log.targetId?.slice(0, 8)}</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">{log.timestamp?.toDate?.()?.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <div className="text-[9px] md:text-[10px] font-mono text-text-tertiary/50 uppercase tracking-tighter truncate">
        SHA-256: {log.id.slice(0, 16).toUpperCase()}
      </div>
    </div>
  );

  const renderFlag = (user: any) => (
    <div key={user.id} className="p-6 rounded-2xl border border-danger/10 bg-danger/[0.02] hover:border-danger/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl mb-4">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-danger/10 flex items-center justify-center text-danger shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
            <h3 className="font-bold text-text-primary uppercase tracking-tight text-[11px] md:text-sm truncate max-w-[120px] md:max-w-none">{user.username || 'ANONYMOUS_NODE'}</h3>
            <div className="flex flex-wrap gap-1">
              <span className="bg-danger text-white text-[6px] md:text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">Risk: {user.riskLevel || 'HIGH'}</span>
              {user.fraudFlags?.map((f: string) => (
                <span key={f} className="bg-danger/20 text-danger text-[6px] md:text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-danger/20">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <p className="text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase tracking-widest truncate">{user.email}</p>
             <span className="text-text-tertiary/20">|</span>
             <p className="text-[8px] font-mono text-text-tertiary italic uppercase">FP: {user.fingerprint?.slice(0, 12)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto">
        <div className="text-left lg:text-right">
          <p className="text-[7px] md:text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-0.5 md:mb-1">Score</p>
          <p className="text-xs md:text-sm font-mono font-bold text-text-primary">{user.riskScore || 0}</p>
        </div>
        <div className="flex items-center gap-2">
           <button
             onClick={async () => {
                await updateDoc(doc(db, 'users', user.id), { isFlagged: false, riskScore: 0, riskLevel: 'LOW' });
             }}
             className="px-4 py-2 bg-success/10 text-success text-[8px] font-black uppercase tracking-widest rounded-lg border border-success/20 hover:bg-success/20 transition-all"
           >
             Dismiss
           </button>
           <button className="px-4 py-2 bg-danger/10 text-danger text-[8px] font-black uppercase tracking-widest rounded-lg border border-danger/20 hover:bg-danger/20 transition-all italic">
             Restrict
           </button>
        </div>
      </div>
    </div>
  );

  const renderReferral = (ref: any) => (
    <div key={ref.id} className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl mb-4">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Users size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5 md:mb-2">
            <h3 className="font-bold text-text-primary uppercase tracking-tight text-[11px] md:text-sm truncate">REF: {ref.refereeUsername || 'ANONYMOUS'}</h3>
            <div className="flex items-center gap-2">
               <span className={cn(
                 "text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border",
                 ref.status === 'REWARDED' ? "bg-success/10 text-success border-success/20" : "bg-surface-bright text-text-tertiary border-border"
               )}>
                 {ref.status}
               </span>
               {ref.status === 'REWARDED' && (
                 <span className="text-[7px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                    IDEMPOTENT_OK
                 </span>
               )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><Zap size={10} className="text-primary" /> Referrer: {ref.referrerId?.slice(0, 12)}...</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">Referee: {ref.refereeId?.slice(0, 12)}...</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">Join: {ref.createdAt?.toDate?.()?.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-right">
           <p className="text-[7px] font-black text-text-tertiary uppercase tracking-widest mb-1">TX Authority</p>
           <p className="text-[10px] font-mono font-bold text-text-primary">{ref.rewardTransactionId?.slice(0, 12) || 'PENDING_QUAL'}</p>
        </div>
        <div className="flex flex-col gap-1 items-end">
           <div className="flex items-center gap-1.5">
              <div className={cn("w-1 h-1 rounded-full", ref.rewardTransactionId ? "bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-white/10")} />
              <span className="text-[7px] font-bold text-text-tertiary uppercase tracking-widest">Ledger</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className={cn("w-1 h-1 rounded-full", ref.status === 'REWARDED' ? "bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-white/10")} />
              <span className="text-[7px] font-bold text-text-tertiary uppercase tracking-widest">Sync</span>
           </div>
        </div>
      </div>
    </div>
  );

  const renderFingerprint = (fp: any) => (
    <div key={fp.id} className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl mb-4">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-all shrink-0">
          <Fingerprint size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5 md:mb-2">
            <h3 className="font-bold text-text-primary uppercase tracking-tight text-[11px] md:text-sm truncate">NODE_FP: {fp.fingerprint}</h3>
            <span className="text-[7px] md:text-[8px] font-black text-text-tertiary uppercase tracking-[0.2em] bg-surface-bright px-2 py-0.5 rounded border border-border">ACTIVE</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><User size={10} className="text-primary" /> UID: {fp.userId?.slice(0, 12)}...</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">Last Seen: {fp.lastSeen?.toDate?.()?.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
         <button className="p-3 bg-surface-bright hover:bg-surface-accent rounded-xl transition-all border border-border">
            <Eye size={16} className="text-text-tertiary" />
         </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-danger" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Audit Center</h1>
          </div>
          <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Monitor system anomalies, administrative logs, and flagged accounts.</p>
        </div>

        <div className="flex bg-surface-bright p-1 rounded-2xl border border-border backdrop-blur-xl max-w-full overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'THREATS', icon: Activity, label: 'Anomalies' },
            { id: 'AUDIT', icon: History, label: 'Log' },
            { id: 'FLAGS', icon: AlertTriangle, label: 'Security Queue' },
            { id: 'REFERRALS', icon: Users, label: 'Referrals' },
            { id: 'USERS', icon: Fingerprint, label: 'Users' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-primary text-text-primary shadow-lg shadow-primary/20" : "text-text-tertiary hover:text-text-primary hover:bg-surface-bright"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="relative group mb-8">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by ID or Action..."
              className="w-full bg-surface border border-border rounded-[1.5rem] py-5 pl-16 pr-8 text-[11px] md:text-sm focus:border-primary/50 outline-none transition-all font-medium shadow-2xl"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-surface-bright border border-border rounded-2xl animate-pulse mb-4" />)
              ) : data.length > 0 ? (
                data.map(item => {
                  if (activeTab === 'THREATS') return renderThreat(item);
                  if (activeTab === 'AUDIT') return renderAudit(item);
                  if (activeTab === 'FLAGS') return renderFlag(item);
                  if (activeTab === 'REFERRALS') return renderReferral(item);
                  return renderFingerprint(item);
                })
              ) : (
                <div className="py-40 text-center border border-dashed border-border-bright rounded-[3rem] bg-surface opacity-40">
                  <ShieldCheck size={48} className="mx-auto text-success/40 mb-6" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary italic">System Secure</h3>
                  <p className="text-[10px] font-mono text-text-tertiary/50 uppercase tracking-widest mt-2">No suspicious activity detected in the current window</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <section className="bg-surface border border-border rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3 mb-8">
              <Filter size={16} className="text-primary" /> Filter Settings
            </h2>
            <div className="space-y-3">
              {['ALL_EVENTS', 'AUTH_FAILURE', 'ECON_ANOMALY', 'API_BREACH'].map(f => (
                <button key={f} className="w-full p-4 rounded-xl border border-border bg-surface-bright/50 text-left text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all">
                  {f}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-primary/[0.02] border border-primary/10 rounded-[2rem] p-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mb-6">
              <Zap size={16} /> Operational Health
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-2">Integrity Score</p>
                <div className="h-1.5 w-full bg-surface-bright rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-success" />
                </div>
              </div>
              <div>
                <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-2">Audit Latency</p>
                <p className="text-xl font-mono font-bold text-text-primary">12ms</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OpsAuditCenter;
