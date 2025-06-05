'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Activity, RoutePoint } from '@/lib/types';
import { spacing } from '@/lib/design-system';
import { useCycloLabToast } from '@/hooks/use-cyclolab-toast';
// import L from 'leaflet'; // Rimosso import globale di L
// import NextDynamic from 'next/dynamic'; // Rimosso import non utilizzato

// Le definizioni delle icone verranno spostate e create dinamicamente nel client
/*
const startIcon = new L.Icon({ ... });
const endIcon = new L.Icon({ ... });
const hoverIcon = new L.DivIcon({ ... });
*/

// Caricamento dinamico dei componenti di Leaflet per evitare errori SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
/* Rimosso import dinamico per LayersControl, sarà gestito tramite stato
const LayersControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.LayersControl),
  { ssr: false }
);
*/
/* Rimosso import non utilizzato
const WMSTileLayer = dynamic( // Potrebbe non essere necessario, ma lo includo se serve per alcuni tile layer
  () => import('react-leaflet').then((mod) => mod.WMSTileLayer),
  { ssr: false }
);
*/

// Importa il nuovo componente HoverMarker dinamicamente
const DynamicHoverMarker = dynamic(() => import('./HoverMarker'), { 
  ssr: false, 
  loading: () => null 
});

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_CENTER = { lat: 45.464664, lng: 9.188540 }; // Milano come fallback

// =====================================================
// ACTIVITY MAP COMPONENT
// =====================================================

interface ActivityMapProps {
  activity: Activity;
  routePoints: RoutePoint[];
  highlightedPoint?: RoutePoint | null;
  onSegmentSelect?: (selection: { startIndex: number; endIndex: number } | null) => void;
  selectedSegment?: { startIndex: number; endIndex: number } | null;
}

// RIMOZIONE DELLA SEZIONE 'declare global' POICHE' @types/leaflet DOVREBBE FORNIRE I TIPI
/*
declare global {
  namespace L {
    interface IconOptions {
      iconUrl: string;
      iconRetinaUrl?: string;
      iconSize?: [number, number];
      iconAnchor?: [number, number];
      popupAnchor?: [number, number];
      shadowUrl?: string;
      shadowRetinaUrl?: string;
      shadowSize?: [number, number];
      shadowAnchor?: [number, number];
      className?: string;
    }
    class Icon {
      constructor(options: IconOptions);
    }
    interface DivIconOptions {
      html: string | HTMLElement;
      className?: string;
      iconSize?: [number, number];
      iconAnchor?: [number, number];
      popupAnchor?: [number, number];
      bgPos?: [number, number];
    }
    class DivIcon {
      constructor(options: DivIconOptions);
    }
  }
}
*/

