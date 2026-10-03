import React from 'react';
import { cn } from '../utils/cn';

export const Pill = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-deep-teal text-glow-aqua border border-glow-aqua/30", className)}>
      {children}
    </span>
  );
};
