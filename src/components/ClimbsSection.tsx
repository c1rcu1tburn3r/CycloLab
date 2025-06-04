'use client';

// =====================================================
// CYCLOLAB CLIMBS SECTION COMPONENT
// =====================================================
// Componente per visualizzare salite rilevate automaticamente
// =====================================================

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Mountain, 
  Clock, 
  TrendingUp, 
  Zap, 
  Heart, 
  Star,
  StarOff,
  Edit2,
  Save,
  X,
  Trophy,
  Target,
  Activity,
  Map,
  MapPin
} from 'lucide-react';
import { DbDetectedClimb, updateClimbName, toggleClimbFavorite } from '@/app/activities/climbActions';
import { 
  formatCategory, 
  getCategoryColor, 
  formatClimbTime 
} from '@/lib/climbDetection';
import type { RoutePoint } from '@/lib/types';
import { getGridClasses, spacing } from '@/lib/design-system';

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
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface ClimbsSectionProps {
  climbs: DbDetectedClimb[];
  showActions?: boolean;
  routePoints?: RoutePoint[]; // Aggiungiamo i punti GPS per la mappa
}

interface ClimbCardProps {
  climb: DbDetectedClimb;
  onUpdateName?: (climbId: string, newName: string) => Promise<void>;
  onToggleFavorite?: (climbId: string) => Promise<void>;
  showActions?: boolean;
  routePoints?: RoutePoint[]; // Punti GPS per la mappa
}

// =====================================================
// CLIMB CARD COMPONENT
// =====================================================

