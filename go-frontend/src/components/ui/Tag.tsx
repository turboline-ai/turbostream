import React from 'react';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'nebula';
  children: React.ReactNode;
}

const Tag: React.FC<TagProps> = ({ variant = 'default', className = '', children, ...props }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-gray-700 text-gray-300 border border-gray-600',
    success: 'bg-green-900/30 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30',
    error: 'bg-red-900/30 text-red-400 border border-red-500/30',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-500/30',
    nebula: 'bg-gradient-to-r from-[#9CCBA6]/20 to-[#507EA4]/20 text-[#89D2C0] border border-[#89D2C0]/30',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Tag;
