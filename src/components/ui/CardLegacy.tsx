import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'ghost';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hover = true,
  onClick
}) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover && onClick ? { y: -4, transition: { duration: 0.2 } } : {}}
      className={cn(
        "bg-surface border border-border transition-all duration-300 relative overflow-hidden group",
        variant === 'default' && "rounded-2xl p-8",
        variant === 'compact' && "rounded-xl p-5",
        variant === 'ghost' && "bg-transparent border-transparent p-0 shadow-none hover:bg-surface-bright/50",
        hover && onClick && "cursor-pointer hover:border-border-bright hover:shadow-premium",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default Card;
