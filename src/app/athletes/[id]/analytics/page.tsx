import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import PerformanceAnalyticsDashboard from '@/components/analytics/PerformanceAnalyticsDashboard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Link from 'next/link';
import type { Athlete } from '@/lib/types';

interface AnalyticsPageProps {
  params: { id: string };
}

async function getAthleteWithAccess(athleteId: string, userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Verifica che l'atleta esista e che l'utente abbia accesso
  const { data: athlete, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .single();

  if (error || !athlete) {
    return null;
  }

  // Verifica accesso: proprietario o coach autorizzato
  if (athlete.user_id === userId) {
    return athlete;
  }

  // Verifica se è un coach autorizzato
  const { data: association } = await supabase
    .from('coach_athlete_associations')
    .select('*')
    .eq('coach_id', userId)
    .eq('athlete_id', athleteId)
    .eq('status', 'accepted')
    .single();

  return association ? athlete : null;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athlete = await getAthleteWithAccess(params.id, user.id);

  if (!athlete) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            {/* Breadcrumb e Navigazione */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Link href="/athletes" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Atleti
                </Link>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link href={`/athletes/${params.id}/edit`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {athlete.name} {athlete.surname}
                </Link>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 dark:text-white font-medium">Analytics</span>
              </div>
              
              <Link 
                href={`/athletes/${params.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Torna al Profilo
              </Link>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Performance Analytics
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {athlete.name} {athlete.surname}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Analisi avanzate delle performance ciclistiche</span>
            </div>
          </div>

          {/* Dashboard Component */}
          <Suspense fallback={
            <div className="space-y-6">
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </div>
          }>
            <PerformanceAnalyticsDashboard 
              athleteId={params.id}
              athlete={athlete}
              userId={user.id}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 