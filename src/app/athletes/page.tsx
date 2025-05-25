// src/app/athletes/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Athlete } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DeleteAthleteButton from '@/components/DeleteAthleteButton';

// Funzione per calcolare l'età
function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'N/D';
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age.toString() : 'N/D';
  } catch {
    return 'N/D';
  }
}

export default async function AthletesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching athletes:', error);
  }

  const athletesList = athletes || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          {/* Ultra-Modern Header */}
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
              {/* Gradient Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-t-3xl" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Icon Moderno */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  
                  {/* Titolo */}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      I Tuoi Atleti
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0V9a1 1 0 011-1h4a1 1 0 011 1v11" />
                      </svg>
                      Dashboard Professionale
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Atleti Totali</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{athletesList.length}</p>
                  </div>
                  
                  <Link href="/athletes/add">
                    <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Aggiungi Atleta
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Atleti Totali</h3>
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{athletesList.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">sotto la tua guida</p>
            </div>

            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Under 25</h3>
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {athletesList.filter(athlete => {
                  const age = calculateAge(athlete.birth_date);
                  return age !== 'N/D' && parseInt(age) < 25;
                }).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">giovani talenti</p>
            </div>

            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Profili Completi</h3>
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {athletesList.filter(athlete => 
                  athlete.name && athlete.surname && athlete.birth_date && athlete.nationality
                ).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">dati completi</p>
            </div>

            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Nazionalità</h3>
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {new Set(athletesList.filter(athlete => athlete.nationality).map(athlete => athlete.nationality)).size}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">diverse rappresentate</p>
            </div>
          </div>

          {/* Athletes Grid */}
          {athletesList.length === 0 ? (
            <div className="stats-card text-center py-16">
              <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nessun atleta ancora</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                Inizia aggiungendo il tuo primo atleta per gestire le performance e monitorare i progressi.
              </p>
              <Link href="/athletes/add">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Aggiungi il Primo Atleta
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {athletesList.map((athlete, index) => (
                <div
                  key={athlete.id} 
                  className="stats-card group animate-slide-up hover:scale-[1.02] transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Link href={`/athletes/${athlete.id}/edit`} className="block h-full flex flex-col">
                    {/* Avatar Section */}
                    <div className="text-center mb-6">
                      <div className="relative inline-block">
                        {athlete.avatar_url ? (
                          <div className="w-20 h-20 mx-auto overflow-hidden rounded-2xl border-2 border-blue-200/50 dark:border-blue-700/50 shadow-lg group-hover:border-blue-400/50 dark:group-hover:border-blue-500/50 transition-all duration-300">
                            <img 
                              src={athlete.avatar_url} 
                              alt={`${athlete.name} ${athlete.surname}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-2xl mx-auto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:shadow-xl transition-all duration-300">
                            {athlete.name.charAt(0).toUpperCase()}{athlete.surname.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {/* Status Indicator */}
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {athlete.name} {athlete.surname}
                      </h3>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 flex-grow">
                      <div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Età</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{calculateAge(athlete.birth_date)}</div>
                      </div>
                      
                      <div className="bg-orange-50/50 dark:bg-orange-900/30 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nazionalità</div>
                        <div className="text-sm font-bold text-orange-600 dark:text-orange-400 truncate">{athlete.nationality || 'N/D'}</div>
                      </div>
                      
                      <div className="bg-emerald-50/50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Altezza</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{athlete.height_cm ? `${athlete.height_cm}cm` : 'N/D'}</div>
                      </div>
                      
                      <div className="bg-purple-50/50 dark:bg-purple-900/30 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Peso</div>
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{athlete.weight_kg ? `${athlete.weight_kg}kg` : 'N/D'}</div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';