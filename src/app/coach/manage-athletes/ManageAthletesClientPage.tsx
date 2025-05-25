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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Target
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useDebouncedCallback } from 'use-debounce';

interface AthleteStats {
  totalActivities: number;
  thisWeekActivities: number;
  avgSpeed: number;
  totalDistance: number;
  lastActivity: string | null;
}

export default function ManageAthletesClientPage() {
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
        setFeedback({type: 'success', message: 'Atleta associato con successo!' });
        await fetchManagedAthletes();
        setSearchTerm('');
        setSearchResults([]);
      } else {
        setFeedback({ type: 'error', message: result.error || "Impossibile associare l'atleta."});
      }
      setIsAssociating(null);
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  const handleRemoveAthlete = async (athleteId: string, athleteName: string) => {
    if (!window.confirm(`Sei sicuro di voler rimuovere ${athleteName} dalla tua lista atleti?`)) {
      return;
    }
    
    setIsRemoving(athleteId);
    setFeedback(null);
    startTransitionGlobal(async () => {
      const result = await dissociateAthleteFromCoach(athleteId);
      if (result.success) {
        setFeedback({type: 'success', message: 'Atleta rimosso con successo.'});
        await fetchManagedAthletes();
      } else {
        setFeedback({type: 'error', message: result.error || "Impossibile rimuovere l'atleta."});
      }
      setIsRemoving(null);
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  // Mock stats per ora - in futuro saranno calcolate dal database
  const getAthleteStats = (athleteId: string): AthleteStats => ({
    totalActivities: Math.floor(Math.random() * 50) + 20,
    thisWeekActivities: Math.floor(Math.random() * 7),
    avgSpeed: Math.floor(Math.random() * 10) + 25,
    totalDistance: Math.floor(Math.random() * 1000) + 500,
    lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
  });

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
                
                {/* Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Atleti Gestiti</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{managedAthletes.length}</p>
                  </div>
                </div>
              </div>

              {/* Feedback globale */}
              {feedback && (
                <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
                  feedback.type === 'success' 
                    ? 'bg-green-50/80 text-green-700 border border-green-200/50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700/50' 
                    : 'bg-red-50/80 text-red-700 border border-red-200/50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50'
                }`}>
                  {feedback.type === 'success' ? 
                    <Award className="w-5 h-5" /> : 
                    <MessageSquare className="w-5 h-5" />
                  }
                  {feedback.message}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Atleti Totali</h3>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{managedAthletes.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">sotto la tua guida</p>
            </div>

            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Attività Settimana</h3>
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {managedAthletes.reduce((acc, _) => acc + getAthleteStats(_.id).thisWeekActivities, 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">+12% vs settimana scorsa</p>
            </div>

            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Distanza Totale</h3>
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {Math.floor(managedAthletes.reduce((acc, _) => acc + getAthleteStats(_.id).totalDistance, 0) / 100) / 10}k km
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">questo anno</p>
            </div>

            <div className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Messaggi</h3>
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">3</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">non letti (coming soon)</p>
            </div>
          </div>

          {/* Attività Recenti */}
          <div className="stats-card mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Attività Recenti</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Le ultime attività dei tuoi atleti</p>
              </div>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {managedAthletes.slice(0, 5).map((athlete, index) => {
                const stats = getAthleteStats(athlete.id);
                return (
                  <div 
                    key={athlete.id} 
                    className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
                        {athlete.name.charAt(0)}{athlete.surname.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{athlete.name} {athlete.surname}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Ultima attività: {stats.lastActivity ? format(new Date(stats.lastActivity), 'dd MMM', { locale: it }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900 dark:text-white">{stats.thisWeekActivities}</p>
                        <p className="text-gray-500 dark:text-gray-400">questa settimana</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">{stats.avgSpeed} km/h</p>
                        <p className="text-gray-500 dark:text-gray-400">velocità media</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aggiungi Nuovo Atleta */}
          <div className="stats-card mb-8">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Aggiungi Nuovo Atleta</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cerca e associa atleti al tuo team</p>
              </div>
        </div>

            <div className="space-y-6">
          <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cerca atleta per nome o cognome..."
              value={searchTerm}
              onChange={handleSearchChange}
                  className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
            />
          </div>

              {isLoadingSearch && (
                <div className="flex items-center justify-center p-6">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
                  <p className="text-gray-600 dark:text-gray-400">Ricerca in corso...</p>
            </div>
          )}

              {errorSearch && (
                <div className="p-4 bg-red-50/80 border border-red-200/50 text-red-700 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-400 rounded-xl">
                  {errorSearch}
            </div>
              )}
          
          {searchResults.length > 0 && !isLoadingSearch && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Trovati {searchResults.length} atleti:
                  </p>
                  <div className="grid gap-3">
                    {searchResults.map((athlete, index) => (
                      <div 
                        key={athlete.id} 
                        className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200 animate-slide-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center text-white font-semibold">
                            {athlete.name.charAt(0)}{athlete.surname.charAt(0)}
                          </div>
                  <div>
                            <p className="font-medium text-gray-900 dark:text-white">{athlete.name} {athlete.surname}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {athlete.birth_date ? `Nato il ${format(new Date(athlete.birth_date), 'dd MMM yyyy', { locale: it })}` : 'Data di nascita non disponibile'}
                            </p>
                          </div>
                  </div>
                  <Button 
                    onClick={() => handleAssociateAthlete(athlete.id)}
                          disabled={isAssociating === athlete.id}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
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
                <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p>Nessun atleta trovato per "{searchTerm}"</p>
                  <p className="text-sm mt-1">Prova con un altro nome o verifica l'ortografia</p>
                </div>
          )}
        </div>
      </div>

          {/* I Miei Atleti */}
          <div className="stats-card">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">I Miei Atleti ({managedAthletes.length})</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitora e gestisci le prestazioni</p>
        </div>
            </div>

            {isLoadingManaged ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-400">Caricamento atleti...</p>
              </div>
            ) : managedAthletes.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nessun atleta associato</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  Inizia aggiungendo i tuoi primi atleti per monitorare le loro prestazioni e gestire gli allenamenti.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {managedAthletes.map((athlete, index) => {
                  const stats = getAthleteStats(athlete.id);
                  return (
                    <div
                      key={athlete.id}
                      className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30 rounded-2xl p-6 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Avatar Section */}
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                          {athlete.name.charAt(0)}{athlete.surname.charAt(0)}
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-4">{athlete.name} {athlete.surname}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Associato il {format(new Date(athlete.assigned_at), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50/50 dark:bg-blue-900/30 rounded-xl">
                          <Activity className="w-4 h-4 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalActivities}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Attività</p>
                        </div>
                        <div className="text-center p-3 bg-green-50/50 dark:bg-green-900/30 rounded-xl">
                          <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.avgSpeed}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">km/h med.</p>
                        </div>
            </div>

                      <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 mb-6">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Questa settimana: {stats.thisWeekActivities} attività</span>
            </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/athletes/${athlete.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <Activity className="w-4 h-4 mr-2" />
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
                    </div>
                  );
                })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
} 