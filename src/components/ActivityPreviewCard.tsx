'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Activity, RoutePoint } from '@/lib/types';
import ActivityPreviewMap from './ActivityPreviewMap';
import { Card, CardContent } from "@/components/ui/card";

interface ActivityPreviewCardProps {
  activity: Activity;
  index?: number;
  isComparisonMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  canSelect?: boolean;
  athleteName?: string;
}

// Funzione helper per formattare la durata
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return 'N/D';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  } else if (m > 0) {
    return `${m}m ${s}s`;
  } else {
    return `${s}s`;
  }
}

// Funzione per ottenere il badge del tipo di sensori
const getSensorBadge = (activity: Activity) => {
  const hasPower = activity.avg_power_watts && activity.avg_power_watts > 0;
  const hasHeartRate = activity.avg_heart_rate && activity.avg_heart_rate > 0;
  const hasCadence = activity.avg_cadence && activity.avg_cadence > 0;
  
  // Determina il tipo di setup in base ai sensori disponibili
  if (hasPower && hasHeartRate && hasCadence) {
    return { 
      icon: '⚡', 
      text: 'Completo', 
      bg: 'bg-emerald-500', 
      textColor: 'text-white',
      tooltip: 'PowerMeter + Cardio + Cadenza'
    };
  }
  if (hasPower && hasHeartRate) {
    return { 
      icon: '⚡', 
      text: 'PowerMeter+', 
      bg: 'bg-blue-500', 
      textColor: 'text-white',
      tooltip: 'PowerMeter + Cardio'
    };
  }
  if (hasPower && hasCadence) {
    return { 
      icon: '⚡', 
      text: 'PowerMeter+', 
      bg: 'bg-blue-500', 
      textColor: 'text-white',
      tooltip: 'PowerMeter + Cadenza'
    };
  }
  if (hasPower) {
    return { 
      icon: '⚡', 
      text: 'PowerMeter', 
      bg: 'bg-blue-600', 
      textColor: 'text-white',
      tooltip: 'Solo PowerMeter'
    };
  }
  if (hasHeartRate && hasCadence) {
    return { 
      icon: '❤️', 
      text: 'Cardio+', 
      bg: 'bg-red-500', 
      textColor: 'text-white',
      tooltip: 'Cardio + Cadenza'
    };
  }
  if (hasHeartRate) {
    return { 
      icon: '❤️', 
      text: 'Cardio', 
      bg: 'bg-red-600', 
      textColor: 'text-white',
      tooltip: 'Solo Cardio'
    };
  }
  if (hasCadence) {
    return { 
      icon: '🔄', 
      text: 'Cadenza', 
      bg: 'bg-orange-500', 
      textColor: 'text-white',
      tooltip: 'Solo Cadenza'
    };
  }
  
  // Solo GPS e velocità di base
  return { 
    icon: '📍', 
    text: 'Base', 
    bg: 'bg-gray-500', 
    textColor: 'text-white',
    tooltip: 'Solo GPS + Velocità'
  };
};

// Funzione per ottenere l'icona del tipo di attività
const getActivityIcon = (type: string | null | undefined) => {
  switch (type) {
    case 'cycling':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'running':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l6 6m0 0l6-6M11 9v12a2 2 0 104 0V9" />
        </svg>
      );
    case 'swimming':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2l6 6m0 0l-6 6m6-6H4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
};

// Funzione per ottenere i colori del tipo di attività
const getActivityColor = (type: string | null | undefined) => {
  switch (type) {
    case 'cycling':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', accent: 'from-orange-500 to-red-500' };
    case 'running':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500 to-blue-500' };
    case 'swimming':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', accent: 'from-blue-500 to-indigo-500' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', accent: 'from-gray-500 to-gray-700' };
  }
};

