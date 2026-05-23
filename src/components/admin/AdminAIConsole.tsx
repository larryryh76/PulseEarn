import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Terminal,
  Zap,
  Activity,
  RefreshCw,
  Brain,
  Rocket,
  Plus,
  CheckCircle2,
  Eye,
  Settings,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../utils';
import { EcosystemScanner, EcosystemState, AIReport } from '../../utils/EcosystemScanner';
import { EcosystemBot, BotStrategy } from '../../utils/ecosystemBot';
import toast from 'react-hot-toast';

const AdminAIConsole: React.FC = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, type?: 'status' | 'strategy' | 'input'}[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<EcosystemState | null>(null);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<BotStrategy | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingRequirement, setPendingRequirement] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const runSystemScan = async () => {
    setIsScanning(true);
    try {
      const newState = await EcosystemScanner.scanState();
      const newReports = await EcosystemScanner.generateReports(newState);
      setState(newState);
      setReports(newReports);

      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Initial ecosystem synchronization complete. Intelligence core is active. I have identified ${newReports.length} growth opportunities.`,
          type: 'status'
        }]);
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runSystemScan();
  }, []);

  const handleStrategyRequest = (report: AIReport) => {
    const strategy = EcosystemBot.generateStrategy(report);
    setActiveStrategy(strategy);

    if (report.id === 'growth_social_low') {
       setPendingRequirement('tiktok_handle');
       setMessages(prev => [...prev, {
         role: 'assistant',
         content: `Targeting: ${report.id}. I recommend the "${strategy.title}" protocol. To proceed, what is the primary TikTok/YouTube handle for this campaign?`,
         type: 'input'
       }]);
    } else {
       setMessages(prev => [...prev, {
         role: 'assistant',
         content: `Targeting: ${report.id}. I recommend executing the "${strategy.title}" protocol. Reason: ${strategy.reasoning}`,
         type: 'strategy'
       }]);
    }
  };

  const handleExecuteStrategy = async () => {
    if (!activeStrategy) return;
    setIsExecuting(true);
    try {
      await EcosystemBot.executeStrategy(activeStrategy);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Strategy "${activeStrategy.title}" has been successfully deployed. External node verification is monitoring handles for compliance.`,
        type: 'status'
      }]);
      toast.success('Strategy deployed successfully!');
      setActiveStrategy(null);
      setPendingRequirement(null);
      await runSystemScan();
    } catch (e) {
      toast.error('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !state) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    if (pendingRequirement) {
       setMessages(prev => [...prev, {
         role: 'assistant',
         content: `Requirement recorded: "${userMsg}". Initializing campaign parameters with handle verification enabled. Protocol ready for deployment.`,
         type: 'strategy'
       }]);
       return;
    }

    setTimeout(() => {
      let response = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes('campaign') || lower.includes('create')) {
        response = "I can generate specialized campaigns based on live metrics. Select an anomaly from the health scan sidebar, or provide a specific social handle.";
      } else if (lower.includes('status') || lower.includes('health')) {
        response = `System operational. Economy balance: ${state.users.reduce((a,u) => a + (u.points || 0), 0).toLocaleString()} PTS. Active tasks: ${state.tasks.length}.`;
      } else {
        response = "Understood. Monitoring ecosystem vectors for opportunities.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-10rem)]">

      <div className="lg:col-span-8 flex flex-col bg-[#050507] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05),transparent_70%)] pointer-events-none" />

         <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01] relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                  <Brain size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Ecosystem Intelligence Bot</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Strategy Engine: ACTIVE</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                  <Eye size={12} className="text-white/40" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Bot Visibility: Full</span>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative z-10">
            {messages.map((m, i) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={cn("flex gap-4 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                 <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", m.role === 'assistant' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/40")}>
                    {m.role === 'assistant' ? <Bot size={14} /> : <Terminal size={14} />}
                 </div>
                 <div className={cn("p-4 rounded-2xl text-[12px] leading-relaxed", m.role === 'assistant' ? "bg-white/[0.03] text-white/80" : "bg-primary text-white")}>
                    {m.content}
                    {m.type === 'strategy' && activeStrategy && (
                       <div className="mt-4 p-4 rounded-xl bg-primary/20 border border-primary/30 space-y-3">
                          <p className="font-bold text-[11px] uppercase tracking-widest flex items-center gap-2">
                             <Rocket size={14} /> Protocol Strategy Ready
                          </p>
                          <div className="space-y-1">
                             {activeStrategy.suggestedTasks?.map((t, j) => (
                                <div key={j} className="flex items-center gap-2 text-[10px] text-white/60">
                                   <Plus size={10} /> {t.title} (+{t.rewardPoints} PTS)
                                </div>
                             ))}
                          </div>
                          <button
                            onClick={handleExecuteStrategy}
                            disabled={isExecuting}
                            className="w-full py-2 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary/80 transition-all flex items-center justify-center gap-2"
                          >
                             {isExecuting ? <RefreshCw size={12} className="animate-spin" /> : 'Confirm Ecosystem Update'}
                          </button>
                       </div>
                    )}
                 </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
         </div>

         <form onSubmit={handleSend} className="p-6 border-t border-white/[0.05] bg-white/[0.01] relative z-10">
            <div className="relative">
               <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={pendingRequirement ? "Enter the requested details..." : "Command the ecosystem..."} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-6 pr-14 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium" />
               <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 transition-all">
                  <Send size={16} />
               </button>
            </div>
         </form>
      </div>

      <div className="lg:col-span-4 space-y-6 overflow-y-auto custom-scrollbar">

         <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Anomaly Detection</h3>
               </div>
               <button onClick={runSystemScan} disabled={isScanning} className="p-1 rounded bg-white/5 text-white/20 hover:text-primary transition-colors">
                  <RefreshCw size={10} className={cn(isScanning && "animate-spin")} />
               </button>
            </div>

            <div className="space-y-4">
               {reports.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                     <CheckCircle2 className="mx-auto text-success/20 mb-2" size={24} />
                     <p className="text-[9px] font-bold text-white/20 uppercase">Ecosystem Healthy</p>
                  </div>
               ) : reports.map((report, i) => (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] relative group hover:bg-white/[0.04] transition-all cursor-pointer">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                           <div className={cn("w-1.5 h-1.5 rounded-full", report.severity === 'high' ? "bg-danger" : report.severity === 'medium' ? "bg-orange-500" : "bg-primary")} />
                           <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{report.type}</span>
                        </div>
                        <span className="text-[8px] text-white/20 font-bold">{report.severity.toUpperCase()}</span>
                     </div>
                     <p className="text-[11px] text-white/70 leading-relaxed font-medium mb-3">{report.message}</p>
                     <button
                       onClick={() => handleStrategyRequest(report)}
                       className="w-full py-2 rounded-lg bg-white/5 text-white/40 group-hover:bg-primary group-hover:text-white text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                     >
                        <Zap size={10} /> Execute Strategy
                     </button>
                  </motion.div>
               ))}
            </div>
         </div>

         <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-4">
            <div className="flex items-center gap-2">
               <Settings size={14} className="text-white/20" />
               <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ops Configuration</h3>
            </div>
            <div className="space-y-3">
               <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 font-bold uppercase">Reward Scaling</span>
                  <span className="text-[10px] text-success font-bold">OPTIMIZED</span>
               </div>
               <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 font-bold uppercase">Verification Mode</span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Multi-Node</span>
               </div>
            </div>
         </div>

         <div className="p-6 rounded-[2rem] bg-accent/5 border border-accent/20 space-y-4">
            <div className="flex items-center gap-2 text-accent">
               <MessageSquare size={16} />
               <h4 className="text-[10px] font-bold uppercase tracking-widest">Growth Intelligence</h4>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed font-medium">
               Bot is currently prioritizing retention protocols. Referral growth has been flagged for a potential "Node Expansion" event.
            </p>
         </div>

      </div>

    </div>
  );
};

export default AdminAIConsole;
