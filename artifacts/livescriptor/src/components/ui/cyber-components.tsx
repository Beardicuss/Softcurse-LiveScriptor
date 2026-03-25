import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  glitchHover?: boolean;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = 'primary', glitchHover = false, children, ...props }, ref) => {
    const base = "relative px-6 py-2 font-mono font-bold uppercase tracking-wider transition-all duration-300 overflow-hidden text-sm";
    
    const variants = {
      primary: "bg-primary/10 text-primary border border-primary/50 hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]",
      secondary: "bg-secondary/10 text-secondary border border-secondary/50 hover:bg-secondary/20 hover:border-secondary hover:shadow-[0_0_15px_rgba(0,136,255,0.4)]",
      danger: "bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/20 hover:border-destructive hover:shadow-[0_0_15px_rgba(255,107,53,0.4)]",
      ghost: "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 border border-transparent"
    };

    return (
      <button 
        ref={ref}
        className={cn(base, variants[variant], glitchHover && "hover-glitch", className)} 
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);
CyberButton.displayName = "CyberButton";

export const CyberInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "bg-background/80 border-b-2 border-transparent border-b-primary/30 text-primary placeholder:text-muted-foreground/50 px-4 py-2 font-mono text-sm focus:outline-none focus:border-b-primary focus:bg-primary/5 transition-all w-full",
          className
        )}
        {...props}
      />
    );
  }
);
CyberInput.displayName = "CyberInput";

export const CyberPanel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card/80 backdrop-blur-md border border-primary/20 shadow-[0_0_20px_rgba(0,0,0,0.6)] neon-border-primary",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CyberPanel.displayName = "CyberPanel";
