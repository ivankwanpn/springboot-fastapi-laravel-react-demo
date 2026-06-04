'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-navy-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border bg-navy-700 px-4 py-2.5 text-sm text-white placeholder:text-navy-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            error
              ? 'border-red-500/50 focus:ring-red-500/50'
              : 'border-navy-500 hover:border-navy-400'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
