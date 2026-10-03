import { cn } from '../utils/cn';
import { Zap } from 'lucide-react';

export const XPChip = ({ xp, className }: { xp: number, className?: string }) => {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded bg-deep-teal/50 border border-glow-aqua/20 text-glow-aqua text-sm font-bold shadow-[0_0_5px_rgba(46,230,214,0.1)]", className)}>
      <Zap size={14} className="fill-glow-aqua/20" />
      {xp} XP
    </span>
  );
};
