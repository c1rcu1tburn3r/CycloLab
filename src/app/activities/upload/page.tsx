import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ActivityUploadForm from '@/components/ActivityUploadForm';
import type { Athlete } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getAthletesForCurrentUser(supabaseClient: any, userId: string): Promise<Athlete[]> {
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('*')
    .eq('user_id', userId)
    .order('surname', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Errore nel recuperare gli atleti:', error.message);
    return [];
  }
  return data || [];
}

export default async function UploadActivityPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athletes = await getAthletesForCurrentUser(supabase, user.id);

  if (athletes.length === 0) {
    // Reindirizza alla pagina di creazione atleta se non ci sono atleti
    redirect('/athletes/add?message=Devi+prima+creare+un+atleta');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative container mx-auto px-4 py-8 flex justify-center items-start">
        <Card className="w-full max-w-2xl stats-card mt-8 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold">Carica una nuova attività</CardTitle>
            <CardDescription className="mt-2">
              Carica un file FIT e inserisci i dettagli dell&apos;attività.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityUploadForm userId={user.id} athletes={athletes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 