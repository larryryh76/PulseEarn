import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useNotifications } from '../hooks/useNotifications';
import {
  Bell,
  Info,
  AlertTriangle,
  Zap,
  TrendingUp,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Notifications: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const getIcon = (type?: string) => {
    switch (type) {
      case 'reward': return <Zap size={16} className="text-primary" />;
      case 'level_up': return <TrendingUp size={16} className="text-success" />;
      case 'system': return <Info size={16} className="text-text-tertiary" />;
      case 'alert': return <AlertTriangle size={16} className="text-danger" />;
      default: return <Bell size={16} className="text-text-tertiary" />;
    }
  };

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-surface rounded-xl mb-12" />
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-surface rounded-2xl" />)}
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary" />
               <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Synchronization Center</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-4">
              Notifications
              {unreadCount > 0 && (
                <div className="badge-system badge-primary h-6 px-3 flex items-center text-[9px]">
                  {unreadCount} NEW SIGNALS
                </div>
              )}
            </h1>
          </motion.div>

          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="h-10"
          >
            <Check size={14} />
            Authorize All Read
          </Button>
        </header>

        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => !notification.read && markAsRead(notification.id)}
                className="group"
              >
                 <Card
                  variant="compact"
                  className={cn(
                    "p-6 flex items-start gap-5 cursor-pointer transition-all",
                    !notification.read ? "border-primary/20 bg-primary/[0.01]" : "opacity-60 grayscale-[0.5] hover:grayscale-0"
                  )}
                 >
                    <div className={cn(
                      "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                      !notification.read ? "bg-primary/5 border-primary/20 text-primary" : "bg-surface-bright border-border text-text-tertiary"
                    )}>
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className={cn(
                          "text-sm font-bold tracking-tight transition-colors",
                          !notification.read ? "text-white" : "text-text-secondary"
                        )}>{notification.title}</h3>
                        <span className="text-[9px] font-mono font-bold text-text-tertiary uppercase">
                          {notification.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed font-medium line-clamp-2">
                        {notification.description}
                      </p>
                    </div>

                    {!notification.read ? (
                       <div className="w-2 h-2 rounded-full bg-primary mt-2 shadow-[0_0_12px_rgba(94,106,210,1)] animate-pulse shrink-0" />
                    ) : (
                       <div className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary/20 group-hover:text-text-tertiary transition-colors">
                          <ChevronRight size={14} />
                       </div>
                    )}
                 </Card>
              </motion.div>
            ))
          ) : (
            <div className="py-48 text-center border border-dashed border-border rounded-[2.5rem] bg-surface/20 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-[1.25rem] bg-surface border border-border flex items-center justify-center text-text-tertiary">
                 <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                 <h2 className="text-lg font-bold text-white">Registry Clear</h2>
                 <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.2em]">No synchronization signals detected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
