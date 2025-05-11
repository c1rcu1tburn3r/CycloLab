// src/app/athletes/[id]/edit/page.tsx
import AthleteForm from '@/components/AthleteForm';
import Link from 'next/link';
// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane lo stesso
import { redirect } from 'next/navigation';
import type { Athlete } from '@/app/athletes/page';

interface EditAthletePageProps {
  params: {
    id: string;
  };
}

async function getAthleteById(supabaseClient: any, athleteId: string, userId: string): Promise<Athlete | null> {
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Errore nel recuperare l_atleta per la modifica:', error.message);
    return null;
  }
  return data as Athlete | null;
}

export default async function EditAthletePage({ params }: EditAthletePageProps) {
  // USA AWAIT QUI, perché TypeScript nel tuo ambiente pensa che cookies() sia async
  const cookieStore = await cookies();
  const { id: athleteId } = params;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (cookiesToSet.length > 0) {
            console.warn(`(Server Component at athletes/[id]/edit/page.tsx) Attempted to set cookies via setAll: ${cookiesToSet.map(c => c.name).join(', ')}. This operation has no effect here and should be handled by middleware.`);
          }
        }
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athleteToEdit = await getAthleteById(supabase, athleteId, user.id);

  if (!athleteToEdit) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-red-600">Atleta non trovato</h1>
        <p className="text-slate-600">Impossibile trovare l'atleta che stai cercando di modificare, o non hai i permessi per farlo.</p>
        <Link href="/athletes" className="mt-4 inline-block text-blue-600 hover:underline">
          Torna alla lista atleti
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Modifica Profilo Atleta
        </h1>
        <Link href="/athletes" className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Torna alla lista atleti
        </Link>
      </div>
      <AthleteForm initialData={athleteToEdit} />
    </div>
  );
}

export const dynamic = 'force-dynamic';