import React from 'react';
import { motion } from 'framer-motion';
import { PSEMineLogo } from './PSEMineLogo';

interface PSEMineLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

/**
 * PSEMine Branded Loader
 * Reuses PulseEarn's core loading animation timing, transition logic, and structural progress bar,
 * but customized with the official PSEmine identity, original vector logo, and cryptographic styling.
 * Free of any fake AI or telemetry messages.
 */
export const PSEMineLoader: React.FC<PSEMineLoaderProps> = ({
  label = 'Loading Campaign',
  fullScreen = true
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6 select-none">
      <div className="scale-125 mb-2">
        <PSEMineLogo size={48} showWordmark={true} />
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Foundation Progress Track */}
        <div className="w-44 h-1 bg-white/10 dark:bg-white/10 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 w-1/2 bg-[#00E599] rounded-full shadow-[0_0_15px_rgba(0,229,153,0.6)]"
          />
        </div>
        <p className="text-[10px] font-bold tracking-[0.25em] text-text-tertiary uppercase">
          {label}
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-[#070A0F] text-white flex items-center justify-center"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className="py-20 flex items-center justify-center">
      {content}
    </div>
  );
};

export default PSEMineLoader;
