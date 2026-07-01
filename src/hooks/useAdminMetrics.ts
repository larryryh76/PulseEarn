import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const useAdminMetrics = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'global_metrics'), (snap) => {
      if (snap.exists()) {
        setMetrics(snap.data());
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const reconcile = async () => {
    const loadToast = toast.loading("Reconciling global metrics...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/reconcile-metrics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Metrics Reconciled");
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Reconciliation failed");
    } finally {
      toast.dismiss(loadToast);
    }
  };

  return { metrics, loading, reconcile };
};
