'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  width?: number | string;
  height?: number | string;
  variant?: 'nebula' | 'darkmatter' | 'default';
  closable?: boolean;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  placement = 'right',
  width = 400,
  height = 400,
  variant = 'default',
  closable = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, closable]);

  if (!isOpen) return null;

  const placementClasses = {
    left: 'left-0 top-0 h-full',
    right: 'right-0 top-0 h-full',
    top: 'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full',
  };

  const sizeStyles = {
    left: { width: typeof width === 'number' ? `${width}px` : width },
    right: { width: typeof width === 'number' ? `${width}px` : width },
    top: { height: typeof height === 'number' ? `${height}px` : height },
    bottom: { height: typeof height === 'number' ? `${height}px` : height },
  };

  const variantClasses = {
    nebula: 'bg-gradient-to-br from-gray-800 to-gray-900 border-[#89D2C0]/30',
    darkmatter: 'card-darkmatter border-white/10',
    default: 'bg-gray-800 border-gray-700',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />

      {/* Drawer */}
      <div
        className={`absolute ${placementClasses[placement]} ${variantClasses[variant]} border shadow-2xl transition-transform duration-300 ease-in-out transform`}
        style={sizeStyles[placement]}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            {title && <div className="text-xl font-semibold text-white">{title}</div>}
            {closable && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;