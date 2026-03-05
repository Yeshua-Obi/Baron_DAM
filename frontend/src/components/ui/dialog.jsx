import React, { useEffect } from 'react';

export const Dialog = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    // Prevents the background from scrolling when a popup is open
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={() => onOpenChange(false)} 
      />
      <div className="z-50 w-full relative flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};

export const DialogContent = ({ children, className }) => {
  return (
    <div className={`w-full relative shadow-xl ${className}`}>
      {children}
    </div>
  );
};

export const DialogHeader = ({ children, className }) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}>
    {children}
  </div>
);

export const DialogTitle = ({ children, className }) => (
  <h2 className={`font-serif text-lg leading-none ${className}`}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, className }) => (
  <p className={`text-sm text-white/50 ${className}`}>
    {children}
  </p>
);