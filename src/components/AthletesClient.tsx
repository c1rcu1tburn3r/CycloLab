'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import AthleteCard from '@/components/AthleteCard';
import { useAthletes, useCycloLabCacheInvalidation } from '@/hooks/use-cyclolab-cache';
import type { Athlete } from '@/lib/types';

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

interface AthletesClientProps {
  userId: string;
  initialAthletes?: Athlete[];
}

export default function AthletesClient({ userId, initialAthletes = [] }: AthletesClientProps) {
  const { 
    data: athletesList, 
    isLoading, 
    error, 
    isStale,
    refetch 
  } = useAthletes(userId);

  const { invalidateOnAthleteChange } = useCycloLabCacheInvalidation();

  // Usa i dati iniziali se disponibili e non ci sono ancora dati cached
  const athletes = athletesList || initialAthletes;

  // Effetto per gestire aggiornamenti quando si torna alla pagina
  useEffect(() => {
    const handleFocus = () => {
      if (isStale) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isStale, refetch]);

  if (error) {
    return (
      <div className="stats-card text-center py-16">
        <svg className="w-20 h-20 text-red-300 dark:text-red-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Errore nel caricamento</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Si è verificato un errore nel caricamento degli atleti.
        </p>
        <Button 
          onClick={() => refetch()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header con indicatore di caricamento */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
          {/* Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-t-3xl" />
          
          {/* Indicatore di caricamento */}
          {isLoading && (
            <div className="absolute top-1 right-4 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Aggiornamento...
            </div>
          )}
          
          {/* Indicatore dati stale */}
          {isStale && !isLoading && (
            <div className="absolute top-1 right-4 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Dati non aggiornati
            </div>
          )}
          
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
                  {isStale && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">
                      Cache
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Atleti Totali</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {athletes.length}
                  {isLoading && <span className="text-sm text-blue-500 ml-1">...</span>}
                </p>
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
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{athletes.length}</p>
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
            {athletes.filter(athlete => {
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
            {athletes.filter(athlete => 
              athlete.name && athlete.surname && athlete.birth_date
            ).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">dati completi</p>
        </div>

        <div className="stats-card group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Domini Email</h3>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {new Set(athletes.filter(athlete => athlete.email).map(athlete => athlete.email!.split('@')[1])).size}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">domini diversi</p>
        </div>
      </div>

      {/* Athletes Grid */}
      {athletes.length === 0 ? (
        <div className="stats-card text-center py-16">
          <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {isLoading ? 'Caricamento atleti...' : 'Nessun atleta ancora'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            {isLoading 
              ? 'Stiamo caricando i tuoi atleti...'
              : 'Inizia aggiungendo il tuo primo atleta per gestire le performance e monitorare i progressi.'
            }
          </p>
          {!isLoading && (
            <Link href="/athletes/add">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Aggiungi il Primo Atleta
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {athletes.map((athlete, index) => (
            <AthleteCard key={athlete.id} athlete={athlete} index={index} />
          ))}
        </div>
      )}
    </>
  );
} 