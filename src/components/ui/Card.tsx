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
      whileHover={hover ? { y: -4, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } } : {}}
      className={cn(
        "bg-[#0D0D12]/50 backdrop-blur-md rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden group",
        glow && "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_20px_rgba(0,112,255,0.1)] after:pointer-events-none",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default Card;
