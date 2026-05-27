import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-2 group cursor-pointer ${className}`}>
      <div className="relative w-9 h-9">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />

        {/* Minimalist Icon */}
        <div className="relative w-full h-full bg-background border border-white/10 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary/50">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-white"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Minimalist Pulse + Arrow Up */}
            <path
              d="M3 12h3l3-9 4 18 3-9h5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:text-primary transition-colors"
            />
          </svg>

          {/* Subtle accent dot */}
          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </div>
      </div>

      <div className="flex flex-col -gap-1">
        <span className="font-heading font-bold text-xl tracking-tight text-white leading-tight">
          Pulse<span className="text-white/60 font-medium">Earn</span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 font-bold leading-none">
          Ecosystem
        </span>
      </div>
    </div>
  );
};

export default Logo;
