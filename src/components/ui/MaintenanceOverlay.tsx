import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, ShieldAlert, WifiOff } from 'lucide-react';
import Logo from './Logo';

export type MaintenanceType = 'PERMISSION_DENIED' | 'MAINTENANCE' | 'OFFLINE' | 'INITIALIZATION_FAILED';

interface MaintenanceOverlayProps {
  type: MaintenanceType;
  message?: string;
  onRetry?: () => void;
}

const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  type,
  message,
  onRetry
}) => {
  const getIcon = () => {
    switch (type) {
      case 'PERMISSION_DENIED': return <ShieldAlert className="w-12 h-12 text-red-500" />;
      case 'OFFLINE': return <WifiOff className="w-12 h-12 text-amber-500" />;
      case 'MAINTENANCE': return <AlertTriangle className="w-12 h-12 text-[#0070FF]" />;
      default: return <RefreshCcw className="w-12 h-12 text-white/40 animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'PERMISSION_DENIED': return 'System Lockdown';
      case 'OFFLINE': return 'Connection Lost';
      case 'MAINTENANCE': return 'Scheduled Upgrade';
      default: return 'Initialization Error';
    }
  };

  const getDescription = () => {
    if (message) return message;
    switch (type) {
      case 'PERMISSION_DENIED': return 'The backend is currently denying access. This is usually due to security rule updates or administrative lockdown.';
      case 'OFFLINE': return 'We cannot reach the PulseEarn servers. Please check your internet connection.';
      case 'MAINTENANCE': return 'We are currently optimizing the ecosystem. Please check back shortly.';
      default: return 'An unexpected error occurred while connecting to the core engines.';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-[#050507] flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">
        <div className="scale-125 mb-4">
          <Logo />
        </div>

        <div className="relative w-full">
          <div className="absolute inset-0 bg-[#0070FF]/10 blur-3xl rounded-full" />
          <div className="relative bg-[#12121A] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-inner">
                {getIcon()}
              </div>
            </div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight mb-3">
              {getTitle()}
            </h1>
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-relaxed mb-8 px-4">
              {getDescription()}
            </p>

            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-5 bg-white text-black font-black uppercase italic tracking-[0.2em] text-[10px] rounded-2xl hover:bg-[#0070FF] hover:text-white transition-all duration-500 shadow-xl"
              >
                Reconnect System
              </button>
            )}
          </div>
        </div>

        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.4em]">
          Engine Status // {type.replace('_', ' ')}
        </p>
      </div>
    </motion.div>
  );
};

export default MaintenanceOverlay;
