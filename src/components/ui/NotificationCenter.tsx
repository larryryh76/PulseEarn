import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, CheckCircle2, Info, Star, Trophy, X } from 'lucide-react';
import { cn } from '../../utils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_completed': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'reward_claimed': return <Trophy className="text-yellow-500" size={16} />;
      case 'streak_bonus': return <Star className="text-orange-500" size={16} />;
      case 'referral_joined': return <Info className="text-accent" size={16} />;
      default: return <Bell className="text-primary" size={16} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 z-50 w-[320px] md:w-[380px] bg-[#0D0D14] border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Notifications</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight"
                >
                  Mark all read
                </button>
                <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell size={32} className="mx-auto text-white/5 mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markAsRead(n.id)}
                      className={cn(
                        "p-4 transition-colors cursor-pointer group relative",
                        n.read ? "opacity-60" : "bg-primary/[0.02] hover:bg-primary/[0.04]"
                      )}
                    >
                      {!n.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                      )}
                      <div className="flex gap-3">
                        <div className="mt-0.5">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-xs font-bold mb-1",
                            n.read ? "text-white/60" : "text-white"
                          )}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-white/40 leading-relaxed">
                            {n.description}
                          </p>
                          <p className="text-[9px] text-white/20 font-bold uppercase mt-2">
                            {n.timestamp ? n.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
