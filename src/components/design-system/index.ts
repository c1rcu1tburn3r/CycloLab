/**
 * CycloLab Design System Components
 * Esportazione centralizzata di tutti i componenti standardizzati
 */

// Core utilities
export * from '@/lib/design-system';

// Componenti base
export * from './Button';
export * from './Card';

// Re-export dei componenti UI esistenti che sono già coerenti
export { Badge } from '@/components/ui/badge';
export { Input } from '@/components/ui/input';
export { Label } from '@/components/ui/label';

// Utility per creare spacing consistente
export const Spacing = {
  xs: 'gap-1 space-y-1 space-x-1',
  sm: 'gap-2 space-y-2 space-x-2', 
  md: 'gap-4 space-y-4 space-x-4',
  lg: 'gap-6 space-y-6 space-x-6',
  xl: 'gap-8 space-y-8 space-x-8',
  '2xl': 'gap-12 space-y-12 space-x-12',
} as const;

// Utility per creare bordi consistenti  
export const Borders = {
  none: 'border-0',
  thin: 'border border-gray-200 dark:border-gray-700',
  thick: 'border-2 border-gray-300 dark:border-gray-600',
  accent: 'border-l-4 border-blue-500',
  top: 'border-t border-gray-200 dark:border-gray-700',
  bottom: 'border-b border-gray-200 dark:border-gray-700',
} as const;

// Utility per shadow consistenti
export const Shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  glow: 'shadow-glow',
} as const;

// Utility functions per layout patterns
export const getContainerClasses = (size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' = 'xl') => {
  const sizeClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md', 
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };
  return `mx-auto px-4 sm:px-6 lg:px-8 ${sizeClasses[size]}`;
};

export const getStackClasses = (spacing: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4', 
    lg: 'space-y-6',
    xl: 'space-y-8',
  };
  return spacingClasses[spacing];
};

export const getInlineClasses = (
  spacing: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  align: 'start' | 'center' | 'end' = 'center'
) => {
  const spacingClasses = {
    sm: 'space-x-2',
    md: 'space-x-4',
    lg: 'space-x-6', 
    xl: 'space-x-8',
  };
  
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };
  
  return `flex ${alignClasses[align]} ${spacingClasses[spacing]}`;
};

export const getGridClasses = (
  cols: 1 | 2 | 3 | 4 | 6 | 12 = 1,
  gap: 'sm' | 'md' | 'lg' | 'xl' = 'md'
) => {
  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12',
  };
  
  const colsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  };
  
  return `grid ${colsMap[cols]} ${gapClasses[gap]}`;
}; 