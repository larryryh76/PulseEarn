import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className, glow = false, hover = true, onClick }) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -4, border: 'rgba(255,255,255,0.15)', transition: { duration: 0.3 } } : {}}
      className={cn(
        "bg-black rounded-3xl p-8 border border-white/5 relative overflow-hidden group shadow-2xl",
        glow && "after:absolute after:inset-0 after:rounded-3xl after:shadow-[0_0_40px_rgba(0,102,255,0.1)] after:pointer-events-none",
        className
      )}
    >
      <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default Card;
