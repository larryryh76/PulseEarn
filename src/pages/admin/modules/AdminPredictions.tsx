import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Search,
  ArrowRight,
  DollarSign,
  Activity
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  serverTimestamp,
  getDocs,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { PredictionRecord, Campaign } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import { useCryptoData } from '../../../hooks/useCryptoData';
import Card from '../../../components/ui/Card';

const AdminPredictions = () => {
  const [predictions, setPredictions] = React.useState<PredictionRecord[]>([]);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { marketData } = useCryptoData();

  React.useEffect(() => {
    const q = query(collection(db, 'user_predictions'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PredictionRecord)));
      setLoading(false);
    });

    const cq = query(collection(db, 'campaigns'), where('category', '==', 'PREDICTION'));
    onSnapshot(cq, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });

    return unsubscribe;
  }, []);

  const resolvePrediction = async (campaign: any) => {
    const coinId = campaign.predictionAsset ||
                   (campaign.name.toLowerCase().includes('bitcoin') ? 'bitcoin' :
                   campaign.name.toLowerCase().includes('ethereum') ? 'ethereum' :
                   campaign.name.toLowerCase().includes('solana') ? 'solana' : 'bitcoin');

    const currentPrice = marketData.find(c => c.id === coinId)?.current_price;

    if (!currentPrice) return toast.error("Price data unavailable");
    if (!window.confirm(`Resolve "${campaign.name}" at current price $${(currentPrice || 0)?.toLocaleString()}?`)) return;

    const loadingToast = toast.loading('Resolving forecasts...');

    try {
      const predsQ = query(collection(db, 'user_predictions'), where('taskId', '==', campaign.id), where('status', '==', 'ACTIVE'));
      const predsSnap = await getDocs(predsQ);

      console.log(`[AdminPredictions] Resolving ${predsSnap.size} forecasts for ${campaign.name}`);

      let winners = 0;
      let totalDistributed = 0;

      for (const pDoc of predsSnap.docs) {
        try {
          const pred = pDoc.data() as PredictionRecord;
          const isWin = (pred.direction === 'UP' && currentPrice > pred.entryPrice) ||
                        (pred.direction === 'DOWN' && currentPrice < pred.entryPrice);

          await PointTransactionEngine.resolvePrediction(pDoc.id, currentPrice, campaign.totalPrizePool);

          if (isWin) {
            winners++;
            totalDistributed += campaign.totalPrizePool;
          }
        } catch (predErr) {
          console.error(`[AdminPredictions] Individual resolution failed for ${pDoc.id}:`, predErr);
        }
      }

      await updateDoc(doc(db, 'campaigns', campaign.id), {
        active: false,
        status: 'ARCHIVED',
        resolvedAt: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      toast.success(`Resolved ${predsSnap.size} forecasts. Winners: ${winners}. Distributed: ${totalDistributed} PTS`);
    } catch (err: any) {
      console.error('[AdminPredictions] Resolution failed:', err);
      toast.dismiss(loadingToast);
      toast.error(`Resolution failed: ${err.message}`);
    }
  };

  const filteredPredictions = predictions.filter(p =>
    p.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Prediction Management</h1>
          <p className="text-text-secondary text-sm font-medium">Resolve market forecasts and manage prediction reward distributions.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by User or Asset..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
          />
        </div>
      </header>

      <section className="space-y-6">
         <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            Active Prediction Campaigns
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.filter(c => c.active).map(camp => (
              <Card key={camp.id} className="p-6 space-y-6 bg-white/[0.01]">
                 <div className="flex justify-between items-start">
                    <div>
                       <h3 className="font-bold text-white uppercase">{camp.name}</h3>
                       <p className="text-[10px] text-white/40 uppercase font-mono mt-1">ID: {camp.id.slice(0, 8)}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-[9px] font-bold uppercase tracking-widest">
                       Live
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-3">
                       <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Participants</p>
                       <p className="text-sm font-mono font-bold text-white">{predictions.filter(p => p.taskId === camp.id).length}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                       <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Prize Pool</p>
                       <p className="text-sm font-mono font-bold text-primary">{(camp.totalPrizePool || 0)?.toLocaleString()} PTS</p>
                    </div>
                 </div>
                 <button
                   onClick={() => resolvePrediction(camp)}
                   className="w-full py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                 >
                    Resolve Campaign <ArrowRight size={14} />
                 </button>
              </Card>
            ))}
            {campaigns.filter(c => c.active).length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">No active prediction campaigns</p>
              </div>
            )}
         </div>
      </section>

      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-[2rem] animate-pulse" />)
        ) : filteredPredictions.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">User / Asset</th>
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Forecast</th>
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Entry Price</th>
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {filteredPredictions.map((pred) => (
                      <tr key={pred.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary">
                              <DollarSign size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white uppercase group-hover:text-primary transition-colors">{pred.symbol}</p>
                              <p className="text-[10px] font-mono text-white/40 mt-1">{pred.userId.slice(0, 16)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-2">
                            {pred.direction === 'UP' ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                            <span className={cn("text-[11px] font-bold uppercase tracking-widest", pred.direction === 'UP' ? 'text-success' : 'text-danger')}>
                              Market {pred.direction}
                            </span>
                          </div>
                        </td>
                        <td className="p-8">
                          <p className="text-sm font-mono font-bold text-white">${(pred.entryPrice || 0)?.toLocaleString()}</p>
                        </td>
                        <td className="p-8 text-right">
                          <span className={cn(
                            "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                            pred.status === 'RESOLVED' ? "bg-success/5 text-success border-success/20" : "bg-warning/5 text-warning border-warning/20"
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

            {/* Mobile View */}
            <div className="lg:hidden space-y-4">
              {filteredPredictions.map((pred) => (
                <div key={pred.id} className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-4">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary">
                            <DollarSign size={18} />
                         </div>
                         <div>
                            <p className="font-bold text-white uppercase">{pred.symbol}</p>
                            <p className="text-[10px] font-mono text-white/40">ID: {pred.userId.slice(0, 8)}...</p>
                         </div>
                      </div>
                      <span className={cn(
                         "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border",
                         pred.status === 'RESOLVED' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                      )}>
                         {pred.status}
                      </span>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-2xl p-4">
                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Forecast</p>
                         <div className="flex items-center gap-2">
                            {pred.direction === 'UP' ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                            <span className={cn("text-[10px] font-bold uppercase", pred.direction === 'UP' ? 'text-success' : 'text-danger')}>
                               {pred.direction}
                            </span>
                         </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4">
                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Entry Price</p>
                         <p className="text-sm font-mono font-bold">${(pred.entryPrice || 0)?.toLocaleString()}</p>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-24 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
             <Activity size={48} className="mx-auto text-white/5 mb-6" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">No prediction records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPredictions;
