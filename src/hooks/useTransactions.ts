import { useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  limit,
  collection,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Transaction } from '../types';

export const useTransactions = (limitCount = 30) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('timestamp', 'desc'),
      limit(Math.max(limitCount, 100))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));

      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, limitCount]);

  return { transactions, loading };
};
