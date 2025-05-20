// src/app/auth/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const router = useRouter();
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      // Il middleware dovrebbe gestire il reindirizzamento se il login ha successo
      // e l'utente prova ad accedere a /auth/login.
      // Qui potremmo semplicemente fare un refresh per assicurarci che il layout
      // e il middleware ricarichino lo stato corretto, oppure reindirizzare a una pagina specifica.
      router.push('/athletes'); // Reindirizza alla dashboard principale dopo il login
      router.refresh(); // Importante per far sì che i Server Components ricarichino lo stato utente
    }
  };

  return (
    <div className="min-h-screen bg-[#e9f1f5] flex flex-col items-center">
      {/* Logo e Intestazione */}
      <div className="w-full bg-[#1e2e42] py-6 mb-8 flex justify-center">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-[#b4cad6] rounded-full flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1e2e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-2xl text-white">CycloLab</span>
        </div>
      </div>

      <div className="container mx-auto px-4 flex flex-col items-center justify-center flex-grow pb-12">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] p-4">
            <h1 className="text-2xl font-bold text-white text-center">Accedi alla piattaforma</h1>
          </div>
          
          <div className="p-6 sm:p-8">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-100 text-sm">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1e2e42] mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-[#b4cad6] rounded-md shadow-sm focus:outline-none focus:ring-[#4a6b85] focus:border-[#4a6b85] sm:text-sm"
                  placeholder="tuamail@esempio.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#1e2e42] mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-[#b4cad6] rounded-md shadow-sm focus:outline-none focus:ring-[#4a6b85] focus:border-[#4a6b85] sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#4a6b85] hover:bg-[#1e2e42] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4a6b85] disabled:bg-[#b4cad6] disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Accesso in corso...' : 'Accedi'}
              </button>
            </form>
            
            <div className="mt-6 border-t border-[#e9f1f5] pt-6">
              <p className="text-center text-sm text-[#4a6b85]">
                Non hai un account?{' '}
                <Link href="/auth/signup" className="font-medium text-[#4a6b85] hover:text-[#1e2e42] transition-colors">
                  Registrati qui
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-[#4a6b85] text-sm">
          <p>&copy; {new Date().getFullYear()} CycloLab. Tutti i diritti riservati.</p>
        </div>
      </div>
    </div>
  );
}