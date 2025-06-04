'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Activity, RoutePoint } from '@/lib/types';
import { getGridClasses, spacing } from '@/lib/design-system';
import { Card as DesignCard } from '@/components/design-system';

// Import dinamico della mappa per evitare errori SSR
const SegmentMapView = dynamic(
  () => import('./SegmentMapView'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Caricamento mappa...</p>
        </div>
      </div>
    )
  }
);

interface VisualSegmentSelectorProps {
  activities: Activity[];
}

interface SelectedSegment {
  startIndex: number;
  endIndex: number;
  activity1: {
    startIndex: number;
    endIndex: number;
    performance: SegmentPerformance;
  };
  activity2: {
    startIndex: number;
    endIndex: number;
    performance: SegmentPerformance;
  };
  distance: number;
  name: string;
}

interface SegmentPerformance {
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed?: number;
  avgPower?: number;
  maxPower?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGain?: number;
  avgCadence?: number;
}

export default function VisualSegmentSelector({ activities }: VisualSegmentSelectorProps) {
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionPoints, setSelectionPoints] = useState<{ lat: number; lng: number }[]>([]);

  // Debug: monitora cambiamenti di stato
  useEffect(() => {
    console.log('🔄 State changed:', {
      isSelecting,
      selectionPointsLength: selectionPoints.length,
      hasSelectedSegment: !!selectedSegment
    });
  }, [isSelecting, selectionPoints, selectedSegment]);

  // Debug: monitora quando handleMapClick viene ricreato
  useEffect(() => {
    console.log('🔄 handleMapClick recreated due to dependency change');
  }, [isSelecting, selectionPoints]);

  // Parsing route points
  const routeData = useMemo(() => {
    return activities.map(activity => {
      let routePoints: RoutePoint[] = [];
      
      try {
        if (activity.route_points) {
          routePoints = typeof activity.route_points === 'string' 
            ? JSON.parse(activity.route_points)
            : activity.route_points;
        }
      } catch (error) {
        console.error('Errore parsing route_points:', error);
      }
      
      return {
        ...activity,
        routePoints: routePoints || []
      };
    });
  }, [activities]);

  // Funzione per iniziare la selezione
  const startSelection = () => {
    console.log('🚀 Starting selection - clearing previous state');
    setIsSelecting(true);
    setSelectionPoints([]);
    setSelectedSegment(null);
  };

  // Funzione per gestire click sulla mappa
  const handleMapClick = useCallback((lat: number, lng: number) => {
    console.log(`🎯 Map click received: lat=${lat}, lng=${lng}`);
    console.log(`📊 Current state: isSelecting=${isSelecting}, points=${selectionPoints.length}`);
    
    if (!isSelecting) {
      console.log('❌ Not in selecting mode, ignoring click');
      return;
    }

    if (selectionPoints.length >= 2) {
      console.log('⚠️ Already have 2 points, ignoring additional click');
      return;
    }

    // Controlla se questo punto è troppo vicino al precedente (potrebbe essere click duplicato)
    if (selectionPoints.length > 0) {
      const lastPoint = selectionPoints[selectionPoints.length - 1];
      const distance = Math.sqrt(
        Math.pow(lat - lastPoint.lat, 2) + Math.pow(lng - lastPoint.lng, 2)
      );
      
      if (distance < 0.001) { // ~100m
        console.log('⚠️ Click too close to previous point, ignoring (possible duplicate)');
        return;
      }
    }

    const newPoints = [...selectionPoints, { lat, lng }];
    console.log(`📍 Adding point ${newPoints.length}:`, { lat, lng });
    console.log(`📍 New points array:`, newPoints);
    setSelectionPoints(newPoints);
    
    // Se abbiamo 2 punti, calcola il segmento
    if (newPoints.length === 2) {
      console.log('🔄 Calculating segment with both points...');
      setTimeout(() => {
        calculateSegment(newPoints[0], newPoints[1]);
        setIsSelecting(false);
      }, 100); // Piccolo delay per assicurarsi che lo stato sia aggiornato
    }
  }, [isSelecting, selectionPoints]);

  // Calcola le prestazioni del segmento selezionato
  const calculateSegment = useCallback((startPoint: { lat: number; lng: number }, endPoint: { lat: number; lng: number }) => {
    console.log('🎯 Calculating segment between:', startPoint, endPoint);
    
    const segmentData = routeData.map(activity => {
      const route = activity.routePoints;
      if (route.length === 0) return null;

      // Trova i punti più vicini ai click dell'utente
      const startIndex = findNearestPointIndex(route, startPoint);
      const endIndex = findNearestPointIndex(route, endPoint);
      
      // Assicurati che l'ordine sia corretto
      const actualStart = Math.min(startIndex, endIndex);
      const actualEnd = Math.max(startIndex, endIndex);
      
      if (actualEnd - actualStart < 5) return null; // Segmento troppo corto
      
      const segmentPoints = route.slice(actualStart, actualEnd + 1);
      const performance = calculateSegmentPerformance(segmentPoints, activity);
      
      return {
        activity,
        startIndex: actualStart,
        endIndex: actualEnd,
        performance,
        segmentPoints
      };
    }).filter(Boolean);

    if (segmentData.length >= 2) {
      const avgDistance = segmentData.reduce((sum, seg) => sum + seg!.performance.distance, 0) / segmentData.length;
      
      const segment: SelectedSegment = {
        startIndex: 0,
        endIndex: 0,
        activity1: {
          startIndex: segmentData[0]!.startIndex,
          endIndex: segmentData[0]!.endIndex,
          performance: segmentData[0]!.performance
        },
        activity2: {
          startIndex: segmentData[1]!.startIndex,
          endIndex: segmentData[1]!.endIndex,
          performance: segmentData[1]!.performance
        },
        distance: avgDistance,
        name: `Segmento selezionato (${(avgDistance / 1000).toFixed(2)} km)`
      };
      
      setSelectedSegment(segment);
      console.log('✅ Segment calculated:', segment);
    }
  }, [routeData, setSelectedSegment]);

  // Effetto per calcolare il segmento quando abbiamo due punti selezionati
  useEffect(() => {
    if (selectionPoints.length === 2 && !isSelecting) {
      // Aggiungi un piccolo delay per permettere al rendering di completarsi
      setTimeout(() => {
        const newPoints = [...selectionPoints];
        calculateSegment(newPoints[0], newPoints[1]);
        setIsSelecting(false);
      }, 100); // Piccolo delay per assicurarsi che lo stato sia aggiornato
    }
  }, [isSelecting, selectionPoints, calculateSegment]);

  // Trova il punto più vicino nelle coordinate
  const findNearestPointIndex = (route: RoutePoint[], target: { lat: number; lng: number }): number => {
    let minDistance = Infinity;
    let nearestIndex = 0;
    
    route.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(point.lat - target.lat, 2) + Math.pow(point.lng - target.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    return nearestIndex;
  };

  // Calcola le prestazioni di un segmento
  const calculateSegmentPerformance = (points: RoutePoint[], activity: Activity): SegmentPerformance => {
    console.log(`🧮 Calculating performance for segment with ${points.length} points`);
    
    if (points.length < 2) {
      console.warn('⚠️ Insufficient points for segment calculation');
      return {
        distance: 0,
        duration: 0,
        avgSpeed: 0
      };
    }

    let totalDistance = 0;
    let speeds: number[] = [];
    let powers: number[] = [];
    let heartRates: number[] = [];
    let elevationGain = 0;
    let cadences: number[] = [];

    // Calcola il tempo totale dal primo all'ultimo punto
    const startTime = points[0].time;
    const endTime = points[points.length - 1].time;
    const totalDuration = endTime - startTime; // già in secondi

    console.log(`⏱️ Segment timing: start=${startTime}s, end=${endTime}s, duration=${totalDuration}s`);

    // Verifica che la durata sia ragionevole
    if (totalDuration < 0) {
      console.warn('⚠️ Negative duration detected, possibly wrong time order');
    }
    if (totalDuration > 7200) { // Più di 2 ore per un segmento
      console.warn('⚠️ Very long duration detected, check time data');
    }

    // Se abbiamo dati di distanza progressiva, usali
    if (points[0].distance !== undefined && points[points.length - 1].distance !== undefined) {
      totalDistance = points[points.length - 1].distance! - points[0].distance!;
      console.log(`📏 Using distance data: ${totalDistance}m`);
    } else {
      // Altrimenti calcola la distanza usando Haversine formula (più accurata)
      for (let i = 0; i < points.length - 1; i++) {
        const point1 = points[i];
        const point2 = points[i + 1];
        
        // Formula Haversine per calcolo distanza GPS
        const R = 6371000; // Raggio Terra in metri
        const φ1 = point1.lat * Math.PI / 180;
        const φ2 = point2.lat * Math.PI / 180;
        const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
        const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const distance = R * c;
        totalDistance += distance;
      }
      console.log(`📏 Calculated distance using GPS: ${totalDistance}m`);
    }

    // Raccogli dati per le medie da tutti i punti disponibili
    points.forEach((point, index) => {
      // Se abbiamo il campo speed, usalo direttamente
      if (point.speed !== undefined && !isNaN(point.speed) && point.speed > 0) {
        speeds.push(point.speed);
      }
      
      if (point.power !== undefined && !isNaN(point.power) && point.power >= 0) {
        powers.push(point.power);
      }
      
      if (point.heart_rate !== undefined && !isNaN(point.heart_rate) && point.heart_rate > 0) {
        heartRates.push(point.heart_rate);
      }
      
      if (point.cadence !== undefined && !isNaN(point.cadence) && point.cadence >= 0) {
        cadences.push(point.cadence);
      }
      
      // Calcola dislivello
      if (index > 0 && point.elevation !== undefined && points[index - 1].elevation !== undefined) {
        const elevDiff = point.elevation - points[index - 1].elevation!;
        if (elevDiff > 0) {
          elevationGain += elevDiff;
        }
      }
    });

    // Calcola velocità media: se non abbiamo dati di velocità diretti, calcoliamo dalla distanza e tempo
    let avgSpeed = 0;
    if (speeds.length > 0) {
      // Usa la media dei valori di velocità disponibili
      avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      console.log(`🏃 Using speed data: ${avgSpeed} km/h (from ${speeds.length} points)`);
    } else if (totalDuration > 0 && totalDistance > 0) {
      // Calcola dalla distanza e tempo totali
      avgSpeed = (totalDistance / 1000) / (totalDuration / 3600); // km/h
      console.log(`🏃 Calculated speed from distance/time: ${avgSpeed} km/h`);
    }

    const result: SegmentPerformance = {
      distance: totalDistance,
      duration: totalDuration,
      avgSpeed,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : undefined,
      avgPower: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : undefined,
      maxPower: powers.length > 0 ? Math.max(...powers) : undefined,
      avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
      maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
      elevationGain: elevationGain > 0 ? elevationGain : undefined,
      avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined
    };

    console.log('📊 Segment performance calculated:', {
      distance: `${(result.distance / 1000).toFixed(2)} km`,
      duration: `${result.duration}s`,
      avgSpeed: `${result.avgSpeed.toFixed(1)} km/h`,
      avgPower: result.avgPower ? `${Math.round(result.avgPower)} W` : 'N/A'
    });

    return result;
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controlli */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Seleziona Segmento sulla Mappa
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSelecting ? 
              `Clicca ${2 - selectionPoints.length} punto/i DIRETTAMENTE sulle tracce colorate per definire il segmento` :
              'Clicca "Inizia Selezione" e poi clicca due punti sulle tracce GPS colorate'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {!isSelecting ? (
            <Button onClick={startSelection} className="bg-blue-500 hover:bg-blue-600">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618V6.382a1 1 0 00-1.447-.894L15 7M9 7l-4.553-2.276A1 1 0 003 5.618v2.236a1 1 0 001.447.894L9 7zm0 0v6m6-6v6m6 3l-4.553 2.276A1 1 0 0121 17.618v2.236a1 1 0 00-1.447-.894L15 17M9 17l-4.553 2.276A1 1 0 003 18.382v-2.236a1 1 0 011.447-.894L9 17zm0 0v-6m6 6v-6" />
              </svg>
              Inizia Selezione
            </Button>
          ) : (
            <Button onClick={() => { setIsSelecting(false); setSelectionPoints([]); }} variant="outline">
              Annulla
            </Button>
          )}
        </div>
      </div>

      {/* Mappa */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <SegmentMapView 
          activities={routeData}
          onMapClick={handleMapClick}
          selectionPoints={selectionPoints}
          isSelecting={isSelecting}
          selectedSegment={selectedSegment}
        />
      </div>

      {/* Risultati Comparazione */}
      {selectedSegment && selectedSegment.activity1 && selectedSegment.activity2 && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>Confronto Segmenti Selezionati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={getGridClasses(2, 'md')}>
              <Card variant="glass">
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Confronto Performance
                  </h4>
                  <div className={`space-y-2 ${spacing.top.sm}`}>
                    {/* Attività 1 */}
                    <div className={`bg-blue-50 dark:bg-blue-900/20 ${spacing.all.md} rounded-lg`}>
                      <h4 className={`font-semibold text-gray-900 dark:text-white ${spacing.bottom.sm}`}>
                        {activities[0]?.title || 'Attività 1'}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Distanza</p>
                          <p className="font-semibold text-base">{(selectedSegment.activity1.performance.distance / 1000).toFixed(2)} km</p>
                        </div>
                        <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Tempo</p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">{formatDuration(selectedSegment.activity1.performance.duration)}</p>
                            {selectedSegment.activity1.performance.duration !== selectedSegment.activity2.performance.duration && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                selectedSegment.activity1.performance.duration < selectedSegment.activity2.performance.duration 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {selectedSegment.activity1.performance.duration < selectedSegment.activity2.performance.duration ? '-' : '+'}
                                {formatDuration(Math.abs(selectedSegment.activity1.performance.duration - selectedSegment.activity2.performance.duration))}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Vel. Media</p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">{selectedSegment.activity1.performance.avgSpeed.toFixed(1)} km/h</p>
                            {selectedSegment.activity1.performance.avgSpeed !== selectedSegment.activity2.performance.avgSpeed && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                selectedSegment.activity1.performance.avgSpeed > selectedSegment.activity2.performance.avgSpeed 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {selectedSegment.activity1.performance.avgSpeed > selectedSegment.activity2.performance.avgSpeed ? '+' : ''}
                                {(selectedSegment.activity1.performance.avgSpeed - selectedSegment.activity2.performance.avgSpeed).toFixed(1)}km/h
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedSegment.activity1.performance.avgPower && (
                          <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                            <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Pot. Media</p>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base">{Math.round(selectedSegment.activity1.performance.avgPower)} W</p>
                              {selectedSegment.activity2.performance.avgPower && selectedSegment.activity1.performance.avgPower !== selectedSegment.activity2.performance.avgPower && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  selectedSegment.activity1.performance.avgPower > selectedSegment.activity2.performance.avgPower 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {selectedSegment.activity1.performance.avgPower > selectedSegment.activity2.performance.avgPower ? '+' : ''}
                                  {Math.round(selectedSegment.activity1.performance.avgPower - selectedSegment.activity2.performance.avgPower)}W
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {selectedSegment.activity1.performance.avgCadence && (
                          <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                            <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Cadenza</p>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base">{Math.round(selectedSegment.activity1.performance.avgCadence)} rpm</p>
                              {selectedSegment.activity2.performance.avgCadence && Math.abs(selectedSegment.activity1.performance.avgCadence - selectedSegment.activity2.performance.avgCadence) > 0.1 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  selectedSegment.activity1.performance.avgCadence > selectedSegment.activity2.performance.avgCadence 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {selectedSegment.activity1.performance.avgCadence > selectedSegment.activity2.performance.avgCadence ? '+' : ''}
                                  {Math.round(selectedSegment.activity1.performance.avgCadence - selectedSegment.activity2.performance.avgCadence)}rpm
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attività 2 */}
                    <div className={`bg-green-50 dark:bg-green-900/20 ${spacing.all.md} rounded-lg`}>
                      <h4 className={`font-semibold text-gray-900 dark:text-white ${spacing.bottom.sm}`}>
                        {activities[1]?.title || 'Attività 2'}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Distanza</p>
                          <p className="font-semibold text-base">{(selectedSegment.activity2.performance.distance / 1000).toFixed(2)} km</p>
                        </div>
                        <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Tempo</p>
                          <p className="font-semibold text-base">{formatDuration(selectedSegment.activity2.performance.duration)}</p>
                        </div>
                        <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Vel. Media</p>
                          <p className="font-semibold text-base">{selectedSegment.activity2.performance.avgSpeed.toFixed(1)} km/h</p>
                        </div>
                        {selectedSegment.activity2.performance.avgPower && (
                          <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                            <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Pot. Media</p>
                            <p className="font-semibold text-base">{Math.round(selectedSegment.activity2.performance.avgPower)} W</p>
                          </div>
                        )}
                        {selectedSegment.activity2.performance.avgCadence && (
                          <div className={`bg-gray-50/50 dark:bg-gray-800/40 ${spacing.all.sm} rounded-lg`}>
                            <p className={`text-xs text-gray-500 dark:text-gray-400 ${spacing.bottom.xs}`}>Cadenza</p>
                            <p className="font-semibold text-base">{Math.round(selectedSegment.activity2.performance.avgCadence)} rpm</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 