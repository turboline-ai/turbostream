import React from 'react';

export interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: React.ReactNode;
  description?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  description,
  showIcon = true,
  className = ''
}) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/20 border-green-500/30 text-green-200';
      case 'error':
        return 'bg-red-900/20 border-red-500/30 text-red-200';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-200';
      case 'info':
      default:
        return 'bg-blue-900/20 border-blue-500/30 text-blue-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getAlertStyles()} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className="text-lg flex-shrink-0">{getIcon()}</span>}
        <div className="flex-1">
          {message && <div className="font-medium mb-1">{message}</div>}
          {description && <div className="text-sm opacity-90">{description}</div>}
        </div>
      </div>
    </div>
  );
};

export default Alert;