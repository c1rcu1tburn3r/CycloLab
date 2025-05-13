import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ActivityUploadForm from '@/components/ActivityUploadForm';
import type { Athlete } from '@/lib/types';

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
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Carica una nuova attività</h1>
        <p className="text-slate-600 mt-2">
          Carica un file FIT e inserisci i dettagli dell'attività.
        </p>
      </div>
      
      <ActivityUploadForm userId={user.id} athletes={athletes} />
    </div>
  );
}

export const dynamic = 'force-dynamic'; 