import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useNotifications } from '../hooks/useNotifications';
import {
  Bell,
  Info,
  AlertTriangle,
  Zap,
  TrendingUp,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Notifications: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const getIcon = (type?: string) => {
    switch (type) {
      case 'reward': return <Zap size={16} className="text-success" />;
      case 'level_up': return <TrendingUp size={16} className="text-primary" />;
      case 'system': return <Info size={16} className="text-accent" />;
      case 'alert': return <AlertTriangle size={16} className="text-warning" />;
      default: return <Bell size={16} className="text-text-secondary" />;
    }
  };

  if (loading) return <MainLayout><div className="pt-32 px-6 max-w-2xl mx-auto space-y-4 animate-pulse">
    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
  </div></MainLayout>;

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
        <header className="mb-12 flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Signal Feed</p>
            <h1 className="flex items-center gap-4">
              Alerts
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} NEW
                </span>
              )}
            </h1>
          </motion.div>

          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-[11px] font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check size={14} />
            Mark all read
          </button>
        </header>

        <div className="space-y-2">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => !notification.read && markAsRead(notification.id)}
                className={cn(
                  "system-card p-4 flex items-start gap-4 cursor-pointer group",
                  !notification.read ? "border-primary/20 bg-primary/[0.02]" : "opacity-60"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl border border-border bg-black transition-colors group-hover:border-white/10",
                  !notification.read && "border-primary/20"
                )}>
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[13px] font-medium text-white/90">{notification.title}</h3>
                    <span className="text-[10px] font-mono text-text-secondary uppercase">
                      {notification.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2">{notification.description}</p>
                </div>

                {!notification.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shadow-[0_0_8px_rgba(94,106,210,0.8)]" />
                )}
              </motion.div>
            ))
          ) : (
            <div className="py-32 text-center border border-dashed border-border rounded-3xl">
              <Bell className="mx-auto text-white/5 mb-4" size={48} />
              <p className="text-text-secondary text-sm">Your signal feed is currently clear</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
