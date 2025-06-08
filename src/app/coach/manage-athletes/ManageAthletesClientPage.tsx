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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/design-system/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Activity, 
  TrendingUp,
  MessageSquare,
  Clock,
  Award,
  Target,
  Calendar,
  BarChart3,
  Zap,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useDebouncedCallback } from 'use-debounce';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCycloLabToast } from '@/hooks/use-cyclolab-toast';
import { getGridClasses, spacing } from '@/lib/design-system';

export default function ManageAthletesClientPage() {
  // Stato per gestire l'idratazione e evitare mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  const [managedAthletes, setManagedAthletes] = useState<ManagedAthlete[]>([]);
  const [isLoadingManaged, setIsLoadingManaged] = useState(true);
  const [errorManaged, setErrorManaged] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [errorSearch, setErrorSearch] = useState<string | null>(null);

  const [isAssociating, setIsAssociating] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [isPendingGlobal, startTransitionGlobal] = useTransition();
  const [activeTab, setActiveTab] = useState('my-athletes');

  const { showSuccess, showError } = useCycloLabToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  // Effect per gestire l'idratazione
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
      setErrorManaged('Si è verificato un errore durante il caricamento degli atleti.');
      setManagedAthletes([]);
    }
    setIsLoadingManaged(false);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      fetchManagedAthletes();
    }
  }, [fetchManagedAthletes, isHydrated]);

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([]);
      setErrorSearch(null);
      setIsLoadingSearch(false);
      return;
    }
    setIsLoadingSearch(true);
    setErrorSearch(null);
    try {
      const result = await searchPotentialAthletes(term);
      if (result.error) {
        setErrorSearch(result.error);
        setSearchResults([]);
      } else if (result.data) {
        setSearchResults(result.data);
      }
    } catch (err: any) {
      setErrorSearch('Errore durante la ricerca.');
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
    setFeedback(null);
    startTransitionGlobal(async () => {
      const result = await associateAthleteToCoach(athleteId);
      if (result.success) {
        showSuccess('Atleta associato', 'Atleta associato con successo al tuo team!');
        await fetchManagedAthletes();
        setSearchTerm('');
        setSearchResults([]);
        setActiveTab('my-athletes'); // Passa alla tab dei miei atleti
      } else {
        showError('Errore', result.error || "Impossibile associare l'atleta.");
      }
      setIsAssociating(null);
    });
  };

  const handleRemoveAthlete = async (athleteId: string, athleteName: string) => {
    showConfirm({
      title: 'Rimuovi Atleta',
      description: `Sei sicuro di voler rimuovere ${athleteName} dalla tua lista atleti? L'atleta non verrà eliminato ma non potrai più visualizzare i suoi dati.`,
      confirmText: 'Rimuovi Atleta',
      cancelText: 'Annulla',
      variant: 'warning',
      icon: <UserMinus className="w-6 h-6" />,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/coach/athletes/${athleteId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Errore durante la rimozione dell\'atleta');
          }

          showSuccess('Atleta rimosso', `${athleteName} è stato rimosso dalla tua lista atleti`);
          
          // Rimuovi dall'array locale
          setManagedAthletes(prev => prev.filter(ca => ca.id !== athleteId));
        } catch (error) {
          console.error('Errore rimozione atleta:', error);
          showError('Errore', 'Si è verificato un errore durante la rimozione dell\'atleta');
        }
      }
    });
  };

  // Calcola statistiche
  const stats = {
    totalAthletes: managedAthletes.length,
    recentlyAdded: managedAthletes.filter(a => {
      const addedDate = new Date(a.assigned_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return addedDate > weekAgo;
    }).length,
    // Placeholder per future statistiche
    totalActivities: 0,
    avgPerformance: 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className={spacing.bottom.xl}>
            <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 border-t-2 border-t-blue-500 dark:border-t-blue-400 p-8 shadow-2xl">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Icon Moderno */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <Users className="w-10 h-10" />
                  </div>
                  
                  {/* Titolo */}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      Gestione Atleti
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Dashboard Coach Professionale
                    </p>
                  </div>
                </div>
                
                {/* Actions e Badge */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Atleti Gestiti</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isHydrated ? managedAthletes.length : 0}
                    </p>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1">
                    <Activity className="w-3 h-3 mr-1" />
                    Attivo
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {isHydrated && (
            <div className={`${getGridClasses(4, 'md')} ${spacing.bottom.xl}`}>
              <MetricCard
                title="Atleti Totali"
                value={stats.totalAthletes.toString()}
                subtitle="sotto la tua guida"
                icon={<Users className="w-5 h-5" />}
                accent="blue"
              />

              <MetricCard
                title="Aggiunti Recenti"
                value={stats.recentlyAdded.toString()}
                subtitle="ultimi 7 giorni"
                icon={<UserPlus className="w-5 h-5" />}
                accent="emerald"
              />

              <MetricCard
                title="Attività Totali"
                value="-"
                subtitle="in sviluppo"
                icon={<Activity className="w-5 h-5" />}
                accent="purple"
              />

              <MetricCard
                title="Performance Media"
                value="-"
                subtitle="in sviluppo"
                icon={<TrendingUp className="w-5 h-5" />}
                accent="amber"
              />
            </div>
          )}

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className={spacing.bottom.xl}>
              <TabsList className="grid w-full max-w-xl mx-auto grid-cols-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-1 rounded-2xl shadow-lg">
                <TabsTrigger 
                  value="my-athletes" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    I Miei Atleti ({isHydrated ? managedAthletes.length : 0})
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="add-athletes"
                  className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Aggiungi Atleti
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content: I Miei Atleti */}
            <TabsContent value="my-athletes" className="space-y-6">
              {!isHydrated ? (
                <div className="flex items-center justify-center p-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="ml-4 text-gray-600 dark:text-gray-400">Inizializzazione...</p>
                </div>
              ) : isLoadingManaged ? (
                <div className="flex items-center justify-center p-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="ml-4 text-gray-600 dark:text-gray-400">Caricamento atleti...</p>
                </div>
              ) : managedAthletes.length === 0 ? (
                <Card className="text-center py-16">
                  <CardContent>
                    <Users className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nessun atleta associato</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      Inizia aggiungendo i tuoi primi atleti per monitorare le loro prestazioni e gestire gli allenamenti.
                    </p>
                    <Button 
                      onClick={() => setActiveTab('add-athletes')}
                      className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Aggiungi il Primo Atleta
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className={getGridClasses(3, 'xl')}>
                  {managedAthletes.map((athlete, index) => (
                    <Card
                      key={athlete.id}
                      className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-slide-up overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardContent className="p-6">
                        {/* Avatar Section */}
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                            {athlete.name.charAt(0)}{athlete.surname.charAt(0)}
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-4">{athlete.name} {athlete.surname}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(new Date(athlete.assigned_at), 'dd MMM yyyy', { locale: it })}
                          </p>
                        </div>

                        {/* Statistiche Rapide */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="text-center p-3 bg-blue-50/50 dark:bg-blue-900/30 rounded-xl">
                            <Activity className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">-</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Attività</p>
                          </div>
                          <div className="text-center p-3 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-xl">
                            <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">-</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Performance</p>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                          <Zap className="w-4 h-4 mr-2 text-emerald-500" />
                          <span>Attivo</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Link href={`/athletes/${athlete.id}/edit`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizza
                            </Button>
                          </Link>
                          <Button 
                            variant="outline"
                            size="sm" 
                            onClick={() => handleRemoveAthlete(athlete.id, `${athlete.name} ${athlete.surname}`)} 
                            disabled={isRemoving === athlete.id}
                            className="text-red-600 hover:text-red-700 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            {isRemoving === athlete.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <UserMinus className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Aggiungi Atleti */}
            <TabsContent value="add-athletes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <UserPlus className="w-6 h-6 text-emerald-600" />
                    Aggiungi Nuovo Atleta
                  </CardTitle>
                  <CardDescription>
                    Cerca e associa atleti al tuo team per iniziare a monitorare le loro prestazioni
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Cerca atleta per nome o cognome..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 h-12"
                    />
                  </div>

                  {isLoadingSearch && (
                    <div className="flex items-center justify-center p-8">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-3" />
                      <p className="text-gray-600 dark:text-gray-400">Ricerca in corso...</p>
                    </div>
                  )}

                  {errorSearch && (
                    <div className="p-4 bg-red-50/80 border border-red-200/50 text-red-700 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-400 rounded-xl">
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      {errorSearch}
                    </div>
                  )}
                
                  {searchResults.length > 0 && !isLoadingSearch && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Trovati {searchResults.length} atleti
                        </p>
                        <Badge variant="outline">{searchResults.length} risultati</Badge>
                      </div>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {searchResults.map((athlete, index) => (
                          <div 
                            key={athlete.id} 
                            className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200 animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-semibold">
                                {athlete.name.charAt(0)}{athlete.surname.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{athlete.name} {athlete.surname}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {athlete.birth_date ? format(new Date(athlete.birth_date), 'dd MMM yyyy', { locale: it }) : 'Data di nascita non disponibile'}
                                </p>
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleAssociateAthlete(athlete.id)}
                              disabled={isAssociating === athlete.id}
                              className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              {isAssociating === athlete.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Associando...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Associa
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.length === 0 && searchTerm.length >= 2 && !isLoadingSearch && !errorSearch && (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">Nessun atleta trovato</h3>
                      <p>Nessun risultato per "{searchTerm}"</p>
                      <p className="text-sm mt-1">Prova con un altro nome o verifica l'ortografia</p>
                    </div>
                  )}

                  {searchTerm.length < 2 && (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                      <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">Cerca Atleti</h3>
                      <p>Inserisci almeno 2 caratteri per iniziare la ricerca</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
} 