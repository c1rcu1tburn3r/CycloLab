// src/app/athletes/add/page.tsx
import AthleteForm from '@/components/AthleteForm';
import Link from 'next/link';
// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane lo stesso
import { redirect } from 'next/navigation';

export default async function AddAthletePage() {
  // USA AWAIT QUI
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
            console.warn(`WARN (add athlete page): Supabase client tried to set cookie '${name}' from a Server Component.`);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn(`WARN (add athlete page): Supabase client tried to remove cookie '${name}' from a Server Component.`);
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Aggiungi Nuovo Atleta</h1>
        <Link href="/athletes" className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Torna alla lista atleti
        </Link>
      </div>
      <AthleteForm />
    </div>
  );
}

// export const dynamic = 'force-dynamic';