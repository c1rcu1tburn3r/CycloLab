'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { spacing, themeUtils } from '@/lib/design-system';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder durante l'hydration
    return (
      <div className={`${spacing.all.sm} rounded-xl bg-gray-100 dark:bg-gray-800 w-8 h-8`} />
    );
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  // Determina quale icona mostrare
  const showDarkIcon = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`${spacing.all.sm} rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 ${themeUtils.transition('colors')} flex items-center justify-center`}
      title={showDarkIcon ? 'Attiva modalità chiara' : 'Attiva modalità scura'}
    >
      {showDarkIcon ? (
        // Icona sole (tema dark attivo)
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Icona luna (tema light attivo)
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
} 