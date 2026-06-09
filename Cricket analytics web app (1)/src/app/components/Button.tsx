import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  children,
  className,
  ...props
}: ButtonProps) {
  const baseStyles = 'px-5 lg:px-6 py-2.5 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] flex items-center justify-center';

  const variants = {
    primary: 'bg-[#e60023] text-white hover:bg-[#c4001e] active:scale-95',
    secondary: 'bg-transparent text-[#e60023] border border-[#e60023] hover:bg-[#e60023]/5 active:scale-95',
    ghost: 'bg-transparent text-[#e60023] hover:bg-[#e60023]/5 active:scale-95',
    destructive: 'bg-[#b30000] text-white hover:bg-[#8b0000] active:scale-95',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
