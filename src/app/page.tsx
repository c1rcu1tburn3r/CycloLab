// src/app/page.tsx
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <div className="text-center py-10">
      <h1 className="text-4xl font-bold text-slate-800 mb-6">
        Benvenuto in Cycling Coach App!
      </h1>
      <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
        La tua piattaforma per monitorare gli allenamenti, analizzare le performance
        e guidare i tuoi atleti al successo.
      </p>
      {session ? (
        <Link
          href="/athletes"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-transform hover:scale-105 text-lg"
        >
          Vai ai Tuoi Atleti
        </Link>
      ) : (
        <Link
          href="/auth/login"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-transform hover:scale-105 text-lg"
        >
          Accedi o Registrati
        </Link>
      )}
    </div>
  );
}