// src/app/athletes/add/page.tsx
import AthleteForm from '@/components/AthleteForm';
import Link from 'next/link';
// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane lo stesso
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components

export default async function AddAthletePage() {
  // USA AWAIT QUI
  const cookieStore = await cookies();

  // Inizializza il client Supabase usando createServerClient da @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Il console.warn è stato rimosso qui
        }
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative container mx-auto px-4 py-8 flex justify-center items-start">
        <Card className="w-full max-w-2xl stats-card mt-8 mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">Registra Nuovo Atleta</CardTitle>
                <div className="space-y-2">
                  <CardDescription className="text-base whitespace-nowrap">
                    Inserisci i dati per creare un nuovo atleta.
                  </CardDescription>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      L'atleta verrà automaticamente associato al tuo account coach
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/athletes" className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:underline flex items-center gap-1 whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Torna alla lista
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <AthleteForm mode="registration" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// export const dynamic = 'force-dynamic';