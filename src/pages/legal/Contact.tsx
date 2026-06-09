import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const Contact: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-8">Contact Support</h1>
          <p className="text-text-secondary mb-12 text-lg">
            Our specialized operations team is available to assist with technical queries and account verification.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="system-card p-8">
               <h2 className="text-xl font-bold mb-4">Operations Hub</h2>
               <p className="text-text-secondary mb-6">Technical & Platform Support</p>
               <div className="space-y-4">
                  <a href="https://t.me/pulseearn" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-primary hover:underline font-bold uppercase tracking-widest text-xs">
                     <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">TG</span>
                     Telegram Support
                  </a>
                  <a href="https://discord.gg/pulseearn" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-primary hover:underline font-bold uppercase tracking-widest text-xs">
                     <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">DC</span>
                     Discord Community
                  </a>
               </div>
            </div>
            <div className="system-card p-8 flex flex-col justify-between">
               <div>
                  <h2 className="text-xl font-bold mb-4">Security Center</h2>
                  <p className="text-text-secondary mb-6">Fraud & Integrity Reports</p>
               </div>
               <button onClick={() => window.location.href = "mailto:integrity@pulseearn.io"} className="w-full py-4 bg-danger/10 text-danger border border-danger/20 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-danger/20 transition-all">
                  Submit Incident Report
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Contact;
