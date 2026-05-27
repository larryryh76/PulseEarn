import React, { useState, useEffect, useRef } from 'react';
import { Check, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { cn } from '../../utils';
import Skeleton from './Skeleton';
import toast from 'react-hot-toast';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', id), {
        read: true
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllRead = async () => {
    if (!currentUser || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          const ref = doc(db, 'users', currentUser.uid, 'notifications', n.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
      toast.success('Batch update successful');
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute right-0 top-12 z-[100]" ref={dropdownRef}>
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-80 md:w-96 bg-black border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                 <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Operational Notices</h3>
                 {unreadCount > 0 && <div className="w-1 h-1 rounded-full bg-primary" />}
              </div>
              <div className="flex items-center gap-4">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[9px] font-bold text-primary hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                )}
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={14} className="text-white/20" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">Registry Empty</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-5 flex gap-4 transition-all hover:bg-white/[0.01] relative group",
                        !notif.read && "bg-white/[0.02]"
                      )}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                        notif.read ? "bg-white/[0.02] border-white/[0.04] text-white/20" : "bg-primary/5 border-primary/10 text-primary"
                      )}>
                        {notif.type === 'reward_claimed' ? <Check size={14} /> : <Info size={14} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={cn(
                            "text-[12px] font-bold tracking-tight truncate",
                            notif.read ? "text-white/30" : "text-white"
                          )}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-mono text-white/10 uppercase whitespace-nowrap pt-0.5">
                            {notif.timestamp ? formatTime(notif.timestamp.toDate()) : '...'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-[11px] leading-relaxed mt-0.5 line-clamp-2",
                          notif.read ? "text-white/20" : "text-white/50"
                        )}>
                          {notif.description}
                        </p>

                        <div className="flex items-center gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               deleteNotification(notif.id);
                             }}
                             className="text-[9px] font-bold text-white/20 hover:text-danger uppercase tracking-widest"
                           >
                              Delete
                           </button>
                           {!notif.read && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 markAsRead(notif.id);
                               }}
                               className="text-[9px] font-bold text-primary hover:text-white uppercase tracking-widest"
                             >
                               Acknowledge
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return `JUST NOW`;
  if (minutes < 60) return `${minutes}M AGO`;
  if (hours < 24) return `${hours}H AGO`;
  return `${days}D AGO`;
};

export default NotificationCenter;
