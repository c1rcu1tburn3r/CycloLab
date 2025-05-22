import { Suspense } from 'react';
import ManageAthletesClientPage from './ManageAthletesClientPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default async function ManageAthletesPage() {
  // Questa pagina è un Server Component, potrebbe fare pre-fetching dati se necessario
  // o passare dati iniziali al Client Component.
  // Per ora, il Client Component gestirà il fetch dei dati.

  return (
    <div className="">
      {/* RIMOSSA LA SEZIONE DELL'HEADER/NAVBAR */}
      
      <div className="container mx-auto px-4 pt-6 pb-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e2e42]">
            Gestione Atleti Associati
          </h1>
          <p className="text-sm text-[#4a6b85] mt-2">
            Visualizza, aggiungi o rimuovi atleti dal tuo elenco.
          </p>
        </header>

        <Suspense fallback={<LoadingState />}>
          <ManageAthletesClientPage />
        </Suspense>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="bg-white border border-[#b4cad6] shadow-lg">
      <CardHeader>
        <CardTitle className="text-[#1e2e42]">Elenco Atleti</CardTitle>
        <CardDescription className="text-[#4a6b85]">Recupero degli atleti associati...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center p-6">
          <div className="w-12 h-12 border-4 border-[#b4cad6] border-t-[#1e2e42] rounded-full animate-spin"></div>
          <p className="ml-4 text-[#4a6b85]">Caricamento in corso...</p>
        </div>
      </CardContent>
    </Card>
  );
} 