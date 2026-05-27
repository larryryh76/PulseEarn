import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  glow = false,
  children,
  className,
  ...props
}) => {
  const variants = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'bg-primary text-white hover:bg-primary/90',
    outline: 'border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-white/20',
    ghost: 'text-white/40 hover:text-white hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl',
    md: 'px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl',
    lg: 'px-14 py-6 text-[12px] font-bold uppercase tracking-[0.3em] rounded-2xl',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden shadow-2xl",
        variants[variant],
        sizes[size],
        glow && "shadow-[0_0_30px_rgba(255,255,255,0.1)]",
        className
      )}
      {...(props as any)}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

export default Button;
