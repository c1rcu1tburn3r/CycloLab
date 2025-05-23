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
// Per i DatePicker, useremo input type="date" per semplicità e per evitare
// di dover installare/configurare un componente DatePicker complesso ora.
// Potrai sostituirli con il tuo componente DatePicker preferito in seguito.
import DeleteActivityButton from '@/components/DeleteActivityButton';

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
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | 'all'>('all');
  const [startDate, setStartDate] = useState<string>(''); // Formato YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>('');     // Formato YYYY-MM-DD
  const [searchTerm, setSearchTerm] = useState('');

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
    return activities.sort((a,b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime());
  }, [initialActivities, selectedAthleteId, startDate, endDate, searchTerm]);

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

  return (
    <div className="min-h-screen">
      {/* Header copiato da page.tsx, adattato per usare i dati filtrati */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
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
      <Card className="mb-8 stats-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div>
            <label htmlFor="athlete-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atleta</label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger id="athlete-filter" className="stats-card-bg-input"><SelectValue placeholder="Seleziona atleta" /></SelectTrigger>
              <SelectContent className="stats-card-bg-input">
                <SelectItem value="all">Tutti gli Atleti</SelectItem>
                {coachAthletes.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>{athlete.name} {athlete.surname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Da Data</label>
            <input 
                type="date" 
                id="start-date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">A Data</label>
             <input 
                type="date" 
                id="end-date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
            />
          </div>
          <div>
            <label htmlFor="search-term" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cerca</label>
            <input 
                type="text"
                id="search-term"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titolo, descrizione, tipo..."
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
            />
          </div>
        </div>
      </Card>

      {/* Quick Stats Aggregate */}
       {filteredActivities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="stats-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessioni Filtrate</h3>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActivities}</p>
          </Card>
          <Card className="stats-card p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Cycling</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCyclingActivities}</p>
          </Card>
          <Card className="stats-card p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Distanza Totale</h3>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDistanceKm} km</p>
          </Card>
          <Card className="stats-card p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Tempo Totale</h3>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.totalDurationSeconds)}</p>
          </Card>
        </div>
      )}

      {/* Elenco Attività Filtrate */}
      {filteredActivities.length === 0 ? (
         <div className="stats-card text-center py-16">
           <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
           <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nessuna attività trovata</h3>
           <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Prova a modificare i filtri o carica nuove attività.</p>
         </div>
      ) : (
        <div className="space-y-6">
          {filteredActivities.map((activity, index) => {
            const { bg, text, accent } = getActivityColor(activity.activity_type);
            // @ts-ignore athletes può essere null o un oggetto, non un array qui.
            const athleteName = activity.athletes?.name ? `${activity.athletes.name} ${activity.athletes.surname}` : 'Atleta';
            const fitFilePathForDelete = activity.fit_file_name && currentUserId && activity.athlete_id 
              ? `${currentUserId}/${activity.athlete_id}/${activity.fit_file_name}` 
              : null;

            return (
              <Card 
                key={activity.id} 
                className={`stats-card group animate-slide-up hover:shadow-2xl transition-all duration-300`}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent}`} />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <Link href={`/activities/${activity.id}`} className="hover:underline">
                          {activity.title || 'Attività Senza Titolo'}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(parseISO(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it }) + ' alle ' + format(parseISO(activity.activity_date), 'HH:mm', { locale: it })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${bg} ${text}`}>
                      {getActivityIcon(activity.activity_type)}
                      <span>{activity.activity_type ? activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1) : 'Generico'}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedAthleteId === 'all' && activity.athlete_id && (
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                      Atleta: {athleteName}
                    </p>
                  )}
                  {activity.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2 text-sm">
                      {activity.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50/50 dark:bg-gray-800/40 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Distanza</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {activity.distance_meters ? `${(activity.distance_meters / 1000).toFixed(2)} km` : 'N/D'}
                      </p>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-gray-800/40 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Durata</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatDuration(activity.duration_seconds)}
                      </p>
                    </div>
                    {/* Dislivello temporaneamente commentato 
                    <div className="bg-gray-50/50 dark:bg-gray-800/40 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Dislivello</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {activity.total_ascent ? `${Math.round(activity.total_ascent)} m` : 'N/D'}
                      </p>
                    </div>
                    */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/40 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Carico Allenamento</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {activity.tss ? `${Math.round(activity.tss)} TSS` : 'N/D'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-4">
                    <DeleteActivityButton 
                      activityId={activity.id}
                      activityTitle={activity.title || 'attività senza titolo'}
                      fitFilePath={fitFilePathForDelete}
                    />
                    <Link href={`/activities/${activity.id}/edit`}>
                      <Button variant="outline" size="sm" className="border-gray-200/50 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Modifica
                      </Button>
                    </Link>
                    <Link href={`/activities/${activity.id}`}>
                      <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300">
                         <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                         Dettagli
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}