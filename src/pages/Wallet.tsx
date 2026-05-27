import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(collection(db, 'users', userData.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    });
  }, [userData?.uid]);

  if (!userData) return null;

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section>
          <h1>Wallet</h1>
          <p>Financial Overview</p>
        </section>

        <section>
          <div className="text-5xl font-bold">{userData.points.toLocaleString()} PTS</div>
          <p className="text-xl">≈ {formatUSD(PTS_TO_USD(userData.points))}</p>
        </section>

        <section>
          <h2>Transaction History</h2>
          <div className="mt-6 space-y-4">
            {loading ? (
              <p>Loading ledger...</p>
            ) : transactions.length === 0 ? (
              <p>No transactions found.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-white/40">
                    <th className="py-2">Source</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="py-3 text-sm">{tx.source}</td>
                      <td className="py-3 text-xs uppercase text-white/30">{tx.type}</td>
                      <td className={`py-3 text-right font-mono ${tx.amount > 0 ? 'text-success' : 'text-danger'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
