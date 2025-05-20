import { Suspense } from 'react';
import ManageAthletesClientPage from './ManageAthletesClientPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default async function ManageAthletesPage() {
  // Questa pagina è un Server Component, potrebbe fare pre-fetching dati se necessario
  // o passare dati iniziali al Client Component.
  // Per ora, il Client Component gestirà il fetch dei dati.

  return (
    <div className="min-h-screen bg-[#e9f1f5]">
      {/* Header/Navbar in stile con la landing page */}
      <div className="bg-[#1e2e42] text-white py-4 px-4 md:px-8 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#b4cad6] rounded-full flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1e2e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg">CycloLab</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/athletes" className="text-[#b4cad6] hover:text-white transition-colors">
              Atleti
            </Link>
            <Link href="/activities" className="text-[#b4cad6] hover:text-white transition-colors">
              Attività
            </Link>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 pt-8 pb-12">
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