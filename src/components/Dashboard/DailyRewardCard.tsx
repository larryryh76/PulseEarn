import React, { useState, useEffect } from 'react';
import { Flame, Clock, Gift, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import { cn } from '../../utils';

const DailyRewardCard: React.FC = () => {
  const { userData } = useAuth();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const utcOffset = -new Date().getTimezoneOffset();
      const now = new Date();
      const localNow = new Date(now.getTime() + utcOffset * 60000);

      const nextResetLocal = new Date(localNow);
      nextResetLocal.setHours(24, 0, 0, 0);

      const diff = nextResetLocal.getTime() - localNow.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const isClaimedToday = () => {
    if (!userData?.lastRewardDate) return false;
    const utcOffset = -new Date().getTimezoneOffset();
    const lastDateUTC = userData.lastRewardDate.toDate();
    const nowUTC = new Date();

    const lastDateLocal = new Date(lastDateUTC.getTime() + utcOffset * 60000);
    const nowLocal = new Date(nowUTC.getTime() + utcOffset * 60000);

    return lastDateLocal.getUTCFullYear() === nowLocal.getUTCFullYear() &&
           lastDateLocal.getUTCMonth() === nowLocal.getUTCMonth() &&
           lastDateLocal.getUTCDate() === nowLocal.getUTCDate();
  };

  const claimed = isClaimedToday();

  return (
    <Card variant="compact" className="p-5 md:p-8 flex flex-col justify-between min-h-[140px] md:min-h-[160px] bg-surface border-border group relative overflow-hidden shadow-2xl">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="data-label">Daily Check-In</p>
          <div className="flex items-center gap-2">
            <Flame className={cn("w-5 h-5 transition-all", claimed ? "text-orange-500 fill-orange-500" : "text-text-tertiary")} />
            <span className="text-xl font-bold text-text-primary">{userData?.streak || 0} Day Streak</span>
          </div>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
          claimed ? "bg-success/10 border-success/20 text-success" : "bg-surface-bright border-border text-text-tertiary"
        )}>
          {claimed ? <CheckCircle2 size={20} /> : <Gift size={20} />}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={10} /> Next Reset
            </p>
            <p className="text-sm font-mono font-bold text-text-primary">{timeLeft}</p>
          </div>
          {claimed && (
            <span className="text-[9px] font-black uppercase text-success tracking-widest bg-success/10 px-2 py-1 rounded-md border border-success/20">
              Claimed
            </span>
          )}
        </div>

        <div className="h-1.5 w-full bg-surface-bright rounded-full overflow-hidden p-0.5 border border-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((((userData?.streak || 0) - 1) % 7 + 1) / 7 * 100, 100)}%` }}
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"
          />
        </div>
      </div>
    </Card>
  );
};

export default DailyRewardCard;
