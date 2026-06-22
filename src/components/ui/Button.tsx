import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  ...props
}) => {
  const variants = {
    primary: 'bg-text-primary text-background hover:opacity-90 shadow-lg shadow-primary/10',
    secondary: 'bg-surface-bright text-text-primary border border-border hover:bg-surface-accent',
    outline: 'border border-border text-text-primary hover:bg-surface-glass',
    ghost: 'text-text-tertiary hover:text-text-primary hover:bg-surface-glass',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg',
    md: 'px-6 py-3 text-[11px] font-bold uppercase tracking-[0.1em] rounded-xl',
    lg: 'px-10 py-5 text-[12px] font-bold uppercase tracking-[0.2em] rounded-2xl',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={isLoading || props.disabled}
      className={cn(
        "relative transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden",
        variants[variant],
        sizes[size],
        isLoading && "opacity-70 cursor-not-allowed",
        className
      )}
      {...(props as any)}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </motion.button>
  );
};

export default Button;
