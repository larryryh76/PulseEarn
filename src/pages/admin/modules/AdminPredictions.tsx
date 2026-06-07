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
  writeBatch,
  getDocs,
  where
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

  const resolvePrediction = async (campaign: Campaign) => {
    const coinId = campaign.name.toLowerCase().includes('bitcoin') ? 'bitcoin' : 'ethereum';
    const currentPrice = marketData.find(c => c.id === coinId)?.current_price;

    if (!currentPrice) return toast.error("Price data unavailable");
    if (!window.confirm(`Resolve "${campaign.name}" at current price $${currentPrice.toLocaleString()}?`)) return;

    try {
      const predsQ = query(collection(db, 'user_predictions'), where('taskId', '==', campaign.id), where('status', '==', 'ACTIVE'));
      const predsSnap = await getDocs(predsQ);

      const batch = writeBatch(db);
      let winners = 0;
      let totalDistributed = 0;

      for (const pDoc of predsSnap.docs) {
        const pred = pDoc.data() as PredictionRecord;
        const won = (pred.direction === 'UP' && currentPrice > pred.entryPrice) ||
                    (pred.direction === 'DOWN' && currentPrice < pred.entryPrice);

        if (won) {
          winners++;
          const reward = campaign.totalPrizePool;
          totalDistributed += reward;

          await PointTransactionEngine.execute({
            userId: pred.userId,
            amount: reward,
            type: 'prediction_reward',
            source: `Forecast Win: ${campaign.name}`,
            claimId: `pred_win_${pred.id}`,
            referenceId: campaign.id
          });
        }

        batch.update(doc(db, 'user_predictions', pred.id), {
          status: 'RESOLVED',
          exitPrice: currentPrice,
          rewardAmount: won ? campaign.totalPrizePool : 0,
          resolvedAt: serverTimestamp()
        });
      }

      batch.update(doc(db, 'campaigns', campaign.id), {
        active: false,
        status: 'ARCHIVED'
      });

      await batch.commit();
      toast.success(`Resolved ${predsSnap.size} predictions. Winners: ${winners}. Distributed: ${totalDistributed} PTS`);
    } catch (err) {
      console.error(err);
      toast.error("Resolution failed");
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
                       <p className="text-sm font-mono font-bold text-primary">{camp.totalPrizePool.toLocaleString()} PTS</p>
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

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
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
              {loading ? (
                [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="p-8"><div className="h-4 bg-white/5 rounded w-full" /></td></tr>)
              ) : filteredPredictions.map((pred) => (
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
                     <p className="text-sm font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
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
    </div>
  );
};

export default AdminPredictions;
