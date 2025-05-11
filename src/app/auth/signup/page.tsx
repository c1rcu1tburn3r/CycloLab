// src/app/auth/signup/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "La password deve essere di almeno 8 caratteri e contenere: una lettera minuscola, una maiuscola, un numero e un simbolo (es. !@#$%^&*)."
      );
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      setIsLoading(false);
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      if (data.user && data.user.identities && data.user.identities.length > 0 && !data.user.email_confirmed_at) {
         setMessage("Registrazione quasi completata! Controlla la tua email (anche la cartella spam) per confermare l'account.");
      } else if (data.user) {
         setMessage("Registrazione completata! Sarai reindirizzato al login tra pochi secondi...");
         setTimeout(() => {
           router.push('/auth/login');
         }, 3000); // Reindirizza dopo 3 secondi
      } else {
        setError("Si è verificato un problema durante la registrazione. Riprova.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-start pt-12 sm:pt-16 min-h-screen">
      <div className="p-6 sm:p-8 bg-white shadow-xl rounded-lg w-full max-w-md border border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center text-slate-700">Registra Coach</h1>
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
        {message && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{message}</p>}
        <form onSubmit={handleSignup} className="space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500"
              placeholder="tuamail@esempio.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password (min. 8 caratteri, include maiuscole, minuscole, numeri, simboli)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>
           <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Conferma Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>
         <p className="mt-6 text-center text-sm text-slate-600">
          Hai già un account?{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Accedi qui
          </Link>
        </p>
      </div>
    </div>
  );
}