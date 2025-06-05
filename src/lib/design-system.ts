/**
 * CycloLab Design System
 * Sistema di design centralizzato per garantire consistenza in tutto il progetto
 */

// ===== DESIGN TOKENS =====

export const designTokens = {
  // Spacing Scale (rem-based per consistenza)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '3rem',    // 48px
    '4xl': '4rem',    // 64px
  },

  // Border Radius Scale
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Typography Scale
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgb(59 130 246 / 0.3)',
  },

  // Z-Index Scale
  zIndex: {
    base: 1,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1700,
    tooltip: 1800,
    sidebar: 9999,
  },

  // Animation Duration
  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
} as const;

// ===== COMPONENT VARIANTS =====

export const componentVariants = {
  // Button Variants
  button: {
    variant: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg',
      secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
      outline: 'border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg',
      warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
    radius: {
      sm: 'rounded-md',
      md: 'rounded-lg',
      lg: 'rounded-xl',
    },
  },

  // Card Variants
  card: {
    variant: {
      default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      elevated: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg',
      glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50',
      metric: 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30',
      neon: 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border border-purple-500/50 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300',
    },
    padding: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    radius: {
      md: 'rounded-lg',
      lg: 'rounded-xl',
      xl: 'rounded-2xl',
    },
    hover: {
      none: '',
      lift: 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200',
      glow: 'hover:shadow-glow transition-all duration-200',
      scale: 'hover:scale-105 transition-transform duration-200',
    },
  },

  // Input Variants
  input: {
    variant: {
      default: 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20',
      error: 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20',
      success: 'border-emerald-300 dark:border-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/20',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-4 text-lg',
    },
  },

  // Badge Variants
  badge: {
    variant: {
      default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
      danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    },
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    },
  },
} as const;

// ===== SEMANTIC COLORS =====

export const semanticColors = {
  // Intent Colors
  primary: {
    50: 'rgb(239 246 255)',
    100: 'rgb(219 234 254)',
    500: 'rgb(59 130 246)',
    600: 'rgb(37 99 235)',
    700: 'rgb(29 78 216)',
    900: 'rgb(30 58 138)',
  },
  success: {
    50: 'rgb(236 253 245)',
    100: 'rgb(209 250 229)',
    500: 'rgb(16 185 129)',
    600: 'rgb(5 150 105)',
    700: 'rgb(4 120 87)',
    900: 'rgb(6 78 59)',
  },
  warning: {
    50: 'rgb(255 251 235)',
    100: 'rgb(254 243 199)',
    500: 'rgb(245 158 11)',
    600: 'rgb(217 119 6)',
    700: 'rgb(180 83 9)',
    900: 'rgb(120 53 15)',
  },
  danger: {
    50: 'rgb(254 242 242)',
    100: 'rgb(254 226 226)',
    500: 'rgb(239 68 68)',
    600: 'rgb(220 38 38)',
    700: 'rgb(185 28 28)',
    900: 'rgb(127 29 29)',
  },
} as const;

// ===== LAYOUT SYSTEM =====

export const layoutSystem = {
  // Container Max Widths
  container: {
    sm: 'max-w-screen-sm',   // 640px
    md: 'max-w-screen-md',   // 768px
    lg: 'max-w-screen-lg',   // 1024px
    xl: 'max-w-screen-xl',   // 1280px
    '2xl': 'max-w-screen-2xl', // 1536px
    full: 'max-w-full',
  },

  // Grid System
  grid: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    },
    gap: {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
      xl: 'gap-12',
    },
  },

  // Common Layout Patterns
  stack: {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
  inline: {
    sm: 'space-x-2',
    md: 'space-x-4',
    lg: 'space-x-6',
    xl: 'space-x-8',
  },
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Combina classi CSS in modo sicuro
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Crea una stringa di classi per un componente usando le varianti
 */
export function createComponentClasses<T extends keyof typeof componentVariants>(
  component: T,
  variants: Partial<{
    [K in keyof typeof componentVariants[T]]: keyof typeof componentVariants[T][K]
  }>,
  additionalClasses?: string
): string {
  const baseClasses: string[] = [];
  
  const componentVariant = componentVariants[component];
  
  Object.entries(variants).forEach(([key, value]) => {
    if (value && componentVariant[key as keyof typeof componentVariant]) {
      const variantClasses = componentVariant[key as keyof typeof componentVariant];
      if (variantClasses && typeof variantClasses === 'object' && value in variantClasses) {
        baseClasses.push(variantClasses[value as keyof typeof variantClasses] as string);
      }
    }
  });

  return cn(...baseClasses, additionalClasses);
}

// ===== THEME UTILITIES =====

export const themeUtils = {
  /**
   * Ottieni classe per stato hover consistente
   */
  hover: (intensity: 'subtle' | 'medium' | 'strong' = 'medium') => {
    const intensities = {
      subtle: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      medium: 'hover:bg-gray-100 dark:hover:bg-gray-700',
      strong: 'hover:bg-gray-200 dark:hover:bg-gray-600',
    };
    return intensities[intensity];
  },

  /**
   * Ottieni classe per transizioni consistenti
   */
  transition: (type: 'all' | 'colors' | 'transform' = 'all') => {
    const types = {
      all: 'transition-all duration-200 ease-out',
      colors: 'transition-colors duration-200 ease-out',
      transform: 'transition-transform duration-200 ease-out',
    };
    return types[type];
  },

  /**
   * Ottieni classe per focus ring consistente
   */
  focusRing: (color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') => {
    const colors = {
      primary: 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
      success: 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
      warning: 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500',
      danger: 'focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
    };
    return colors[color];
  },
} as const;

// ===== ESPORTAZIONI =====

export type ComponentVariant<T extends keyof typeof componentVariants> = 
  keyof typeof componentVariants[T];

export type DesignToken = typeof designTokens;
export type SemanticColor = typeof semanticColors;
export type LayoutSystem = typeof layoutSystem;

// Utility functions per layout
export const getGridClasses = (
  cols: number, 
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' = 'md'
): string => {
  const baseClass = `grid gap-4`;
  const responsive = breakpoint !== 'md' ? `${breakpoint}:` : '';
  return `${baseClass} grid-cols-1 ${responsive}grid-cols-${cols}`;
};

// Spacing utilities
export const spacing = {
  // Top spacing
  top: {
    xs: 'mt-1',
    sm: 'mt-2',
    md: 'mt-4',
    lg: 'mt-6',
    xl: 'mt-8',
    '2xl': 'mt-12',
    '3xl': 'mt-16',
    '4xl': 'mt-24'
  },
  // Bottom spacing
  bottom: {
    xs: 'mb-1',
    sm: 'mb-2',
    md: 'mb-4',
    lg: 'mb-6',
    xl: 'mb-8',
    '2xl': 'mb-12',
    '3xl': 'mb-16',
    '4xl': 'mb-24'
  },
  // Horizontal spacing
  horizontal: {
    xs: 'mx-1',
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-6',
    xl: 'mx-8',
    '2xl': 'mx-12',
    '3xl': 'mx-16',
    '4xl': 'mx-24'
  },
  // Vertical spacing
  vertical: {
    xs: 'my-1',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
    xl: 'my-8',
    '2xl': 'my-12',
    '3xl': 'my-16',
    '4xl': 'my-24'
  },
  // All-around spacing
  all: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
    '2xl': 'p-12',
    '3xl': 'p-16',
    '4xl': 'p-24'
  }
}; 