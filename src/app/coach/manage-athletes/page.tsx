import { Suspense } from 'react';
import ManageAthletesClientPage from './ManageAthletesClientPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default async function ManageAthletesPage() {
  // Questa pagina è un Server Component, potrebbe fare pre-fetching dati se necessario
  // o passare dati iniziali al Client Component.
  // Per ora, il Client Component gestirà il fetch dei dati.

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold">Gestione Atleti Associati</h1>
            <p className="text-white/80 text-lg">
              Visualizza, aggiungi o rimuovi atleti dal tuo team professionale
            </p>
            <div className="flex items-center text-white/60 text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestione Avanzata
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<LoadingState />}>
        <ManageAthletesClientPage />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <Card variant="glass" className="border-dashed border-2 border-gray-300/50 dark:border-gray-600/50">
      <CardHeader className="text-center">
        <CardTitle className="text-foreground text-xl">Caricamento Atleti</CardTitle>
        <CardDescription className="text-muted-foreground">
          Recupero degli atleti associati al tuo team...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.3s' }}></div>
          </div>
          <p className="text-muted-foreground font-medium">Sincronizzazione in corso...</p>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 