const ActivityPreviewCard: React.FC<ActivityPreviewCardProps> = ({
  activity,
  index = 0,
  isComparisonMode = false,
  isSelected = false,
  onToggleSelection,
  canSelect = true,
  athleteName
}) => {
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  // Fetch dei route points per la mappa
  useEffect(() => {
    const fetchRoutePoints = async () => {
      if (!activity.id) return;
      
      try {
        setIsLoadingRoute(true);
        const response = await fetch(`/api/activities/${activity.id}/route-points`);
        if (response.ok) {
          const data = await response.json();
          setRoutePoints(data.routePoints || []);
        }
      } catch (error) {
        console.error('Errore nel caricamento route points:', error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoutePoints();
  }, [activity.id]);

  const { bg, text, accent } = getActivityColor(activity.activity_type);

  // Estrai località dal titolo se possibile (semplificato)
  const extractLocation = (title: string | null): string => {
    if (!title) return '';
    
    // Cerca pattern comuni per località italiane
    const locationPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–—]/,
      /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s|$)/g
    ];

    for (const pattern of locationPatterns) {
      const match = title.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        return match[1].trim();
      }
    }
    
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  };

  const displayTitle = extractLocation(activity.title || 'Attività Senza Titolo');

  // Gestione click della card in modalità comparazione
  const handleCardClick = (e: React.MouseEvent) => {
    if (isComparisonMode) {
      e.preventDefault(); // Impedisce la navigazione quando siamo in modalità comparazione
      if (onToggleSelection && canSelect) {
        onToggleSelection();
      }
    }
  };

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] animate-slide-up ${
        isSelected 
          ? 'ring-4 ring-blue-500/60 shadow-2xl shadow-blue-500/25 border-blue-500/50' 
          : 'hover:shadow-2xl'
      } ${isComparisonMode ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${index * 75}ms` }}
      onClick={handleCardClick}
    >
      {/* Gradient Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent}`} />
      
      {/* Contenuto che può essere cliccabile o meno */}
      <div className="relative">
        {/* Se non siamo in modalità comparazione, wrappa tutto in un Link */}
        {!isComparisonMode ? (
          <Link href={`/activities/${activity.id}`} className="block">
            <CardContentWrapper
              activity={activity}
              routePoints={routePoints}
              isLoadingRoute={isLoadingRoute}
              displayTitle={displayTitle}
              athleteName={athleteName}
              bg={bg}
              text={text}
              isComparisonMode={isComparisonMode}
              isSelected={isSelected}
              canSelect={canSelect}
            />
          </Link>
        ) : (
          <CardContentWrapper
            activity={activity}
            routePoints={routePoints}
            isLoadingRoute={isLoadingRoute}
            displayTitle={displayTitle}
            athleteName={athleteName}
            bg={bg}
            text={text}
            isComparisonMode={isComparisonMode}
            isSelected={isSelected}
            canSelect={canSelect}
          />
        )}
      </div>
    </Card>
  );
};

// Componente wrapper per il contenuto della card
const CardContentWrapper: React.FC<{
  activity: Activity;
  routePoints: RoutePoint[];
  isLoadingRoute: boolean;
  displayTitle: string;
  athleteName?: string;
  bg: string;
  text: string;
  isComparisonMode?: boolean;
  isSelected?: boolean;
  canSelect?: boolean;
}> = ({ activity, routePoints, isLoadingRoute, displayTitle, athleteName, bg, text, isComparisonMode, isSelected, canSelect }) => {
  return (
    <div className="p-0">
      {/* Mappa di anteprima */}
      <div className="relative">
        {isLoadingRoute ? (
          <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-t-xl flex items-center justify-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
        ) : (
          <ActivityPreviewMap 
            activity={activity} 
            routePoints={routePoints}
            height="192px"
          />
        )}
        
        {/* Badge tipo attività sovrapposto */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${bg} ${text} border border-white/20`}>
          {getActivityIcon(activity.activity_type)}
          <span className="hidden sm:inline">
            {activity.activity_type ? 
              activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1) 
              : 'Attività'
            }
          </span>
        </div>

        {/* Badge sensori sovrapposto */}
        <div 
          className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${getSensorBadge(activity).bg} ${getSensorBadge(activity).textColor} border border-white/20`}
          title={getSensorBadge(activity).tooltip}
        >
          <span>{getSensorBadge(activity).icon}</span>
          <span className="hidden sm:inline">{getSensorBadge(activity).text}</span>
        </div>
      </div>

      {/* Contenuto della card */}
      <CardContent className="p-4">
        {/* Data */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {format(parseISO(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}
        </div>

        {/* Titolo/Località */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
            {displayTitle}
          </h3>
          
          {/* Pulsante selezione in modalità comparazione */}
          {isComparisonMode && (
            <div className="ml-2 flex-shrink-0">
              <div className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg">
                {isSelected ? 'Selezionata' : 'Seleziona'}
              </div>
            </div>
          )}
        </div>

        {/* Nome atleta se necessario */}
        {athleteName && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-3 font-medium">
            {athleteName}
          </p>
        )}

        {/* Dati di riepilogo */}
        <div className="grid grid-cols-4 gap-2">
          {/* Distanza */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Distanza</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {activity.distance_meters ? `${(activity.distance_meters / 1000).toFixed(1)} km` : 'N/D'}
              </p>
            </div>
          </div>

          {/* Tempo */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Tempo</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDuration(activity.duration_seconds)}
              </p>
            </div>
          </div>

          {/* Dislivello */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Dislivello</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {activity.elevation_gain_meters ? `${activity.elevation_gain_meters} m` : 'N/D'}
              </p>
            </div>
          </div>

          {/* TSS */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">TSS</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {activity.tss ? Math.round(activity.tss) : 'N/D'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default ActivityPreviewCard; 