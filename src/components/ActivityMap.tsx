'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity } from '@/lib/types';

// Interfaccia per i punti GPS del percorso
interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  time: number;
  distance?: number;
}

// Estendo l'interfaccia Activity per TypeScript
interface ActivityWithRoutePoints extends Activity {
  route_points?: string | null;
}

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

interface ActivityMapProps {
  activity: Activity;
}

const ActivityMap = ({ activity }: ActivityMapProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  
  // Cast activity al tipo esteso
  const activityWithRoute = activity as ActivityWithRoutePoints;
  
  // Utilizziamo useEffect per assicurarci che il componente venga montato solo lato client
  useEffect(() => {
    setIsMounted(true);
    
    // Importiamo il CSS di Leaflet solo lato client
    const loadLeafletCSS = async () => {
      await import('leaflet/dist/leaflet.css');
    };
    loadLeafletCSS();
    
    // Aggiorniamo i marker di Leaflet che altrimenti sarebbero rotti
    const setupLeafletIcons = async () => {
      const L = await import('leaflet');
      // Fix per le icone di Leaflet in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    };
    setupLeafletIcons();
    
    // Estrai i punti del percorso dal JSON
    if (activityWithRoute.route_points) {
      try {
        const parsedPoints = JSON.parse(activityWithRoute.route_points) as RoutePoint[];
        setRoutePoints(parsedPoints);
        console.log(`Caricati ${parsedPoints.length} punti del percorso`);
      } catch (error) {
        console.error('Errore nel parsing dei punti del percorso:', error);
      }
    }
  }, [activityWithRoute.route_points]);

  // Verifichiamo se abbiamo le coordinate di partenza
  const hasStartCoordinates = Boolean(activity.start_lat && activity.start_lon);
  const hasRoutePoints = routePoints.length > 0;
  
  // Centro predefinito della mappa (Milano) se non ci sono coordinate
  const defaultCenter = { lat: 45.464664, lng: 9.188540 };
  
  // Se abbiamo punti del percorso, usiamo il centro del percorso come centro della mappa
  let mapCenter: {lat: number, lng: number};
  let zoomLevel = 13;
  
  if (hasRoutePoints) {
    // Trova il centro del percorso usando i punti minimo e massimo
    const lats = routePoints.map(p => p.lat);
    const lngs = routePoints.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    mapCenter = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2
    };
    
    // Calcola uno zoom appropriato in base alle dimensioni del percorso
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    
    // Adatta lo zoom in base alle dimensioni del percorso
    // Valori empirici: più grande è il percorso, minore deve essere lo zoom
    if (Math.max(latDiff, lngDiff) > 0.05) { // Circa 5-6 km
      zoomLevel = 12;
    }
    if (Math.max(latDiff, lngDiff) > 0.1) { // Circa 10-12 km
      zoomLevel = 11;
    }
    if (Math.max(latDiff, lngDiff) > 0.2) { // Circa 20-25 km
      zoomLevel = 10;
    }
    if (Math.max(latDiff, lngDiff) > 0.4) { // Percorso molto lungo > 40-50 km
      zoomLevel = 9;
    }
  } else if (hasStartCoordinates && activity.start_lat && activity.start_lon) {
    mapCenter = { lat: activity.start_lat, lng: activity.start_lon };
  } else {
    mapCenter = defaultCenter;
  }
    
  // Se il componente non è ancora montato, non rendiamo nulla
  if (!isMounted) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[350px] flex items-center justify-center">
        <p className="text-gray-500">Caricamento mappa...</p>
      </div>
    );
  }

  // Se non ci sono coordinate né punti GPS, mostriamo un messaggio
  if (!hasStartCoordinates && !hasRoutePoints) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Percorso</h2>
        <div className="h-[350px] rounded-lg flex items-center justify-center bg-slate-50 border border-gray-200">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Coordinate GPS non disponibili</h3>
            <p className="text-slate-500 max-w-xs mx-auto">
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
          center={[mapCenter.lat, mapCenter.lng]} 
          zoom={zoomLevel} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Visualizza i punti del percorso completo se disponibili */}
          {hasRoutePoints && (
            <>
              <Polyline 
                positions={routePoints.map(point => [point.lat, point.lng] as [number, number])} 
                color="#0055ff" 
                weight={4} 
                opacity={0.7}
              />
              
              {/* Mostra il punto di partenza */}
              <Marker position={[routePoints[0].lat, routePoints[0].lng]}>
                <Popup>
                  <div className="text-center">
                    <strong>Partenza</strong>
                    <br />
                    {formatDistance(routePoints[0].distance)} • {formatTime(routePoints[0].time)}
                  </div>
                </Popup>
              </Marker>
              
              {/* Mostra il punto di arrivo */}
              <Marker position={[routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng]}>
                <Popup>
                  <div className="text-center">
                    <strong>Arrivo</strong>
                    <br />
                    {formatDistance(routePoints[routePoints.length - 1].distance)} • {formatTime(routePoints[routePoints.length - 1].time)}
                  </div>
                </Popup>
              </Marker>
            </>
          )}
          
          {/* Se non abbiamo i punti del percorso ma abbiamo le coordinate di partenza */}
          {!hasRoutePoints && hasStartCoordinates && activity.start_lat && activity.start_lon && (
            <Marker position={[activity.start_lat, activity.start_lon]}>
              <Popup>
                <div className="text-center">
                  <strong>{activity.title}</strong>
                  <br />
                  {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <div className="mt-3 flex items-center">
        <div className="flex-1">
          {hasRoutePoints ? (
            <p className="text-xs text-gray-500">
              Percorso completo: {routePoints.length} punti GPS 
              {activity.distance_meters ? ` • ${(activity.distance_meters / 1000).toFixed(1)} km` : ''}
              {activity.elevation_gain_meters ? ` • ${activity.elevation_gain_meters}m dislivello` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
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