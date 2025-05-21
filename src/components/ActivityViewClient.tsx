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
  const [selectedSegment, setSelectedSegment] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Stato per le metriche del segmento
  const [segmentMetrics, setSegmentMetrics] = useState<SegmentMetrics | null>(null);
  const [isSegmentMetricsLoading, setIsSegmentMetricsLoading] = useState<boolean>(false);
  const [segmentMetricsError, setSegmentMetricsError] = useState<string | null>(null);
  const [segmentMetricsWarning, setSegmentMetricsWarning] = useState<string | null>(null);

  const handleChartHover = useCallback((dataIndex: number | null) => {
    setHoveredDataIndex(dataIndex);
  }, []);

  // Funzione unificata per la gestione della selezione di segmenti
  // sia dalla mappa che dal grafico
  const handleSegmentSelect = useCallback((selection: { startIndex: number; endIndex: number } | null) => {
    setSelectedSegment(selection);
  }, []);

  // Funzione per resettare la selezione del segmento
  const resetSelection = useCallback(() => {
    setSelectedSegment(null);
  }, []);
  
  // Variabile per i punti da visualizzare sulla mappa (sempre tutti)
  const mapDisplayPoints = parsedRoutePoints;
  
  // I punti da visualizzare sul grafico dipendono dalla selezione
  const chartDisplayPoints = useMemo(() => {
    if (selectedSegment) {
      // Assicurati che gli indici siano validi e nell'ordine corretto
      const start = Math.max(0, selectedSegment.startIndex);
      const end = Math.min(parsedRoutePoints.length - 1, selectedSegment.endIndex);
      if (start <= end) {
        return parsedRoutePoints.slice(start, end + 1);
      }
    }
    return parsedRoutePoints; // Ritorna tutti i punti se non c'è selezione o se gli indici non sono validi
  }, [parsedRoutePoints, selectedSegment]);
  
  // Effetto per calcolare le statistiche del segmento quando la selezione cambia
  useEffect(() => {
    // Prende l'ID dell'atleta dall'oggetto activityFull.
    const targetAthleteIdForProfile = activityFull.athlete_id;
    const coachUserId = activityFull.user_id; // Questo è l'ID del coach loggato

    // Log per debug
    console.log("[ActivityViewClient] Debug IDs:", {
      targetAthleteIdForProfile,
      coachUserId,
      hasSelectedSegment: !!selectedSegment,
      chartPointsLength: chartDisplayPoints?.length || 0
    });

    if (selectedSegment && chartDisplayPoints && chartDisplayPoints.length >= 2) {
      const fetchSegmentStats = async () => {
        setIsSegmentMetricsLoading(true);
        setSegmentMetricsError(null);
        setSegmentMetrics(null);
        setSegmentMetricsWarning(null);
        try {
          const firstPointTimestamp = chartDisplayPoints[0]?.timestamp;
          let activityDateISO: string | undefined = undefined;
          if (firstPointTimestamp) {
            activityDateISO = new Date(firstPointTimestamp * 1000).toISOString();
          } else {
            console.warn("[ActivityViewClient] Timestamp mancante nel primo punto. Utilizzo della data dell'attività.");
            // Fallback alla data dell'attività se disponibile
            if (activityFull.activity_date) {
              activityDateISO = new Date(activityFull.activity_date).toISOString();
            }
          }

          // Verifica di sicurezza per i parametri necessari
          if (!targetAthleteIdForProfile) {
            console.warn("[ActivityViewClient] athlete_id non trovato in activityFull. Impossibile recuperare il profilo atleta.");
            setSegmentMetricsError("ID atleta mancante per recuperare il profilo.");
            setIsSegmentMetricsLoading(false);
            return;
          }

          if (!activityDateISO) {
            console.warn("[ActivityViewClient] Data attività mancante. Impossibile recuperare il profilo atleta.");
            setSegmentMetricsError("Data attività mancante per recuperare il profilo.");
            setIsSegmentMetricsLoading(false);
            return;
          }

          // Tutto ok, procedi con l'analisi
          const result = await analyzeActivitySegment(
            chartDisplayPoints, 
            coachUserId, 
            activityDateISO, 
            targetAthleteIdForProfile
          );
          
          if (result.data) {
            setSegmentMetrics(result.data);
            // Gestisci il warning se presente
            if (result.warning) {
              console.warn("Warning from analyzeActivitySegment:", result.warning);
              setSegmentMetricsWarning(result.warning);
            } else {
              setSegmentMetricsWarning(null);
            }
          } else if (result.error) {
            console.error("Error from analyzeActivitySegment:", result.error);
            setSegmentMetricsError(result.error);
            setSegmentMetricsWarning(null);
          }
        } catch (error: any) {
          console.error("Client-side error calling analyzeActivitySegment:", error);
          setSegmentMetricsError(error.message || 'Errore imprevisto nell\'analisi del segmento.');
          setSegmentMetricsWarning(null);
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
      setSegmentMetricsWarning(null);
    }
  }, [selectedSegment, chartDisplayPoints, activityFull.user_id, activityFull.athlete_id, activityFull.activity_date]);

  const highlightedMapPoint = hoveredDataIndex !== null && chartDisplayPoints && hoveredDataIndex < chartDisplayPoints.length 
    ? chartDisplayPoints[hoveredDataIndex] 
    : null;

  return (
    <div className="relative">
      {/* Mappa del percorso */}
      <Suspense fallback={
        <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center">
          <p className="text-gray-600">Caricamento mappa...</p>
        </div>
      }>
        <ActivityMap
          activity={activityFull} 
          routePoints={mapDisplayPoints}
          highlightedPoint={highlightedMapPoint}
          onSegmentSelect={handleSegmentSelect}
          selectedSegment={selectedSegment}
        />
      </Suspense>

      {/* Grafico Altimetrico - spostato qui sopra per essere più vicino alla mappa */}
      {chartDisplayPoints && chartDisplayPoints.length > 0 ? (
        <ActivityElevationChart
          routePoints={chartDisplayPoints}
          onChartHover={handleChartHover}
          selectedSegment={selectedSegment}
          onSegmentSelect={handleSegmentSelect}
          isSegmentActive={chartDisplayPoints.length !== parsedRoutePoints.length}
          originalStartIndex={selectedSegment ? selectedSegment.startIndex : 0}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md h-[300px] flex items-center justify-center">
          <p className="text-gray-600">
            {selectedSegment ? "Nessun dato nel segmento selezionato per il grafico." : "Caricamento o dati non disponibili per il grafico."}
          </p>
        </div>
      )}

      {/* Box Statistiche Segmento - spostato sotto il grafico */}
      <SegmentStats 
        metrics={segmentMetrics}
        isLoading={isSegmentMetricsLoading}
        error={segmentMetricsError}
        warning={segmentMetricsWarning}
      />
    </div>
  );
};

export default ActivityViewClient; 