import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PsemineLogo from './PsemineLogo';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface PsemineLoaderProps {
  message?: string;
  timeoutMs?: number;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const PsemineLoader: React.FC<PsemineLoaderProps> = ({
  message = 'Loading PSEmine...',
  timeoutMs = 15000,
  onRetry,
  fullScreen = true
}) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  const containerClasses = fullScreen
    ? "fixed inset-0 z-[100] bg-[#080A11] flex flex-col items-center justify-center p-6"
    : "min-h-[400px] w-full bg-[#080A11] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <PsemineLogo size="lg" />
        </motion.div>

        {!timedOut ? (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Loading Bar */}
            <div className="w-56 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
              <motion.div
                initial={{ left: '-100%' }}
                animate={{ left: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent rounded-full shadow-[0_0_15px_#00F2FE]"
              />
            </div>

            {/* Message */}
            <p className="text-xs font-semibold text-cyan-200/70 tracking-widest uppercase">
              {message}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 bg-red-950/20 border border-red-500/20 p-5 rounded-xl text-center"
          >
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
              <AlertCircle size={16} />
              <span>Connection Delayed</span>
            </div>
            <p className="text-xs text-gray-400">
              Taking longer than expected to load PSEmine. Check your connection or retry.
            </p>
            <button
              onClick={() => {
                setTimedOut(false);
                if (onRetry) onRetry();
                else window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 rounded-lg text-xs font-bold transition-all"
            >
              <RefreshCw size={14} />
              <span>Retry Request</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PsemineLoader;
