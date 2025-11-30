'use client';

import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'nebula' | 'darkmatter' | 'default';
  label?: string;
  error?: string;
  helperText?: string;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ variant = 'default', label, error, helperText, className = '', autoSize, ...props }, ref) => {
    const variantClasses = {
      nebula: 'textarea-nebula',
      darkmatter: 'textarea-darkmatter',
      default: 'w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200 resize-none',
    };

    // Handle autoSize functionality
    const handleAutoSize = (element: HTMLTextAreaElement) => {
      if (!autoSize) return;

      const minRows = typeof autoSize === 'object' ? autoSize.minRows || 3 : 3;
      const maxRows = typeof autoSize === 'object' ? autoSize.maxRows || 10 : 10;

      // Reset height to auto to get the correct scrollHeight
      element.style.height = 'auto';

      // Calculate rows based on line height (approximately 1.5rem per row)
      const lineHeight = 24; // 1.5rem
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;
      const scrollHeight = element.scrollHeight;

      // Set height within bounds
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      element.style.height = `${newHeight}px`;
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoSize) {
        handleAutoSize(e.currentTarget);
      }
      props.onInput?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoSize) {
        handleAutoSize(e.currentTarget);
      }
      props.onChange?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${variantClasses[variant]} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''} ${className}`}
          onInput={handleInput}
          onChange={handleChange}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;