const ActivityMap: React.FC<ActivityMapProps> = ({ activity, routePoints, highlightedPoint, onSegmentSelect, selectedSegment }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const [reactLeafletModule, setReactLeafletModule] = useState<typeof import('react-leaflet') | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileLoadError, setTileLoadError] = useState<boolean>(false);
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(false);
  
  // Refs per cleanup
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const eventListenersRef = useRef<Array<() => void>>([]);

  // Stato per la selezione del segmento
  const [selectionStartIdx, setSelectionStartIdx] = useState<number | null>(null);
  const [selectionEndIdx, setSelectionEndIdx] = useState<number | null>(null);
  const [selectingEndPoint, setSelectingEndPoint] = useState<boolean>(false);

  // Ref per i marker di selezione
  const startSelectionMarkerRef = useRef<L.Marker | null>(null);
  const endSelectionMarkerRef = useRef<L.Marker | null>(null);

  const { showInfo } = useCycloLabToast();

  // Cleanup function per rimuovere event listeners e layer
  const cleanup = () => {
    // Rimuovi tutti gli event listeners registrati
    eventListenersRef.current.forEach(removeListener => {
      try {
        removeListener();
      } catch (error) {
        console.warn('Errore durante la rimozione di event listener:', error);
      }
    });
    eventListenersRef.current = [];

    // Cleanup marker refs
    if (startSelectionMarkerRef.current) {
      try {
        startSelectionMarkerRef.current.remove();
      } catch (error) {
        console.warn('Errore durante la rimozione del marker di inizio:', error);
      }
      startSelectionMarkerRef.current = null;
    }

    if (endSelectionMarkerRef.current) {
      try {
        endSelectionMarkerRef.current.remove();
      } catch (error) {
        console.warn('Errore durante la rimozione del marker di fine:', error);
      }
      endSelectionMarkerRef.current = null;
    }

    // Cleanup tile layer
    if (tileLayerRef.current) {
      try {
        tileLayerRef.current.remove();
      } catch (error) {
        console.warn('Errore durante la rimozione del tile layer:', error);
      }
      tileLayerRef.current = null;
    }

    // Cleanup mappa
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn('Errore durante la rimozione della mappa:', error);
      }
      mapRef.current = null;
    }
  };

  // Gestione connessione lenta
  useEffect(() => {
    const slowConnectionTimer = setTimeout(() => {
      if (!isMounted) {
        setIsSlowConnection(true);
      }
    }, 5000); // Se non carica entro 5 secondi, considera connessione lenta

    return () => clearTimeout(slowConnectionTimer);
  }, [isMounted]);

  useEffect(() => {
    setIsMounted(true);
    
    // Carica CSS di Leaflet con gestione errori
    import('leaflet/dist/leaflet.css').catch(error => {
      console.warn('Impossibile caricare CSS di Leaflet:', error);
      setMapError('Errore nel caricamento degli stili della mappa');
    });
    
    // Carica Leaflet con gestione errori
    import('leaflet').then(LModule => {
      setLeaflet(LModule);
      setMapError(null);
    }).catch(error => {
      console.error('Errore nel caricamento di Leaflet:', error);
      setMapError('Impossibile caricare la libreria delle mappe');
    });

    // Carica react-leaflet con gestione errori
    import('react-leaflet').then(mod => {
      setReactLeafletModule(mod);
    }).catch(error => {
      console.error('Errore nel caricamento di react-leaflet:', error);
      setMapError('Errore nel caricamento dei componenti mappa');
    });

    // Cleanup al dismount del componente
    return cleanup;
  }, []);

  // Gestione errori tile loading
  const handleTileLoadError = (error: any) => {
    console.warn('Errore nel caricamento dei tile:', error);
    setTileLoadError(true);
    
    // Riprova dopo 3 secondi
    setTimeout(() => {
      setTileLoadError(false);
    }, 3000);
  };

  // Fallback per connessioni lente o errori
  const renderFallback = () => {
    if (mapError) {
      return (
        <div className={`${spacing.all.lg} rounded-xl shadow-md h-[350px] flex flex-col items-center justify-center`}>
          <svg className={`w-12 h-12 text-red-500 ${spacing.bottom.md}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className={`text-red-600 dark:text-red-400 text-center ${spacing.bottom.sm}`}>Errore nel caricamento della mappa</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">{mapError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className={`${spacing.top.md} ${spacing.horizontal.md} py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors`}
          >
            Ricarica pagina
          </button>
        </div>
      );
    }

    if (isSlowConnection) {
      return (
        <div className={`${spacing.all.lg} rounded-xl shadow-md h-[350px] flex flex-col items-center justify-center`}>
          <svg className={`w-12 h-12 text-yellow-500 ${spacing.bottom.md}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`text-yellow-600 dark:text-yellow-400 text-center ${spacing.bottom.sm}`}>Connessione lenta rilevata</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">La mappa potrebbe richiedere più tempo per caricare</p>
          <div className="mt-4 flex space-x-2">
            <button 
              onClick={() => setIsSlowConnection(false)} 
              className={`${spacing.horizontal.md} py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors`}
            >
              Continua ad attendere
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className={`${spacing.horizontal.md} py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors`}
            >
              Ricarica
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`${spacing.all.lg} rounded-xl shadow-md h-[350px] flex items-center justify-center`}>
        <div className="flex flex-col items-center">
          <svg className={`animate-spin h-8 w-8 text-blue-600 ${spacing.bottom.md}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Caricamento mappa...</p>
        </div>
      </div>
    );
  };

  // Sincronizza lo stato locale con la prop selectedSegment
  useEffect(() => {
    // Se riceviamo selectedSegment dalle props, aggiorniamo lo stato locale
    if (selectedSegment) {
      setSelectionStartIdx(selectedSegment.startIndex);
      setSelectionEndIdx(selectedSegment.endIndex);
      setSelectingEndPoint(false);
      
      // Centriamo la mappa sul segmento selezionato
      if (reactLeafletModule && routePoints && routePoints.length > 0) {
        try {
          const startPoint = routePoints[selectedSegment.startIndex];
          const endPoint = routePoints[selectedSegment.endIndex];
          
          if (startPoint && endPoint && startPoint.lat && startPoint.lng && endPoint.lat && endPoint.lng) {
            // Calcola il centro e il bounds per zoommare sul segmento
            const minLat = Math.min(startPoint.lat, endPoint.lat);
            const maxLat = Math.max(startPoint.lat, endPoint.lat);
            const minLng = Math.min(startPoint.lng, endPoint.lng);
            const maxLng = Math.max(startPoint.lng, endPoint.lng);
            
            // Aggiungi un po' di padding
            const latPadding = (maxLat - minLat) * 0.2;
            const lngPadding = (maxLng - minLng) * 0.2;
            
            // Crea un bounds con tutti i punti del segmento
            const bounds = [];
            for (let i = selectedSegment.startIndex; i <= selectedSegment.endIndex; i++) {
              const point = routePoints[i];
              if (point && point.lat && point.lng) {
                bounds.push([point.lat, point.lng]);
              }
            }
            
            // Aggiorniamo lo stato per innescare un re-render della mappa
            // con i nuovi bounds calcolati
            if (bounds.length > 0) {
              // Non facciamo nulla qui, il cambio di selectionStartIdx e selectionEndIdx
              // già innescherà un re-render con la visualizzazione corretta
            }
          }
        } catch (error) {
          console.error("Errore nel centrare la mappa sul segmento:", error);
        }
      }
    } 
    // Non resettiamo quando selectedSegment è null perché potrebbe essere in corso una selezione sulla mappa
  }, [selectedSegment, routePoints, reactLeafletModule]);

  const { startIcon, endIcon } = useMemo(() => {
    if (!leaflet) {
      // console.log('[ActivityMap] Leaflet (L) not available for icon creation.'); // Rimosso Log
      return { startIcon: undefined, endIcon: undefined };
    }
    try {
      const sIcon = new leaflet.Icon({
        iconUrl: '/marker-icon-green.png', 
        iconRetinaUrl: '/marker-icon-green-2x.png',
        shadowUrl: '/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      const eIcon = new leaflet.Icon({
        iconUrl: '/marker-icon-red.png',
        iconRetinaUrl: '/marker-icon-red-2x.png',
        shadowUrl: '/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      // console.log('[ActivityMap] Icons created:', { sIcon, eIcon }); // Rimosso Log
      return { startIcon: sIcon, endIcon: eIcon };
    } catch (error) {
      console.error('[ActivityMap] Error creating icons:', error); // Lascio questo error log, può essere utile
      return { startIcon: undefined, endIcon: undefined };
    }
  }, [leaflet]);

  const hasStartCoordinates = Boolean(activity.start_lat && activity.start_lon);
  const hasRoutePoints = routePoints && routePoints.length > 0;
  
  // Rimosso blocco di log [ActivityMap] Pre-render state

  const { mapCenter, zoomLevel } = useMemo(() => {
    let center = DEFAULT_CENTER;
    let zoom = 13;

    // Se c'è una selezione attiva, centra la mappa su quel segmento
    if (selectionStartIdx !== null && selectionEndIdx !== null && routePoints.length > 0) {
      const selectedPoints = routePoints.slice(Math.min(selectionStartIdx, selectionEndIdx), Math.max(selectionStartIdx, selectionEndIdx) + 1);
      if (selectedPoints.length > 0) {
        const lats = selectedPoints.map(p => p.lat);
        const lngs = selectedPoints.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        center = {
          lat: (minLat + maxLat) / 2,
          lng: (minLng + maxLng) / 2
        };
        
        const latDiff = maxLat - minLat;
        const lngDiff = maxLng - minLng;
        const maxDiff = Math.max(latDiff, lngDiff);

        if (maxDiff === 0) { zoom = 16; } // Zoom maggiore se i punti sono coincidenti o molto vicini
        else if (maxDiff < 0.002) zoom = 17;
        else if (maxDiff < 0.005) zoom = 16;
        else if (maxDiff < 0.01) zoom = 15;
        else if (maxDiff < 0.02) zoom = 14;
        else if (maxDiff < 0.05) zoom = 13;
        else if (maxDiff < 0.1) zoom = 12;
        else if (maxDiff < 0.2) zoom = 11;
        else if (maxDiff < 0.4) zoom = 10;
        else if (maxDiff < 0.8) zoom = 9;
        else zoom = 8;
      }
    } else if (hasRoutePoints) {
      const lats = routePoints.map(p => p.lat);
      const lngs = routePoints.map(p => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      center = {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      };
      
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      if (maxDiff === 0) { zoom = 15; }
      else if (maxDiff < 0.005) zoom = 16;
      else if (maxDiff < 0.01) zoom = 15;
      else if (maxDiff < 0.02) zoom = 14;
      else if (maxDiff < 0.05) zoom = 13;
      else if (maxDiff < 0.1) zoom = 12;
      else if (maxDiff < 0.2) zoom = 11;
      else if (maxDiff < 0.4) zoom = 10;
      else if (maxDiff < 0.8) zoom = 9;
      else zoom = 8;
    } else if (hasStartCoordinates && activity.start_lat && activity.start_lon) {
      center = { lat: activity.start_lat, lng: activity.start_lon };
      zoom = 14;
    }
    return { mapCenter: center, zoomLevel: zoom };
  }, [routePoints, activity.start_lat, activity.start_lon, hasRoutePoints, hasStartCoordinates, selectionStartIdx, selectionEndIdx]);
    
  const findClosestPointIndex = (latlng: L.LatLng): number | null => {
    if (!routePoints || routePoints.length === 0) return null;

    let closestIndex = -1;
    let minDistanceSq = Infinity;

    routePoints.forEach((point, index) => {
      const distSq = (point.lat - latlng.lat) ** 2 + (point.lng - latlng.lng) ** 2;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestIndex = index;
      }
    });
    return closestIndex !== -1 ? closestIndex : null;
  };

  const handlePolylineClick = (event: L.LeafletMouseEvent) => {
    if (!leaflet) return;

    const clickedLatLng = event.latlng;
    const closestIndex = findClosestPointIndex(clickedLatLng);

    if (closestIndex === null) return;

    if (!selectingEndPoint) {
      // Primo click: imposta l'inizio della selezione
      setSelectionStartIdx(closestIndex);
      setSelectionEndIdx(null); // Resetta la fine precedente
      setSelectingEndPoint(true);
      if (onSegmentSelect) onSegmentSelect(null);
      // console.log(`[Map] Selection started at index: ${closestIndex}`);
    } else {
      // Secondo click: imposta la fine della selezione
      let start = selectionStartIdx!;
      let end = closestIndex;

      if (end < start) {
        // Se l'utente clicca prima per la fine, scambia gli indici
        [start, end] = [end, start];
      }
      setSelectionEndIdx(end);
      setSelectingEndPoint(false);
      if (onSegmentSelect) onSegmentSelect({ startIndex: start, endIndex: end });
      // console.log(`[Map] Selection ended. Start: ${start}, End: ${end}`);
    }
  };

  const resetSelection = () => {
    setSelectionStartIdx(null);
    setSelectionEndIdx(null);
    setSelectingEndPoint(false);
    if (onSegmentSelect) {
      onSegmentSelect(null);
    }
    // console.log("[Map] Selection Reset");
  };

  // Icone per i marker di selezione (semplici cerchi per ora)
  const selectionMarkerIcon = useMemo(() => {
    if (!leaflet) return undefined;
    return new leaflet.DivIcon({
      html: `<div style="background-color: yellow; width: 12px; height: 12px; border-radius: 50%; border: 2px solid black;"></div>`,
      className: 'selection-marker-icon',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }, [leaflet]);

  // Modificato il controllo per attendere che leaflet e le icone siano caricate
  if (!isMounted || !leaflet || !startIcon || !endIcon) {
    // console.log('[ActivityMap] Rendering loading state due to: !isMounted || !leaflet || !startIcon || !endIcon'); // Rimosso Log
    return renderFallback();
  }

  if (!hasStartCoordinates && !hasRoutePoints) {
    // console.log('[ActivityMap] Rendering no GPS data state.'); // Rimosso Log
    return (
      <div className={`${spacing.all.lg} rounded-xl shadow-md`}>
        <h2 className={`text-xl font-semibold ${spacing.bottom.md} text-slate-800 dark:text-slate-200`}>Percorso</h2>
        <div className="h-[350px] rounded-xl flex items-center justify-center bg-slate-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <div className={`w-16 h-16 mx-auto ${spacing.bottom.md} bg-slate-100 dark:bg-gray-600 rounded-full flex items-center justify-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400 dark:text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
            </svg>
          </div>
          <h3 className={`text-lg font-medium text-slate-700 dark:text-slate-200 ${spacing.bottom.sm}`}>Coordinate GPS non disponibili</h3>
          <p className="text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
            Le coordinate GPS non sono presenti nel file FIT di questa attività. 
            Prova a caricare un file con dati GPS validi per visualizzare il percorso sulla mappa.
          </p>
        </div>
      </div>
    );
  }

  const handleDownloadGPX = () => {
    showInfo(
      'Funzione in sviluppo', 
      'Il download GPX sarà disponibile nelle prossime versioni. Per ora puoi scaricare i dati dalle impostazioni dell\'atleta.'
    );
  };

  return (
    <div className={`${spacing.all.lg} rounded-xl shadow-md`}>
      <h2 className={`text-xl font-semibold ${spacing.bottom.md} text-slate-800 dark:text-slate-200 flex items-center`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
        Percorso
      </h2>
      {/* Contenitore per mappa e controlli sovrapposti */}
      <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 relative">
        {/* Istruzione migliorata su come selezionare un tratto - mostrata solo se non c'è una selezione attiva */}
        {(selectionStartIdx === null && routePoints && routePoints.length > 0) && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 px-3 py-1.5 rounded-b-md shadow-md text-sm font-medium text-slate-700 dark:text-slate-200 border border-t-0 border-slate-200 dark:border-gray-600">
            Clicca due punti sulla traccia per analizzare un segmento
          </div>
        )}
        
        {/* Pulsante di reset migliorato */}
        {(selectionStartIdx !== null || selectionEndIdx !== null) && (
          <button 
            onClick={resetSelection}
            className={`absolute bottom-3 left-3 z-[1000] px-2.5 py-1 bg-red-600/80 text-white text-xs rounded hover:bg-red-700/80 shadow-sm flex items-center gap-1`}
            title="Azzera selezione"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Reset
          </button>
        )}

        <MapContainer 
          key={`${mapCenter.lat}-${mapCenter.lng}-${zoomLevel}`}
          center={[mapCenter.lat, mapCenter.lng]} 
          zoom={zoomLevel} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          ref={(mapInstance) => {
            if (mapInstance) {
              mapRef.current = mapInstance;
              
              // Registra event listeners per cleanup
              const onMapClick = (e: L.LeafletMouseEvent) => handlePolylineClick(e);
              mapInstance.on('click', onMapClick);
              
              const removeMapClickListener = () => {
                mapInstance.off('click', onMapClick);
              };
              eventListenersRef.current.push(removeMapClickListener);
            }
          }}
        >
          {/* Banner errori tile */}
          {tileLoadError && (
            <div className="absolute top-2 left-2 right-2 z-[1000] bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Alcuni tile della mappa potrebbero non caricarsi correttamente. Prova a cambiare layer o ricarica la pagina.
                </span>
              </div>
            </div>
          )}
          
          {/* Uso di un cast per LayersControl per accedere a BaseLayer */}
          {(isMounted && leaflet && reactLeafletModule && MapContainer && TileLayer) ? (() => {
            const ActualLayersControl = reactLeafletModule.LayersControl;
            // TileLayer è quello importato dinamicamente all'inizio del file

            if (!ActualLayersControl || !ActualLayersControl.BaseLayer) {
              console.error('[Map] ActualLayersControl or ActualLayersControl.BaseLayer is not available from reactLeafletModule.');
              return null; 
            }
            
            return (
              <ActualLayersControl position="topright">
                <ActualLayersControl.BaseLayer checked name="Stradale">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    eventHandlers={{
                      tileerror: handleTileLoadError,
                      tileloadstart: () => setTileLoadError(false)
                    }}
                    errorTileUrl="/map-error-tile.png" // Tile di fallback per errori
                  />
                </ActualLayersControl.BaseLayer>
                <ActualLayersControl.BaseLayer name="Satellitare">
                  <TileLayer
                    attribution='&copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    eventHandlers={{
                      tileerror: handleTileLoadError,
                      tileloadstart: () => setTileLoadError(false)
                    }}
                    errorTileUrl="/map-error-tile.png"
                  />
                </ActualLayersControl.BaseLayer>
                <ActualLayersControl.BaseLayer name="Topografica">
                  <TileLayer
                    attribution='&copy; OpenTopoMap'
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    eventHandlers={{
                      tileerror: handleTileLoadError,
                      tileloadstart: () => setTileLoadError(false)
                    }}
                    errorTileUrl="/map-error-tile.png"
                  />
                </ActualLayersControl.BaseLayer>
              </ActualLayersControl>
            );
          })() : (() => null)()}
          
          {hasRoutePoints && (
            <>
              {/* Calcola i segmenti della polyline in base alla selezione */}
              {(() => {
                const allLatLngs = routePoints.map(point => [point.lat, point.lng] as [number, number]);
                let segments: JSX.Element[] = [];

                const defaultPathOptions = { color: '#0055ff', weight: 4, opacity: 0.7 };
                const selectedPathOptions = { 
                  color: '#ff4500', 
                  weight: 5, 
                  opacity: 0.85,
                  dashArray: undefined, // Rimuove il pattern tratteggiato se presente
                  lineCap: 'round' as L.LineCapShape, // Arrotonda i finali delle linee con tipizzazione corretta
                  lineJoin: 'round' as L.LineJoinShape // Arrotonda le giunzioni con tipizzazione corretta
                }; // Arancione per la selezione

                if (selectionStartIdx !== null && selectionEndIdx !== null) {
                  const sIdx = Math.min(selectionStartIdx, selectionEndIdx);
                  const eIdx = Math.max(selectionStartIdx, selectionEndIdx);

                  // 1. Segmento prima della selezione
                  if (sIdx > 0) {
                    segments.push(<Polyline key="pre-selection" positions={allLatLngs.slice(0, sIdx + 1)} pathOptions={defaultPathOptions} />);
                  }
                  // 2. Segmento selezionato
                  segments.push(<Polyline key="selection" positions={allLatLngs.slice(sIdx, eIdx + 1)} pathOptions={selectedPathOptions} eventHandlers={{ click: handlePolylineClick }} />); 
                  // 3. Segmento dopo la selezione
                  if (eIdx < allLatLngs.length - 1) {
                    segments.push(<Polyline key="post-selection" positions={allLatLngs.slice(eIdx, allLatLngs.length)} pathOptions={defaultPathOptions} />);
                  }
                } else {
                  // Nessuna selezione, o selezione in corso (solo startIdx impostato)
                  // Renderizza l'intera polyline, ma permetti il click per iniziare la selezione
                  segments.push(<Polyline key="full" positions={allLatLngs} pathOptions={defaultPathOptions} eventHandlers={{ click: handlePolylineClick }} />);
                }
                return segments;
              })()}

              {/* Marker di Inizio e Fine Percorso (originali) */}
              {startIcon && routePoints[0] && (
                 <Marker 
                    position={[routePoints[0].lat, routePoints[0].lng]}
                    icon={startIcon}
                  >
                    <Popup>Partenza</Popup>
                  </Marker>
              )}
             
              {endIcon && routePoints.length > 1 && routePoints[routePoints.length -1] && (
                <Marker 
                  position={[routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng]}
                  icon={endIcon}
                >
                  <Popup>Arrivo</Popup>
                </Marker>
              )}
            </>
          )}
          {!hasRoutePoints && hasStartCoordinates && activity.start_lat && activity.start_lon && startIcon && (
            <Marker 
              position={[activity.start_lat, activity.start_lon]}
              icon={startIcon}
            >
              <Popup>Punto di partenza</Popup>
            </Marker>
          )}

          {/* Marker per la selezione del segmento */}
          {selectionStartIdx !== null && routePoints[selectionStartIdx] && selectionMarkerIcon && (
            <Marker 
              position={[routePoints[selectionStartIdx].lat, routePoints[selectionStartIdx].lng]}
              icon={selectionMarkerIcon}
            />
          )}
          {/* Log di debug per il secondo marker di selezione RIMOSSO*/}
          {/* {(() => {
            console.log('[Map] Checking to render EndSelectionMarker:', { 
              selectionEndIdx, 
              pointExists: selectionEndIdx !== null && routePoints && selectionEndIdx < routePoints.length ? !!routePoints[selectionEndIdx] : false, 
              iconExists: !!selectionMarkerIcon 
            });
            return null;
          })()} */}
          {selectionEndIdx !== null && routePoints[selectionEndIdx] && selectionMarkerIcon && (
            <Marker 
              position={[routePoints[selectionEndIdx].lat, routePoints[selectionEndIdx].lng]}
              icon={selectionMarkerIcon}
            />
          )}

          {/* Aggiungi il HoverMarker qui */}
          <DynamicHoverMarker point={highlightedPoint || null} />

        </MapContainer>
      </div>
      <div className="mt-3 flex items-center">
        <div className="flex-1">
          {hasRoutePoints ? (
            <p className="text-xs text-gray-600">
              Percorso completo: {routePoints.length} punti GPS 
              {activity.distance_meters ? ` • ${(activity.distance_meters / 1000).toFixed(1)} km` : ''}
              {activity.elevation_gain_meters ? ` • ${activity.elevation_gain_meters}m dislivello` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-600">
              Solo punto di partenza disponibile. Percorso completo non disponibile.
            </p>
          )}
        </div>
        {hasRoutePoints && (
          <a 
            href="#" 
            onClick={handleDownloadGPX}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Esporta GPX
          </a>
        )}
      </div>
    </div>
  );
};

// Funzione di utilità per formattare la distanza
function formatDistance(distance?: number): string {
  if (!distance) return "0 km";
  if (distance < 1000) {
    return `${distance.toFixed(0)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

// Funzione di utilità per formattare il timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default ActivityMap; 