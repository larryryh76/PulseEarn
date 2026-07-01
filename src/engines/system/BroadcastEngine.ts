import { collection, getDocs, serverTimestamp, query, limit, startAfter, QueryDocumentSnapshot, DocumentData, orderBy, Query, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export class BroadcastEngine {
  static async broadcastGlobal(title: string, description: string, type: 'system' | 'reward' | 'alert' = 'system') {
    // Scalability: Optimized for memory efficiency using pagination and writeBatch
    const FETCH_LIMIT = 500;

    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let hasMore = true;
    let totalSent = 0;

    // Log the broadcast history
    await writeBatch(db).set(doc(collection(db, 'broadcasts')), {
      title,
      description,
      type,
      timestamp: serverTimestamp(),
      status: 'SENDING'
    }).commit();

    while (hasMore) {
       const q: Query<DocumentData> = lastDoc
          ? query(collection(db, 'users'), orderBy('__name__'), startAfter(lastDoc), limit(FETCH_LIMIT))
          : query(collection(db, 'users'), orderBy('__name__'), limit(FETCH_LIMIT));

       const snap = await getDocs(q);
       if (snap.empty) {
          hasMore = false;
          break;
       }

       const users = snap.docs;
       lastDoc = snap.docs[snap.docs.length - 1];

       // Use writeBatch for atomic efficiency (Max 500 operations per batch)
       const batch = writeBatch(db);

       users.forEach((userDoc) => {
          const notifRef = doc(collection(db, 'users', userDoc.id, 'notifications'));
          batch.set(notifRef, {
            title,
            description,
            type,
            read: false,
            timestamp: serverTimestamp()
          });
       });

       await batch.commit();
       totalSent += users.length;

       if (users.length < FETCH_LIMIT) {
          hasMore = false;
       }
    }

    console.log(`[BroadcastEngine] Completed. Sent to ${totalSent} users.`);
  }
}
