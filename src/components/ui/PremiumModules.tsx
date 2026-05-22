import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

export const CardPremium: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: 'thin' | 'standard' | 'deep';
  onClick?: () => void;
}> = ({ children, className, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={onClick}
      className={cn(
        'glass-card p-6 overflow-hidden relative group',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export const MarketWidget: React.FC<{
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}> = ({ label, value, change, isPositive, icon }) => (
  <CardPremium className="p-4 flex items-center justify-between group">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
    {change && (
      <div className={cn(
        "px-2 py-0.5 rounded-md text-[10px] font-bold",
        isPositive ? "text-success bg-success/10" : "text-danger bg-danger/10"
      )}>
        {change}
      </div>
    )}
  </CardPremium>
);
