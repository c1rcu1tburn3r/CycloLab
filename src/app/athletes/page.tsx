// src/app/athletes/page.tsx
import Link from 'next/link';
import Image from 'next/image';
// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DeleteAthleteButton from '../../components/DeleteAthleteButton';
import type { Athlete } from '@/lib/types';

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

  return (
    <div className="">
      <div className="container mx-auto px-4 pt-6 pb-12">
        {/* Header della pagina */}
        <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] rounded-xl text-white p-6 mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">I Tuoi Atleti</h1>
              <p className="text-[#b4cad6] mt-1">
                {athletes.length === 0 
                  ? 'Inizia ad aggiungere i tuoi atleti' 
                  : `${athletes.length} ${athletes.length === 1 ? 'atleta' : 'atleti'} in gestione`}
              </p>
            </div>
            <Link
              href="/athletes/add"
              className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Aggiungi Atleta
            </Link>
          </div>
        </div>

        {athletes.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center text-[#4a6b85] border border-[#b4cad6]">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#e9f1f5] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[#4a6b85]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A1.5 1.5 0 0 1 18 21.75H6a1.5 1.5 0 0 1-1.499-1.632Z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[#1e2e42]">Nessun atleta trovato.</h2>
            <p className="text-sm mb-6">Inizia aggiungendo il tuo primo atleta per monitorare i suoi progressi e attività.</p>
            <Link
              href="/athletes/add"
              className="bg-[#4a6b85] hover:bg-[#1e2e42] text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Aggiungi il tuo primo atleta
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="bg-white p-5 rounded-xl shadow-lg border border-[#b4cad6] hover:shadow-2xl transition-shadow duration-300 ease-in-out flex flex-col">
                <Link href={`/athletes/${athlete.id}/edit`} passHref legacyBehavior>
                  <a className="block flex-grow cursor-pointer">
                    <div className="text-center mb-4">
                      {athlete.avatar_url ? (
                        <div className="w-24 h-24 mx-auto overflow-hidden rounded-full border-2 border-[#4a6b85] shadow-sm">
                          <img 
                            src={athlete.avatar_url} 
                            alt={`${athlete.name} ${athlete.surname}`} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full mx-auto bg-[#4a6b85] flex items-center justify-center text-white text-2xl font-semibold border-2 border-[#b4cad6]">
                          {athlete.name.charAt(0).toUpperCase()}{athlete.surname.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-semibold text-[#1e2e42] hover:text-[#4a6b85] text-center truncate transition-colors" title={`Dettagli atleta ${athlete.name} ${athlete.surname}`}>
                      {athlete.name} {athlete.surname}
                    </div>
                  </a>
                </Link>
                <hr className="my-3 border-[#e9f1f5]" />
                <div className="text-xs sm:text-sm space-y-1.5 text-[#4a6b85] flex-grow">
                  <p><strong>Nazionalità:</strong> {athlete.nationality || 'N/D'}</p>
                  <p><strong>Età:</strong> {calculateAge(athlete.birth_date)} anni</p>
                  <p><strong>Altezza:</strong> {athlete.height_cm ? `${athlete.height_cm} cm` : 'N/D'}</p>
                  <p><strong>Peso:</strong> {athlete.weight_kg ? `${athlete.weight_kg} kg` : 'N/D'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#e9f1f5] text-center flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-around sm:items-center">
                  <Link
                    href={`/activities?athleteId=${athlete.id}`}
                    className="bg-[#4a6b85] hover:bg-[#1e2e42] text-white font-semibold py-2 px-3 rounded-lg text-xs shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center"
                  >
                    Attività
                  </Link>
                  <DeleteAthleteButton athlete={athlete} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';