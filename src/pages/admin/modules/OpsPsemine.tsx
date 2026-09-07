import React from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Activity, AlertTriangle, CheckCircle2, Coins, Database, ShieldAlert } from 'lucide-react';
import { db } from '../../../firebase/config';

const collections = ['psemine_campaigns', 'psemine_tools', 'psemine_orders', 'psemine_fraud_flags', 'psemine_audit_logs'] as const;
type CollectionName = typeof collections[number];

export default function OpsPsemine() {
  const [counts, setCounts] = React.useState<Record<CollectionName, number>>({ psemine_campaigns: 0, psemine_tools: 0, psemine_orders: 0, psemine_fraud_flags: 0, psemine_audit_logs: 0 });
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  React.useEffect(() => {
    let remaining = collections.length;
    const unsubscribers = collections.map((name) => onSnapshot(query(collection(db, name), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => { setCounts((current) => ({ ...current, [name]: snapshot.size })); remaining -= 1; if (remaining <= 0) setStatus('ready'); }, () => setStatus('error')));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);
  const cards = [{ label: 'Campaigns', key: 'psemine_campaigns', icon: Activity }, { label: 'Tools', key: 'psemine_tools', icon: Coins }, { label: 'Orders', key: 'psemine_orders', icon: Database }, { label: 'Fraud flags', key: 'psemine_fraud_flags', icon: ShieldAlert }, { label: 'Audit events', key: 'psemine_audit_logs', icon: AlertTriangle }] as const;
  return <div className="space-y-8"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-primary">PSEmine operations</p><h1 className="mt-3 text-3xl font-black tracking-tight">Mining economy control</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Read-only operational visibility for PSEmine collections. Economic mutations remain server-authorized and are not exposed as client-side writes.</p></div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-tertiary">{status === 'ready' ? <CheckCircle2 size={15} className="text-success" /> : status === 'error' ? <AlertTriangle size={15} className="text-danger" /> : <Activity size={15} className="animate-pulse text-primary" />} {status === 'ready' ? 'Live collection snapshots' : status === 'error' ? 'One or more collections unavailable' : 'Loading collection snapshots'}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, key, icon: Icon }) => <div key={key} className="rounded-2xl border border-border bg-surface-bright p-5"><Icon size={18} className="text-primary" /><p className="mt-7 text-[10px] font-black uppercase tracking-widest text-text-tertiary">{label}</p><p className="mt-2 text-3xl font-black">{counts[key]}</p><p className="mt-1 text-[10px] text-text-tertiary">latest 100 records</p></div>)}</div><div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-xs leading-6 text-text-secondary">PSEmine is intentionally isolated from PulseEarn points, XP, streaks, tasks, referrals, wallet, and reward history. This panel only reads dedicated <code className="text-primary">psemine_*</code> collections.</div></div>;
}
