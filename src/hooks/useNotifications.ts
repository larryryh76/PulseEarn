import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  limit,
  doc,
  updateDoc,
  writeBatch,
  orderBy,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');

    // 1. Listen for recent notifications (last 100)
    const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(100));
    const unsubscribeList = onSnapshot(
      q,
      (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        setNotifications(notificationsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        setLoading(false);
      }
    );

    // 2. Dedicated Unread Count Listener (Accurate Badge)
    const unreadQ = query(notificationsRef, where('read', '==', false));
    const unsubscribeUnread = onSnapshot(
      unreadQ,
      (snapshot) => {
        setUnreadCount(snapshot.size);
      },
      (error) => {
        console.error('Error listening to unread count:', error);
      }
    );

    return () => {
      unsubscribeList();
      unsubscribeUnread();
    };
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    const notificationRef = doc(db, 'users', currentUser.uid, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;

    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const unreadQ = query(notificationsRef, where('read', '==', false));
    const unreadSnapshot = await getDocs(unreadQ);

    if (unreadSnapshot.empty) return;

    const batch = writeBatch(db);
    unreadSnapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { read: true });
    });

    await batch.commit();
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};
