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
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-secondary text-white hover:bg-secondary/90',
    outline: 'border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-white/20',
    ghost: 'text-white/70 hover:text-white hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-2.5 text-sm font-semibold rounded-xl',
    lg: 'px-8 py-3.5 text-base font-bold rounded-xl',
  };

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden",
        variants[variant],
        sizes[size],
        glow && "shadow-[0_0_15px_rgba(0,112,255,0.25)]",
        className
      )}
      {...(props as any)}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

export default Button;
