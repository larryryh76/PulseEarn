import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  Terminal,
  ShieldCheck,
  Layers,
  Activity,
  BarChart3,
  Settings,
  Bell,
  Wallet,
  Clock,
  LogOut,
  Target,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  getDocs,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import Logo from '../../components/ui/Logo';
import CampaignManagement from './modules/CampaignManagement';
import ValidationCenter from './modules/ValidationCenter';
import UserManagement from './modules/UserManagement';
import SystemLogs from './modules/SystemLogs';
import TransactionCenter from './modules/TransactionCenter';
import FraudCenter from './modules/FraudCenter';
import EconomyCenter from './modules/EconomyCenter';
import WithdrawalManagement from './modules/WithdrawalManagement';

// --- Types ---
type AdminModule =
  | 'OVERVIEW'
  | 'CAMPAIGN_MGMT'
  | 'VALIDATION'
  | 'TRANSACTIONS'
  | 'FRAUD'
  | 'USERS'
  | 'WITHDRAWALS'
  | 'NOTIFICATIONS'
  | 'ECONOMY'
  | 'AUDIT';

// --- Sub-Components (Shells for now) ---
const OverviewModule = ({ stats }: { stats: any }) => (
  <div className="space-y-12">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Operations Intelligence</h1>
      <p className="text-text-secondary text-sm">Real-time infrastructure health and ecosystem velocity.</p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {[
        { label: 'Active Operators', val: stats.totalUsers, icon: Users, color: 'text-primary' },
        { label: 'Live Campaigns', val: stats.activeTasks, icon: Target, color: 'text-success' },
        { label: 'Pending Reviews', val: stats.pendingClaims, icon: ShieldCheck, color: 'text-warning' },
        { label: 'Fraud Alerts', val: 0, icon: ShieldAlert, color: 'text-danger' },
        { label: 'Payout Queue', val: stats.pendingWithdrawals || 0, icon: Wallet, color: 'text-accent' },
        { label: 'System Velocity', val: 'Nominal', icon: Activity, color: 'text-white/40' },
      ].map(card => (
        <div key={card.label} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <div className={cn("p-2 rounded-lg bg-white/5 w-fit mb-4", card.color)}>
            <card.icon size={18} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{card.label}</p>
          <p className="text-xl font-mono font-bold">{card.val}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
             <BarChart3 size={16} className="text-primary" />
             Economic Distribution
          </h3>
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-black/20 text-white/10">
             Economy Analytics Engine Pending
          </div>
       </div>
       <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
             <Clock size={16} className="text-accent" />
             Infrastructure Events
          </h3>
          <div className="space-y-4">
             {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                   <p className="text-[11px] font-medium text-white/60">System Synchronized with Global Node-01</p>
                   <span className="ml-auto text-[9px] font-mono text-white/20">Just Now</span>
                </div>
             ))}
          </div>
       </div>
    </div>
  </div>
);

const AdminTerminal: React.FC = () => {
  const [activeModule, setActiveModule] = useState<AdminModule>('OVERVIEW');
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingClaims: 0,
    totalCampaigns: 0,
    ecosystemPoints: 0,
    pendingWithdrawals: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersCount = await getCountFromServer(collection(db, 'users'));
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('active', '==', true)));
        const claimsSnap = await getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING')));

        setStats(prev => ({
          ...prev,
          totalUsers: usersCount.data().count,
          activeTasks: tasksSnap.size,
          pendingClaims: claimsSnap.data().count
        }));
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  if (userData?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/20 uppercase tracking-[0.5em] font-bold">Unauthorized / Administrative Tier Required</p>
      </div>
    );
  }

  const navItems = [
    { id: 'OVERVIEW', label: 'Intelligence', icon: Terminal },
    { id: 'CAMPAIGN_MGMT', label: 'Campaigns', icon: Layers },
    { id: 'VALIDATION', label: 'Validation', icon: ShieldCheck },
    { id: 'TRANSACTIONS', label: 'Ledger', icon: Activity },
    { id: 'USERS', label: 'Operators', icon: Users },
    { id: 'WITHDRAWALS', label: 'Payouts', icon: Wallet },
    { id: 'FRAUD', label: 'Security', icon: ShieldAlert },
    { id: 'ECONOMY', label: 'Economy', icon: BarChart3 },
    { id: 'NOTIFICATIONS', label: 'Broadcasts', icon: Bell },
    { id: 'AUDIT', label: 'System Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-primary/30 flex overflow-hidden">

      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-white/5 bg-background/50 backdrop-blur-xl flex flex-col z-50">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
           <Logo />
           <div className="h-4 w-px bg-white/10" />
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Ops Terminal</span>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4 mb-4">Command Center</p>
           {navItems.map(item => (
             <button
               key={item.id}
               onClick={() => setActiveModule(item.id as AdminModule)}
               className={cn(
                 "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all",
                 activeModule === item.id
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.05)]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
               )}
             >
               <item.icon size={18} />
               {item.label}
               {activeModule === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
             </button>
           ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
           <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Authenticated As</p>
              <p className="text-xs font-mono font-bold truncate">{userData?.email}</p>
           </div>
           <button
             onClick={async () => { await logout(); navigate('/'); }}
             className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-danger/60 hover:text-danger hover:bg-danger/5 transition-all"
           >
              <LogOut size={18} />
              Exit Terminal
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#050507]">
         <header className="h-20 border-b border-white/5 px-12 flex items-center justify-between sticky top-0 bg-[#050507]/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
               <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Ecosystem Hub v5.0.0-PRO // Global Cluster-01</span>
            </div>

            <div className="flex items-center gap-8">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <ShieldCheck size={14} className="text-success" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Audit Secure</span>
               </div>
               <button className="p-2 hover:bg-white/5 rounded-xl transition-all relative">
                  <Bell size={20} className="text-text-secondary" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[#050507]" />
               </button>
               <div className="h-8 w-px bg-white/10" />
               <button className="p-1 border border-white/10 rounded-xl">
                  <img src={userData?.avatarUrl} alt="" className="w-8 h-8 rounded-lg" />
               </button>
            </div>
         </header>

         <div className="p-12 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
               <motion.div
                 key={activeModule}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                  {activeModule === 'OVERVIEW' && <OverviewModule stats={stats} />}
                  {activeModule === 'CAMPAIGN_MGMT' && <CampaignManagement />}
                  {activeModule === 'VALIDATION' && <ValidationCenter />}
                  {activeModule === 'TRANSACTIONS' && <TransactionCenter />}
                  {activeModule === 'USERS' && <UserManagement />}
                  {activeModule === 'WITHDRAWALS' && <WithdrawalManagement />}
                  {activeModule === 'FRAUD' && <FraudCenter />}
                  {activeModule === 'ECONOMY' && <EconomyCenter />}
                  {activeModule === 'AUDIT' && <SystemLogs />}

                  {/* Remaining modules placeholders */}
                  {activeModule === 'NOTIFICATIONS' && (
                    <div className="py-40 text-center">
                       <Bell size={48} className="mx-auto text-white/5 mb-6" />
                       <h2 className="text-2xl font-bold mb-2">Broadcast Center</h2>
                       <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
                          Infrastructure for global announcements and campaign alerts is synchronizing.
                       </p>
                    </div>
                  )}

                  {!['OVERVIEW', 'CAMPAIGN_MGMT', 'VALIDATION', 'TRANSACTIONS', 'USERS', 'WITHDRAWALS', 'FRAUD', 'ECONOMY', 'AUDIT', 'NOTIFICATIONS'].includes(activeModule) && (
                    <div className="py-40 text-center">
                       <Settings size={48} className="mx-auto text-white/5 mb-6" />
                       <h2 className="text-2xl font-bold mb-2">Module Synchronizing</h2>
                       <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
                          Infrastructure for the {activeModule} module is currently aligning with backend protocol targets. Deployment scheduled for next cycle.
                       </p>
                    </div>
                  )}
               </motion.div>
            </AnimatePresence>
         </div>
      </main>
    </div>
  );
};

export default AdminTerminal;
