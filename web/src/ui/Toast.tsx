import React from 'react';
import { cn } from '../utils/cn';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export const Toast = ({ type = 'info', message, onClose }: { type?: ToastType, message: string, onClose?: () => void }) => {
  const icons = {
    success: <CheckCircle className="text-health-lime" size={20} />,
    error: <XCircle className="text-alert-coral" size={20} />,
    info: <Info className="text-glow-aqua" size={20} />
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-deep-teal border border-glow-aqua/20 shadow-lg min-w-[300px]">
      {icons[type]}
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-foam-white/70 hover:text-foam-white transition-colors">
          <X size={16} />
        </button>
      )}
    </div>
  );
};
