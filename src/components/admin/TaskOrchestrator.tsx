import React, { useState } from 'react';
import { Clock } from 'lucide-react';

const TaskOrchestrator: React.FC = () => {
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Mission Control</h2>
          <h1 className="text-3xl font-bold">Task Orchestrator</h1>
        </div>

        <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl">
           {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
             <button
               key={f}
               onClick={() => setFilter(f)}
               className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                 filter === f ? 'bg-primary text-white' : 'text-white/20 hover:text-white/40'
               }`}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
          <div className="p-20 text-center glass-card border-white/[0.05] rounded-[2.5rem]">
             <Clock className="mx-auto mb-6 opacity-10" size={48} />
             <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/20">Awaiting user submissions...</p>
          </div>
      </div>
    </div>
  );
};

export default TaskOrchestrator;
