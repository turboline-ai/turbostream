import React from 'react';

export interface InputNumberProps {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  formatter?: (value: number | undefined) => string;
}

const InputNumber: React.FC<InputNumberProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled = false,
  className = '',
  size = 'medium',
  formatter
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1 text-sm';
      case 'large':
        return 'px-4 py-3 text-lg';
      case 'medium':
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numValue = inputValue === '' ? null : Number(inputValue);

    if (numValue === null) {
      onChange?.(null);
      return;
    }

    // Apply min/max constraints
    let constrainedValue = numValue;
    if (min !== undefined && constrainedValue < min) constrainedValue = min;
    if (max !== undefined && constrainedValue > max) constrainedValue = max;

    onChange?.(constrainedValue);
  };

  const displayValue = formatter && value !== undefined ? formatter(value) : value;

  return (
    <input
      type="number"
      value={displayValue ?? ''}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getSizeClasses()} ${className}`}
    />
  );
};

export default InputNumber;