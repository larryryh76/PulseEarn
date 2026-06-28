import * as React from 'react';
import {
  ShieldAlert,
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
  where,
  doc,
  updateDoc,
  orderBy,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../../components/admin/common/DataTable';
import toast from 'react-hot-toast';

const OpsAuditCenter: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'THREATS' | 'AUDIT' | 'FLAGS' | 'USERS' | 'REFERRALS'>('THREATS');
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchAuditData = async (isNext = false) => {
    setLoading(true);
    try {
       let colName = 'system_anomalies';
       let orderField = 'timestamp';
       let filters: any[] = [];

       if (activeTab === 'AUDIT') colName = 'system_audit';
       else if (activeTab === 'FLAGS') {
          colName = 'users';
          filters = [where('isFlagged', '==', true)];
          orderField = 'createdAt';
       }
       else if (activeTab === 'REFERRALS') colName = 'referrals';
       else if (activeTab === 'USERS') {
          colName = 'system_fingerprints';
          orderField = 'lastSeen';
       }

       let q = query(
         collection(db, colName),
         ...filters,
         orderBy(orderField, 'desc'),
         limit(20)
       );

       if (isNext && lastDoc) {
          q = query(
             collection(db, colName),
             ...filters,
             orderBy(orderField, 'desc'),
             startAfter(lastDoc),
             limit(20)
          );
       }

       const snap = await getDocs(q);
       const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

       if (isNext) {
          setData(prev => [...prev, ...docs]);
       } else {
          setData(docs);
       }

       setLastDoc(snap.docs[snap.docs.length - 1]);
       setHasMore(snap.docs.length === 20);
    } catch (err) {
       console.error("[OpsAuditCenter] Fetch Error:", err);
       toast.error("Audit sync failure");
    } finally {
       setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAuditData();
  }, [activeTab]);

  const renderThreat = (ano: any) => (
    <div key={ano.id} className={cn(
      "p-6 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group bg-surface hover:border-primary/20 shadow-xl w-full",
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
    <div key={log.id} className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl w-full">
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
    <div key={user.id} className="p-6 rounded-2xl border border-danger/10 bg-danger/[0.02] hover:border-danger/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl w-full">
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
             onClick={async (e) => {
                e.stopPropagation();
                await updateDoc(doc(db, 'users', user.id), { isFlagged: false, riskScore: 0, riskLevel: 'LOW' });
                toast.success("Flag Dismissed");
                fetchAuditData();
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
    <div key={ref.id} className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl w-full">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Users size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5 md:mb-2">
            <h3 className="font-bold text-text-primary uppercase tracking-tight text-[11px] md:text-sm truncate">REF: {ref.refereeUsername || 'ANONYMOUS'}</h3>
            <span className={cn(
              "text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border",
              ref.status === 'REWARDED' ? "bg-success/10 text-success border-success/20" : "bg-surface-bright text-text-tertiary border-border"
            )}>
              {ref.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><Zap size={10} className="text-primary" /> Referrer: {ref.referrerId?.slice(0, 12)}...</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">Referee UID: {ref.refereeId?.slice(0, 12)}...</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-surface-bright" />
            <div className="flex items-center gap-1.5">Date: {ref.createdAt?.toDate?.()?.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[7px] md:text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-0.5 md:mb-1">TX ID</p>
        <p className="text-[10px] font-mono font-bold text-text-primary">{ref.rewardTransactionId?.slice(0, 8) || 'NONE'}</p>
      </div>
    </div>
  );

  const renderFingerprint = (fp: any) => (
    <div key={fp.id} className="p-6 rounded-2xl border border-border bg-surface hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group shadow-xl w-full">
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

  const filteredData = data.filter(item =>
    item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.error || item.action || item.username || item.refereeUsername || item.fingerprint)?.toLowerCase().includes(searchTerm.toLowerCase())
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
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <DataTable
            columns={[
              {
                header: 'Log Entry',
                accessor: (item: any) => {
                  if (activeTab === 'THREATS') return renderThreat(item);
                  if (activeTab === 'AUDIT') return renderAudit(item);
                  if (activeTab === 'FLAGS') return renderFlag(item);
                  if (activeTab === 'REFERRALS') return renderReferral(item);
                  return renderFingerprint(item);
                }
              }
            ]}
            data={filteredData}
            isLoading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search audit records..."
            onLoadMore={() => fetchAuditData(true)}
            hasMore={hasMore}
            activeFilter={activeTab}
            onFilterChange={(t) => setActiveTab(t as any)}
            filters={[
               { id: 'THREATS', label: 'Anomalies' },
               { id: 'AUDIT', label: 'Log' },
               { id: 'FLAGS', label: 'Security Queue' },
               { id: 'REFERRALS', label: 'Referrals' },
               { id: 'USERS', label: 'Users' }
            ]}
          />
        </div>

        <div className="space-y-6">
          <section className="bg-surface border border-border rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3 mb-8">
              <Filter size={16} className="text-primary" /> System Stats
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

          <section className="bg-primary/[0.02] border border-primary/10 rounded-[2rem] p-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mb-6">
              <Zap size={16} /> Operational
            </h2>
            <p className="text-[10px] text-text-tertiary leading-relaxed uppercase tracking-widest opacity-60">Audit feeds synchronized with PulseEarn Authority (v5.0.0-PRO).</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OpsAuditCenter;
