'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Activity, RoutePoint } from '@/lib/types';
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
  const [reactLeafletModule, setReactLeafletModule] = useState<typeof import('react-leaflet') | null>(null); // Stato per il modulo react-leaflet
  // const mapRef = useRef<L.Map | null>(null); // Rimosso perché non più usato per aggiungere layer imperativamente
  // const highlightedMarkerRef = useRef<L.CircleMarker | null>(null); // Rimosso perché il pallino è gestito da HoverMarker

  // Stato per la selezione del segmento
  const [selectionStartIdx, setSelectionStartIdx] = useState<number | null>(null);
  const [selectionEndIdx, setSelectionEndIdx] = useState<number | null>(null);
  const [selectingEndPoint, setSelectingEndPoint] = useState<boolean>(false); // True se stiamo aspettando il secondo click per il punto finale

  // Ref per i marker di selezione (opzionale, ma può servire per stili/popup)
  const startSelectionMarkerRef = useRef<L.Marker | null>(null);
  const endSelectionMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    import('leaflet/dist/leaflet.css'); 
    
    import('leaflet').then(LModule => {
      // console.log('[ActivityMap] Leaflet module (L) loaded:', LModule); // Rimosso Log
      setLeaflet(LModule);
    });

    import('react-leaflet').then(mod => { // Carica il modulo react-leaflet
      setReactLeafletModule(mod);
    });
  }, []);

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

  const defaultCenter = { lat: 45.464664, lng: 9.188540 };
  
  const { mapCenter, zoomLevel } = useMemo(() => {
    let center = defaultCenter;
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
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[350px] flex items-center justify-center">
        <p className="text-gray-600">Caricamento mappa...</p>
      </div>
    );
  }

  if (!hasStartCoordinates && !hasRoutePoints) {
    // console.log('[ActivityMap] Rendering no GPS data state.'); // Rimosso Log
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Percorso</h2>
        <div className="h-[350px] rounded-lg flex items-center justify-center bg-slate-50 border border-gray-200">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Coordinate GPS non disponibili</h3>
            <p className="text-slate-600 max-w-xs mx-auto">
              Le coordinate GPS non sono presenti nel file FIT di questa attività. 
              Prova a caricare un file con dati GPS validi per visualizzare il percorso sulla mappa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
        Percorso
      </h2>
      {/* Contenitore per mappa e controlli sovrapposti */}
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200 relative">
        {/* Istruzione migliorata su come selezionare un tratto - mostrata solo se non c'è una selezione attiva */}
        {(selectionStartIdx === null && routePoints && routePoints.length > 0) && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-[1000] bg-white bg-opacity-80 px-3 py-1.5 rounded-b-md shadow-md text-sm font-medium text-slate-700 border border-t-0 border-slate-200">
            Clicca due punti sulla traccia per analizzare un segmento
          </div>
        )}
        
        {/* Pulsante di reset migliorato */}
        {(selectionStartIdx !== null || selectionEndIdx !== null) && (
          <button 
            onClick={resetSelection}
            className="absolute bottom-3 left-3 z-[1000] px-2.5 py-1 bg-red-600/80 text-white text-xs rounded hover:bg-red-700/80 shadow-sm flex items-center gap-1"
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
        >
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
                  />
                </ActualLayersControl.BaseLayer>
                <ActualLayersControl.BaseLayer name="Satelittare (Esri)">
                  <TileLayer
                    attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                </ActualLayersControl.BaseLayer>
                <ActualLayersControl.BaseLayer name="Topografica (OpenTopoMap)">
                  <TileLayer
                    attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
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
            onClick={(e) => {
              e.preventDefault();
              // Qui potremmo aggiungere una funzione per scaricare il percorso come GPX
              alert('Funzione di download GPX non ancora implementata');
            }}
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