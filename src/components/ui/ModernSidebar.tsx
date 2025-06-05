'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ThemeToggle } from './ThemeToggle';
import { spacing, themeUtils } from '@/lib/design-system';

interface SidebarProps {
  user?: any;
}

const navigation = [
  {
    name: 'Atleti',
    href: '/athletes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    name: 'Activity Hub',
    href: '/activities',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Upload',
    href: '/activities/upload',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    name: 'Gestione Atleti',
    href: '/coach/manage-athletes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export function ModernSidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const pathname = usePathname();
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  // Gestione loading state per navigazione
  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      setIsNavigating(true);
      // Il loading state verrà resettato quando il pathname cambia
    }
  };

  // Reset loading state quando cambia il pathname
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Listener per aggiornamenti avatar
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { avatarUrl } = event.detail;
      setCurrentAvatarUrl(avatarUrl);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  // Sincronizza con user props quando cambia
  useEffect(() => {
    setCurrentAvatarUrl(user?.user_metadata?.avatar_url || null);
  }, [user?.user_metadata?.avatar_url]);

  // Effetto per gestire il margine del body in base al collapsed state
  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) {
      root.style.setProperty('--sidebar-width', '64px');
    } else {
      root.style.setProperty('--sidebar-width', '256px');
    }
  }, [collapsed]);

  return (
    <>
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.3s' }}></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Caricamento...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Preparazione dati atleta</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-sidebar bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            {!collapsed && (
              <div className={`flex items-center space-x-3 ${spacing.bottom.md} overflow-hidden`}>
                <div className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">CycloLab</span>
              </div>
            )}
            
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`${spacing.all.sm} rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 ${themeUtils.transition('colors')}`}
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`group flex items-center ${collapsed ? 'justify-center px-3 py-3' : 'px-3 py-3'} rounded-xl ${themeUtils.transition('all')} duration-200 relative ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <div className={`flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <span className="ml-3 font-medium">{item.name}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {/* User Info */}
            {!collapsed && user && (
              <div className={`flex items-center space-x-3 ${spacing.bottom.md} overflow-hidden`}>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden">
                  {currentAvatarUrl ? (
                    <img 
                      src={currentAvatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.user_metadata?.full_name 
                      ? user.user_metadata.full_name.charAt(0).toUpperCase()
                      : user.email?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px]">
                    {user.user_metadata?.full_name || 
                      (user.email && user.email.length > 20 
                        ? `${user.email.substring(0, 17)}...` 
                        : user.email
                      )
                    }
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Coach</p>
                </div>
              </div>
            )}

            {/* Avatar compresso per la modalità collapsed */}
            {collapsed && user && (
              <div className={`flex justify-center ${spacing.bottom.md}`}>
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                  {currentAvatarUrl ? (
                    <img 
                      src={currentAvatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.user_metadata?.full_name 
                      ? user.user_metadata.full_name.charAt(0).toUpperCase()
                      : user.email?.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`flex ${collapsed ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
              {/* Left side: Settings and Theme Toggle */}
              <div className={`flex ${collapsed ? 'flex-col space-y-2' : 'items-center space-x-2'}`}>
                {/* Settings Button */}
                <Link
                  href="/account/settings"
                  onClick={() => handleNavigation('/account/settings')}
                  className={`group flex items-center justify-center ${spacing.all.sm} rounded-xl ${themeUtils.transition('all')} duration-200 ${
                    pathname === '/account/settings' || pathname.startsWith('/account/settings/')
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title="Impostazioni"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      Impostazioni
                    </div>
                  )}
                </Link>

                {/* Theme Toggle */}
                <ThemeToggle />
              </div>

              {/* Right side: Logout Button */}
              <button
                onClick={handleLogout}
                className={`group flex items-center justify-center ${spacing.all.sm} rounded-xl bg-gray-100 dark:bg-gray-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 ${themeUtils.transition('all')} duration-200 ${
                  collapsed ? 'mt-2' : ''
                }`}
                title="Esci"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Esci
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer per il contenuto principale */}
      <div className={`flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`} />
    </>
  );
} 