// src/app/auth/signup/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  const router = useRouter();
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      setIsLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else if (data.user && !data.user.email_confirmed_at) {
      setIsSuccess(true);
    } else {
      router.push('/athletes');
      router.refresh();
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 grid-dots pointer-events-none"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Success Card */}
            <div className="stats-card text-center animate-fade-in">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registrazione Completata!</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Abbiamo inviato un email di conferma a <strong>{email}</strong>. 
                    Clicca sul link nell&apos;email per attivare il tuo account.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Link href="/auth/login">
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      Torna al Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none"></div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo Header */}
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">CycloLab</h1>
            <p className="text-gray-600 dark:text-gray-300">Inizia il tuo viaggio verso l'eccellenza</p>
          </div>

          {/* Signup Card */}
          <div className="stats-card animate-fade-in">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Crea il tuo account</h2>
                <p className="text-gray-600 dark:text-gray-300">Registrati gratuitamente per iniziare</p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm animate-slide-up">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="tuamail@esempio.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Conferma Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Registrazione in corso...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Crea Account
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200/50 dark:border-gray-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-lg">
                    Hai già un account?
                  </span>
                </div>
              </div>

              <Link href="/auth/login">
                <Button variant="outline" className="w-full border-gray-200/50 dark:border-gray-700/50 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all py-3">
                  Accedi
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm animate-fade-in">
            <p>&copy; {new Date().getFullYear()} CycloLab. Tutti i diritti riservati.</p>
            <div className="flex justify-center space-x-6 mt-4">
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Termini</a>
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Supporto</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}