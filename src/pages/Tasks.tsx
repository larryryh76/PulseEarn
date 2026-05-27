import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Target, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

const Tasks: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="relative w-full max-w-4xl mx-auto">
          {/* Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full -z-10" />

          <div className="bg-black border border-white/[0.04] rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden shadow-2xl text-center space-y-12">
            {/* Header Identity */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
                  <div className="relative flex h-2 w-2">
                    <div className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-20 animate-ping"></div>
                    <div className="relative inline-flex rounded-full h-2 w-2 bg-primary"></div>
                  </div>
                  System Notice
                </div>
              </div>
              <h1 className="text-display text-white uppercase">
                Marketplace <br />
                <span className="text-white/20">Upgrading.</span>
              </h1>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="surface-1 p-8 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/20 mx-auto">
                  <Target size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Rewards</p>
                  <p className="text-sm font-bold text-white uppercase">Updating</p>
                </div>
              </div>
              <div className="surface-1 p-8 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/20 mx-auto">
                  <Cpu size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Missions</p>
                  <p className="text-sm font-bold text-white uppercase">Enhancing</p>
                </div>
              </div>
              <div className="surface-1 p-8 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/20 mx-auto">
                  <ShieldAlert size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Security</p>
                  <p className="text-sm font-bold text-white uppercase">Active</p>
                </div>
              </div>
            </div>

            {/* Context Message */}
            <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed font-medium uppercase tracking-tight">
              We are currently re-architecting the unified mission ecosystem to ensure absolute operational integrity.
              The Marketplace will resume shortly.
            </p>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="h-1 w-32 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  animate={{ x: [-128, 128] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="h-full w-1/2 bg-primary/40"
                />
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] animate-pulse">Syncing...</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
