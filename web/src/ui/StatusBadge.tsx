import React from 'react';
import { cn } from '../utils/cn';
import { CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export type StatusType = 'Healthy' | 'Watch' | 'Warning' | 'Alert';

export const StatusBadge = ({ status, className }: { status: StatusType, className?: string }) => {
  const config = {
    Healthy: { color: 'text-health-lime border-health-lime bg-health-lime/10', icon: CheckCircle },
    Watch: { color: 'text-watch-amber border-watch-amber bg-watch-amber/10', icon: Info },
    Warning: { color: 'text-watch-amber border-watch-amber bg-watch-amber/10', icon: AlertTriangle }, // Or separate warning color if needed
    Alert: { color: 'text-alert-coral border-alert-coral bg-alert-coral/10', icon: AlertOctagon }
  };

  const { color, icon: Icon } = config[status] || config.Healthy;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border", color, className)}>
      <Icon size={16} />
      {status}
    </span>
  );
};
