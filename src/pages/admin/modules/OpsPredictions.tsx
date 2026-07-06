import * as React from "react";
import {
  TrendingUp,
  Activity,
  ArrowRight,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  orderBy,
  startAfter
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { PredictionRecord, Campaign } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import { MarketResolutionEngine } from '../../../engines/predictions/MarketResolutionEngine';
import DataTable from '../../../components/admin/common/DataTable';

const OpsPredictions: React.FC = () => {
  const [predictions, setPredictions] = React.useState<PredictionRecord[]>([]);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchPredictions = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'user_predictions'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'user_predictions'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PredictionRecord));

      if (isNext) {
        setPredictions(prev => [...prev, ...data]);
      } else {
        setPredictions(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsPredictions] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPredictions();

    const cq = query(collection(db, 'campaigns'), where('category', '==', 'PREDICTION'));
    const unsub = onSnapshot(cq, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });

    return unsub;
  }, []);

  const runAutomatedResolution = async () => {
     const loadingToast = toast.loading('Executing automated market resolution...');
     try {
        const result = await MarketResolutionEngine.resolveExpiredPredictions();
        toast.dismiss(loadingToast);
        toast.success(`Resolution cycle complete. Resolved: ${result.resolved}`);
        fetchPredictions(); // Refresh
     } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error(`Engine Failure: ${err.message}`);
     }
  };

  const resolveCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`SETTLE CAMPAIGN: "${campaign.name}"?\n\nThe backend will fetch the authoritative live price at settlement time.`)) return;

    const loadingToast = toast.loading('Executing settlement...');
    try {
      const predsQ = query(collection(db, 'user_predictions'), where('taskId', '==', campaign.id), where('status', '==', 'ACTIVE'));
      const predsSnap = await getDocs(predsQ);

      // Each prediction is settled server-side via /api/resolve-prediction which
      // re-fetches the authoritative live price at the moment of settlement.
      // Never pass a client-fetched price — the server is the single source of truth.
      const results = await Promise.allSettled(
        predsSnap.docs.map(pDoc =>
          fetch('/api/resolve-prediction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId: pDoc.id }),
          }).then(r => r.json())
        )
      );

      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success));

      await updateDoc(doc(db, 'campaigns', campaign.id), {
        active: false,
        status: 'ARCHIVED',
        updatedAt: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      if (failures.length > 0) {
        toast.error(`Campaign archived. ${failures.length} prediction(s) failed settlement — check audit logs.`);
      } else {
        toast.success(`Campaign "${campaign.name}" settled and archived.`);
      }
      fetchPredictions();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(`Settlement Failed: ${err.message}`);
    }
  };

  const filtered = predictions.filter(p =>
    p.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <TrendingUp size={20} />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Market Management</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Monitor asset predictions and manage market settlements.</p>
          </div>

          <button
             onClick={runAutomatedResolution}
             className="w-full md:w-auto px-6 py-3 bg-surface-bright border border-border-bright rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent transition-all flex items-center justify-center gap-2 italic"
          >
             <Activity size={14} /> Auto-Resolve
          </button>
       </header>

       <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {campaigns.filter(c => c.active).map(camp => (
                <div key={camp.id} className="p-8 rounded-[2rem] bg-surface border border-border space-y-8 shadow-2xl relative overflow-hidden group">
                   <div className="flex justify-between items-start relative z-10">
                      <div>
                         <h3 className="text-lg font-bold text-text-primary uppercase italic">{camp.name}</h3>
                         <p className="text-[10px] font-mono text-text-tertiary mt-1">Ref: {camp.id.slice(0, 12).toUpperCase()}</p>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-success/10 text-success border border-success/20 text-[8px] font-black uppercase tracking-widest">LIVE</div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-bright rounded-2xl p-4 border border-border">
                         <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-1">Participants</p>
                         <p className="text-lg font-mono font-bold text-text-primary">{predictions.filter(p => p.taskId === camp.id).length}</p>
                      </div>
                      <div className="bg-surface-bright rounded-2xl p-4 border border-border text-right">
                         <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-1">Valuation</p>
                         <p className="text-lg font-mono font-bold text-primary">2.0X FIXED</p>
                      </div>
                   </div>

                   <button
                     onClick={() => resolveCampaign(camp)}
                     className="w-full py-4 bg-primary text-text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 italic"
                   >
                      Settle Predictions <ArrowRight size={14} />
                   </button>
                </div>
             ))}
          </div>
       </section>

       <DataTable
         columns={[
           {
             header: 'Prediction Details',
             accessor: (pred: PredictionRecord) => (
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                     <DollarSign size={18} />
                  </div>
                  <div>
                     <p className="text-xs md:text-sm font-bold text-text-primary uppercase italic group-hover:text-primary transition-colors">{pred.symbol} FORECAST</p>
                     <p className="text-[9px] md:text-[10px] font-mono text-text-tertiary mt-1 uppercase">ID: {pred.userId.slice(0, 12)}...</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Direction',
             accessor: (pred: PredictionRecord) => (
               <div className="flex items-center gap-2 md:gap-3">
                  {pred.direction === 'UP' ? <TrendingUp size={16} className="text-success" /> : <TrendingDown size={16} className="text-danger" />}
                  <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]", pred.direction === 'UP' ? 'text-success' : 'text-danger')}>
                     MARKET {pred.direction}
                  </span>
               </div>
             )
           },
           {
             header: 'Entry Price',
             accessor: (pred: PredictionRecord) => (
               <p className="text-xs md:text-sm font-mono font-bold text-text-primary">${pred.entryPrice.toLocaleString()}</p>
             )
           },
           {
             header: 'Status',
             className: 'text-right',
             accessor: (pred: PredictionRecord) => (
               <span className={cn(
                  "px-2 md:px-3 py-1 md:py-1.5 rounded text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] border",
                  pred.status === 'RESOLVED' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
               )}>
                  {pred.status}
               </span>
             )
           }
         ]}
         data={filtered}
         isLoading={loading}
         searchTerm={searchTerm}
         onSearchChange={setSearchTerm}
         searchPlaceholder="Scan positions..."
         onLoadMore={() => fetchPredictions(true)}
         hasMore={hasMore}
       />
    </div>
  );
};

export default OpsPredictions;
