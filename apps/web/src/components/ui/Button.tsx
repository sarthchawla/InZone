import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          'active:scale-[0.97] active:brightness-95',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-stone-100 text-stone-900 hover:bg-stone-200': variant === 'default',
            'bg-accent text-white hover:bg-accent-hover': variant === 'primary',
            'hover:bg-stone-100 text-stone-700': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          },
          {
            'min-h-[36px] px-3 text-sm': size === 'sm',
            'min-h-[44px] px-4 text-sm': size === 'md',
            'min-h-[48px] px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
