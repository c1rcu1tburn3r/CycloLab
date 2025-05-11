// src/app/page.tsx
import Link from 'next/link';

// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane lo stesso

export default async function HomePage() {
  // USA AWAIT QUI, perché TypeScript nel tuo ambiente pensa che cookies() sia async
  const cookieStore = await cookies();

  // Inizializza il client Supabase usando createServerClient da @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn(`WARN (page): Supabase client tried to set cookie '${name}' from a Server Component. This is usually handled by middleware.`);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn(`WARN (page): Supabase client tried to remove cookie '${name}' from a Server Component. This is usually handled by middleware.`);
          }
        },
      },
    }
  );

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