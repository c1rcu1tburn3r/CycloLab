// src/app/athletes/add/page.tsx
import AthleteForm from '@/components/AthleteForm';
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'; // Helper corretto
import { cookies } from 'next/headers'; // Importa cookies da next/headers
import { redirect } from 'next/navigation';

export default async function AddAthletePage() {
  // Crea il client Supabase per Server Components, passando la funzione cookies
  const supabase = createServerComponentClient({ cookies });

  // Usa getUser() per ottenere l'utente autenticato dal server Supabase
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Se c'è un errore o l'utente non è trovato (non autenticato), reindirizza al login
    // console.error('AddAthletePage: Utente non autenticato o errore nel recupero sessione.', userError);
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
      <AthleteForm /> {/* Il form non ha initialData qui perché è per l'aggiunta */}
    </div>
  );
}

// Potrebbe essere utile rendere anche questa pagina dinamica se ci fossero problemi di caching
// export const dynamic = 'force-dynamic';