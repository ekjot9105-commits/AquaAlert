import React from 'react';
import { cn } from '../utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-glow-aqua focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
    
    const variants = {
      primary: "bg-glow-aqua text-ink-navy hover:bg-glow-aqua/90 shadow-[0_0_15px_rgba(46,230,214,0.3)]",
      secondary: "bg-deep-teal text-foam-white hover:bg-deep-teal/80 border border-glow-aqua/20",
      ghost: "hover:bg-deep-teal/50 text-foam-white",
      danger: "bg-alert-coral text-white hover:bg-alert-coral/90 shadow-[0_0_15px_rgba(255,92,92,0.3)]"
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
