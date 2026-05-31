import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Transaction } from '../../types';
import Card from '../ui/Card';
import { Zap, TrendingUp } from 'lucide-react';
import { cn } from '../../utils';
import { motion } from 'framer-motion';

const TransactionHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveTab] = useState('All');

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filters = ['All', 'Earnings', 'Stakes', 'Bonus'];

  const filteredTx = transactions.filter(tx => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Earnings') return tx.amount > 0;
    if (activeFilter === 'Stakes') return tx.amount < 0;
    if (activeFilter === 'Bonus') return tx.type === 'referral_reward' || tx.type === 'daily_reward';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2 custom-scrollbar">
         {filters.map(f => (
           <button
             key={f}
             onClick={() => setActiveTab(f)}
             className={cn(
               "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-all",
               activeFilter === f
                ? "bg-primary border-primary text-white"
                : "bg-white/[0.03] border-white/[0.05] text-white/40"
             )}
           >
             {f}
           </button>
         ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />)
        ) : filteredTx.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/[0.03] rounded-[2rem]">
             <p className="text-white/20 font-bold uppercase tracking-widest text-xs">No transaction history found</p>
          </div>
        ) : (
          filteredTx.map((tx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={tx.id}
            >
              <Card className="p-4 border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110",
                      tx.amount > 0 ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {tx.amount > 0 ? <Zap size={18} /> : <TrendingUp size={18} className="rotate-180" />}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white/90 capitalize">{tx.type.replace('_', ' ')}</h5>
                      <p className="text-[9px] text-white/30 uppercase font-medium truncate max-w-[150px]">{tx.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-mono font-bold",
                      tx.amount > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-[8px] text-white/10 font-bold">
                       {tx.timestamp?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
