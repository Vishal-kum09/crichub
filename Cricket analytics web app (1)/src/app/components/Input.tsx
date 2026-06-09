import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  pill?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, pill = false, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-white border transition-colors text-base',
            'focus:outline-none focus:ring-2 focus:ring-[#e60023] focus:border-[#e60023]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[44px]',
            error
              ? 'border-[#b30000] focus:border-[#b30000] focus:ring-[#b30000]'
              : 'border-[#e0e0e0]',
            pill ? 'rounded-full' : 'rounded-xl',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-[#b30000]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
