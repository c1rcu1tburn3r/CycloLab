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

  // Gestione click del checkbox
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Impedisce la propagazione del click
    if (onToggleSelection) {
      onToggleSelection();
    }
  };

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
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-2xl'
      } ${isComparisonMode ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${index * 75}ms` }}
      onClick={handleCardClick}
    >
      {/* Checkbox per comparazione */}
      {isComparisonMode && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center justify-center w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              disabled={!canSelect && !isSelected}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              onClick={(e) => e.stopPropagation()} // Evita doppio trigger
            />
          </div>
        </div>
      )}

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
          />
        )}

        {/* Overlay per modalità comparazione */}
        {isComparisonMode && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none">
            <div className="absolute bottom-3 right-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
              {isSelected ? 'Selezionata' : 'Clicca per selezionare'}
            </div>
          </div>
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
}> = ({ activity, routePoints, isLoadingRoute, displayTitle, athleteName, bg, text }) => {
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
      </div>

      {/* Contenuto della card */}
      <CardContent className="p-4">
        {/* Data */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {format(parseISO(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}
        </div>

        {/* Titolo/Località */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {displayTitle}
        </h3>

        {/* Nome atleta se necessario */}
        {athleteName && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-3 font-medium">
            {athleteName}
          </p>
        )}

        {/* Dati di riepilogo */}
        <div className="grid grid-cols-3 gap-3">
          {/* Distanza */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Distanza</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {activity.distance_meters ? `${(activity.distance_meters / 1000).toFixed(1)} km` : 'N/D'}
              </p>
            </div>
          </div>

          {/* Tempo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tempo</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDuration(activity.duration_seconds)}
              </p>
            </div>
          </div>

          {/* Dislivello o TSS */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
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