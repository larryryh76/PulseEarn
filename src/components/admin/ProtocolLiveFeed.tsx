import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Activity, Zap, UserPlus, ShieldAlert, Clock } from 'lucide-react';
import { cn } from '../../utils';

const ProtocolLiveFeed: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // Real live feed would be a global collection or specialized log
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
    <Card className="p-0 overflow-hidden border-white/[0.05] bg-[#0A0A0F]">
      <div className="p-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest">Protocol Real-time Events</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-tighter">Live Stream</span>
        </div>
      </div>
      <div className="divide-y divide-white/[0.02] max-h-[400px] overflow-y-auto custom-scrollbar">
        {activities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/10">Listening for protocol events...</p>
          </div>
        ) : (
          activities.map(act => {
            const Icon = getIcon(act.type?.toLowerCase() || '');
            const color = getColor(act.type?.toLowerCase() || '');
            return (
              <div key={act.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-lg bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors", color)}>
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white/80">{act.type}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-tighter">{act.description}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-mono text-white/20">{act.timestamp?.toDate().toLocaleTimeString()}</p>
                   {act.points && (
                     <p className={cn("text-[10px] font-bold", act.points > 0 ? "text-green-500" : "text-red-500")}>
                        {act.points > 0 ? '+' : ''}{act.points}
                     </p>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default ProtocolLiveFeed;
