import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, ExternalLink } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';
import { useNavigate } from 'react-router-dom';

const LeaderboardPreview: React.FC = () => {
  const navigate = useNavigate();
  const leaders = [
    { rank: 1, name: 'Operator_Whale', earnings: '45,230', winRate: '78%', avatar: 'OW' },
    { rank: 2, name: 'Signal_Master', earnings: '32,150', winRate: '72%', avatar: 'SM' },
    { rank: 3, name: 'Ledger_Alpha', earnings: '28,400', winRate: '85%', avatar: 'LA' },
    { rank: 4, name: 'Trend_Sentinel', earnings: '21,900', winRate: '64%', avatar: 'TS' },
    { rank: 5, name: 'Pulse_Hunter', earnings: '18,320', winRate: '61%', avatar: 'PH' },
  ];

  return (
    <section id="leaderboard" className="py-32 relative overflow-hidden bg-[#050507]">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-4"
            >
              <Trophy size={16} />
              Global Rankings
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-7xl font-bold text-white tracking-tighter uppercase leading-[0.9]"
            >
              Elite <span className="text-white/20">Operators.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-white/40 text-lg md:text-xl font-medium tracking-tight max-w-2xl mx-auto uppercase"
            >
              The most successful ecosystem participants and high-yield executors.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-0 border border-white/10 bg-black overflow-hidden rounded-[2.5rem] shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold">
                      <th className="px-10 py-8">Rank</th>
                      <th className="px-10 py-8">Operator Identity</th>
                      <th className="px-10 py-8">Total Yield</th>
                      <th className="px-10 py-8 text-right">Execution Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaders.map((leader) => (
                      <tr
                        key={leader.rank}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-10 py-8">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border",
                            leader.rank === 1 ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(0,102,255,0.3)]" :
                            leader.rank === 2 ? "bg-white/10 border-white/20 text-white/60" :
                            leader.rank === 3 ? "bg-white/5 border-white/10 text-white/40" : "bg-white/[0.02] border-white/5 text-white/20"
                          )}>
                            {leader.rank}
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-[1rem] bg-white/[0.03] border border-white/10 flex items-center justify-center font-bold text-[11px] text-white/40 group-hover:border-primary/40 group-hover:text-primary transition-all">
                              {leader.avatar}
                            </div>
                            <span className="font-bold text-lg text-white tracking-tight group-hover:text-primary transition-colors">{leader.name}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-baseline gap-2">
                             <span className="font-mono font-bold text-lg text-white">{leader.earnings}</span>
                             <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">PTS</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end gap-2 text-success font-bold text-base font-mono">
                            <TrendingUp size={16} />
                            {leader.winRate}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-white/[0.01] border-t border-white/5 text-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="text-white/20 hover:text-white font-bold text-[11px] uppercase tracking-[0.4em] flex items-center gap-3 mx-auto transition-colors group"
                >
                  Authorize Participation
                  <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LeaderboardPreview;
