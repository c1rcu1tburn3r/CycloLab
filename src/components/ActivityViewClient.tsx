'use client';

import React, { useState, useCallback, Suspense } from 'react';
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
  // const [brushedRange, setBrushedRange] = useState<{ startIndex: number; endIndex: number } | null>(null); // Commentato perché onBrush è rimosso

  // Rimuovi o commenta handleChartBrush poiché onBrush non viene più passato
  /*
  const handleChartBrush = useCallback((startIndex: number, endIndex: number) => {
    console.log(`[ActivityViewClient] Brush event: ${startIndex} - ${endIndex}`);
    setBrushedRange({ startIndex, endIndex });
  }, []);
  */

  const handleChartHover = useCallback((dataIndex: number | null) => {
    setHoveredDataIndex(dataIndex);
  }, []);

  const mapDisplayPoints = parsedRoutePoints;
  const chartDisplayPoints = parsedRoutePoints;
  
  const highlightedMapPoint = hoveredDataIndex !== null && hoveredDataIndex < parsedRoutePoints.length 
    ? parsedRoutePoints[hoveredDataIndex] 
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
        />
      </Suspense>

      {/* Grafico Altimetrico */}
      {chartDisplayPoints.length > 0 && (
        <ActivityElevationChart
          routePoints={chartDisplayPoints}
          onChartHover={handleChartHover}
          // onBrush={handleChartBrush} // Rimosso passaggio prop onBrush
        />
      )}
    </>
  );
};

export default ActivityViewClient; 