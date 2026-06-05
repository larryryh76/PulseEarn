import { collection, getDocs, addDoc, serverTimestamp, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';

export class BroadcastEngine {
  static async broadcastGlobal(title: string, description: string, type: 'system' | 'reward' | 'alert' = 'system') {
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
    await Promise.all(usersSnap.docs.map(userDoc =>
      addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
        title, description, type, read: false, timestamp: serverTimestamp()
      })
    ));
  }
}
