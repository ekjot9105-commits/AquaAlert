import React from 'react';
import { cn } from '../utils/cn';
import { Check } from 'lucide-react';

export const Stepper = ({ steps, currentStep }: { steps: string[], currentStep: number }) => {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center relative">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors",
                isCompleted ? "bg-glow-aqua border-glow-aqua text-ink-navy" : 
                isCurrent ? "bg-deep-teal border-glow-aqua text-glow-aqua shadow-[0_0_10px_rgba(46,230,214,0.4)]" : 
                "bg-ink-navy border-white/20 text-white/50"
              )}>
                {isCompleted ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{index + 1}</span>}
              </div>
              <span className={cn(
                "absolute top-10 text-[10px] whitespace-nowrap font-medium",
                isCurrent || isCompleted ? "text-foam-white" : "text-white/50"
              )}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 transition-colors",
                isCompleted ? "bg-glow-aqua" : "bg-white/10"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
