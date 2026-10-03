import React from 'react';
import { cn } from '../utils/cn';

export type PriorityLevel = 'Low' | 'Medium' | 'High';

export const PriorityBadge = ({ level, className }: { level: PriorityLevel, className?: string }) => {
  const styles = {
    Low: 'bg-deep-teal text-health-lime border border-health-lime/30',
    Medium: 'bg-deep-teal text-watch-amber border border-watch-amber/30',
    High: 'bg-alert-coral text-white border border-alert-coral shadow-[0_0_10px_rgba(255,92,92,0.5)]'
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider", styles[level], className)}>
      {level} Priority
    </span>
  );
};
