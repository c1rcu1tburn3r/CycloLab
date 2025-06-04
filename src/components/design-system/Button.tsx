import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, themeUtils } from '@/lib/design-system';
import { Loader2 } from 'lucide-react';

// Definizione delle varianti usando il design system
const buttonVariants = cva(
  // Base classes consistenti
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium text-center whitespace-nowrap',
    'border border-transparent rounded-lg',
    'cursor-pointer disabled:cursor-not-allowed',
    'outline-none focus-visible:outline-none',
    'disabled:opacity-50 disabled:pointer-events-none',
    themeUtils.transition('all'),
    themeUtils.focusRing('primary'),
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
          'text-white shadow-sm hover:shadow-md',
        ],
        secondary: [
          'bg-gray-100 hover:bg-gray-200 active:bg-gray-300',
          'dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600',
          'text-gray-900 dark:text-gray-100',
          'border-gray-200 dark:border-gray-700',
        ],
        outline: [
          'border-gray-300 dark:border-gray-600',
          'hover:border-blue-500 dark:hover:border-blue-400',
          'hover:bg-blue-50 dark:hover:bg-blue-900/20',
          'text-gray-700 dark:text-gray-300',
          'hover:text-blue-700 dark:hover:text-blue-300',
        ],
        ghost: [
          'border-transparent',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'text-gray-700 dark:text-gray-300',
          'hover:text-gray-900 dark:hover:text-gray-100',
        ],
        danger: [
          'bg-red-600 hover:bg-red-700 active:bg-red-800',
          'text-white shadow-sm hover:shadow-md',
        ],
        success: [
          'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
          'text-white shadow-sm hover:shadow-md',
        ],
        warning: [
          'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
          'text-white shadow-sm hover:shadow-md',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm gap-1 rounded-md',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2 rounded-xl',
        xl: 'h-14 px-8 text-lg gap-3 rounded-xl',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-md',
        'icon-lg': 'h-12 w-12 p-0 rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = size?.includes('icon');

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading state */}
        {loading && (
          <Loader2 
            className={cn(
              'animate-spin shrink-0',
              isIconOnly ? 'w-4 h-4' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )} 
          />
        )}
        
        {/* Left icon - only show if not loading */}
        {!loading && leftIcon && (
          <span 
            className={cn(
              'shrink-0',
              isIconOnly ? 'w-4 h-4' : size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )}
          >
            {leftIcon}
          </span>
        )}
        
        {/* Content */}
        {!isIconOnly && (
          <span className="truncate">
            {loading && loadingText ? loadingText : children}
          </span>
        )}
        
        {/* Right icon - only show if not loading and not icon-only */}
        {!loading && !isIconOnly && rightIcon && (
          <span 
            className={cn(
              'shrink-0',
              size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )}
          >
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Utility per creare gruppi di bottoni
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}> = ({ children, className, orientation = 'horizontal' }) => {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'horizontal' 
          ? '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:border-l-0'
          : 'flex-col [&>button]:rounded-none [&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:first-child)]:border-t-0',
        className
      )}
    >
      {children}
    </div>
  );
}; 