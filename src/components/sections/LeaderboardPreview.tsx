import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, ExternalLink } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../utils';
import { useNavigate } from 'react-router-dom';

const LeaderboardPreview: React.FC = () => {
  const navigate = useNavigate();
  const leaders = [
    { rank: 1, name: 'CryptoWhale', earnings: '$45,230', winRate: '78%', avatar: 'CW' },
    { rank: 2, name: 'MoonWalker', earnings: '$32,150', winRate: '72%', avatar: 'MW' },
    { rank: 3, name: 'SatoshiKid', earnings: '$28,400', winRate: '85%', avatar: 'SK' },
    { rank: 4, name: 'AlphaTrader', earnings: '$21,900', winRate: '64%', avatar: 'AT' },
    { rank: 5, name: 'BullRun99', earnings: '$18,320', winRate: '61%', avatar: 'BR' },
  ];

  return (
    <section id="leaderboard" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 text-secondary font-bold uppercase tracking-widest text-sm mb-4"
              >
                <Trophy size={20} />
                Global Rankings
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-bold"
              >
                Pulse <span className="text-secondary">Legends</span>
              </motion.h2>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10"
            >
              <button className="px-6 py-2 rounded-xl bg-secondary text-white font-bold text-sm shadow-lg shadow-secondary/20 transition-all">Daily</button>
              <button className="px-6 py-2 rounded-xl text-white/40 hover:text-white font-bold text-sm transition-all">Weekly</button>
              <button className="px-6 py-2 rounded-xl text-white/40 hover:text-white font-bold text-sm transition-all">All-time</button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-0 border-white/10 bg-white/[0.02] overflow-hidden backdrop-blur-3xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-[0.2em] font-bold">
                      <th className="px-8 py-6">Rank</th>
                      <th className="px-8 py-6">Player</th>
                      <th className="px-8 py-6">Total Earnings</th>
                      <th className="px-8 py-6 text-right">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.map((leader, i) => (
                      <tr
                        key={leader.rank}
                        className={cn(
                          "group hover:bg-white/[0.03] transition-colors",
                          i !== leaders.length - 1 && "border-b border-white/5"
                        )}
                      >
                        <td className="px-8 py-6">
                          {leader.rank <= 3 ? (
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                              leader.rank === 1 && "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50",
                              leader.rank === 2 && "bg-gray-300/20 text-gray-300 border border-gray-300/50",
                              leader.rank === 3 && "bg-orange-600/20 text-orange-600 border border-orange-600/50"
                            )}>
                              {leader.rank}
                            </div>
                          ) : (
                            <span className="font-mono text-white/40 pl-3">{leader.rank}</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/40 to-primary/40 flex items-center justify-center font-bold border border-white/10 group-hover:scale-110 transition-transform">
                              {leader.avatar}
                            </div>
                            <span className="font-bold text-white group-hover:text-secondary transition-colors">{leader.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="font-mono font-bold text-lg">{leader.earnings}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 text-green-400 font-bold">
                            <TrendingUp size={14} />
                            {leader.winRate}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="text-white/40 hover:text-white font-bold text-sm flex items-center gap-2 mx-auto transition-colors group"
                >
                  View Full Leaderboard
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
