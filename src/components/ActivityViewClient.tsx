'use client';

import React, { useState, useCallback, Suspense, useMemo, useEffect } from 'react';
import type { Activity, RoutePoint, SegmentMetrics } from '@/lib/types';
import ActivityMap from '@/components/ActivityMap';
import NextDynamic from 'next/dynamic';
import { analyzeActivitySegment } from '@/app/activities/segmentAnalysisActions';
import SegmentStats from '@/components/SegmentStats';

// Caricamento dinamico per ActivityElevationChart
const ActivityElevationChart = NextDynamic(
  () => import('@/components/ActivityElevationChart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white p-6 rounded-lg shadow-md h-[300px] flex items-center justify-center">
        <p className="text-gray-600">Caricamento grafico altimetrico...</p>
      </div>
    )
  }
);

interface ActivityViewClientProps {
  activityFull: Activity; // L'oggetto Activity completo
  parsedRoutePoints: RoutePoint[];
  // Dati specifici per la visualizzazione che erano passati direttamente dal Server Component
  // Questi potrebbero essere derivati da activityFull se preferibile, ma passarli direttamente
  // evita di doverli ricalcolare o riformattare nel client se già fatto nel server component.
  activityTitle: string;
  activityDate: string;
  athleteName?: string;
  distanceKm?: string;
  durationFormatted?: string;
  elevationGain?: string;
  avgSpeed?: string;
  description?: string | null;
  avgPower?: string;
  normalizedPower?: string;
  avgHeartRate?: string;
  maxHeartRate?: string;
  avgCadence?: string;
  downloadUrl?: string | null;
}

const ActivityViewClient: React.FC<ActivityViewClientProps> = ({
  activityFull,
  parsedRoutePoints,
  // Le altre props non le useremo direttamente qui, ma sono definite per completezza
  // se dovessimo spostare più logica di rendering qui.
  // Per ora, ActivityMap riceverà activityFull.
}) => {
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);
  const [mapSelectedRouteIndices, setMapSelectedRouteIndices] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Stato per le metriche del segmento
  const [segmentMetrics, setSegmentMetrics] = useState<SegmentMetrics | null>(null);
  const [isSegmentMetricsLoading, setIsSegmentMetricsLoading] = useState<boolean>(false);
  const [segmentMetricsError, setSegmentMetricsError] = useState<string | null>(null);

  const handleChartHover = useCallback((dataIndex: number | null) => {
    setHoveredDataIndex(dataIndex);
  }, []);

  const handleMapSegmentSelect = useCallback((selection: { startIndex: number; endIndex: number } | null) => {
    // console.log("[ActivityViewClient] Map segment selected:", selection);
    setMapSelectedRouteIndices(selection);
    // La logica di fetch è ora nell'useEffect che dipende da mapSelectedRouteIndices e chartDisplayPoints
  }, []);

  const mapDisplayPoints = parsedRoutePoints;
  
  const chartDisplayPoints = useMemo(() => {
    if (mapSelectedRouteIndices) {
      // Assicurati che gli indici siano validi e nell'ordine corretto
      const start = Math.max(0, mapSelectedRouteIndices.startIndex);
      const end = Math.min(parsedRoutePoints.length - 1, mapSelectedRouteIndices.endIndex);
      if (start <= end) {
        return parsedRoutePoints.slice(start, end + 1);
      }
    }
    return parsedRoutePoints; // Ritorna tutti i punti se non c'è selezione o se gli indici non sono validi
  }, [parsedRoutePoints, mapSelectedRouteIndices]);
  
  // Effetto per calcolare le statistiche del segmento quando chartDisplayPoints cambia
  // (e quindi quando mapSelectedRouteIndices cambia e produce un segmento valido)
  useEffect(() => {
    if (mapSelectedRouteIndices && chartDisplayPoints && chartDisplayPoints.length >= 2) {
      // Solo se c'è una selezione mappa E il segmento risultante ha almeno 2 punti
      const fetchSegmentStats = async () => {
        setIsSegmentMetricsLoading(true);
        setSegmentMetricsError(null);
        setSegmentMetrics(null); // Pulisci le metriche precedenti
        try {
          // console.log(`[ActivityViewClient] Calling analyzeActivitySegment for ${chartDisplayPoints.length} points.`);
          // Nota: activityFull.athlete_id potrebbe essere null se non espanso,
          // dovrai assicurarti che sia disponibile o gestire il caso.
          // Per ora, la server action non usa athleteId.
          const result = await analyzeActivitySegment(chartDisplayPoints, activityFull.user_id); // Passa activityFull.user_id
          if (result.data) {
            setSegmentMetrics(result.data);
          } else if (result.error) {
            console.error("Error from analyzeActivitySegment:", result.error);
            setSegmentMetricsError(result.error);
          }
        } catch (error: any) {
          console.error("Client-side error calling analyzeActivitySegment:", error);
          setSegmentMetricsError(error.message || 'Errore imprevisto nell\'analisi del segmento.');
        } finally {
          setIsSegmentMetricsLoading(false);
        }
      };
      fetchSegmentStats();
    } else {
      // Se non c'è selezione valida, resetta le statistiche
      setSegmentMetrics(null);
      setIsSegmentMetricsLoading(false);
      setSegmentMetricsError(null);
    }
    // Aggiunto activityFull.user_id alle dipendenze se/quando lo useremo
  }, [mapSelectedRouteIndices, chartDisplayPoints, activityFull.user_id]);

  const highlightedMapPoint = hoveredDataIndex !== null && chartDisplayPoints && hoveredDataIndex < chartDisplayPoints.length 
    ? chartDisplayPoints[hoveredDataIndex] 
    : null;

  return (
    <>
      {/* Mappa del percorso - Suspense è già gestito nella pagina padre per ActivityMap se caricato dinamicamente lì */}
      {/* ActivityMap riceve l'activity completa e i punti specifici per il rendering */}
      <Suspense fallback={
        <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center">
          <p className="text-gray-600">Caricamento mappa...</p>
        </div>
      }>
        <ActivityMap
          activity={activityFull} 
          routePoints={mapDisplayPoints}
          highlightedPoint={highlightedMapPoint}
          onSegmentSelect={handleMapSegmentSelect}
        />
      </Suspense>

      {/* Box Statistiche Segmento */}
      <SegmentStats 
        metrics={segmentMetrics}
        isLoading={isSegmentMetricsLoading}
        error={segmentMetricsError}
      />

      {/* Grafico Altimetrico */}
      {chartDisplayPoints && chartDisplayPoints.length > 0 ? (
        <ActivityElevationChart
          routePoints={chartDisplayPoints}
          onChartHover={handleChartHover}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md h-[300px] flex items-center justify-center">
          <p className="text-gray-600">
            {mapSelectedRouteIndices ? "Nessun dato nel segmento selezionato per il grafico." : "Caricamento o dati non disponibili per il grafico."}
          </p>
        </div>
      )}
    </>
  );
};

export default ActivityViewClient; 