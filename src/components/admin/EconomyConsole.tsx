import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs
} from 'firebase/firestore';
import {
  BarChart,
  TrendingUp,
  AlertTriangle,
  PieChart,
  DollarSign,
  Target,
  Waves
} from 'lucide-react';
import { cn } from '../../utils';

const EconomyConsole: React.FC = () => {
  const [stats, setStats] = useState({
    totalSupply: 0,
    dailyEmission: 0,
    averagePointsPerUser: 0,
    activeLiability: 0,
    poolUtilization: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      let total = 0;
      let earnedToday = 0;
      usersSnap.forEach(u => {
        total += u.data().points || 0;
        earnedToday += u.data().totalEarnedToday || 0;
      });

      setStats({
        totalSupply: total,
        dailyEmission: earnedToday,
        averagePointsPerUser: total / (usersSnap.size || 1),
        activeLiability: total * 0.001, // Mock value
        poolUtilization: 68
      });
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Economy & Monetary Policy</h1>
          <p className="text-white/40 text-xs mt-1">Global liquidity and reward emission management.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
           Monetary v2.0
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Monetary Stats */}
         <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Total Pulse Supply', val: stats.totalSupply.toLocaleString(), icon: Waves, color: 'text-primary' },
              { label: 'Daily Emission', val: stats.dailyEmission.toLocaleString(), icon: TrendingUp, color: 'text-green-500' },
              { label: 'Avg User Capital', val: stats.averagePointsPerUser.toFixed(1), icon: Target, color: 'text-yellow-500' },
              { label: 'Estimated Liability', val: stats.activeLiability.toFixed(2), icon: DollarSign, color: 'text-blue-500' }
            ].map((s, i) => (
              <Card key={i} className="p-6 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden group">
                 <div className="flex items-center justify-between relative z-10">
                    <div className={cn("p-2 rounded-xl bg-white/[0.03]", s.color)}>
                       <s.icon size={20} />
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-mono font-bold text-white">{s.val}</p>
                       <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.label}</p>
                    </div>
                 </div>
                 <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            ))}

            <Card className="p-6 md:col-span-2 border-white/[0.05] bg-[#0A0A0F]">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                     <BarChart size={16} className="text-primary" />
                     <h3 className="text-xs font-bold uppercase tracking-widest">Emission Velocity (24h)</h3>
                  </div>
                  <span className="text-[10px] text-green-500 font-bold uppercase">+4.2% Growth</span>
               </div>
               <div className="h-48 flex items-end gap-2 px-2">
                  {[45, 60, 35, 70, 85, 40, 55, 90, 65, 80, 50, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 rounded-t-sm group relative"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-50 transition-opacity rounded-t-sm" />
                    </div>
                  ))}
               </div>
            </Card>
         </div>

         {/* Pool Controls */}
         <div className="space-y-6">
            <Card className="p-6 border-white/[0.05] bg-[#0A0A0F]">
               <div className="flex items-center gap-2 mb-6">
                  <PieChart size={16} className="text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Global Reward Pool</h3>
               </div>
               <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64" cy="64" r="58"
                      fill="transparent"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="64" cy="64" r="58"
                      fill="transparent"
                      stroke="var(--color-primary)"
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 58}
                      strokeDashoffset={2 * Math.PI * 58 * (1 - 0.68)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-2xl font-mono font-bold">68%</span>
                     <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Utilized</span>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold">
                     <span className="text-white/40 uppercase">Earning Cap</span>
                     <span className="text-white">500 PTS / DAY</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                     <span className="text-white/40 uppercase">Multiplier</span>
                     <span className="text-green-500">1.0x (Standard)</span>
                  </div>
               </div>
            </Card>

            <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 flex gap-4">
               <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
               <div>
                  <p className="text-[11px] font-bold text-yellow-500 uppercase tracking-widest mb-1">Inflation Warning</p>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                     Daily emission has increased by 14% over the baseline. Consider adjusting task reward parameters.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default EconomyConsole;
