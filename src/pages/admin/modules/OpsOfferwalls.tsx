import * as React from 'react';
import {
  Globe,
  Plus,
  ExternalLink,
  Activity,
  BarChart3,
  ShieldCheck,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import ProviderManagerModal from './modals/ProviderManagerModal';
import toast from 'react-hot-toast';
import { formatUSD } from '../../../utils/finance';

const OpsOfferwalls: React.FC = () => {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [callbacks, setCallbacks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
     totalRevenue: 0,
     totalCallbacks: 0,
     payouts24h: 0
  });

  const [hasMoreCallbacks, setHasMoreCallbacks] = React.useState(true);
  const [lastCallbackDoc, setLastCallbackDoc] = React.useState<any>(null);

  const fetchProviders = async () => {
    try {
      const snap = await getDocs(collection(db, 'system_config'));
      const list = snap.docs
        .filter(d => d.id.startsWith('provider_'))
        .map(d => ({ id: d.id, ...d.data(), providerName: d.id.replace('provider_', '').toUpperCase() }));
      setProviders(list);
    } catch (err) {
      toast.error("Failed to load providers");
    }
  };

  const fetchCallbacks = async (isNext = false) => {
     setLoading(true);
     try {
        let q = query(
           collection(db, 'system_claims'),
           where('type', '>=', 'offerwall_'),
           where('type', '<=', 'offerwall_\uf8ff'),
           orderBy('type'),
           orderBy('executedAt', 'desc'),
           limit(10)
        );

        if (isNext && lastCallbackDoc) {
           q = query(
              collection(db, 'system_claims'),
              where('type', '>=', 'offerwall_'),
              where('type', '<=', 'offerwall_\uf8ff'),
              orderBy('type'),
              orderBy('executedAt', 'desc'),
              startAfter(lastCallbackDoc),
              limit(10)
           );
        }

        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (isNext) setCallbacks(prev => [...prev, ...data]);
        else {
           setCallbacks(data);
           // Calculate quick stats from visible data (approximate)
           const total = data.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
           setStats(prev => ({ ...prev, totalRevenue: total, totalCallbacks: data.length }));
        }

        setLastCallbackDoc(snap.docs[snap.docs.length - 1]);
        setHasMoreCallbacks(snap.docs.length === 10);
     } catch (err) {
        console.error("[OpsOfferwalls] Callback Fetch Error:", err);
     } finally {
        setLoading(false);
     }
  };

  React.useEffect(() => {
    fetchProviders();
    fetchCallbacks();
  }, []);

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Globe size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-text-primary">Offerwall Control</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Manage third-party offerwall integrations, API keys, and revenue sharing.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button
               onClick={() => { setSelectedProviderId(null); setIsModalOpen(true); }}
               className="flex-1 md:flex-none px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
             >
                <Plus size={16} /> New Provider
             </button>
          </div>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-border p-8 rounded-[2rem] shadow-2xl space-y-4">
             <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                   <BarChart3 size={20} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Cumulative</span>
             </div>
             <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-1">Ecosystem Yield</p>
                <p className="text-2xl font-mono font-bold text-text-primary">{stats.totalRevenue.toLocaleString()} <span className="text-[10px] opacity-40">PTS</span></p>
             </div>
          </div>

          <div className="bg-surface border border-border p-8 rounded-[2rem] shadow-2xl space-y-4">
             <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                   <ShieldCheck size={20} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Verified</span>
             </div>
             <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-1">Successful Conversions</p>
                <p className="text-2xl font-mono font-bold text-text-primary">{stats.totalCallbacks.toLocaleString()} <span className="text-[10px] opacity-40">EVENTS</span></p>
             </div>
          </div>

          <div className="bg-surface border border-border p-8 rounded-[2rem] shadow-2xl space-y-4">
             <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                   <Activity size={20} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">Real-time</span>
             </div>
             <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-1">Active Integrations</p>
                <p className="text-2xl font-mono font-bold text-text-primary">{providers.filter(p => p.active).length} <span className="text-[10px] opacity-40">DRIVERS</span></p>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-8">
          <div className="space-y-6">
             <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-3 px-1">
                <ShieldCheck size={14} className="text-primary" />
                Provider Directory
             </h2>
          </div>
          <DataTable
            columns={[
              {
                header: 'Provider',
                accessor: (p: any) => (
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary shadow-inner">
                        <Globe size={18} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-text-primary uppercase italic">{p.providerName}</p>
                        <p className="text-[9px] font-mono text-text-tertiary mt-1 uppercase tracking-widest">{p.id}</p>
                     </div>
                  </div>
                )
              },
              {
                header: 'Status',
                accessor: (p: any) => (
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit ${p.active ? 'bg-success/5 text-success border-success/20' : 'bg-danger/5 text-danger border-danger/20'}`}>
                     {p.active ? 'Active' : 'Inactive'}
                  </div>
                )
              },
              {
                header: 'Revenue Shares',
                accessor: (p: any) => (
                  <div className="flex items-center gap-4 text-[10px] font-mono font-bold">
                     <div className="flex flex-col">
                        <span className="text-[8px] text-text-tertiary uppercase">Platform</span>
                        <span className="text-primary">{((p.platformShare ?? 0) * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] text-text-tertiary uppercase">User</span>
                        <span className="text-success">{((p.userShare ?? 0) * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] text-text-tertiary uppercase">Ref</span>
                        <span className="text-warning">{((p.referralShare ?? 0) * 100).toFixed(0)}%</span>
                     </div>
                  </div>
                )
              },
              {
                header: 'Actions',
                className: 'text-right',
                accessor: (p: any) => (
                  <div className="flex items-center justify-end gap-2">
                     <button
                       onClick={(e) => { e.stopPropagation(); setSelectedProviderId(p.id.replace('provider_', '')); setIsModalOpen(true); }}
                       className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all"
                     >
                        <ExternalLink size={16} />
                     </button>
                  </div>
                )
              }
            ]}
            data={providers}
            isLoading={false}
            onRowClick={(p) => { setSelectedProviderId(p.id.replace('provider_', '')); setIsModalOpen(true); }}
          />
       </div>

       <div className="space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-3 px-1">
             <Clock size={14} className="text-primary" />
             Live Conversion Stream
          </h2>
          <DataTable
             columns={[
                {
                   header: 'Event',
                   accessor: (c: any) => (
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-lg bg-surface-bright border border-border flex items-center justify-center text-success shadow-inner">
                            <ArrowUpRight size={14} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-text-primary uppercase italic">{c.type.replace('offerwall_', '').toUpperCase()}</p>
                            <p className="text-[8px] font-mono text-text-tertiary mt-0.5">{c.id.slice(0, 16)}...</p>
                         </div>
                      </div>
                   )
                },
                {
                   header: 'User',
                   accessor: (c: any) => (
                      <p className="text-[10px] font-mono font-medium text-text-secondary uppercase">{c.userId.slice(0, 12)}...</p>
                   )
                },
                {
                   header: 'Yield',
                   className: 'text-right',
                   accessor: (c: any) => (
                      <div>
                         <p className="text-[10px] font-mono font-bold text-success">+{c.amount.toLocaleString()} PTS</p>
                         <p className="text-[8px] font-black text-text-tertiary uppercase mt-0.5 tracking-widest italic">{formatUSD(c.amount / 1000)}</p>
                      </div>
                   )
                },
                {
                   header: 'Timestamp',
                   className: 'text-right',
                   accessor: (c: any) => (
                      <p className="text-[9px] font-mono text-text-tertiary uppercase">{(c.executedAt?.toDate?.() || new Date()).toLocaleTimeString()}</p>
                   )
                }
             ]}
             data={callbacks}
             isLoading={loading}
             onLoadMore={() => fetchCallbacks(true)}
             hasMore={hasMoreCallbacks}
          />
       </div>

       <ProviderManagerModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); fetchProviders(); }}
         providerId={selectedProviderId}
       />
    </div>
  );
};

export default OpsOfferwalls;
