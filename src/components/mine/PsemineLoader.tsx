import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PsemineLogo from './PsemineLogo';
import { RefreshCw, AlertCircle, Binary } from 'lucide-react';

interface PsemineLoaderProps { message?: string; timeoutMs?: number; onRetry?: () => void; fullScreen?: boolean; }

export const PsemineLoader: React.FC<PsemineLoaderProps> = ({ message = 'Synchronizing protocol state...', timeoutMs = 15000, onRetry, fullScreen = true }) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTimedOut(true), timeoutMs); return () => clearTimeout(timer); }, [timeoutMs]);
  const containerClasses = fullScreen ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080b10] p-6' : 'flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl bg-[#080b10] p-6';
  return <div className={containerClasses}><div className="psemine-grid pointer-events-none absolute inset-0 opacity-40" /><div className="relative flex max-w-sm flex-col items-center gap-8 text-center">
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }} className="psemine-pulse"><PsemineLogo size="lg" /></motion.div>
    {!timedOut ? <div className="flex w-full flex-col items-center gap-5"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#758287]"><Binary size={13} className="text-[#f0aa3e]" /> PSEmine protocol</div><div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ x: '-100%' }} animate={{ x: '200%' }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="psemine-loader-beam absolute inset-y-0 w-1/2 rounded-full" /></div><p className="text-xs font-semibold uppercase tracking-widest text-[#9ca8ac]">{message}</p></div> : <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="psemine-panel flex flex-col items-center gap-4 rounded-2xl p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#f0aa3e]"><AlertCircle size={16} /> Connection delayed</div><p className="text-xs leading-6 text-[#9ca8ac]">PSEmine is taking longer than expected to respond.</p><button onClick={() => { setTimedOut(false); onRetry ? onRetry() : window.location.reload(); }} className="psemine-button-secondary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"><RefreshCw size={14} /> Retry request</button></motion.div>}
  </div></div>;
};
export default PsemineLoader;
