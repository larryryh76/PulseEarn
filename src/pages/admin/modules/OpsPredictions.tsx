import * as React from "react";
import {
  TrendingUp,
  Activity,
  Search,
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
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { PredictionRecord, Campaign } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import { MarketResolutionEngine } from '../../../engines/predictions/MarketResolutionEngine';
import { useCryptoData } from '../../../hooks/useCryptoData';

const OpsPredictions: React.FC = () => {
  const [predictions, setPredictions] = React.useState<PredictionRecord[]>([]);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { marketData } = useCryptoData();

  React.useEffect(() => {
    const q = query(collection(db, 'user_predictions'), limit(200));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PredictionRecord));
      data.sort((a, b) => {
         const timeA = (a.createdAt as any)?.toMillis?.() || 0;
         const timeB = (b.createdAt as any)?.toMillis?.() || 0;
         return timeB - timeA;
      });
      setPredictions(data);
      setLoading(false);
    });

    const cq = query(collection(db, 'campaigns'), where('category', '==', 'PREDICTION'));
    onSnapshot(cq, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });

    return unsubscribe;
  }, []);

  const runAutomatedResolution = async () => {
     const loadingToast = toast.loading('Executing automated market resolution...');
     try {
        const result = await MarketResolutionEngine.resolveExpiredPredictions();
        toast.dismiss(loadingToast);
        toast.success(`Resolution cycle complete. Resolved: ${result.resolved}`);
     } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error(`Engine Failure: ${err.message}`);
     }
  };

  const resolveCampaign = async (campaign: Campaign) => {
    const coinId = campaign.predictionAsset || 'bitcoin';
    const currentPrice = marketData.find(c => c.id === coinId)?.current_price;

    if (!currentPrice) return toast.error("Price logic vector unavailable");
    if (!window.confirm(`SETTLE CAMPAIGN: "${campaign.name}" at $${currentPrice.toLocaleString()}?`)) return;

    const loadingToast = toast.loading('Executing settlement matrix...');
    try {
      const predsQ = query(collection(db, 'user_predictions'), where('taskId', '==', campaign.id), where('status', '==', 'ACTIVE'));
      const predsSnap = await getDocs(predsQ);

      for (const pDoc of predsSnap.docs) {
        await PointTransactionEngine.resolvePrediction(pDoc.id, currentPrice);
      }

      await updateDoc(doc(db, 'campaigns', campaign.id), {
        active: false,
        status: 'ARCHIVED',
        updatedAt: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      toast.success(`Campaign ${campaign.name} finalized`);
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

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
             <button
               onClick={runAutomatedResolution}
               className="w-full sm:w-auto px-6 py-3 bg-surface-bright border border-border-bright rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent transition-all flex items-center justify-center gap-2 italic"
             >
                <Activity size={14} /> Auto-Resolve
             </button>
             <div className="relative group w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan positions..."
                  className="w-full bg-surface-bright border border-border-bright rounded-xl py-3 pl-12 pr-6 text-[11px] focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
          </div>
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

       <div className="bg-surface border border-border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
             <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
                <thead>
                   <tr className="bg-surface-bright border-b border-border whitespace-nowrap">
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Prediction Details</th>
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Direction</th>
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Entry Price</th>
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="p-12"><div className="h-4 bg-surface-bright rounded w-full" /></td></tr>)
                   ) : filtered.map((pred) => (
                      <tr key={pred.id} className="group hover:bg-surface-bright/50 transition-colors whitespace-nowrap">
                         <td className="p-6 md:p-8">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                                  <DollarSign size={18} />
                               </div>
                               <div>
                                  <p className="text-xs md:text-sm font-bold text-text-primary uppercase italic group-hover:text-primary transition-colors">{pred.symbol} FORECAST</p>
                                  <p className="text-[9px] md:text-[10px] font-mono text-text-tertiary mt-1 uppercase">ID: {pred.userId.slice(0, 12)}...</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-6 md:p-8">
                            <div className="flex items-center gap-2 md:gap-3">
                               {pred.direction === 'UP' ? <TrendingUp size={16} className="text-success" /> : <TrendingDown size={16} className="text-danger" />}
                               <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]", pred.direction === 'UP' ? 'text-success' : 'text-danger')}>
                                  MARKET {pred.direction}
                               </span>
                            </div>
                         </td>
                         <td className="p-6 md:p-8">
                            <p className="text-xs md:text-sm font-mono font-bold text-text-primary">${pred.entryPrice.toLocaleString()}</p>
                         </td>
                         <td className="p-6 md:p-8 text-right">
                            <span className={cn(
                               "px-2 md:px-3 py-1 md:py-1.5 rounded text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] border",
                               pred.status === 'RESOLVED' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                            )}>
                               {pred.status}
                            </span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

export default OpsPredictions;
