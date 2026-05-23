import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare,
  ShieldAlert,
  BarChart3,
  ChevronRight
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
          content: `Ecosystem health scan complete. I am currently monitoring ${newState.users.length} active users and ${newState.tasks.length} engagement channels. I have identified ${newReports.length} growth anomalies requiring attention.`,
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
         content: `Campaign Target: ${report.type.toUpperCase()} / Social Engagement. I have drafted the "${strategy.title}" strategy. To finalize deployment, please specify the primary social handle for interaction tracking:`,
         type: 'input'
       }]);
    } else {
       setMessages(prev => [...prev, {
         role: 'assistant',
         content: `Campaign Target: ${report.type.toUpperCase()} / ${report.id.split('_')[1].toUpperCase()}. Recommendation: Deploy "${strategy.title}". Intelligence Logic: ${strategy.reasoning}`,
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
        content: `Strategy "${activeStrategy.title}" has been successfully deployed. Automated verification systems are now monitoring for completion compliance.`,
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
         content: `Requirement recorded: "${userMsg}". Initializing campaign parameters with handle verification enabled. Growth protocol ready for deployment.`,
         type: 'strategy'
       }]);
       return;
    }

    setTimeout(() => {
      let response = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes('campaign') || lower.includes('create')) {
        response = "I can generate specialized campaigns based on real-time ecosystem health. Select an anomaly from the scan sidebar to view my proposed strategy.";
      } else if (lower.includes('status') || lower.includes('health')) {
        response = `Ecosystem operational. Point circulation: ${state.users.reduce((a,u) => a + (u.points || 0), 0).toLocaleString()} PTS. Engagement channels: ${state.tasks.length} active.`;
      } else {
        response = "Monitoring engagement vectors. I will notify you if any growth anomalies are detected.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-10rem)]">

      {/* MAIN OPERATOR PANEL */}
      <div className="lg:col-span-8 flex flex-col bg-[#050507] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05),transparent_70%)] pointer-events-none" />

         <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01] relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,112,255,0.2)]">
                  <Brain size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Ecosystem Operator AI</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Growth Engine: ACTIVE</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Activity size={12} className="text-primary" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Latency: 24ms</span>
               </div>
               <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                  <Eye size={12} className="text-white/40" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Mode: Supervisor</span>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative z-10">
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={cn("flex gap-4 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}
                >
                   <div className={cn(
                     "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                     m.role === 'assistant' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/40 shadow-xl"
                   )}>
                      {m.role === 'assistant' ? <Bot size={14} /> : <Terminal size={14} />}
                   </div>
                   <div className={cn(
                     "p-5 rounded-2xl text-[13px] leading-relaxed shadow-xl",
                     m.role === 'assistant' ? "bg-white/[0.03] text-white/80 border border-white/5" : "bg-primary text-white font-medium"
                   )}>
                      {m.content}
                      {m.type === 'strategy' && activeStrategy && (
                         <div className="mt-5 p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-4">
                            <div className="flex items-center justify-between">
                               <p className="font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 text-primary">
                                  <Rocket size={14} /> Actionable Growth Strategy
                               </p>
                               <span className="text-[9px] font-mono font-bold text-white/20">#{activeStrategy.id.split('_')[1]}</span>
                            </div>
                            <div className="space-y-2">
                               {activeStrategy.suggestedTasks?.map((t, j) => (
                                  <div key={j} className="flex items-start gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
                                     <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">
                                        <Plus size={10} />
                                     </div>
                                     <div>
                                        <p className="text-[11px] font-bold text-white">{t.title}</p>
                                        <p className="text-[9px] text-white/40 mt-0.5">{t.rewardPoints} PTS • {t.category}</p>
                                     </div>
                                  </div>
                               ))}
                            </div>
                            <button
                              onClick={handleExecuteStrategy}
                              disabled={isExecuting}
                              className="w-full py-3.5 rounded-xl bg-primary text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,112,255,0.4)]"
                            >
                               {isExecuting ? <RefreshCw size={14} className="animate-spin" /> : (
                                  <>
                                    <Zap size={14} />
                                    Approve & Deploy Strategy
                                  </>
                               )}
                            </button>
                         </div>
                      )}
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
         </div>

         <form onSubmit={handleSend} className="p-6 border-t border-white/[0.05] bg-white/[0.01] relative z-10">
            <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
               <input
                 type="text"
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 placeholder={pendingRequirement ? "Specify parameters..." : "Command the ecosystem..."}
                 className="relative w-full bg-[#050507] border border-white/[0.08] rounded-2xl pl-6 pr-14 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium placeholder:text-white/10"
               />
               <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:shadow-[0_0_15px_rgba(0,112,255,0.4)] hover:scale-105 transition-all">
                  <Send size={16} />
               </button>
            </div>
         </form>
      </div>

      {/* ANALYTICS SIDEBAR */}
      <div className="lg:col-span-4 space-y-6 overflow-y-auto custom-scrollbar pr-1">

         {/* Live Anomalies */}
         <div className="p-6 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-primary" />
                  <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Anomaly Detection</h3>
               </div>
               <button onClick={runSystemScan} disabled={isScanning} className="p-1.5 rounded-lg bg-white/5 text-white/20 hover:text-primary hover:bg-primary/5 transition-all">
                  <RefreshCw size={12} className={cn(isScanning && "animate-spin")} />
               </button>
            </div>

            <div className="space-y-3">
               {reports.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-[2rem]">
                     <CheckCircle2 className="mx-auto text-success/20 mb-3" size={32} />
                     <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Ecosystem Optimized</p>
                  </div>
               ) : reports.map((report, i) => (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    onClick={() => handleStrategyRequest(report)}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] relative group hover:bg-white/[0.04] hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                  >
                     <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                        <BarChart3 size={40} />
                     </div>
                     <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-2">
                           <div className={cn(
                             "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                             report.severity === 'high' ? "text-danger bg-danger" : report.severity === 'medium' ? "text-orange-500 bg-orange-500" : "text-primary bg-primary"
                           )} />
                           <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">{report.type}</span>
                        </div>
                        <span className={cn(
                           "text-[8px] font-bold px-2 py-0.5 rounded bg-white/5",
                           report.severity === 'high' ? "text-danger" : "text-white/20"
                        )}>{report.severity.toUpperCase()}</span>
                     </div>
                     <p className="text-[12px] text-white/70 leading-relaxed font-medium mb-4 relative z-10">{report.message}</p>
                     <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-primary group-hover:gap-2 transition-all relative z-10">
                        <span>View Strategy</span>
                        <ChevronRight size={12} />
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>

         {/* Operator Performance */}
         <div className="p-6 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] space-y-5 shadow-xl">
            <div className="flex items-center gap-2">
               <Settings size={14} className="text-white/20" />
               <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Operator Config</h3>
            </div>
            <div className="space-y-3">
               <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[9px] font-bold text-white/20 uppercase">Reward Scaling</p>
                     <p className="text-[11px] font-bold text-success uppercase">Optimized</p>
                  </div>
                  <div className="w-10 h-1 bg-success/20 rounded-full overflow-hidden">
                     <div className="w-[85%] h-full bg-success" />
                  </div>
               </div>
               <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[9px] font-bold text-white/20 uppercase">Fraud Intelligence</p>
                     <p className="text-[11px] font-bold text-primary uppercase">Active</p>
                  </div>
                  <div className="w-10 h-1 bg-primary/20 rounded-full overflow-hidden">
                     <div className="w-[92%] h-full bg-primary" />
                  </div>
               </div>
            </div>
         </div>

         {/* AI Insight */}
         <div className="p-6 rounded-[2.5rem] bg-accent/5 border border-accent/20 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-accent">
               <MessageSquare size={16} />
               <h4 className="text-[10px] font-bold uppercase tracking-widest">Intelligence Summary</h4>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium italic">
               "Ecosystem Operator is currently prioritizing high-yield social engagement loops to combat seasonal churn. Reward multipliers are set to auto-adjust."
            </p>
         </div>

      </div>

    </div>
  );
};

export default AdminAIConsole;
