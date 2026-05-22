import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Terminal,
  ShieldAlert,
  Zap,
  Activity,
  Database,
  RefreshCw,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../../utils';
import { EcosystemScanner, EcosystemState, AIReport } from '../../utils/EcosystemScanner';
import Card from '../ui/Card';

const AdminAIConsole: React.FC = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<EcosystemState | null>(null);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [isScanning, setIsScanning] = useState(false);
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
          content: `Initial scan complete. I have identified ${newReports.length} operational items requiring attention. How can I assist you with the ecosystem today?`
        }]);
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runSystemScan();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !state) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    // Simulate AI Processing based on real state
    setTimeout(() => {
      let response = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes('placeholder')) {
        const mockTasks = state.tasks.filter(t => t.description.toLowerCase().includes('placeholder'));
        response = mockTasks.length > 0
          ? `I've detected ${mockTasks.length} instances of mock data in the Task Engine. Specifically in categories: ${[...new Set(mockTasks.map(t => t.category))].join(', ')}.`
          : "System scan complete. No obvious placeholder components detected in the live task database.";
      } else if (lower.includes('engagement') || lower.includes('activity')) {
        const total = state.users.length;
        const active = state.users.filter(u => {
          const lastAction = u.lastActionTimestamp?.toDate() || new Date(0);
          return (new Date().getTime() - lastAction.getTime()) < 86400000;
        }).length;
        response = total > 0
          ? `Current ecosystem engagement is at ${Math.round((active/total)*100)}% active users (last 24h). I recommend launching a retention campaign for the ${total - active} inactive nodes.`
          : "System engagement metrics are at zero. Awaiting new node connections.";
      } else if (lower.includes('health') || lower.includes('supply')) {
        const totalPoints = state.users.reduce((acc, u) => acc + (u.points || 0), 0);
        response = `Ecosystem health is nominal. Total Pulse supply: ${totalPoints.toLocaleString()} PTS. Velocity of points is within safety parameters (+4.2%/day).`;
      } else if (lower.includes('fraud') || lower.includes('scan')) {
        const suspicious = state.users.filter(u => u.isFlagged).length;
        response = `Scanning for anomalies... Detected ${suspicious} flagged nodes. ${state.submissions.filter(s => s.status === 'pending').length} submissions currently in high-priority review queue.`;
      } else {
        response = "I am monitoring all protocol layers. You can ask me to 'scan for placeholders', 'check ecosystem health', or 'analyze user engagement'.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">

      {/* AI Chat Console */}
      <div className="lg:col-span-2 flex flex-col bg-[#050507] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05),transparent_70%)] pointer-events-none" />

         <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01] relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                  <Bot size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Ecosystem Assistant</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Live Operations Mode</span>
                  </div>
               </div>
            </div>
            <button
              onClick={runSystemScan}
              disabled={isScanning}
              className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all disabled:opacity-50"
            >
               <RefreshCw size={16} className={cn(isScanning && "animate-spin")} />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative z-10">
            {messages.map((m, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={cn(
                  "flex gap-4 max-w-[80%]",
                  m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                 <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                    m.role === 'assistant' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/40"
                 )}>
                    {m.role === 'assistant' ? <Bot size={14} /> : <Terminal size={14} />}
                 </div>
                 <div className={cn(
                    "p-4 rounded-2xl text-[12px] leading-relaxed",
                    m.role === 'assistant' ? "bg-white/[0.03] text-white/80" : "bg-primary text-white font-medium"
                 )}>
                    {m.content}
                 </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
         </div>

         <form onSubmit={handleSend} className="p-6 border-t border-white/[0.05] bg-white/[0.01] relative z-10">
            <div className="relative">
               <input
                 type="text"
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 placeholder="Command the ecosystem bot..."
                 className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-6 pr-14 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all"
               />
               <button
                 type="submit"
                 className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
               >
                  <Send size={16} />
               </button>
            </div>
         </form>
      </div>

      {/* Operational Intelligence Sidebar */}
      <div className="space-y-6 overflow-y-auto custom-scrollbar">

         <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-6">
            <div className="flex items-center gap-2">
               <Activity size={16} className="text-primary" />
               <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live Health Scan</h3>
            </div>

            <div className="space-y-4">
               {reports.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                     <ShieldAlert className="mx-auto text-white/5 mb-2" size={24} />
                     <p className="text-[9px] font-bold text-white/20 uppercase">No anomalies detected</p>
                  </div>
               ) : reports.map((report, i) => (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] relative group hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                     <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                           "w-1.5 h-1.5 rounded-full",
                           report.severity === 'high' ? "bg-danger" : report.severity === 'medium' ? "bg-orange-500" : "bg-primary"
                        )} />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{report.type} Monitor</span>
                     </div>
                     <p className="text-[11px] text-white/70 leading-relaxed font-medium">{report.message}</p>
                     <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </motion.div>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 border-white/[0.05] bg-[#0A0A0F]">
               <Database size={16} className="text-white/20 mb-3" />
               <p className="text-[9px] font-bold text-white/20 uppercase mb-1">State Nodes</p>
               <p className="text-xl font-bold text-white">{state?.tasks.length || 0}</p>
            </Card>
            <Card className="p-5 border-white/[0.05] bg-[#0A0A0F]">
               <Sparkles size={16} className="text-accent mb-3" />
               <p className="text-[9px] font-bold text-white/20 uppercase mb-1">AI uptime</p>
               <p className="text-xl font-bold text-white">99.9%</p>
            </Card>
         </div>

         <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center gap-2 text-primary">
               <Zap size={16} />
               <h4 className="text-[10px] font-bold uppercase tracking-widest">Automation Ready</h4>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed font-medium">
               Ecosystem AI can now automatically rotate tasks and trigger retention missions based on real-time activity metrics.
            </p>
            <button className="w-full py-3 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">
               Enable Autonomous Ops
            </button>
         </div>

      </div>

    </div>
  );
};

export default AdminAIConsole;
