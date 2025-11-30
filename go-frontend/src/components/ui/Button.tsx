import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'milkyway' | 'nebula' | 'ghost' | 'danger' | 'default';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'medium', loading = false, icon, disabled, className = '', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed';
    
    const variantClasses = {
      milkyway: 'btn-milkyway focus:ring-[#D7D9C4]',
      nebula: 'px-6 py-3 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3]',
      ghost: 'bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 focus:ring-gray-500 disabled:opacity-50',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:opacity-50',
      default: 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500 disabled:opacity-50',
    };

    const sizeClasses = {
      small: 'h-9 px-3 text-sm',
      medium: 'h-9 px-4 text-sm',
      large: 'h-9 px-6 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: children ? '0.5rem' : 0 }} />}
        {!loading && icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: children ? '0.5rem' : 0 }}>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
