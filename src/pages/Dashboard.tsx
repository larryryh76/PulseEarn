import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Shield,
  ChevronRight,
  Activity as ActivityIcon,
  Star,
  Target,
  ArrowUpRight,
  Users,
  Wallet,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatUSD, PTS_TO_USD } from '../utils/finance';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities, tasks, loading } = useTasks();

  const featuredTasks = tasks.filter(t => t.active).slice(0, 4);

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <p className="data-label text-primary mb-2">Earning Intelligence</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Command Center</h1>
          </motion.div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} className="text-success" />
                Identity Verified
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Node Connected
             </div>
          </div>
        </header>

        {/* Primary Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

           {/* Vault Balance */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] relative overflow-hidden flex flex-col justify-between min-h-[320px] group hover:border-primary/20 transition-all"
           >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />

              <div className="relative z-10 flex justify-between items-start">
                 <div>
                    <p className="data-label text-primary mb-1">Secured Vault</p>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Verified Earnings</p>
                 </div>
                 <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                    <Wallet size={24} />
                 </div>
              </div>

              <div className="relative z-10 mt-12">
                 <div className="flex items-baseline gap-4">
                    <p className="text-6xl font-mono font-bold text-white tracking-tighter">
                       {userData?.points.toLocaleString() || '0'}
                    </p>
                    <p className="text-xl font-bold text-text-secondary uppercase tracking-widest">PT</p>
                 </div>
                 <div className="flex items-center gap-3 mt-4">
                    <p className="text-xl font-medium text-white/40 leading-none">
                       &asymp; {formatUSD(PTS_TO_USD(userData?.points || 0))}
                    </p>
                    <Link to="/wallet" className="ml-auto p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                       <ArrowUpRight size={18} />
                    </Link>
                 </div>
              </div>
           </motion.div>

           {/* Progress & Growth */}
           <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between"
              >
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <p className="data-label text-accent mb-1">Tier Status</p>
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Level {userData?.level || 1} Operator</p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded-xl text-accent border border-accent/20">
                       <TrendingUp size={20} />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-end mb-4">
                       <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">XP Power</p>
                       <p className="text-sm font-mono font-bold">{userData?.xp.toLocaleString()} / 1,000</p>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min(((userData?.xp || 0) / 1000) * 100, 100)}%` }}
                         className="h-full bg-accent"
                       />
                    </div>
                 </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between"
              >
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <p className="data-label text-success mb-1">Ecosystem Growth</p>
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Referral Performance</p>
                    </div>
                    <div className="p-3 bg-success/10 rounded-xl text-success border border-success/20">
                       <Users size={20} />
                    </div>
                 </div>
                 <div>
                    <p className="text-3xl font-mono font-bold text-white mb-2">{userData?.stats?.referralsCount || 0}</p>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                       <span>Successful Invites</span>
                       <span className="text-success">+50 PT / ea</span>
                    </div>
                 </div>
              </motion.div>
           </div>
        </div>

        {/* Featured Campaigns */}
        <section className="mb-20">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <Star size={18} className="text-primary" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Marketplace Alpha</h2>
              </div>
              <Link to="/tasks" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest flex items-center gap-2">
                 Marketplace <ChevronRight size={14} />
              </Link>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTasks.map(task => (
                 <Link
                   key={task.id}
                   to={`/tasks/${task.id}`}
                   className="bg-white/[0.01] border border-white/5 p-6 rounded-[2.5rem] group hover:border-primary/20 hover:bg-white/[0.02] transition-all"
                 >
                    <div className="flex justify-between items-start mb-6">
                       <div className="p-2 rounded-xl bg-white/5 text-text-secondary group-hover:text-primary transition-all">
                          <Target size={18} />
                       </div>
                       <p className="text-sm font-mono font-bold text-white">+{task.rewardAmount}</p>
                    </div>
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors leading-tight mb-2">{task.title}</h4>
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">{task.description}</p>
                 </Link>
              ))}
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

           {/* Recent Rewards */}
           <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center gap-3">
                 <Zap size={18} className="text-warning" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Verified Settlements</h2>
              </div>
              <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] overflow-hidden">
                 <div className="divide-y divide-white/5">
                    {activities.length > 0 ? (
                       activities.slice(0, 5).map(act => (
                          <div key={act.id} className="p-6 flex items-center justify-between group hover:bg-white/[0.01] transition-all">
                             <div className="flex items-center gap-6">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-text-secondary">
                                   <ActivityIcon size={18} />
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white mb-0.5">{act.description}</p>
                                   <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">{act.timestamp?.toDate().toLocaleString()}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-mono font-bold text-success">+{act.points} PT</p>
                                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Released</p>
                             </div>
                          </div>
                       ))
                    ) : (
                       <div className="py-20 text-center text-white/10">
                          <Shield size={48} className="mx-auto mb-4" />
                          <p className="text-xs font-bold uppercase tracking-widest">Vault Synchronizing...</p>
                       </div>
                    )}
                 </div>
                 <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
                    <Link to="/wallet" className="text-[10px] font-bold text-text-secondary hover:text-white uppercase tracking-widest transition-colors">
                       View Complete Transaction Ledger
                    </Link>
                 </div>
              </div>
           </div>

           {/* Ecosystem Activity */}
           <div className="lg:col-span-4 space-y-8">
              <div className="flex items-center gap-3">
                 <LayoutDashboard size={18} className="text-primary" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Ecosystem Pulse</h2>
              </div>
              <div className="bg-primary/5 border border-primary/10 p-8 rounded-[2.5rem]">
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-6">Global Operator Activity</p>
                 <div className="space-y-6">
                    {[1,2,3,4].map(i => (
                       <div key={i} className="flex items-center gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <p className="text-[11px] text-white/60 leading-tight uppercase font-medium">Operator-{(Math.random()*1000).toFixed(0)} secured 50 PT via Social Campaign</p>
                       </div>
                    ))}
                 </div>
                 <div className="mt-10 pt-8 border-t border-primary/10">
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mb-1">Live Circulation</p>
                          <p className="text-lg font-mono font-bold text-primary">{(Math.random()*1000000).toLocaleString()} PT</p>
                       </div>
                       <ActivityIcon size={24} className="text-primary/20" />
                    </div>
                 </div>
              </div>
           </div>

        </div>

      </div>
    </MainLayout>
  );
};

export default Dashboard;
