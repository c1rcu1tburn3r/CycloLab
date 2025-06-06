'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Activity, RoutePoint } from '@/lib/types';
import { spacing } from '@/lib/design-system';

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

interface SegmentMapViewProps {
  activities: Array<Activity & { routePoints: RoutePoint[] }>;
  onMapClick: (lat: number, lng: number) => void;
  selectionPoints: { lat: number; lng: number }[];
  isSelecting: boolean;
  selectedSegment?: {
    activity1: { startIndex: number; endIndex: number };
    activity2: { startIndex: number; endIndex: number };
  } | null;
}

const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

export default function SegmentMapView({ 
  activities, 
  onMapClick, 
  selectionPoints, 
  isSelecting, 
  selectedSegment 
}: SegmentMapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const [reactLeafletModule, setReactLeafletModule] = useState<typeof import('react-leaflet') | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileLoadError, setTileLoadError] = useState<boolean>(false);
  
  // Refs per cleanup
  const mapRef = useRef<L.Map | null>(null);
  const eventListenersRef = useRef<Array<() => void>>([]);

  // Cleanup function
  const cleanup = () => {
    eventListenersRef.current.forEach(removeListener => {
      try {
        removeListener();
      } catch (error) {
        console.warn('Errore durante la rimozione di event listener:', error);
      }
    });
    eventListenersRef.current = [];

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn('Errore durante la rimozione della mappa:', error);
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
    
    import('leaflet').then(LModule => {
      setLeaflet(LModule);
      setMapError(null);
    }).catch(error => {
      console.error('Errore nel caricamento di Leaflet:', error);
      setMapError('Impossibile caricare la libreria delle mappe');
    });

    import('react-leaflet').then(mod => {
      setReactLeafletModule(mod);
    }).catch(error => {
      console.error('Errore nel caricamento di react-leaflet:', error);
      setMapError('Errore nel caricamento dei componenti mappa');
    });

    return cleanup;
  }, []);

  // Gestione errori tile loading
  const handleTileLoadError = (error: any) => {
    console.warn('Errore nel caricamento dei tile:', error);
    setTileLoadError(true);
    
    setTimeout(() => {
      setTileLoadError(false);
    }, 3000);
  };

  // Calcola centro e zoom della mappa basati sui dati delle attività
  const { mapCenter, zoomLevel } = useMemo(() => {
    const defaultCenter = { lat: 45.464664, lng: 9.188540 };
    let center = defaultCenter;
    let zoom = 13;

    // Raccoglie tutti i punti da tutte le attività
    const allPoints: RoutePoint[] = [];
    activities.forEach(activity => {
      if (activity.routePoints && activity.routePoints.length > 0) {
        allPoints.push(...activity.routePoints);
      }
    });

    if (allPoints.length > 0) {
      const lats = allPoints.map(p => p.lat);
      const lngs = allPoints.map(p => p.lng);
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

      if (maxDiff === 0) zoom = 15;
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

    return { mapCenter: center, zoomLevel: zoom };
  }, [activities]);

  const handlePolylineClick = (event: any, activityIndex: number) => {
    if (!isSelecting) return;

    const clickedLatLng = event.latlng;
    onMapClick(clickedLatLng.lat, clickedLatLng.lng);
  };

  // Icone per i marker di selezione
  const selectionMarkerIcon = useMemo(() => {
    if (!leaflet) return undefined;
    return (index: number) => new leaflet.DivIcon({
      html: `<div style="
        background: ${index === 0 ? '#10B981' : '#EF4444'};
        border: 2px solid white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${index + 1}</div>`,
      className: 'selection-marker-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }, [leaflet]);

  if (!isMounted || !leaflet || !reactLeafletModule) {
    if (mapError) {
      return (
        <div className={`bg-white dark:bg-gray-800 ${spacing.all.lg} rounded-xl shadow-md h-[400px] flex flex-col items-center justify-center`}>
          <svg className={`w-12 h-12 text-red-500 ${spacing.bottom.md}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className={`text-red-600 dark:text-red-400 text-center ${spacing.bottom.sm}`}>Errore nel caricamento della mappa</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">{mapError}</p>
        </div>
      );
    }
    
    return (
      <div className={`bg-white dark:bg-gray-800 ${spacing.all.lg} rounded-xl shadow-md h-[400px] flex items-center justify-center`}>
        <div className="flex flex-col items-center">
          <svg className={`animate-spin h-8 w-8 text-blue-600 ${spacing.bottom.md}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Caricamento mappa comparazione...</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <svg className={`w-12 h-12 text-gray-400 mx-auto ${spacing.bottom.sm}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">Nessuna attività con dati GPS</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px]">
      {/* Overlay di istruzioni durante la selezione */}
      {isSelecting && (
        <div className={`absolute top-4 left-4 right-4 bg-blue-500 text-white ${spacing.all.sm} rounded-xl shadow-lg z-[1000]`}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">
              {selectionPoints.length === 0 && "🎯 Clicca sulla traccia colorata per il primo punto"}
              {selectionPoints.length === 1 && "🎯 Clicca sulla traccia colorata per il secondo punto"}
            </span>
          </div>
          <div className={`${spacing.top.sm} text-sm text-blue-100`}>
            Clicca due punti per selezionare un segmento da comparare
          </div>
        </div>
      )}

      <MapContainer 
        key={`${mapCenter.lat}-${mapCenter.lng}-${zoomLevel}`}
        center={[mapCenter.lat, mapCenter.lng]} 
        zoom={zoomLevel} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="rounded-xl"
      >
        {/* Layer Control */}
        {(() => {
          const ActualLayersControl = reactLeafletModule.LayersControl;
          
          if (!ActualLayersControl || !ActualLayersControl.BaseLayer) {
            return (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            );
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
                  errorTileUrl="/map-error-tile.png"
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
        })()}
        
        {/* Tracce delle attività */}
        {activities.map((activity, activityIndex) => {
          if (!activity.routePoints || activity.routePoints.length === 0) return null;

          const routeLatLngs = activity.routePoints.map(point => [point.lat, point.lng] as [number, number]);
          const activityColor = colors[activityIndex % colors.length];
          
          // Verifica se questa attività ha un segmento evidenziato
          const hasHighlight = selectedSegment && (
            (activityIndex === 0 && selectedSegment.activity1) ||
            (activityIndex === 1 && selectedSegment.activity2)
          );

          const segmentInfo = activityIndex === 0 ? selectedSegment?.activity1 : selectedSegment?.activity2;

          if (hasHighlight && segmentInfo) {
            // Dividi la traccia in 3 parti: prima del segmento, segmento evidenziato, dopo il segmento
            const beforeSegment = routeLatLngs.slice(0, segmentInfo.startIndex + 1);
            const segmentPart = routeLatLngs.slice(segmentInfo.startIndex, segmentInfo.endIndex + 1);
            const afterSegment = routeLatLngs.slice(segmentInfo.endIndex);

            return (
              <div key={activity.id}>
                {/* Parte prima del segmento */}
                {beforeSegment.length > 1 && (
                  <Polyline 
                    positions={beforeSegment}
                    pathOptions={{
                      color: activityColor,
                      weight: 4,
                      opacity: 0.6
                    }}
                    eventHandlers={{
                      click: (e) => handlePolylineClick(e, activityIndex)
                    }}
                  />
                )}
                
                {/* Segmento evidenziato con effetto glow */}
                {/* Alone più spesso (glow effect) */}
                <Polyline 
                  positions={segmentPart}
                  pathOptions={{
                    color: activityColor,
                    weight: 12,
                    opacity: 0.3,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                  eventHandlers={{
                    click: (e) => handlePolylineClick(e, activityIndex)
                  }}
                />
                
                {/* Linea principale evidenziata */}
                <Polyline 
                  positions={segmentPart}
                  pathOptions={{
                    color: activityColor === '#3B82F6' ? '#1E40AF' : '#DC2626', // Colore più intenso
                    weight: 6,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                  eventHandlers={{
                    click: (e) => handlePolylineClick(e, activityIndex)
                  }}
                />
                
                {/* Parte dopo il segmento */}
                {afterSegment.length > 1 && (
                  <Polyline 
                    positions={afterSegment}
                    pathOptions={{
                      color: activityColor,
                      weight: 4,
                      opacity: 0.6
                    }}
                    eventHandlers={{
                      click: (e) => handlePolylineClick(e, activityIndex)
                    }}
                  />
                )}
              </div>
            );
          } else {
            // Traccia normale senza evidenziazione
            return (
              <Polyline 
                key={activity.id}
                positions={routeLatLngs}
                pathOptions={{
                  color: activityColor,
                  weight: 4,
                  opacity: 0.8
                }}
                eventHandlers={{
                  click: (e) => handlePolylineClick(e, activityIndex)
                }}
              >
                <Popup>
                  <div>
                    <h3><strong>{activity.title || 'Attività'}</strong></h3>
                    <p>Atleta: {activity.athletes?.name || 'N/D'} {activity.athletes?.surname || ''}</p>
                    <p>Distanza: {activity.distance_meters ? (activity.distance_meters / 1000).toFixed(2) + ' km' : 'N/D'}</p>
                    <p>Data: {new Date(activity.activity_date).toLocaleDateString('it-IT')}</p>
                  </div>
                </Popup>
              </Polyline>
            );
          }
        })}

        {/* Marker per i punti di selezione */}
        {selectionPoints.map((point, index) => {
          if (!selectionMarkerIcon) return null;
          
          return (
            <Marker
              key={`selection-${index}`}
              position={[point.lat, point.lng]}
              icon={selectionMarkerIcon(index)}
            >
              <Popup>
                Punto {index + 1} - {index === 0 ? 'Inizio' : 'Fine'} segmento
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legenda delle attività */}
      <div className={`absolute bottom-4 left-4 bg-white dark:bg-gray-800 ${spacing.all.sm} rounded-xl shadow-lg z-[1000] max-w-xs`}>
        <h4 className={`font-semibold text-gray-900 dark:text-white ${spacing.bottom.sm} text-sm`}>Attività</h4>
        <div className="space-y-1">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {activity.title || `Attività ${index + 1}`}
              </span>
            </div>
          ))}
        </div>
        
        {selectionPoints.length > 0 && (
          <div className={`${spacing.top.sm} pt-2 border-t border-gray-200 dark:border-gray-600`}>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {selectionPoints.length === 1 ? '1 punto selezionato' : `${selectionPoints.length} punti selezionati`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 