import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-navy/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md"
          >
            <GlassPanel className="p-0 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-glow-aqua/10">
                <h3 className="font-display font-semibold text-lg">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {children}
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
