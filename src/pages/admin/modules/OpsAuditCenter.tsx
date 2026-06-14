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
  Filter
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where
} from 'firebase/firestore';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';

const OpsAuditCenter: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'THREATS' | 'AUDIT' | 'FLAGS'>('THREATS');
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    let q;

    if (activeTab === 'THREATS') {
      q = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(50));
    } else if (activeTab === 'AUDIT') {
      q = query(collection(db, 'system_audit'), orderBy('timestamp', 'desc'), limit(50));
    } else {
      q = query(collection(db, 'users'), where('flagged', '==', true), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [activeTab]);

  const renderThreat = (ano: any) => (
    <div key={ano.id} className={cn(
      "p-6 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group bg-[#0A0A0F] hover:border-primary/20 shadow-xl mb-4",
      ano.severity === 'HIGH' ? "border-danger/10 hover:border-danger/30" : "border-white/5"
    )}>
      <div className="flex items-center gap-6">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
          ano.severity === 'HIGH' ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
        )}>
          <ShieldAlert size={20} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-white uppercase tracking-tight italic text-sm">{ano.error}</h3>
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
              ano.severity === 'HIGH' ? "bg-danger/20 text-danger border-danger/20" : "bg-warning/20 text-warning border-warning/20"
            )}>
              {ano.severity}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-mono text-white/20 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><User size={10} /> {ano.userId?.slice(0, 16)}...</div>
            <div className="w-1 h-1 rounded-full bg-white/5" />
            <div className="flex items-center gap-1.5 text-primary"><Zap size={10} /> {ano.context}</div>
            <div className="w-1 h-1 rounded-full bg-white/5" />
            <div className="flex items-center gap-1.5"><Clock size={10} /> {ano.timestamp?.toDate?.()?.toLocaleString() || 'PENDING'}</div>
          </div>
        </div>
      </div>
      <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
        <ChevronRight size={16} className="text-white/20" />
      </button>
    </div>
  );

  const renderAudit = (log: any) => (
    <div key={log.id} className="p-6 rounded-2xl border border-white/5 bg-[#0A0A0F] hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl mb-4">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-all">
          <Fingerprint size={20} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-white uppercase tracking-tight text-sm">{log.action?.replace(/_/g, ' ')}</h3>
            <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded border border-primary/20">LOGGED</span>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-mono text-white/20 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><ShieldCheck size={10} className="text-primary" /> {log.performedBy || 'SYSTEM'}</div>
            <div className="w-1 h-1 rounded-full bg-white/5" />
            <div className="flex items-center gap-1.5">Target: {log.targetId?.slice(0, 8)}</div>
            <div className="w-1 h-1 rounded-full bg-white/5" />
            <div className="flex items-center gap-1.5">{log.timestamp?.toDate?.()?.toLocaleString() || 'PENDING'}</div>
          </div>
        </div>
      </div>
      <div className="text-[10px] font-mono text-white/10 uppercase tracking-tighter">
        SHA-256: {log.id.slice(0, 16).toUpperCase()}
      </div>
    </div>
  );

  const renderFlag = (user: any) => (
    <div key={user.id} className="p-6 rounded-2xl border border-danger/10 bg-danger/[0.02] hover:border-danger/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl mb-4">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
          <AlertTriangle size={20} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-white uppercase tracking-tight text-sm">{user.username || 'ANONYMOUS_NODE'}</h3>
            <div className="flex gap-1">
              {user.fraudFlags?.map((f: string) => (
                <span key={f} className="bg-danger/20 text-danger text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-danger/20">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{user.email || user.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">XP_AUTHORITY</p>
          <p className="text-sm font-mono font-bold text-white">{(user.xp || 0).toLocaleString()}</p>
        </div>
        <button className="px-4 py-2 bg-danger/10 text-danger text-[9px] font-black uppercase tracking-widest rounded-lg border border-danger/20 hover:bg-danger/20 transition-all">
          ISOLATE_NODE
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
            <h1 className="text-3xl font-bold tracking-tight uppercase italic text-white">Fraud & Audit Center</h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">Strategic perimeter defense and administrative mutation tracking.</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
          {[
            { id: 'THREATS', icon: Activity, label: 'Threat Stream' },
            { id: 'AUDIT', icon: History, label: 'Audit Trail' },
            { id: 'FLAGS', icon: AlertTriangle, label: 'Flagged Nodes' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/20 hover:text-white hover:bg-white/5"
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
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Scan perimeter by ID, Action or Vector..."
              className="w-full bg-[#0A0A0F] border border-white/5 rounded-[1.5rem] py-5 pl-16 pr-8 text-sm focus:border-primary/50 outline-none transition-all font-medium shadow-2xl"
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
                [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse mb-4" />)
              ) : data.length > 0 ? (
                data.map(item => {
                  if (activeTab === 'THREATS') return renderThreat(item);
                  if (activeTab === 'AUDIT') return renderAudit(item);
                  return renderFlag(item);
                })
              ) : (
                <div className="py-40 text-center border border-dashed border-white/10 rounded-[3rem] bg-[#0A0A0F] opacity-40">
                  <ShieldCheck size={48} className="mx-auto text-success/40 mb-6" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary italic">Perimeter Secure</h3>
                  <p className="text-[10px] font-mono text-white/10 uppercase tracking-widest mt-2">Zero actionable signals detected in current window</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <section className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3 mb-8">
              <Filter size={16} className="text-primary" /> Filter Logic
            </h2>
            <div className="space-y-3">
              {['ALL_EVENTS', 'AUTH_FAILURE', 'ECON_ANOMALY', 'API_BREACH'].map(f => (
                <button key={f} className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.01] text-left text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-primary/30 transition-all">
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
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Integrity Score</p>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-success" />
                </div>
              </div>
              <div>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Audit Latency</p>
                <p className="text-xl font-mono font-bold text-white">12ms</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OpsAuditCenter;
