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
        <>
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
          />

          <div className="fixed inset-x-0 bottom-0 z-[100] md:absolute md:inset-auto md:right-0 md:top-12" ref={dropdownRef}>
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              md-initial={{ opacity: 0, y: 8, scale: 0.98 }}
              md-animate={{ opacity: 1, y: 0, scale: 1 }}
              md-exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full md:w-[400px] bg-[#08080a] border-t md:border border-white/[0.08] rounded-t-[2.5rem] md:rounded-[2rem] shadow-[0_-20px_40px_-12px_rgba(0,0,0,0.5)] md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Drag Handle for Mobile */}
              <div className="h-1.5 w-12 bg-white/10 rounded-full mx-auto mt-4 md:hidden" />

              <div className="p-6 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01] mt-2 md:mt-0">
              <div className="flex items-center gap-3">
                 <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Operational Notices</h3>
                 {unreadCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,102,255,0.6)]" />}
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

            <div className="max-h-[min(480px,70vh)] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto text-white/5">
                    <Info size={24} />
                  </div>
                  <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Registry Empty</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-6 flex gap-5 transition-all hover:bg-white/[0.02] relative group cursor-pointer",
                        !notif.read && "bg-primary/[0.01]"
                      )}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                        notif.read
                          ? "bg-white/[0.01] border-white/[0.04] text-white/10"
                          : "bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/10"
                      )}>
                        {notif.type === 'reward_claimed' ? <Check size={16} /> : <Info size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className={cn(
                            "text-sm font-bold tracking-tight leading-tight",
                            notif.read ? "text-white/20" : "text-white/90"
                          )}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-mono text-white/10 uppercase whitespace-nowrap pt-1">
                            {notif.timestamp ? formatTime(notif.timestamp.toDate()) : '...'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs leading-relaxed mt-1.5 line-clamp-2 font-medium",
                          notif.read ? "text-white/10" : "text-white/40"
                        )}>
                          {notif.description}
                        </p>

                        <div className="flex items-center gap-6 mt-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
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
        </>
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
