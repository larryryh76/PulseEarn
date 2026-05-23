import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Info, X } from 'lucide-react';
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
      toast.success('All notifications marked as read');
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
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-80 md:w-96 bg-[#0D0D12]/95 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest">Protocol Intel</h3>
                 {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-bold uppercase">{unreadCount} New</span>}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[9px] font-bold text-white/30 hover:text-primary transition-colors uppercase tracking-widest"
                  >
                    Clear
                  </button>
                )}
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={14} className="text-white/20" />
                </button>
              </div>
            </div>

            <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-5 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Bell size={20} className="text-white/10" />
                  </div>
                  <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Intelligence</p>
                  <p className="text-[10px] text-white/10 mt-1 uppercase">Awaiting mission updates</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-5 flex gap-4 transition-all hover:bg-white/[0.02] relative group",
                        !notif.read && "bg-primary/[0.02]"
                      )}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                    >
                      {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        notif.read ? "bg-white/5 border-white/5 text-white/20" : "bg-primary/10 border-primary/20 text-primary"
                      )}>
                        {notif.type === 'reward_claimed' ? <Check size={16} /> : <Info size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={cn(
                            "text-[12px] font-bold leading-tight truncate",
                            notif.read ? "text-white/40" : "text-white"
                          )}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-bold text-white/20 uppercase whitespace-nowrap pt-0.5">
                            {notif.timestamp ? formatTime(notif.timestamp.toDate()) : 'Recent'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-[11px] leading-relaxed mt-1 line-clamp-2",
                          notif.read ? "text-white/20" : "text-white/60"
                        )}>
                          {notif.description}
                        </p>

                        <div className="flex items-center gap-3 mt-3">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               deleteNotification(notif.id);
                             }}
                             className="p-1 rounded bg-white/5 text-white/20 hover:text-danger transition-colors"
                           >
                              <Trash2 size={12} />
                           </button>
                           {!notif.read && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 markAsRead(notif.id);
                               }}
                               className="text-[9px] font-bold text-primary uppercase tracking-widest"
                             >
                               Mark Read
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

  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};

export default NotificationCenter;
