'use client';

import React, { useEffect, useRef } from 'react';
import { CircleMarker, useMap } from 'react-leaflet';
import type { RoutePoint } from '@/lib/types';
import type { CircleMarker as LeafletCircleMarker } from 'leaflet'; // Importa il tipo specifico per il ref

interface HoverMarkerProps {
  point: RoutePoint | null;
}

const HoverMarker: React.FC<HoverMarkerProps> = ({ point }) => {
  const map = useMap(); // Hook per ottenere l'istanza della mappa
  const markerRef = useRef<LeafletCircleMarker | null>(null); // Ref per il CircleMarker

  // Effetto per portare il marker in primo piano quando cambia o appare
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.bringToFront();
    }
  }, [point]); // Dipende dal punto, quindi si aggiorna quando il punto cambia

  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    return null; // Non renderizzare nulla se il punto non è valido
  }

  return (
    <CircleMarker
      ref={markerRef} // Assegna il ref
      center={[point.lat, point.lng]}
      radius={7} // Raggio del pallino
      pathOptions={{
        fillColor: '#ff7800', // Colore di riempimento arancione
        color: '#ffffff', // Colore del bordo bianco
        weight: 2, // Spessore del bordo
        opacity: 1, // Opacità del bordo
        fillOpacity: 0.9, // Opacità del riempimento
      }}
      // interactive={false} // Opzionale: per evitare che il pallino catturi eventi del mouse
    />
  );
};

export default HoverMarker; 