'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, MetricCard, getGridClasses } from '@/components/design-system';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ActivityPreviewCard from './ActivityPreviewCard';
import { spacing } from '@/lib/design-system';

interface AthleteActivitiesTabProps {
  activities: Activity[];
  athleteName: string;
}

type SortOption = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'duration_desc' | 'duration_asc';

export default function AthleteActivitiesTab({ activities, athleteName }: AthleteActivitiesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minDistance, setMinDistance] = useState<string>(''); // in km
  const [maxDistance, setMaxDistance] = useState<string>(''); // in km
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 attività per pagina

  // Funzione per formattare la durata
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/D';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calcolo statistiche
  const stats = useMemo(() => {
    const totalActivities = activities.length;
    const totalDistanceKm = activities.reduce((sum, activity) => 
      sum + (activity.distance_meters ? activity.distance_meters / 1000 : 0), 0
    );
    const totalDurationSeconds = activities.reduce((sum, activity) => 
      sum + (activity.duration_seconds || 0), 0
    );
    const totalElevationGain = activities.reduce((sum, activity) => 
      sum + (activity.elevation_gain_meters || 0), 0
    );
    const avgTSS = activities.length > 0 
      ? activities.reduce((sum, activity) => sum + (activity.tss || 0), 0) / activities.length 
      : 0;
    const activitiesWithGPS = activities.filter(activity => 
      activity.fit_file_path
    ).length;

    return {
      totalActivities,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationSeconds,
      totalElevationGain: Math.round(totalElevationGain),
      avgTSS: Math.round(avgTSS),
      activitiesWithGPS
    };
  }, [activities]);

  // Filtri e ordinamento
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = activities.filter(activity => {
      // Filtro per termine di ricerca
      const matchesSearch = !searchTerm || 
        activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro per tipo attività
      const matchesType = activityTypeFilter === 'all' || 
        activity.activity_type === activityTypeFilter;

      // Filtro per data
      const activityDate = new Date(activity.activity_date);
      const matchesDateFrom = !dateFrom || activityDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || activityDate <= new Date(dateTo);

      // Filtro per range distanza
      const activityDistanceKm = activity.distance_meters ? activity.distance_meters / 1000 : 0;
      const matchesMinDistance = !minDistance || !isNaN(parseFloat(minDistance)) ? 
        activityDistanceKm >= (parseFloat(minDistance) || 0) : true;
      const matchesMaxDistance = !maxDistance || !isNaN(parseFloat(maxDistance)) ? 
        activityDistanceKm <= (parseFloat(maxDistance) || Infinity) : true;

      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo && matchesMinDistance && matchesMaxDistance;
    });

    // Ordinamento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime();
        case 'date_asc':
          return new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime();
        case 'distance_desc':
          return (b.distance_meters || 0) - (a.distance_meters || 0);
        case 'distance_asc':
          return (a.distance_meters || 0) - (b.distance_meters || 0);
        case 'duration_desc':
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        case 'duration_asc':
          return (a.duration_seconds || 0) - (b.duration_seconds || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [activities, searchTerm, sortBy, activityTypeFilter, dateFrom, dateTo, minDistance, maxDistance]);

  // Tipi di attività disponibili
  const availableActivityTypes = useMemo(() => {
    const types = new Set(activities.map(activity => activity.activity_type).filter(Boolean));
    return Array.from(types);
  }, [activities]);

  // Paginazione
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedActivities.slice(startIndex, endIndex);
  }, [filteredAndSortedActivities, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedActivities.length / itemsPerPage);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, activityTypeFilter, dateFrom, dateTo, minDistance, maxDistance]);

  return (
    <div className="space-y-6">
      {/* Quick Stats Overview */}
      <Card variant="default" className={spacing.bottom.lg}>
        <CardHeader>
          <CardTitle>Panoramica Attività</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={getGridClasses(4, 'md')}>
            <MetricCard
              title="Totali"
              value={activities.length.toString()}
              accent="blue"
            />
            
            <MetricCard
              title="Distanza"
              value={`${(activities.reduce((sum, act) => sum + (act.distance_meters || 0), 0) / 1000).toFixed(1)} km`}
              accent="emerald"
            />
            
            <MetricCard
              title="Tempo"
              value={formatDuration(activities.reduce((sum, act) => sum + (act.duration_seconds || 0), 0))}
              accent="purple"
            />
            
            <MetricCard
              title="Media"
              value={activities.length > 0 ? `${((activities.reduce((sum, act) => sum + (act.distance_meters || 0), 0) / 1000) / activities.length).toFixed(1)} km` : '0 km'}
              accent="amber"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Card variant="glass" className={spacing.bottom.md}>
        <CardContent className={spacing.all.md}>
          <div className={getGridClasses(4, 'md')}>
            {/* Ricerca */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cerca attività
              </label>
              <Input
                type="text"
                placeholder="Titolo o descrizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Ordinamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ordina per
              </label>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Data (più recente)</SelectItem>
                  <SelectItem value="date_asc">Data (più vecchia)</SelectItem>
                  <SelectItem value="distance_desc">Distanza (maggiore)</SelectItem>
                  <SelectItem value="distance_asc">Distanza (minore)</SelectItem>
                  <SelectItem value="duration_desc">Durata (maggiore)</SelectItem>
                  <SelectItem value="duration_asc">Durata (minore)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo attività */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  {availableActivityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data da */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Da
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Data a */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                A
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Distanza minima */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dist. min (km)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={minDistance}
                onChange={(e) => setMinDistance(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>

            {/* Distanza massima */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dist. max (km)
              </label>
              <Input
                type="number"
                placeholder="∞"
                value={maxDistance}
                onChange={(e) => setMaxDistance(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          {/* Pulsante reset filtri */}
          {(searchTerm || activityTypeFilter !== 'all' || dateFrom || dateTo || minDistance || maxDistance || sortBy !== 'date_desc') && (
            <div className={`${spacing.bottom.md} flex items-center justify-center`}>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setActivityTypeFilter('all');
                  setDateFrom('');
                  setDateTo('');
                  setMinDistance('');
                  setMaxDistance('');
                  setSortBy('date_desc');
                }}
                className="text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filtri
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Lista Attività</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${spacing.bottom.md} flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4`}>
            <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${spacing.bottom.lg}`}>
              {filteredAndSortedActivities.length} attività trovate
            </h3>
            {filteredAndSortedActivities.length !== activities.length && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                su {activities.length} totali
              </span>
            )}
          </div>

          {/* Griglia attività */}
          {filteredAndSortedActivities.length === 0 ? (
            <div className={`${spacing.bottom.xl} flex flex-col items-center justify-center text-center`}>
              <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {activities.length === 0 ? 'Nessuna attività registrata' : 'Nessuna attività trovata'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                {activities.length === 0 
                  ? `${athleteName} non ha ancora attività registrate.`
                  : 'Prova a modificare i filtri di ricerca.'
                }
              </p>
              {activities.length === 0 && (
                <Button 
                  onClick={() => window.location.href = '/activities/upload'}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Carica Prima Attività
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedActivities.map((activity, index) => (
                  <ActivityPreviewCard
                    key={activity.id}
                    activity={activity}
                    index={index}
                    isComparisonMode={false}
                    isSelected={false}
                    onToggleSelection={() => {}}
                    canSelect={false}
                  />
                ))}
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Pagina {currentPage} di {totalPages} ({filteredAndSortedActivities.length} attività)
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Precedente
                    </Button>
                    
                    {/* Numeri pagina */}
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Successiva
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 