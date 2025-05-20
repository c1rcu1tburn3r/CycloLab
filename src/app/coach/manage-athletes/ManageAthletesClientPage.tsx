'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { 
  getManagedAthletes, 
  searchPotentialAthletes, 
  associateAthleteToCoach,
  dissociateAthleteFromCoach,
  type ManagedAthlete 
} from '../athleteManagementActions';
import type { Athlete } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Aggiunto Input
import { PlusCircle, UserMinus, AlertTriangle, Search, XCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useDebouncedCallback } from 'use-debounce'; // Per debounce sulla ricerca

export default function ManageAthletesClientPage() {
  const [managedAthletes, setManagedAthletes] = useState<ManagedAthlete[]>([]);
  const [isLoadingManaged, setIsLoadingManaged] = useState(true);
  const [errorManaged, setErrorManaged] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [errorSearch, setErrorSearch] = useState<string | null>(null);

  const [isAssociating, setIsAssociating] = useState<string | null>(null); // ID dell'atleta in corso di associazione
  const [isRemoving, setIsRemoving] = useState<string | null>(null); // ID dell'atleta in corso di rimozione
  const [associationFeedback, setAssociationFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [removalFeedback, setRemovalFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [isPendingGlobal, startTransitionGlobal] = useTransition(); // Per refresh/azioni globali

  const fetchManagedAthletes = useCallback(async () => {
    setIsLoadingManaged(true);
    setErrorManaged(null);
    try {
      const result = await getManagedAthletes();
      if (result.error) {
        setErrorManaged(result.error);
        setManagedAthletes([]);
      } else if (result.data) {
        setManagedAthletes(result.data);
      }
    } catch (err: any) {
      console.error('Errore imprevisto fetchManagedAthletes:', err);
      setErrorManaged('Si è verificato un errore imprevisto durante il caricamento degli atleti gestiti.');
      setManagedAthletes([]);
    }
    setIsLoadingManaged(false);
  }, []);

  useEffect(() => {
    fetchManagedAthletes();
  }, [fetchManagedAthletes]);

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([]);
      setErrorSearch(null);
      setIsLoadingSearch(false);
      return;
    }
    setIsLoadingSearch(true);
    setErrorSearch(null);
    setAssociationFeedback(null);
    try {
      const result = await searchPotentialAthletes(term);
      if (result.error) {
        setErrorSearch(result.error);
        setSearchResults([]);
      } else if (result.data) {
        setSearchResults(result.data);
      }
    } catch (err: any) {
      setErrorSearch('Errore imprevisto durante la ricerca.');
      setSearchResults([]);
    }
    setIsLoadingSearch(false);
  }, 500);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleAssociateAthlete = async (athleteId: string) => {
    setIsAssociating(athleteId);
    setAssociationFeedback(null);
    startTransitionGlobal(async () => {
      const result = await associateAthleteToCoach(athleteId);
      if (result.success) {
        setAssociationFeedback({type: 'success', message: `Atleta associato con successo!` });
        await fetchManagedAthletes(); // Aggiorna l'elenco degli atleti gestiti
        setSearchTerm(''); // Resetta la ricerca
        setSearchResults([]); // Pulisce i risultati della ricerca
      } else {
        setAssociationFeedback({ type: 'error', message: result.error || "Impossibile associare l'atleta."});
      }
      setIsAssociating(null);
    });
  };

  const handleRemoveAthlete = async (athleteId: string, athleteName: string) => {
    // Chiedi conferma prima di rimuovere
    if (!window.confirm(`Sei sicuro di voler rimuovere ${athleteName} dalla tua lista atleti?`)) {
      return;
    }
    
    setIsRemoving(athleteId);
    setRemovalFeedback(null);
    startTransitionGlobal(async () => {
      const result = await dissociateAthleteFromCoach(athleteId);
      if (result.success) {
        setRemovalFeedback({
          type: 'success', 
          message: `Atleta rimosso con successo.`
        });
        await fetchManagedAthletes(); // Aggiorna l'elenco degli atleti gestiti
      } else {
        setRemovalFeedback({
          type: 'error', 
          message: result.error || "Impossibile rimuovere l'atleta."
        });
      }
      setIsRemoving(null);
      
      // Nascondi il feedback dopo 5 secondi
      setTimeout(() => {
        setRemovalFeedback(null);
      }, 5000);
    });
  };

  return (
    <div className="space-y-8">
      {/* Sezione Aggiungi Atleta */}
      <div className="rounded-xl overflow-hidden shadow-lg border border-[#b4cad6]">
        <div className="bg-[#1e2e42] p-6 text-white">
          <h3 className="text-xl font-semibold">Associa Nuovo Atleta</h3>
          <p className="text-sm text-[#b4cad6] mt-1">Cerca un atleta per nome o cognome e associalo al tuo profilo coach.</p>
        </div>
        <div className="bg-white p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#4a6b85]" />
            <Input
              type="text"
              placeholder="Cerca atleta per nome o cognome..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 border-[#b4cad6] focus:border-[#4a6b85] focus:ring-[#4a6b85]"
            />
          </div>

          {associationFeedback && (
             <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${associationFeedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {associationFeedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertTriangle className="h-5 w-5 mr-2" />}
              {associationFeedback.message}
            </div>
          )}

          {isLoadingSearch && <p className="text-sm text-[#4a6b85] mt-2">Ricerca in corso...</p>}
          {errorSearch && 
            <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" /> {errorSearch}
            </div>
          }
          
          {searchResults.length > 0 && !isLoadingSearch && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto border border-[#b4cad6] rounded-md p-2">
              <p className="text-sm font-medium mb-2 text-[#1e2e42]">Risultati ({searchResults.length}):</p>
              {searchResults.map(athlete => (
                <div key={athlete.id} className="flex items-center justify-between p-2 hover:bg-[#e9f1f5] rounded-md transition-colors">
                  <div>
                    <p className="font-medium text-[#1e2e42]">{athlete.name} {athlete.surname}</p>
                    <p className="text-xs text-[#4a6b85]">ID: {athlete.id} {athlete.birth_date ? ` - Nato il: ${format(new Date(athlete.birth_date), 'dd MMM yyyy', { locale: it })}` : ''}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleAssociateAthlete(athlete.id)}
                    disabled={isAssociating === athlete.id || isPendingGlobal}
                    className="bg-[#1e2e42] hover:bg-[#4a6b85] text-white transition-colors"
                  >
                    {isAssociating === athlete.id ? 'Associo...' : <><PlusCircle className="mr-2 h-4 w-4" /> Associa</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchTerm.length >=2 && !isLoadingSearch && !errorSearch && (
             <p className="text-sm text-[#4a6b85] mt-2">Nessun atleta trovato per "{searchTerm}" o sono già tutti associati.</p>
          )}
        </div>
      </div>

      {/* Elenco Atleti Associati */}
      <div className="rounded-xl overflow-hidden shadow-lg border border-[#b4cad6]">
        <div className="bg-[#1e2e42] p-6 text-white">
          <h3 className="text-xl font-semibold">Atleti Già Associati ({managedAthletes.length})</h3>
          <p className="text-sm text-[#b4cad6] mt-1">Elenco degli atleti che gestisci attualmente.</p>
        </div>
        <div className="bg-white p-6">
          {removalFeedback && (
             <div className={`mb-4 p-3 rounded-md text-sm flex items-center ${removalFeedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {removalFeedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertTriangle className="h-5 w-5 mr-2" />}
              {removalFeedback.message}
            </div>
          )}
          
          {isLoadingManaged && 
            <div className="flex items-center justify-center p-6">
              <div className="w-8 h-8 border-4 border-[#b4cad6] border-t-[#1e2e42] rounded-full animate-spin"></div>
              <p className="ml-4 text-[#4a6b85]">Caricamento atleti associati...</p>
            </div>
          }
          {errorManaged && 
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
              <AlertTriangle className="h-5 w-5 mr-3" />
              <p><span className="font-semibold">Errore:</span> {errorManaged}</p>
            </div>
          }
          {!isLoadingManaged && managedAthletes.length === 0 && !errorManaged && (
            <p className="text-sm text-[#4a6b85] p-4">Nessun atleta associato al momento.</p>
          )}
          {!isLoadingManaged && managedAthletes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#b4cad6]">
                <thead className="bg-[#e9f1f5]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#1e2e42] uppercase tracking-wider">Nome</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#1e2e42] uppercase tracking-wider">Associato il</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#1e2e42] uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#b4cad6]">
                  {managedAthletes.map(athlete => (
                    <tr key={athlete.id} className="hover:bg-[#e9f1f5] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#4a6b85] hover:text-[#1e2e42]">
                        <Link href={`/athletes/${athlete.id}/edit`} className="hover:underline">
                          {athlete.name} {athlete.surname}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#4a6b85]">
                        {format(new Date(athlete.assigned_at), 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Button 
                          variant="outline"
                          size="sm" 
                          onClick={() => handleRemoveAthlete(athlete.id, `${athlete.name} ${athlete.surname}`)} 
                          disabled={isRemoving === athlete.id || isPendingGlobal}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-500"
                        >
                          {isRemoving === athlete.id ? 'Rimozione...' : <><UserMinus className="mr-1 h-4 w-4" /> Rimuovi</>}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 