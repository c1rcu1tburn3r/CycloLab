import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, themeUtils, layoutSystem } from '@/lib/design-system';

// Definizione delle varianti usando il design system
const cardVariants = cva(
  // Base classes consistenti
  [
    'relative overflow-hidden',
    'border rounded-lg',
    themeUtils.transition('all'),
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white dark:bg-gray-800',
          'border-gray-200 dark:border-gray-700',
          'shadow-sm',
        ],
        elevated: [
          'bg-white dark:bg-gray-800',
          'border-gray-200 dark:border-gray-700',
          'shadow-lg',
        ],
        glass: [
          'bg-white/80 dark:bg-gray-800/80',
          'backdrop-blur-xl',
          'border-gray-200/50 dark:border-gray-700/50',
          'shadow-sm',
        ],
        metric: [
          'bg-white/95 dark:bg-gray-800/95',
          'backdrop-blur-sm',
          'border-gray-200/30 dark:border-gray-700/30',
          'shadow-sm',
        ],
        gradient: [
          'bg-gradient-to-br from-white to-gray-50',
          'dark:from-gray-800 dark:to-gray-900',
          'border-gray-200 dark:border-gray-700',
          'shadow-sm',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-md',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
        glow: 'hover:shadow-glow cursor-pointer',
        scale: 'hover:scale-105 cursor-pointer',
        subtle: 'hover:shadow-md cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      radius: 'md',
      hover: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, radius, hover, asChild = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, radius, hover }), className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: keyof typeof layoutSystem.stack;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, spacing = 'sm', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col', layoutSystem.stack[spacing], className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

// Card Content Component
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: keyof typeof layoutSystem.stack;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, spacing = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(layoutSystem.stack[spacing], className)}
      {...props}
    />
  )
);

CardContent.displayName = 'CardContent';

// Card Footer Component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: keyof typeof layoutSystem.inline;
  justify?: 'start' | 'center' | 'end' | 'between';
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, spacing = 'md', justify = 'end', ...props }, ref) => {
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          layoutSystem.inline[spacing],
          justifyClasses[justify],
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Card Title Component
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  CardTitleProps
>(({ className, level = 3, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
    xl: 'text-xl font-bold',
  };

  const baseClasses = cn(
    'text-gray-900 dark:text-gray-100 leading-tight tracking-tight',
    sizeClasses[size],
    className
  );

  // Renderizzazione condizionale per evitare problemi con ref dinamici
  switch (level) {
    case 1:
      return <h1 ref={ref} className={baseClasses} {...props} />;
    case 2:
      return <h2 ref={ref} className={baseClasses} {...props} />;
    case 3:
      return <h3 ref={ref} className={baseClasses} {...props} />;
    case 4:
      return <h4 ref={ref} className={baseClasses} {...props} />;
    case 5:
      return <h5 ref={ref} className={baseClasses} {...props} />;
    case 6:
      return <h6 ref={ref} className={baseClasses} {...props} />;
    default:
      return <h3 ref={ref} className={baseClasses} {...props} />;
  }
});

CardTitle.displayName = 'CardTitle';

// Card Description Component
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'sm' | 'md';
}

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, size = 'sm', ...props }, ref) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
  };

  return (
    <p
      ref={ref}
      className={cn(
        'text-gray-600 dark:text-gray-400 leading-relaxed',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});

CardDescription.displayName = 'CardDescription';

// Metric Card - Specializzato per metriche
export interface MetricCardProps extends Omit<CardProps, 'variant'> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, subtitle, icon, trend, accent = 'blue', className, ...props }, ref) => {
    const accentClasses = {
      blue: 'border-t-blue-500 dark:border-t-blue-400',
      emerald: 'border-t-emerald-500 dark:border-t-emerald-400',
      amber: 'border-t-amber-500 dark:border-t-amber-400',
      red: 'border-t-red-500 dark:border-t-red-400',
      purple: 'border-t-purple-500 dark:border-t-purple-400',
    };

    const iconAccentClasses = {
      blue: 'from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400',
      emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
      amber: 'from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400',
      red: 'from-red-500/10 to-red-500/5 text-red-600 dark:text-red-400',
      purple: 'from-purple-500/10 to-purple-500/5 text-purple-600 dark:text-purple-400',
    };

    return (
      <Card
        ref={ref}
        variant="metric"
        hover="subtle"
        className={cn('border-t-2', accentClasses[accent], className)}
        {...props}
      >
        <CardContent spacing="sm">
          {/* Header with centered icon and title */}
          <div className="flex items-center justify-between mb-4">
            <CardTitle size="sm" className="text-gray-600 dark:text-gray-400 font-medium">
              {title}
            </CardTitle>
            
            {icon && (
              <div className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm border border-white/20",
                iconAccentClasses[accent]
              )}>
                <div className="w-5 h-5">
                  {icon}
                </div>
              </div>
            )}
            
            {trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              )}>
                <svg 
                  className={cn(
                    'w-3 h-3', 
                    trend.isPositive ? 'rotate-0' : 'rotate-180'
                  )} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>

          {/* Value */}
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none mb-2">
            {value}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <CardDescription size="sm">
              {subtitle}
            </CardDescription>
          )}
        </CardContent>
      </Card>
    );
  }
);

MetricCard.displayName = 'MetricCard'; 