import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({ title, description, icon: Icon = Inbox, action }: { title: string, description: string, icon?: ComponentType<{ size?: number }>, action?: ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-deep-teal flex items-center justify-center text-glow-aqua">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-foam-white/70 text-sm max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
