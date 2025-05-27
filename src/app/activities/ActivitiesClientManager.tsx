'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Activity, Athlete } from '@/lib/types';
import Link from 'next/link';
// import Image from 'next/image'; // Non usato al momento
import { formatDistance, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
// Per i DatePicker, useremo input type="date" per semplicità e per evitare
// di dover installare/configurare un componente DatePicker complesso ora.
// Potrai sostituirli con il tuo componente DatePicker preferito in seguito.
import DeleteActivityButton from '@/components/DeleteActivityButton';
import ActivityPreviewCard from '@/components/ActivityPreviewCard';
import { useFilterPreferences } from '@/hooks/useFilterPreferences';
import ExportControls from '@/components/ExportControls';

interface ActivitiesClientManagerProps {
  initialActivities: Activity[];
  coachAthletes: Athlete[];
  currentUserId: string; // Necessario per DeleteActivityButton per costruire fitFilePath
}

// Funzioni helper (considera di spostarle in un file utils se usate altrove)
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return 'N/D';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hStr = h > 0 ? `${h}:` : '';
  const mStr = m < 10 && h > 0 ? `0${m}:` : `${m}:`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  
  if (h > 0) {
    return `${hStr}${mStr}${sStr}`;
  } else if (m > 0) {
    return `${m.toString()}:${s.toString().padStart(2, '0')}`;
  } else {
    return `0:${s.toString().padStart(2, '0')}`;
  }
}

const getActivityIcon = (type: string | null | undefined) => {
    switch (type) {
      case 'cycling':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'running':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l6 6m0 0l6-6M11 9v12a2 2 0 104 0V9" />
          </svg>
        );
      case 'swimming':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2l6 6m0 0l-6 6m6-6H4" />
          </svg>
        );
      case 'strength':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {/* Esempio di icona 'fitness' o 'weight lifting', puoi cambiarla */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.25278C12 6.25278 14.0701 3.5 17.5279 3.5C20.9857 3.5 22.5 6.74563 22.5 9.06237C22.5 14.0971 17.3113 18.5 12 20.5C6.68872 18.5 1.5 14.0971 1.5 9.06237C1.5 6.74563 3.01429 3.5 6.4721 3.5C9.92992 3.5 12 6.25278 12 6.25278Z" />
          </svg>
        );
      default: // Icona generica
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a4.5 4.5 0 00-6.364-6.364L12 10.172l-1.064-1.064a4.5 4.5 0 10-6.364 6.364L12 17.828l7.428-7.428z"/>
          </svg>
        );
    }
  };
  
  const getActivityColor = (type: string | null | undefined) => {
    switch (type) {
      case 'cycling':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', accent: 'from-blue-500 to-purple-600' };
      case 'running':
        return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', accent: 'from-orange-500 to-red-600' };
      case 'swimming':
        return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500 to-blue-600' };
      case 'strength':
        return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', accent: 'from-purple-500 to-purple-700' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', accent: 'from-gray-500 to-gray-700' };
    }
  };


