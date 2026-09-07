import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase/config';
import { usePsemineAuth } from '../contexts/PsemineAuthContext';

export type PsemineRecordState<T> = { records: T[]; loading: boolean; error: string | null };

export function usePsemineRecords<T extends DocumentData>(collectionName: string): PsemineRecordState<T> {
  const { currentUser } = usePsemineAuth();
  const [state, setState] = useState<PsemineRecordState<T>>({ records: [], loading: true, error: null });

  useEffect(() => {
    if (!currentUser) {
      setState({ records: [], loading: false, error: null });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));
    const recordsQuery = query(collection(db, collectionName), where('userId', '==', currentUser.uid));
    return onSnapshot(recordsQuery, (snapshot) => {
      setState({ records: snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as unknown) as T), loading: false, error: null });
    }, () => {
      setState({ records: [], loading: false, error: 'PSEmine data is unavailable right now.' });
    });
  }, [collectionName, currentUser]);

  return state;
}

export async function markPsemineNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'psemine_notifications', notificationId), { read: true, readAt: new Date() });
}
