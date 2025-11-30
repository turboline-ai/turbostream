import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: 'nebula' | 'darkmatter' | 'default';
  label?: string;
  error?: string;
  options: SelectOption[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant = 'default', label, error, options, className = '', ...props }, ref) => {
    const variantClasses = {
      nebula: 'w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-[#89D2C0] focus:outline-none focus:ring-2 focus:ring-[#89D2C0]/30 transition-all duration-200',
      darkmatter: 'w-full px-4 py-2 text-[#E0E0E0] rounded-lg border focus:outline-none focus:ring-2 bg-gradient-to-r from-[#1A1F2B] to-[#2A2F3D] border-white/10 focus:border-white/20 focus:ring-white/5 transition-all duration-200',
      default: 'w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`${variantClasses[variant]} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
