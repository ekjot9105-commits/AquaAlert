import React from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const ProgressBar = ({ progress, className }: { progress: number, className?: string }) => {
  return (
    <div className={cn("w-full h-2 bg-deep-teal rounded-full overflow-hidden", className)}>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="h-full bg-glow-aqua shadow-[0_0_8px_rgba(46,230,214,0.6)]"
      />
    </div>
  );
};
