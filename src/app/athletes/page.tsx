// src/app/athletes/page.tsx
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DeleteAthleteButton from '../../components/DeleteAthleteButton'; // Importiamo già il componente per il delete

// Interfaccia Athlete (assicurati che corrisponda alla tua tabella)
export interface Athlete {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  surname: string;
  birth_date: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  nationality?: string | null;
  avatar_url?: string | null;
}

// Funzione per recuperare gli atleti
async function getAthletesForCurrentUser(supabaseClient: any, userId: string): Promise<Athlete[]> {
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('*')
    .eq('user_id', userId)
    .order('surname', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Errore nel recuperare gli atleti (getAthletesForCurrentUser):', error.message);
    return [];
  }
  return data || [];
}

// Funzione per calcolare l'età
const calculateAge = (birthDateString: string): number | string => {
  if (!birthDateString) return 'N/D';
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 'N/D';
};

export default async function AthletesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athletes = await getAthletesForCurrentUser(supabase, user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">I Tuoi Atleti</h1>
        <Link
          href="/athletes/add"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-sm"
        >
          + Aggiungi Atleta
        </Link>
      </div>

      {athletes.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center text-slate-600 border border-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-400 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A1.5 1.5 0 0 1 18 21.75H6a1.5 1.5 0 0 1-1.499-1.632Z" />
          </svg>
          <p className="text-xl font-semibold mb-2 text-slate-700">Nessun atleta trovato.</p>
          <p className="text-sm">Inizia aggiungendo il tuo primo atleta per monitorare i suoi progressi e attività.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 hover:shadow-2xl transition-shadow duration-300 ease-in-out flex flex-col">
              <div className="flex-grow">
                <div className="text-center mb-4">
                  {athlete.avatar_url ? (
                     <img src={athlete.avatar_url} alt={`${athlete.name} ${athlete.surname}`} className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-blue-500 shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto bg-slate-200 flex items-center justify-center text-slate-500 text-4xl font-semibold border-2 border-slate-300">
                      {athlete.name.charAt(0).toUpperCase()}{athlete.surname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-slate-800 text-center truncate" title={`${athlete.name} ${athlete.surname}`}>{athlete.name} {athlete.surname}</h2>
                <hr className="my-3 border-slate-200" />
                <div className="text-xs sm:text-sm space-y-1.5 text-slate-600">
                  <p><strong>Nazionalità:</strong> {athlete.nationality || 'N/D'}</p>
                  <p><strong>Età:</strong> {calculateAge(athlete.birth_date)} anni</p>
                  <p><strong>Altezza:</strong> {athlete.height_cm ? `${athlete.height_cm} cm` : 'N/D'}</p>
                  <p><strong>Peso:</strong> {athlete.weight_kg ? `${athlete.weight_kg} kg` : 'N/D'}</p>
                </div>
              </div>
              {/* SEZIONE MODIFICATA PER INCLUDERE LINK MODIFICA E DELETEBUTTON */}
              <div className="mt-4 pt-3 border-t border-slate-200 text-center flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-around sm:items-center">
                <Link
                    href={`/athletes/${athlete.id}/edit`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-3 rounded-md hover:bg-blue-50 transition-colors"
                >
                    Modifica
                </Link>
                <DeleteAthleteButton athlete={athlete} />
                {/* Potresti aggiungere un link per i dettagli/attività qui se vuoi */}
                {/* <Link href={`/athletes/${athlete.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 px-3">Dettagli</Link> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';