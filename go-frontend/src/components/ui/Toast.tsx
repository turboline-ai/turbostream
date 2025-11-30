'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string, title?: string, duration?: number) => {
    showToast({ type: 'success', message, title, duration });
  }, [showToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    showToast({ type: 'error', message, title, duration });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    showToast({ type: 'warning', message, title, duration });
  }, [showToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    showToast({ type: 'info', message, title, duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{
      toasts,
      showToast,
      hideToast,
      success,
      error,
      warning,
      info,
    }}>
      {children}
    </ToastContext.Provider>
  );
};

// Toast Component
interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getBgColor = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'var(--success-bg, #10b981)';
      case 'error': return 'var(--error-bg, #ef4444)';
      case 'warning': return 'var(--warning-bg, #f59e0b)';
      case 'info': return 'var(--info-bg, #3b82f6)';
      default: return 'var(--bg-2)';
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-md animate-in slide-in-from-right-2 fade-in duration-300"
      style={{
        backgroundColor: 'var(--bg-2)',
        borderColor: 'var(--line)',
        color: 'var(--ink)',
      }}
    >
      <span className="text-lg flex-shrink-0">{getIcon(toast.type)}</span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>
            {toast.title}
          </div>
        )}
        <div className="text-sm" style={{ color: 'var(--muted)' }}>
          {toast.message}
        </div>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm underline hover:no-underline"
            style={{ color: getBgColor(toast.type) }}
          >
            {toast.action.text}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

// Toast Container Component
export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={hideToast}
        />
      ))}
    </div>
  );
};