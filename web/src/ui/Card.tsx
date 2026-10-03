import React from 'react';
import { cn } from '../utils/cn';
import { GlassPanel } from './GlassPanel';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <GlassPanel ref={ref} className={cn("p-5", className)} blur="sm" {...props}>
        {children}
      </GlassPanel>
    );
  }
);
Card.displayName = 'Card';
