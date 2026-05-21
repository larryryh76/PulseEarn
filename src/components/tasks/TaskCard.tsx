import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import Card from '../ui/Card';
import { Zap, Clock, CheckCircle2, ChevronRight, Play, Loader2 } from 'lucide-react';
import { cn } from '../../utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCardProps {
  task: Task;
  status: 'available' | 'completed' | 'cooldown';
  nextAvailable?: Date;
  onClaim: (taskId: string) => Promise<void>;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, status, nextAvailable, onClaim }) => {
  const [timer, setTimer] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timer === 0) {
      handleClaim();
      setTimer(null);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleClaim = async () => {
    setIsClaiming(true);
    await onClaim(task.id);
    setIsClaiming(false);
  };

  const startTimer = () => {
    if (status !== 'available') return;
    setTimer(task.duration || 30);
  };

  const getIcon = () => {
    if (status === 'completed') return <CheckCircle2 className="text-primary" size={28} />;
    if (task.type === 'timer') return <Clock className="text-accent" size={28} />;
    return <Zap className="text-primary" size={28} />;
  };

  return (
    <Card className={cn(
      "p-5 border-white/[0.03] bg-white/[0.01] transition-all group overflow-hidden relative",
      status === 'completed' && "border-primary/20 bg-primary/[0.04]",
      status === 'available' && "hover:bg-white/[0.03] cursor-pointer"
    )}>
      {status === 'completed' && (
        <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
          <CheckCircle2 size={80} className="text-primary" />
        </div>
      )}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-5">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-transform",
            status === 'completed' ? "bg-primary/20 border-primary/30" : "bg-white/5 border-white/5 group-hover:scale-110",
            task.type === 'timer' && status === 'available' && "bg-accent/10 border-accent/20"
          )}>
            {getIcon()}
          </div>
          <div>
            <h4 className="font-bold text-base tracking-tight">{task.title}</h4>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={cn(
                "text-[11px] font-mono font-bold",
                status === 'completed' ? "text-primary" : "text-white/60"
              )}>
                +{task.rewardPoints} PULSE
              </span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">
                {timer !== null ? `Timer: ${timer}s` : task.description}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {task.type === 'timer' && status === 'available' && timer === null && (
            <button
              onClick={(e) => { e.stopPropagation(); startTimer(); }}
              className="px-4 py-2 rounded-xl bg-accent text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-accent/80 transition-colors"
            >
              <Play size={12} fill="currentColor" />
              Start
            </button>
          )}

          {status === 'available' && task.type !== 'timer' && (
            <button
              onClick={() => handleClaim()}
              disabled={isClaiming}
              className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all disabled:opacity-50"
            >
              {isClaiming ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <ChevronRight size={20} className="text-white/20 group-hover:text-white" />
              )}
            </button>
          )}

          {status === 'completed' && (
            <span className="px-5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">
              Done
            </span>
          )}

          {status === 'cooldown' && (
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Cooldown</span>
               <span className="text-[10px] font-mono text-white/40">
                  {nextAvailable?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer Progress Bar */}
      <AnimatePresence>
        {timer !== null && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: (task.duration! - timer) / task.duration! }}
            className="absolute bottom-0 left-0 h-1 bg-accent w-full origin-left"
          />
        )}
      </AnimatePresence>
    </Card>
  );
};

export default TaskCard;
