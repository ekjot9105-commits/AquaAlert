import React from 'react';
import { cn } from '../utils/cn';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg';
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, blur = 'md', children, ...props }, ref) => {
    const blurClasses = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg'
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white/10 dark:bg-deep-teal/30 border border-white/20 dark:border-glow-aqua/20 rounded-2xl p-6 shadow-xl",
          blurClasses[blur],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassPanel.displayName = 'GlassPanel';
