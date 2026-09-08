import React from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Activity, AlertTriangle, CheckCircle2, Coins, Database, ShieldAlert, Cpu } from 'lucide-react';
import { db } from '../../../firebase/config';

const collections = ['psemine_campaigns', 'psemine_tools', 'psemine_orders', 'psemine_fraud_flags', 'psemine_audit_logs'] as const;
type CollectionName = typeof collections[number];

export default function OpsPsemine() {
  const [counts, setCounts] = React.useState<Record<CollectionName, number>>({
    psemine_campaigns: 0,
    psemine_tools: 0,
    psemine_orders: 0,
    psemine_fraud_flags: 0,
    psemine_audit_logs: 0
  });

  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');

  React.useEffect(() => {
    let remaining = collections.length;
    const unsubscribers = collections.map((name) =>
      onSnapshot(
        query(collection(db, name), orderBy('createdAt', 'desc'), limit(100)),
        (snapshot) => {
          setCounts((current) => ({ ...current, [name]: snapshot.size }));
          remaining -= 1;
          if (remaining <= 0) setStatus('ready');
        },
        () => setStatus('error')
      )
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const cards = [
    { label: 'Genesis Campaigns', key: 'psemine_campaigns', icon: Activity },
    { label: 'Mining Tools Catalog', key: 'psemine_tools', icon: Coins },
    { label: 'Live BNB Orders', key: 'psemine_orders', icon: Database },
    { label: 'Security Fraud Flags', key: 'psemine_fraud_flags', icon: ShieldAlert },
    { label: 'Protocol Audit Logs', key: 'psemine_audit_logs', icon: AlertTriangle }
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
          <Cpu size={14} />
          <span>PSEmine Operational Control Center</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">PSEmine Mining Subsystem Operations</h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Operational overview for dedicated <code className="text-emerald-400 font-mono">psemine_*</code> collections. Server-authoritative state monitoring, active campaign metrics, orders, and security audit logs.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
        {status === 'ready' ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : status === 'error' ? (
          <AlertTriangle size={16} className="text-red-400" />
        ) : (
          <Activity size={16} className="animate-pulse text-emerald-400" />
        )}
        <span>{status === 'ready' ? 'Live Firestore snapshots active' : status === 'error' ? 'Snapshot sync issue' : 'Synchronizing metrics...'}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, key, icon: Icon }) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-[#12121A] p-5 space-y-3">
            <div className="p-2 w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{label}</p>
              <p className="text-2xl font-black text-white mt-1">{counts[key]}</p>
            </div>
            <p className="text-[10px] text-zinc-500">Latest 100 entries</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-xs leading-relaxed text-zinc-300">
        <strong className="text-emerald-400 font-bold block mb-1">PSEmine Subsystem Isolation Guarantee</strong>
        PSEmine data is strictly partitioned into dedicated <code className="text-emerald-400 font-mono">psemine_*</code> collections. PulseEarn XP, points, tasks, and offerwall logic remain isolated from PSEmine mining calculations.
      </div>
    </div>
  );
}
