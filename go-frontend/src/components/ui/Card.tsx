import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'darkmatter' | 'default' | 'spacepolaroid';
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'medium', className = '', children, ...props }, ref) => {
    const baseClasses = 'rounded-lg transition-all duration-200';
    
    const variantClasses = {
      darkmatter: 'card-darkmatter',
      default: 'bg-gray-800 border border-gray-700 text-white',
      spacepolaroid: 'hero-spacepolaroid text-white border border-gray-700',
    };

    const paddingClasses = {
      none: '',
      small: 'p-4',
      medium: 'p-6',
      large: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
