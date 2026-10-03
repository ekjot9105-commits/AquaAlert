import React from 'react';
import { cn } from '../utils/cn';

export const Avatar = ({ src, alt, size = 'md', className }: { src?: string, alt?: string, size?: 'sm'|'md'|'lg', className?: string }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  return (
    <div className={cn("rounded-full overflow-hidden bg-deep-teal border-2 border-glow-aqua/20 flex items-center justify-center text-foam-white font-bold", sizes[size], className)}>
      {src ? (
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span>{alt?.charAt(0)?.toUpperCase() || '?'}</span>
      )}
    </div>
  );
};
