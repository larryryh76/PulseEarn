import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface ButtonPremiumProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const ButtonPremium: React.FC<ButtonPremiumProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary text-white shadow-[0_10px_30px_rgba(0,112,255,0.3)] hover:shadow-[0_15px_40px_rgba(0,112,255,0.4)]',
    accent: 'bg-accent text-black shadow-[0_10px_30px_rgba(0,242,255,0.3)] hover:shadow-[0_15px_40px_rgba(0,242,255,0.4)]',
    outline: 'bg-transparent border border-white/10 hover:bg-white/5 text-white',
    ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-6 py-3 text-[11px]',
    lg: 'px-8 py-4 text-xs',
    xl: 'px-10 py-5 text-sm',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative overflow-hidden rounded-2xl font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...(props as any)}
    >
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-white/[0.05] via-transparent to-transparent pointer-events-none" />

      {loading ? (
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="transition-transform group-hover:scale-110">{icon}</span>}
          <span className="relative z-10">{children}</span>
        </>
      )}

      <div className="absolute inset-0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
    </motion.button>
  );
};

export default ButtonPremium;
