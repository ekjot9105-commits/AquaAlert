import React from 'react';
import { cn } from '../utils/cn';

export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn("animate-pulse bg-deep-teal/40 rounded", className)} />
  );
};
