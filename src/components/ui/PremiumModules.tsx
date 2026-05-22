import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

export const CardPremium: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColor?: 'primary' | 'accent' | 'success' | 'none';
  variant?: 'thin' | 'standard' | 'deep';
}> = ({ children, className, glowColor = 'none', variant = 'standard' }) => {
  const variantClass = {
    thin: 'glass-thin',
    standard: 'glass-standard',
    deep: 'glass-deep'
  }[variant];

  const glowClass = {
    primary: 'hover:shadow-[0_0_40px_rgba(0,112,255,0.15)]',
    accent: 'hover:shadow-[0_0_40px_rgba(0,242,255,0.15)]',
    success: 'hover:shadow-[0_0_40px_rgba(0,255,163,0.15)]',
    none: ''
  }[glowColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-[2rem] p-6 transition-all duration-500 overflow-hidden relative group',
        variantClass,
        glowClass,
        className
      )}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
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
  <CardPremium variant="thin" className="p-4 flex items-center justify-between group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{label}</p>
        <p className="text-lg text-financial text-white">{value}</p>
      </div>
    </div>
    {change && (
      <div className={cn(
        "px-2 py-0.5 rounded-md text-[10px] font-bold",
        isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      )}>
        {change}
      </div>
    )}
  </CardPremium>
);
