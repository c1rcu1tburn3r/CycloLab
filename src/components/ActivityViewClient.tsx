'use client';

import React, { useState, useCallback, Suspense, useMemo } from 'react';
import type { Activity, RoutePoint } from '@/lib/types';
import ActivityMap from '@/components/ActivityMap';
import NextDynamic from 'next/dynamic';

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

  const handleChartHover = useCallback((dataIndex: number | null) => {
    setHoveredDataIndex(dataIndex);
  }, []);

  const handleMapSegmentSelect = useCallback((selection: { startIndex: number; endIndex: number } | null) => {
    console.log("[ActivityViewClient] Map segment selected:", selection);
    setMapSelectedRouteIndices(selection);
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