export default function ActivitiesClientManager({ initialActivities, coachAthletes, currentUserId }: ActivitiesClientManagerProps) {
  // Hook per gestire le preferenze filtri
  const {
    preferences,
    isLoaded,
    updatePreference,
    resetPreferences
  } = useFilterPreferences({
    storageKey: 'activities-filter-preferences',
    defaultValues: {
      selectedAthleteId: 'all',
      searchTerm: '',
      startDate: '',
      endDate: '',
      minDistance: '',
      maxDistance: ''
    }
  });

  // Stati locali inizializzati con valori di default
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [minDistance, setMinDistance] = useState<string>('');
  const [maxDistance, setMaxDistance] = useState<string>('');
  
  // Stati per la comparazione
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  // Stato per la paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const ACTIVITIES_PER_PAGE = 12;

  // Carica le preferenze salvate quando il componente è pronto
  useEffect(() => {
    if (isLoaded && preferences) {
      if (preferences.selectedAthleteId) {
        setSelectedAthleteId(preferences.selectedAthleteId);
      }
      if (preferences.searchTerm) {
        setSearchTerm(preferences.searchTerm);
      }
      if (preferences.startDate) {
        setStartDate(preferences.startDate);
      }
      if (preferences.endDate) {
        setEndDate(preferences.endDate);
      }
      if (preferences.minDistance) {
        setMinDistance(preferences.minDistance);
      }
      if (preferences.maxDistance) {
        setMaxDistance(preferences.maxDistance);
      }
    }
  }, [isLoaded, preferences]); // Aggiunta dipendenza 'preferences'

  // Funzioni wrapper per aggiornare sia lo stato locale che le preferenze
  const handleAthleteChange = (value: string) => {
    setSelectedAthleteId(value);
    updatePreference('selectedAthleteId', value);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updatePreference('searchTerm', value);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    updatePreference('startDate', value);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    updatePreference('endDate', value);
  };

  const handleMinDistanceChange = (value: string) => {
    setMinDistance(value);
    updatePreference('minDistance', value);
  };

  const handleMaxDistanceChange = (value: string) => {
    setMaxDistance(value);
    updatePreference('maxDistance', value);
  };

  const handleResetFilters = () => {
    setSelectedAthleteId('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setMinDistance('');
    setMaxDistance('');
    setCurrentPage(1); // Reset anche la pagina
    resetPreferences();
  };

  // Funzioni per la comparazione
  const toggleActivitySelection = (activityId: string) => {
    const newSelection = new Set(selectedActivities);
    if (newSelection.has(activityId)) {
      newSelection.delete(activityId);
    } else if (newSelection.size < 2) { // Massimo 2 attività
      newSelection.add(activityId);
    } else {
      console.log('Massimo 2 attività selezionabili per la comparazione');
    }
    setSelectedActivities(newSelection);
  };

  const clearSelection = () => {
    setSelectedActivities(new Set());
  };

  const getComparisonSuggestions = () => {
    // Logic per suggerire comparazioni sensate
    const selected = Array.from(selectedActivities).map(id => 
      filteredActivities.find(a => a.id === id)
    ).filter((activity): activity is Activity => activity !== undefined);
    
    if (selected.length < 2) return null;
    
    const firstActivity = selected[0];
    if (!firstActivity) return null;
    
    // Analizza se le attività selezionate sono comparabili
    const sameType = selected.every(a => a.activity_type === firstActivity.activity_type);
    const similarDuration = selected.every(a => 
      Math.abs((a.duration_seconds || 0) - (firstActivity.duration_seconds || 0)) < 600 // 10 min tolerance
    );
    const similarDistance = selected.every(a => 
      Math.abs((a.distance_meters || 0) - (firstActivity.distance_meters || 0)) < 5000 // 5km tolerance
    );
    
    return {
      sameType,
      similarDuration,
      similarDistance,
      recommendedMetrics: sameType ? ['power', 'speed', 'heartRate'] : ['relative_effort', 'efficiency']
    };
  };

  const filteredActivities = useMemo(() => {
    let activities = initialActivities;

    if (selectedAthleteId !== 'all') {
      activities = activities.filter(act => act.athlete_id === selectedAthleteId);
    }

    if (startDate) {
      try {
        const startFilterDate = new Date(startDate);
        startFilterDate.setUTCHours(0,0,0,0); // Confronta con l'inizio del giorno UTC
         activities = activities.filter(act => {
            const activityDate = new Date(act.activity_date);
             return activityDate >= startFilterDate;
        });
      } catch (e) { console.error("Invalid start date format:", startDate, e); }
    }

    if (endDate) {
      try {
        const endFilterDate = new Date(endDate);
        endFilterDate.setUTCHours(23,59,59,999); // Confronta con la fine del giorno UTC
         activities = activities.filter(act => {
            const activityDate = new Date(act.activity_date);
            return activityDate <= endFilterDate;
        });
      } catch (e) { console.error("Invalid end date format:", endDate, e); }
    }
    
    if (searchTerm.trim() !== '') {
        const lowerSearchTerm = searchTerm.toLowerCase();
        activities = activities.filter(act => 
            (act.title && act.title.toLowerCase().includes(lowerSearchTerm)) ||
            (act.description && act.description.toLowerCase().includes(lowerSearchTerm)) ||
            (act.activity_type && act.activity_type.toLowerCase().includes(lowerSearchTerm))
        );
    }

    // Filtro per range distanza
    if (minDistance && !isNaN(parseFloat(minDistance))) {
      const minDistanceMeters = parseFloat(minDistance) * 1000;
      activities = activities.filter(act => 
        act.distance_meters && act.distance_meters >= minDistanceMeters
      );
    }

    if (maxDistance && !isNaN(parseFloat(maxDistance))) {
      const maxDistanceMeters = parseFloat(maxDistance) * 1000;
      activities = activities.filter(act => 
        act.distance_meters && act.distance_meters <= maxDistanceMeters
      );
    }

    return activities.sort((a,b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime());
  }, [initialActivities, selectedAthleteId, startDate, endDate, searchTerm, minDistance, maxDistance]);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAthleteId, startDate, endDate, searchTerm, minDistance, maxDistance]);

  // Calcola le attività da mostrare per la pagina corrente
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * ACTIVITIES_PER_PAGE;
    const endIndex = startIndex + ACTIVITIES_PER_PAGE;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage, ACTIVITIES_PER_PAGE]);

  // Calcola il numero totale di pagine
  const totalPages = Math.ceil(filteredActivities.length / ACTIVITIES_PER_PAGE);

  const stats = useMemo(() => {
    return {
      totalActivities: filteredActivities.length,
      totalCyclingActivities: filteredActivities.filter(a => a.activity_type === 'cycling').length,
      totalDistanceKm: Math.round(filteredActivities.reduce((acc, a) => acc + (typeof a.distance_meters === 'number' ? a.distance_meters / 1000 : 0), 0)),
      totalDurationSeconds: filteredActivities.reduce((acc, a) => acc + (typeof a.duration_seconds === 'number' ? a.duration_seconds : 0), 0),
    };
  }, [filteredActivities]);

  const selectedAthleteName = useMemo(() => {
    if (selectedAthleteId === 'all') return null;
    const athlete = coachAthletes.find(a => a.id === selectedAthleteId);
    return athlete ? `${athlete.name} ${athlete.surname}` : null;
  }, [selectedAthleteId, coachAthletes]);

  // Debug per verificare che il componente funzioni
  useEffect(() => {
    console.log('DEBUG - ActivitiesClientManager rendered');
    console.log('DEBUG - filteredActivities.length:', filteredActivities.length);
    console.log('DEBUG - isComparisonMode:', isComparisonMode);
  }, [filteredActivities.length, isComparisonMode]);

  return (
    <div className="min-h-screen">
      {/* Header copiato da page.tsx, adattato per usare i dati filtrati */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-t-3xl" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedAthleteName ? `Attività di ${selectedAthleteName}` : 'Tutte le Attività'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                   Activity Hub
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Attività Visualizzate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActivities}</p>
              </div>
              <Link href="/activities/upload">
                <Button className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   Carica Attività
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="stats-card mb-8 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {/* Atleta */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Atleta
            </label>
            <Select value={selectedAthleteId} onValueChange={handleAthleteChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Seleziona atleta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli Atleti</SelectItem>
                {coachAthletes.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>{athlete.name} {athlete.surname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Ricerca */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cerca attività
            </label>
            <Input
              type="text"
              placeholder="Titolo, descrizione, tipo..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Data da */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Da
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Data a */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              A
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Distanza minima */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Distanza min (km)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={minDistance}
              onChange={(e) => handleMinDistanceChange(e.target.value)}
              className="h-10"
              min="0"
              step="0.1"
            />
          </div>

          {/* Distanza massima */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Distanza max (km)
            </label>
            <Input
              type="number"
              placeholder="∞"
              value={maxDistance}
              onChange={(e) => handleMaxDistanceChange(e.target.value)}
              className="h-10"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Pulsante reset filtri */}
        {(selectedAthleteId !== 'all' || startDate || endDate || searchTerm || minDistance || maxDistance) && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filtri
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats Aggregate */}
      {filteredActivities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/30 rounded-xl p-4 text-center stats-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessioni Filtrate</h3>
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalActivities}</p>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-4 text-center stats-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Cycling</h3>
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalCyclingActivities}</p>
          </div>

          <div className="bg-orange-50/50 dark:bg-orange-900/30 rounded-xl p-4 text-center stats-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Distanza Totale</h3>
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalDistanceKm} km</p>
          </div>

          <div className="bg-purple-50/50 dark:bg-purple-900/30 rounded-xl p-4 text-center stats-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Tempo Totale</h3>
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatDuration(stats.totalDurationSeconds)}</p>
          </div>
        </div>
      )}

      {/* Comparison Controls */}
      {filteredActivities.length > 1 && (
        <Card className="mb-6 stats-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant={isComparisonMode ? "default" : "outline"}
                onClick={() => {
                  setIsComparisonMode(!isComparisonMode);
                  if (!isComparisonMode) clearSelection();
                }}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {isComparisonMode ? 'Modalità Comparazione ON' : 'Compara Attività'}
              </Button>
              
              {isComparisonMode && selectedActivities.size > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{selectedActivities.size}/2 attività selezionate</span>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Cancella Selezione
                  </Button>
                </div>
              )}
            </div>
            
            {isComparisonMode && selectedActivities.size >= 2 && (
              <div className="flex items-center gap-2">
                {(() => {
                  const suggestions = getComparisonSuggestions();
                  if (suggestions) {
                    return (
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          suggestions.sameType ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {suggestions.sameType ? '✓ Stesso tipo' : '⚠ Tipi diversi'}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          suggestions.similarDuration ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {suggestions.similarDuration ? '✓ Durata simile' : '⚠ Durata diversa'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    const selectedIds = Array.from(selectedActivities).join(',');
                    window.location.href = `/activities/compare?ids=${selectedIds}`;
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Confronta Ora
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Elenco Attività con Preview Cards */}
      {filteredActivities.length === 0 ? (
         <div className="stats-card text-center py-16">
           <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
           <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nessuna attività trovata</h3>
           <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Prova a modificare i filtri o carica nuove attività.</p>
         </div>
      ) : (
        <>
          {/* Grid delle attività - sempre 4 colonne su schermi grandi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {paginatedActivities.map((activity, index) => {
              // @ts-ignore athletes può essere null o un oggetto, non un array qui.
              const athleteName = selectedAthleteId === 'all' && activity.athletes?.name 
                ? `${activity.athletes.name} ${activity.athletes.surname}` 
                : undefined;

              return (
                <ActivityPreviewCard
                  key={activity.id}
                  activity={activity}
                  index={(currentPage - 1) * ACTIVITIES_PER_PAGE + index}
                  isComparisonMode={isComparisonMode}
                  isSelected={selectedActivities.has(activity.id)}
                  onToggleSelection={() => toggleActivitySelection(activity.id)}
                  canSelect={!selectedActivities.has(activity.id) && selectedActivities.size < 2}
                  athleteName={athleteName}
                />
              );
            })}
          </div>

          {/* Controlli di paginazione */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Precedente
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Mostra sempre la prima, l'ultima, la corrente e quelle adiacenti
                  const showPage = page === 1 || page === totalPages || 
                                  Math.abs(page - currentPage) <= 1;
                  
                  if (!showPage && page === 2 && currentPage > 4) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  if (!showPage && page === totalPages - 1 && currentPage < totalPages - 3) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  if (!showPage) return null;

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-10 h-10"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Successiva
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          )}

          {/* Info paginazione */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-8">
            Mostrando {((currentPage - 1) * ACTIVITIES_PER_PAGE) + 1}-{Math.min(currentPage * ACTIVITIES_PER_PAGE, filteredActivities.length)} di {filteredActivities.length} attività
          </div>

          {/* Export Controls - spostato in fondo */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <ExportControls 
              activities={filteredActivities}
              athlete={selectedAthleteId !== 'all' ? coachAthletes.find(a => a.id === selectedAthleteId) : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}