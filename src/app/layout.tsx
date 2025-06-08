// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane lo stesso

import LogoutButtonClient from "@/components/LogoutButtonClient";
import { ModernSidebar } from "@/components/ui/ModernSidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import GlobalSearch from "@/components/ui/GlobalSearch";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CycloLab - Professional Cycling Analytics",
  description: "Piattaforma avanzata per l'analisi delle performance ciclistiche",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // USA AWAIT QUI, perché TypeScript nel tuo ambiente pensa che cookies() sia async
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Cookie setting handled by middleware
        }
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <ThemeProvider>
          <div className="flex h-full bg-gray-50 dark:bg-gray-900">
            {user ? (
              <>
                {/* Sidebar moderna */}
                <ModernSidebar user={user} />
                
                {/* Area principale con header e contenuto */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Header moderno con glassmorphism */}
                  <header className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-30 h-[64px]">
                    <div className="flex items-center justify-between h-full px-6">
                      {/* Breadcrumb / Page Title */}
                      <div className="flex items-center space-x-4">
                        <div className="hidden md:block">
                          <nav className="flex items-center space-x-2 text-sm">
                            <Link 
                              href="/athletes" 
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              CycloLab
                            </Link>
                            <span className="text-gray-500 dark:text-gray-400">/</span>
                            <span className="font-medium text-gray-900 dark:text-white">Panoramica</span>
                          </nav>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center space-x-4">
                        <GlobalSearch />
                        <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a1.5 1.5 0 010-2.12l.7-.7a1 1 0 00.3-.7V6a6 6 0 10-12 0v4.58a1 1 0 00.3.7l.7.7a1.5 1.5 0 010 2.12L3 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                        </button>
                        <ThemeToggle />
                        <div className="flex items-center space-x-3">
                          <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.user_metadata?.full_name || user.email?.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Coach</p>
                          </div>
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                            {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* Contenuto principale */}
                  <main className="flex-1 overflow-y-auto">
                    {children}
                  </main>
                </div>
              </>
            ) : (
              // Layout per utenti non autenticati
              <div className="w-full">
                {/* Header pubblico con glassmorphism */}
                <header className="fixed top-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-50">
                  <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                      {/* Logo */}
                      <Link href="/" className="flex items-center space-x-3 group">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                        </div>
                        <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CycloLab</span>
                      </Link>

                      {/* Navigation */}
                      <nav className="hidden md:flex items-center space-x-8">
                        <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          Funzionalità
                        </a>
                        <a href="#coaches" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                          Per Coach
                        </a>
                        <a href="#athletes" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                          Per Atleti
                        </a>
                      </nav>

                      {/* Auth Buttons */}
                      <div className="flex items-center space-x-4">
                        <ThemeToggle />
                        <Link
                          href="/auth/login"
                          className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          Accedi
                        </Link>
                        <Link
                          href="/auth/signup"
                          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                          Inizia Gratis
                        </Link>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Contenuto pubblico */}
                <main className="pt-20 overflow-y-auto">
                  {children}
                </main>

                {/* Footer moderno */}
                <footer className="relative bg-gray-900 text-white">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-90"></div>
                  <div className="relative container mx-auto px-6 py-12">
                    <div className="grid md:grid-cols-4 gap-8">
                      <div className="col-span-2">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <span className="font-bold text-xl">CycloLab</span>
                        </div>
                        <p className="text-gray-400 mb-4 max-w-md">
                          La piattaforma più avanzata per l'analisi delle performance ciclistiche. 
                          Potenzia il tuo allenamento con dati precisi e insights professionali.
                        </p>
                        <div className="flex space-x-4">
                          <a href="#" className="text-gray-400 hover:text-white transition-colors">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                            </svg>
                          </a>
                          <a href="#" className="text-gray-400 hover:text-white transition-colors">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                            </svg>
                          </a>
                          <a href="#" className="text-gray-400 hover:text-white transition-colors">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </a>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-4">Prodotto</h3>
                        <ul className="space-y-2 text-gray-400">
                          <li><a href="#" className="hover:text-white transition-colors">Funzionalità</a></li>
                          <li><a href="#" className="hover:text-white transition-colors">Prezzi</a></li>
                          <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                          <li><a href="#" className="hover:text-white transition-colors">Integrazioni</a></li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-4">Supporto</h3>
                        <ul className="space-y-2 text-gray-400">
                          <li><a href="#" className="hover:text-white transition-colors">Documentazione</a></li>
                          <li><a href="#" className="hover:text-white transition-colors">Guide</a></li>
                          <li><a href="#" className="hover:text-white transition-colors">Contatti</a></li>
                          <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                      <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} CycloLab. Tutti i diritti riservati.
                      </p>
                      <div className="flex space-x-6 mt-4 md:mt-0">
                        <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy</a>
                        <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Termini</a>
                        <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie</a>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            )}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}