function ClimbCard({ 
  climb, 
  onUpdateName, 
  onToggleFavorite, 
  showActions = true,
  routePoints
}: ClimbCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(climb.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveName = async () => {
    if (!onUpdateName || !editName.trim()) return;
    
    setIsLoading(true);
    try {
      await onUpdateName(climb.id, editName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Errore aggiornamento nome:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!onToggleFavorite) return;
    
    setIsLoading(true);
    try {
      await onToggleFavorite(climb.id);
    } catch (error) {
      console.error('Errore toggle preferita:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categoryColor = getCategoryColor(climb.category as any);
  const distanceKm = (climb.distance_meters / 1000).toFixed(1);
  const elevationGain = Math.round(climb.elevation_gain_meters);
  const avgGradient = climb.avg_gradient_percent.toFixed(1);
  const vamFormatted = Math.round(climb.vam_meters_per_hour);

  return (
    <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
      {/* Barra categoria colorata */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: categoryColor }}
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Nome salita..."
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isLoading || !editName.trim()}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(climb.name || '');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mountain className="h-5 w-5 text-blue-600" />
                  {climb.name || 'Salita Senza Nome'}
                </CardTitle>
                {showActions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Badge categoria */}
            <Badge 
              variant="secondary"
              style={{ 
                backgroundColor: `${categoryColor}20`,
                color: categoryColor,
                borderColor: categoryColor
              }}
              className="border"
            >
              {formatCategory(climb.category as any)}
            </Badge>
            
            {/* Stella preferiti */}
            {showActions && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleFavorite}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                {climb.is_favorite ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metriche principali */}
        <div className={getGridClasses(2, 'md')}>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {distanceKm}
            </div>
            <div className="text-sm text-gray-500">km</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {elevationGain}
            </div>
            <div className="text-sm text-gray-500">m D+</div>
          </div>
        </div>

        {/* Metriche performance */}
        <div className={`space-y-2 ${spacing.top.sm}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{vamFormatted} m/h</div>
                <div className="text-xs text-gray-500">VAM</div>
              </div>
            </div>
            
            {climb.avg_power_watts && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">{Math.round(climb.avg_power_watts)} W</div>
                  <div className="text-xs text-gray-500">Potenza media</div>
                </div>
              </div>
            )}
            
            {climb.avg_heart_rate && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-sm font-medium">{climb.avg_heart_rate} bpm</div>
                  <div className="text-xs text-gray-500">FC media</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Punteggio difficoltà */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Difficoltà</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold">{climb.difficulty_rating}/10</div>
            <div className="text-sm text-gray-500">
              Score: {Math.round(climb.climb_score)}
            </div>
          </div>
        </div>

        {/* Metriche aggiuntive */}
        <div className={`space-y-2 ${spacing.top.sm}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600">VAM:</span>
              <span className="font-medium">{vamFormatted} m/h</span>
            </div>
            
            {climb.avg_power_watts && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <span className="text-gray-600">Potenza:</span>
                <span className="font-medium">{Math.round(climb.avg_power_watts)} W</span>
              </div>
            )}
            
            {climb.avg_heart_rate && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">FC:</span>
                <span className="font-medium">{Math.round(climb.avg_heart_rate)} bpm</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              <span className="text-gray-600">Difficoltà:</span>
              <span className="font-medium">{climb.difficulty_rating}/10</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Score:</span>
              <span className="font-medium">{Math.round(climb.climb_score)}</span>
            </div>
          </div>
        </div>
        
        {/* Mappa del segmento */}
        {routePoints && (
          <ClimbSegmentMap climb={climb} routePoints={routePoints} />
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// CLIMB SEGMENT MAP COMPONENT
// =====================================================

interface ClimbSegmentMapProps {
  climb: DbDetectedClimb;
  routePoints: RoutePoint[];
}

function ClimbSegmentMap({ climb, routePoints }: ClimbSegmentMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    
    // Carica Leaflet per le icone personalizzate
    import('leaflet').then(L => {
      setLeaflet(L);
    }).catch(error => {
      console.error('Errore caricamento Leaflet:', error);
    });
  }, []);

  if (!isMounted || !routePoints || routePoints.length === 0) {
    return null;
  }

  // Estrai i punti del segmento basandosi sugli indici
  const segmentPoints = routePoints.slice(climb.start_point_index, climb.end_point_index + 1);
  
  if (segmentPoints.length === 0) {
    return null;
  }

  // Calcola centro e bounds della mappa
  const lats = segmentPoints.map(p => p.lat);
  const lngs = segmentPoints.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2
  };

  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  
  let zoom = 13;
  if (maxDiff < 0.01) zoom = 15;
  else if (maxDiff < 0.02) zoom = 14;
  else if (maxDiff < 0.05) zoom = 13;
  else if (maxDiff < 0.1) zoom = 12;
  else zoom = 11;

  const polylinePositions = segmentPoints.map(point => [point.lat, point.lng] as [number, number]);

  // Icone personalizzate per i marker
  const startMarkerIcon = leaflet ? new leaflet.DivIcon({
    html: `<div style="
      background: #10B981;
      border: 3px solid white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">S</div>`,
    className: 'start-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }) : undefined;

  const endMarkerIcon = leaflet ? new leaflet.DivIcon({
    html: `<div style="
      background: #EF4444;
      border: 3px solid white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">F</div>`,
    className: 'end-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }) : undefined;

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMap(!showMap)}
        className="mb-3"
      >
        <Map className="h-4 w-4 mr-2" />
        {showMap ? 'Nascondi Mappa' : 'Mostra Segmento'}
      </Button>
      
      {showMap && (
        <div className="h-64 w-full rounded-lg overflow-hidden border">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Linea del segmento */}
            <Polyline
              positions={polylinePositions}
              color="#ef4444"
              weight={4}
              opacity={0.8}
            />
            
            {/* Marker inizio */}
            <Marker position={[segmentPoints[0].lat, segmentPoints[0].lng]} icon={startMarkerIcon}>
            </Marker>
            
            {/* Marker fine */}
            <Marker position={[segmentPoints[segmentPoints.length - 1].lat, segmentPoints[segmentPoints.length - 1].lng]} icon={endMarkerIcon}>
            </Marker>
          </MapContainer>
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN CLIMBS SECTION COMPONENT
// =====================================================

export default function ClimbsSection({
  climbs,
  showActions = true,
  routePoints
}: ClimbsSectionProps) {
  const [sortBy, setSortBy] = useState<'score' | 'elevation' | 'difficulty'>('score');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Handlers per le azioni
  const handleUpdateClimbName = async (climbId: string, newName: string) => {
    const result = await updateClimbName(climbId, newName);
    if (!result.success) {
      throw new Error(result.error || 'Errore aggiornamento nome');
    }
    // Ricarica la pagina per aggiornare i dati
    window.location.reload();
  };

  const handleToggleFavorite = async (climbId: string) => {
    const result = await toggleClimbFavorite(climbId);
    if (!result.success) {
      throw new Error(result.error || 'Errore toggle preferita');
    }
    // Ricarica la pagina per aggiornare i dati
    window.location.reload();
  };

  // Filtra e ordina salite
  const filteredClimbs = climbs
    .filter(climb => !showFavoritesOnly || climb.is_favorite)
    .sort((a, b) => {
      switch (sortBy) {
        case 'elevation':
          return b.elevation_gain_meters - a.elevation_gain_meters;
        case 'difficulty':
          return b.difficulty_rating - a.difficulty_rating;
        case 'score':
        default:
          return b.climb_score - a.climb_score;
      }
    });

  if (climbs.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Mountain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Nessuna Salita Rilevata
          </h3>
          <p className="text-gray-500">
            Questa attività non contiene salite significative o i dati GPS non sono disponibili.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Statistiche aggregate
  const totalElevation = climbs.reduce((sum, climb) => sum + climb.elevation_gain_meters, 0);
  const avgDifficulty = climbs.reduce((sum, climb) => sum + climb.difficulty_rating, 0) / climbs.length;
  const bestCategory = climbs.reduce((best, current) => {
    const categoryPriority = { 'HC': 5, '1': 4, '2': 3, '3': 2, '4': 1, 'uncategorized': 0 };
    return (categoryPriority[current.category as keyof typeof categoryPriority] || 0) > 
           (categoryPriority[best.category as keyof typeof categoryPriority] || 0) ? current : best;
  });

  return (
    <div className={`space-y-6 ${spacing.bottom.md}`}>
      {/* Header con statistiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-blue-600" />
            Salite Rilevate ({climbs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={getGridClasses(4)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {climbs.length}
              </div>
              <div className="text-sm text-gray-500">Salite totali</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(totalElevation)}m
              </div>
              <div className="text-sm text-gray-500">Dislivello totale</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {avgDifficulty.toFixed(1)}/10
              </div>
              <div className="text-sm text-gray-500">Difficoltà media</div>
            </div>
            
            <div className="text-center">
              <Badge 
                variant="secondary"
                style={{ 
                  backgroundColor: `${getCategoryColor(bestCategory.category as any)}20`,
                  color: getCategoryColor(bestCategory.category as any),
                  borderColor: getCategoryColor(bestCategory.category as any)
                }}
                className="border text-sm"
              >
                {formatCategory(bestCategory.category as any)}
              </Badge>
              <div className="text-sm text-gray-500 mt-1">Migliore categoria</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controlli filtri */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ordina per:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="score">Punteggio</option>
            <option value="elevation">Dislivello</option>
            <option value="difficulty">Difficoltà</option>
          </select>
        </div>
        
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className="flex items-center gap-2"
        >
          <Star className="h-4 w-4" />
          Solo Preferite
        </Button>
      </div>

      {/* Lista salite */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {filteredClimbs.map((climb) => (
          <ClimbCard
            key={climb.id}
            climb={climb}
            onUpdateName={handleUpdateClimbName}
            onToggleFavorite={handleToggleFavorite}
            showActions={showActions}
            routePoints={routePoints}
          />
        ))}
      </div>

      {filteredClimbs.length === 0 && showFavoritesOnly && (
        <Card className="text-center py-8">
          <CardContent>
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nessuna Salita Preferita
            </h3>
            <p className="text-gray-500">
              Aggiungi alcune salite ai preferiti per vederle qui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 