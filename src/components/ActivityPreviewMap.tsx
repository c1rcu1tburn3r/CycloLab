'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Activity, RoutePoint } from '@/lib/types';
import L from 'leaflet';

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_CENTER = { lat: 45.464664, lng: 9.188540 }; // Milano come fallback

// =====================================================
// DYNAMIC IMPORTS
// =====================================================

// Caricamento dinamico dei componenti di Leaflet per evitare errori SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// =====================================================
// COMPONENT
// =====================================================

interface ActivityPreviewMapProps {
  activity: Activity;
  routePoints: RoutePoint[];
  height?: string;
}

const ActivityPreviewMap: React.FC<ActivityPreviewMapProps> = ({ 
  activity, 
  routePoints, 
  height = '200px' 
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileLoadError, setTileLoadError] = useState<boolean>(false);
  
  // Refs per cleanup
  const mapRef = useRef<L.Map | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn('Errore durante la rimozione della mappa preview:', error);
      }
      mapRef.current = null;
    }
  };

  useEffect(() => {
    setIsMounted(true);
    
    import('leaflet/dist/leaflet.css').catch(error => {
      console.warn('Impossibile caricare CSS di Leaflet:', error);
      setMapError('Errore nel caricamento degli stili della mappa');
    });

    return cleanup;
  }, []);

  // Gestione errori tile loading
  const handleTileLoadError = (error: any) => {
    console.warn('Errore nel caricamento dei tile preview:', error);
    setTileLoadError(true);
    
    setTimeout(() => {
      setTileLoadError(false);
    }, 3000);
  };

  const hasRoutePoints = routePoints && routePoints.length > 0;
  const hasStartCoordinates = Boolean(activity.start_lat && activity.start_lon);
  
  const { mapCenter, zoomLevel, routeColor } = useMemo(() => {
    let center = DEFAULT_CENTER;
    let zoom = 13;
    let color = '#FF6B35'; // Arancione moderno

    // Determina il colore basato sul tipo di attività
    switch (activity.activity_type) {
      case 'cycling':
        color = '#FF6B35'; // Arancione
        break;
      case 'running':
        color = '#4ECDC4'; // Teal
        break;
      case 'swimming':
        color = '#45B7D1'; // Blu
        break;
      default:
        color = '#FF6B35';
    }

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

      // Zoom adattivo per l'anteprima
      if (maxDiff === 0) zoom = 15;
      else if (maxDiff < 0.005) zoom = 15;
      else if (maxDiff < 0.01) zoom = 14;
      else if (maxDiff < 0.02) zoom = 13;
      else if (maxDiff < 0.05) zoom = 12;
      else if (maxDiff < 0.1) zoom = 11;
      else if (maxDiff < 0.2) zoom = 10;
      else if (maxDiff < 0.4) zoom = 9;
      else zoom = 8;
    } else if (hasStartCoordinates && activity.start_lat && activity.start_lon) {
      center = { lat: activity.start_lat, lng: activity.start_lon };
      zoom = 13;
    }

    return { mapCenter: center, zoomLevel: zoom, routeColor: color };
  }, [routePoints, activity.start_lat, activity.start_lon, activity.activity_type, hasRoutePoints, hasStartCoordinates]);

  if (!isMounted) {
    return (
      <div 
        className="bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!hasStartCoordinates && !hasRoutePoints) {
    return (
      <div 
        className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
          <p className="text-xs text-gray-500 dark:text-gray-400">GPS non disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50"
      style={{ height }}
    >
      <MapContainer 
        center={[mapCenter.lat, mapCenter.lng]} 
        zoom={zoomLevel} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: handleTileLoadError,
            tileloadstart: () => setTileLoadError(false)
          }}
          errorTileUrl="/map-error-tile.png"
        />
        
        {hasRoutePoints && (
          <Polyline 
            positions={routePoints.map(point => [point.lat, point.lng] as [number, number])}
            pathOptions={{ 
              color: routeColor, 
              weight: 3, 
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default ActivityPreviewMap; 