import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useNotifications } from '../hooks/useNotifications';
import { useTasks } from '../hooks/useTasks';
import {
  Bell,
  Info,
  AlertTriangle,
  Zap,
  TrendingUp,
  Check,
  ChevronRight,
  ShieldAlert,
  Activity as ActivityIcon,
  BarChart3,
  Target,
  UserPlus,
  Clock,
  Calendar,
  X,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';


const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications();
  const { activities, loading: tasksLoading } = useTasks();
  const [tab, setTab] = useState<'ALERTS' | 'ACTIVITY'>(location.state?.tab || 'ALERTS');
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  const loading = notificationsLoading || tasksLoading;

  useEffect(() => {
     if (location.state?.tab) {
        setTab(location.state.tab);
     }
  }, [location.state]);

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
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
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

            {tab === 'ALERTS' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="h-10"
              >
                <Check size={14} />
                Mark All as Read
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                 <ActivityIcon size={14} className="text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{activities.length} Events Logged</span>
              </div>
            )}
          </div>

          <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] w-full sm:w-fit">
              <button
                onClick={() => setTab('ALERTS')}
                className={cn(
                  "flex-1 sm:flex-none px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  tab === 'ALERTS' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                )}
              >
                Alerts
              </button>
              <button
                onClick={() => setTab('ACTIVITY')}
                className={cn(
                  "flex-1 sm:flex-none px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  tab === 'ACTIVITY' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                )}
              >
                Activity
              </button>
          </div>
        </header>

        <div className="space-y-3">
          {tab === 'ALERTS' ? (
            notifications.length > 0 ? (
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
            )
          ) : activities.length > 0 ? (
            activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedActivity(activity)}
                className="group"
              >
                <Card
                  variant="compact"
                  className="p-6 flex items-center gap-5 cursor-pointer transition-all hover:border-primary/20 bg-[#0A0A0F] border-white/5"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all bg-white/[0.02] border-white/10 text-white/20 group-hover:text-primary",
                  )}>
                    {activity.type.includes('prediction') ? <BarChart3 size={18} /> :
                      activity.type.includes('task') || activity.type.includes('mission') ? <Target size={18} /> :
                        activity.type.includes('referral') ? <UserPlus size={18} /> :
                          activity.type.includes('level') ? <TrendingUp size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold tracking-tight text-white group-hover:text-primary transition-colors truncate uppercase italic leading-none">
                        {activity.description}
                      </h3>
                      <span className="text-[9px] font-mono font-bold text-text-tertiary uppercase">
                        {activity.timestamp?.toDate?.() ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                      {activity.points > 0 ? `+${activity.points.toLocaleString()} PTS` : 'System Event'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary/20 group-hover:text-primary transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="py-48 text-center border border-dashed border-border rounded-[2.5rem] bg-surface/20 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-[1.25rem] bg-surface border border-border flex items-center justify-center text-text-tertiary">
                <ActivityIcon size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">No Activity</h2>
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Your interaction ledger is empty</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVITY DETAIL OVERLAY - SHARED COMPONENT STYLE */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedActivity(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-lg bg-[#08080C] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
             >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                        <ActivityIcon size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 leading-none mb-1">Activity Log</p>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em]">{selectedActivity.type.replace(/_/g, ' ')}</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedActivity(null)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-text-tertiary">
                      <X size={18} />
                   </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-text-tertiary mb-2">
                         <Calendar size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                         <span className="text-white/10">•</span>
                         <Clock size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic leading-tight">{selectedActivity.description}</h2>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Transaction Yield</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-xl font-mono font-bold", selectedActivity.points >= 0 ? "text-success" : "text-danger")}>
                               {selectedActivity.points > 0 ? '+' : ''}{selectedActivity.points.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      {selectedActivity.metadata?.symbol && (
                         <div className="p-5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Asset Index</span>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">{selectedActivity.metadata.symbol} / USD</span>
                         </div>
                      )}

                      {selectedActivity.metadata?.direction && (
                         <div className="p-5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Forecast Vector</span>
                            <div className="flex items-center gap-2">
                               {selectedActivity.metadata.direction === 'UP' ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                               <span className={cn("text-xs font-bold uppercase tracking-widest", selectedActivity.metadata.direction === 'UP' ? "text-success" : "text-danger")}>{selectedActivity.metadata.direction}</span>
                            </div>
                         </div>
                      )}

                      {selectedActivity.metadata?.entryPrice && (
                         <div className="p-5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Execution Price</span>
                            <span className="text-xs font-mono font-bold text-white">${selectedActivity.metadata.entryPrice.toLocaleString()}</span>
                         </div>
                      )}

                      {selectedActivity.metadata?.taskName && (
                         <div className="p-5 flex justify-between items-start gap-4">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">Objective</span>
                            <span className="text-[11px] font-bold text-white uppercase tracking-tight text-right italic">{selectedActivity.metadata.taskName}</span>
                         </div>
                      )}

                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Ledger Status</span>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Immutable</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">Network Hash</span>
                         <span className="text-[9px] font-mono text-white/20 truncate max-w-[140px]">{selectedActivity.referenceId || selectedActivity.id}</span>
                      </div>
                      {(selectedActivity.type.includes('prediction') ||
                        selectedActivity.type.includes('campaign') ||
                        selectedActivity.type.includes('task') ||
                        selectedActivity.type.includes('mission') ||
                        selectedActivity.type.includes('referral') ||
                        selectedActivity.type.includes('withdrawal')) && (
                        <Button
                           onClick={() => {
                              const type = selectedActivity.type as string;
                              if (type.includes('prediction')) navigate('/predictions', { state: { view: 'PORTFOLIO', highlightId: selectedActivity.referenceId || selectedActivity.id } });
                              else if (type.includes('campaign')) {
                                 if (selectedActivity.metadata?.campaignId) navigate(`/campaigns/${selectedActivity.metadata.campaignId}`);
                                 else navigate('/tasks');
                              }
                              else if (type.includes('task') || type.includes('mission')) navigate('/tasks', { state: { view: 'COMPLETED', highlightId: selectedActivity.referenceId || selectedActivity.id } });
                              else if (type.includes('referral')) navigate('/referrals');
                              else if (type.includes('withdrawal')) navigate('/wallet');
                              setSelectedActivity(null);
                           }}
                           variant="primary"
                           className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl group"
                        >
                           View Source Context <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Button>
                      )}
                   </div>
                </div>

                <div className="p-8 bg-black border-t border-white/5 flex justify-center">
                   <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.6em]">PulseEarn Secure Ledger • Protocol V6.0</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Notifications;
