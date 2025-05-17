import { Suspense } from 'react';
import ManageAthletesClientPage from './ManageAthletesClientPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default async function ManageAthletesPage() {
  // Questa pagina è un Server Component, potrebbe fare pre-fetching dati se necessario
  // o passare dati iniziali al Client Component.
  // Per ora, il Client Component gestirà il fetch dei dati.

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Gestione Atleti Associati
        </h1>
        <p className="text-sm text-slate-600">
          Visualizza, aggiungi o rimuovi atleti dal tuo elenco.
        </p>
      </header>

      <Suspense fallback={<LoadingState />}>
        <ManageAthletesClientPage />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Elenco Atleti</CardTitle>
        <CardDescription>Recupero degli atleti associati...</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Caricamento in corso...</p>
      </CardContent>
    </Card>
  );
} 