import React, { useState, useEffect } from 'react';
import { CardPremium } from '../ui/PremiumModules';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Activity, Zap, UserPlus, ShieldAlert, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

const SystemLiveFeed: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const getIcon = (type: string) => {
    if (type.includes('signup')) return UserPlus;
    if (type.includes('reward')) return Zap;
    if (type.includes('flag') || type.includes('ban')) return ShieldAlert;
    return Activity;
  };

  const getColor = (type: string) => {
    if (type.includes('signup')) return 'text-blue-500';
    if (type.includes('reward')) return 'text-yellow-500';
    if (type.includes('flag') || type.includes('ban')) return 'text-red-500';
    return 'text-primary';
  };

  return (
    <CardPremium variant="standard" className="p-0 border-white/[0.05] bg-[#0A0A0F]">
      <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-primary" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Real-time Ecosystem Activity</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(0,255,163,0.5)]" />
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Live Activity</span>
        </div>
      </div>
      <div className="divide-y divide-white/[0.03] max-h-[450px] overflow-y-auto custom-scrollbar">
        {activities.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/5">Awaiting events...</p>
          </div>
        ) : (
          activities.map(act => {
            const Icon = getIcon(act.type?.toLowerCase() || '');
            const color = getColor(act.type?.toLowerCase() || '');
            return (
              <div key={act.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors group">
                <div className="flex items-center gap-5">
                  <div className={cn("p-2.5 rounded-xl bg-white/[0.02] group-hover:bg-white/[0.05] transition-colors border border-white/[0.03]", color)}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90 group-hover:text-white transition-colors">{act.type}</p>
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-tight mt-0.5">{act.description}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-financial text-white/20 uppercase tracking-widest">{act.timestamp?.toDate().toLocaleTimeString()}</p>
                   {act.points && (
                     <p className={cn("text-xs font-financial mt-1", act.points > 0 ? "text-success" : "text-danger")}>
                        {act.points > 0 ? '+' : ''}{act.points.toLocaleString()} PTS
                     </p>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-4 bg-white/[0.01] border-t border-white/[0.03] flex justify-center">
         <button className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] hover:text-primary transition-colors">
            View Full Historical Log
            <ChevronRight size={10} />
         </button>
      </div>
    </CardPremium>
  );
};

export default SystemLiveFeed;
