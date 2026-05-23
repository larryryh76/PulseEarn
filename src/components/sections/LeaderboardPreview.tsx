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
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-secondary font-bold uppercase tracking-widest text-[10px] mb-4"
            >
              <Trophy size={14} />
              Leaderboard
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-bold mb-4"
            >
              Top Performers
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-white/40 text-sm md:text-lg"
            >
              The most successful traders and earners on the platform.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-0 border-white/10 bg-white/[0.02] overflow-hidden rounded-3xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-5">Rank</th>
                      <th className="px-6 py-5">Player</th>
                      <th className="px-6 py-5">Earnings</th>
                      <th className="px-6 py-5 text-right">Win Rate</th>
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
                        <td className="px-6 py-5">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs",
                            leader.rank === 1 ? "bg-yellow-500/20 text-yellow-500" :
                            leader.rank === 2 ? "bg-gray-300/20 text-gray-300" :
                            leader.rank === 3 ? "bg-orange-600/20 text-orange-600" : "text-white/40"
                          )}>
                            {leader.rank}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-[10px] border border-white/10">
                              {leader.avatar}
                            </div>
                            <span className="font-bold text-sm text-white">{leader.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono font-bold text-sm">{leader.earnings}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-green-400 font-bold text-xs">
                            <TrendingUp size={12} />
                            {leader.winRate}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="text-white/40 hover:text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors"
                >
                  Join the rankings
                  <ExternalLink size={12} />
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
