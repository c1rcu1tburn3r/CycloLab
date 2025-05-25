import { Suspense } from 'react';
import ManageAthletesClientPage from './ManageAthletesClientPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default async function ManageAthletesPage() {
  // Questa pagina è un Server Component, potrebbe fare pre-fetching dati se necessario
  // o passare dati iniziali al Client Component.
  // Per ora, il Client Component gestirà il fetch dei dati.

  return (
    <Suspense fallback={<LoadingState />}>
      <ManageAthletesClientPage />
    </Suspense>
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