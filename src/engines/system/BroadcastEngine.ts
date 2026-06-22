import { collection, getDocs, addDoc, serverTimestamp, query, limit, startAfter, QueryDocumentSnapshot, DocumentData, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

export class BroadcastEngine {
  static async broadcastGlobal(title: string, description: string, type: 'system' | 'reward' | 'alert' = 'system') {
    // Scalability: Optimized for memory efficiency using pagination
    const FETCH_LIMIT = 500;
    const PROCESS_BATCH_SIZE = 50;

    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let hasMore = true;

    while (hasMore) {
       const q = lastDoc
          ? query(collection(db, 'users'), orderBy('__name__'), startAfter(lastDoc), limit(FETCH_LIMIT))
          : query(collection(db, 'users'), orderBy('__name__'), limit(FETCH_LIMIT));

       const snap = await getDocs(q);
       if (snap.empty) {
          hasMore = false;
          break;
       }

       const users = snap.docs;
       lastDoc = snap.docs[snap.docs.length - 1];

       // Process this chunk in smaller sub-batches to avoid promise overloading
       for (let i = 0; i < users.length; i += PROCESS_BATCH_SIZE) {
        const chunk = users.slice(i, i + PROCESS_BATCH_SIZE);
       await Promise.all(chunk.map(userDoc =>
          addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
            title, description, type, read: false, timestamp: serverTimestamp()
          })
       ));
       }
    }
  }
}
