'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Activity, RoutePoint } from '@/lib/types';
// import L from 'leaflet'; // Rimosso import globale di L
import NextDynamic from 'next/dynamic';

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

// Importa il nuovo componente HoverMarker dinamicamente
const DynamicHoverMarker = dynamic(() => import('./HoverMarker'), { 
  ssr: false, 
  loading: () => null // O un piccolo placeholder se preferisci, ma null va bene
});

interface ActivityMapProps {
  activity: Activity;
  routePoints: RoutePoint[];
  highlightedPoint?: RoutePoint | null;
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

const ActivityMap: React.FC<ActivityMapProps> = ({ activity, routePoints, highlightedPoint }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  // const mapRef = useRef<L.Map | null>(null); // Rimosso perché non più usato per aggiungere layer imperativamente
  // const highlightedMarkerRef = useRef<L.CircleMarker | null>(null); // Rimosso perché il pallino è gestito da HoverMarker

  useEffect(() => {
    setIsMounted(true);
    
    import('leaflet/dist/leaflet.css'); 
    
    import('leaflet').then(LModule => {
      // console.log('[ActivityMap] Leaflet module (L) loaded:', LModule); // Rimosso Log
      setLeaflet(LModule);
    });
  }, []);

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

    if (hasRoutePoints) {
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
  }, [routePoints, activity.start_lat, activity.start_lon, hasRoutePoints, hasStartCoordinates]);
    
  // Rimuovi hoveredActualPoint
  /*
  const hoveredActualPoint = useMemo(() => {
    if (hoveredPointIndex !== null && routePoints && hoveredPointIndex >= 0 && hoveredPointIndex < routePoints.length) {
      return routePoints[hoveredPointIndex];
    }
    return null;
  }, [hoveredPointIndex, routePoints]);
  */

  // Effetto per gestire il marker evidenziato (pallino)
  /* // Temporaneamente commentato perche' problematico con react-leaflet e per isolare altri problemi
  useEffect(() => {
    if (!mapRef.current || !leaflet) return;
    const map = mapRef.current;

    // Rimuovi il marker precedente se esiste
    if (highlightedMarkerRef.current) {
      highlightedMarkerRef.current.remove();
      highlightedMarkerRef.current = null;
    }

    // Aggiungi un nuovo marker se highlightedPoint è valido
    if (highlightedPoint && typeof highlightedPoint.lat === 'number' && typeof highlightedPoint.lng === 'number') {
      highlightedMarkerRef.current = leaflet.circleMarker([highlightedPoint.lat, highlightedPoint.lng], {
        radius: 8,
        fillColor: "#ff7800", // Colore arancione per il pallino
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
      // Potresti voler portare il marker in primo piano se ci sono altri elementi sopra
      // highlightedMarkerRef.current.bringToFront(); 
    }
  }, [leaflet, highlightedPoint]); // Dipende da leaflet e highlightedPoint
  */

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
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer 
          key={`${mapCenter.lat}-${mapCenter.lng}-${zoomLevel}`}
          center={[mapCenter.lat, mapCenter.lng]} 
          zoom={zoomLevel} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {hasRoutePoints && (
            <>
              <Polyline 
                positions={routePoints.map(point => [point.lat, point.lng] as [number, number])} 
                pathOptions={{ color: '#0055ff', weight: 4, opacity: 0.7 }}
              />
              {(() => {
                // console.log('[ActivityMap] Rendering Start Marker. Position:', routePoints[0]?.lat, routePoints[0]?.lng, 'Icon:', startIcon);
                return null;
              })()}
              <Marker 
                position={[routePoints[0].lat, routePoints[0].lng]}
                icon={startIcon}
              >
                <Popup>Partenza</Popup>
              </Marker>

              {routePoints.length > 1 && (
                <>
                  {(() => {
                    // console.log('[ActivityMap] Rendering End Marker. Position:', routePoints[routePoints.length - 1]?.lat, routePoints[routePoints.length - 1]?.lng, 'Icon:', endIcon);
                    return null;
                  })()}
                  <Marker 
                    position={[routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng]}
                    icon={endIcon}
                  >
                    <Popup>Arrivo</Popup>
                  </Marker>
                </>
              )}
            </>
          )}
          {!hasRoutePoints && hasStartCoordinates && activity.start_lat && activity.start_lon && (
            <>
              {(() => {
                // console.log('[ActivityMap] Rendering Start-Only Marker. Position:', activity.start_lat, activity.start_lon, 'Icon:', startIcon);
                return null;
              })()}
              <Marker 
                position={[activity.start_lat, activity.start_lon]}
                icon={startIcon}
              >
                <Popup>Punto di partenza</Popup>
              </Marker>
            </>
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