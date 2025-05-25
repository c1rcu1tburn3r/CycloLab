import type { GPS_Point, ActivitySegment, CommonSegment, SegmentComparison } from './types';

/**
 * Calcola la distanza tra due punti GPS usando la formula Haversine
 * @param point1 Primo punto GPS
 * @param point2 Secondo punto GPS
 * @returns Distanza in metri
 */
export function calculateDistance(point1: GPS_Point, point2: GPS_Point): number {
  const R = 6371000; // Raggio della Terra in metri
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Verifica se due punti GPS sono "vicini" entro una tolleranza
 */
export function arePointsClose(point1: GPS_Point, point2: GPS_Point, toleranceMeters = 50): boolean {
  return calculateDistance(point1, point2) <= toleranceMeters;
}

/**
 * Trova segmenti comuni tra due tracce GPS - VERSIONE MIGLIORATA
 * @param route1 Prima traccia GPS
 * @param route2 Seconda traccia GPS
 * @param minSegmentLength Lunghezza minima del segmento in metri
 * @param tolerance Tolleranza per considerare due punti "uguali"
 * @returns Array di segmenti comuni
 */
export function findCommonSegments(
  route1: GPS_Point[], 
  route2: GPS_Point[], 
  minSegmentLength = 300, // Ridotto da 500m a 300m
  tolerance = 150 // Aumentato da 50m a 150m per GPS reali
): Array<{
  route1Segment: { start: number, end: number };
  route2Segment: { start: number, end: number };
  confidence: number;
  length: number;
}> {
  const commonSegments: Array<{
    route1Segment: { start: number, end: number };
    route2Segment: { start: number, end: number };
    confidence: number;
    length: number;
  }> = [];

  console.log(`🔍 Analyzing GPS routes: ${route1.length} vs ${route2.length} points`);
  console.log(`📍 First route sample:`, route1.slice(0, 3));
  console.log(`📍 Second route sample:`, route2.slice(0, 3));

  // Algoritmo migliorato con sampling per performance
  const sampleRate1 = Math.max(1, Math.floor(route1.length / 200)); // Max 200 punti per analisi
  const sampleRate2 = Math.max(1, Math.floor(route2.length / 200));
  
  for (let i1 = 0; i1 < route1.length - 3; i1 += sampleRate1) {
    for (let i2 = 0; i2 < route2.length - 3; i2 += sampleRate2) {
      
      // Verifica se i punti di partenza sono vicini
      if (arePointsClose(route1[i1], route2[i2], tolerance)) {
        console.log(`💡 Found potential start match at ${i1}, ${i2}`);
        
        // Algoritmo più flessibile: cerca pattern di sovrapposizione
        let matchLength = 0;
        let matchingPoints = 0;
        let totalPointsChecked = 0;
        let j1 = i1;
        let j2 = i2;
        
        // Cerca fino a 50 punti avanti o fino alla fine del percorso
        const maxLookAhead = Math.min(50, route1.length - i1, route2.length - i2);
        
        for (let offset = 0; offset < maxLookAhead; offset++) {
          if (j1 + offset >= route1.length || j2 + offset >= route2.length) break;
          
          totalPointsChecked++;
          
          // Controllo più flessibile: cerca il punto più vicino in un raggio
          let bestMatch = false;
          let bestDistance = Infinity;
          
          // Cerca in un piccolo intorno (±3 punti) per compensare differenze di campionamento
          for (let deltaJ2 = -3; deltaJ2 <= 3; deltaJ2++) {
            const checkJ2 = j2 + offset + deltaJ2;
            if (checkJ2 >= 0 && checkJ2 < route2.length) {
              const distance = calculateDistance(route1[j1 + offset], route2[checkJ2]);
              if (distance <= tolerance && distance < bestDistance) {
                bestMatch = true;
                bestDistance = distance;
              }
            }
          }
          
          if (bestMatch) {
            matchingPoints++;
            if (j1 + offset < route1.length - 1) {
              matchLength += calculateDistance(route1[j1 + offset], route1[j1 + offset + 1]);
            }
          }
          
          // Se abbiamo una sequenza abbastanza lunga, continuiamo
          if (offset > 10 && matchingPoints / totalPointsChecked < 0.3) {
            break; // Troppo pochi match, fermiamoci
          }
        }
        
        // Calcola confidence in modo più realistico
        const confidence = totalPointsChecked > 0 ? (matchingPoints / totalPointsChecked) * 100 : 0;
        
        console.log(`📊 Segment analysis: ${matchingPoints}/${totalPointsChecked} points matched, ${matchLength.toFixed(0)}m length, ${confidence.toFixed(1)}% confidence`);
        
        // Criteri più permissivi per accettare il segmento
        if (matchLength >= minSegmentLength && matchingPoints >= 3 && confidence >= 30) {
          console.log(`✅ Accepting segment: ${matchLength.toFixed(0)}m, ${confidence.toFixed(1)}% confidence`);
          
          commonSegments.push({
            route1Segment: { start: i1, end: j1 + matchingPoints - 1 },
            route2Segment: { start: i2, end: j2 + matchingPoints - 1 },
            confidence,
            length: matchLength
          });
          
          // Skip ahead per evitare overlap - più conservativo
          i1 = j1 + matchingPoints + 10;
          break;
        }
      }
    }
  }
  
  console.log(`🎯 Found ${commonSegments.length} potential segments before filtering`);
  
  // Filtro finale più permissivo
  const filteredSegments = commonSegments.filter(seg => seg.confidence > 25); // Ridotto da 60% a 25%
  
  console.log(`✨ Final result: ${filteredSegments.length} common segments`);
  return filteredSegments;
}

/**
 * Analizza la performance di un segmento basandosi sui dati dell'attività
 */
export function analyzeSegmentPerformance(
  routePoints: GPS_Point[],
  startIndex: number,
  endIndex: number,
  activityData: {
    avgPower?: number;
    avgHeartRate?: number;
    duration: number;
    distance: number;
  }
): {
  distance: number;
  duration: number;
  avgSpeed: number;
  elevationGain?: number;
  estimatedPower?: number;
} {
  let totalDistance = 0;
  let elevationGain = 0;
  
  // Calcola distanza e dislivello del segmento
  for (let i = startIndex; i < endIndex && i < routePoints.length - 1; i++) {
    totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);
    
    if (routePoints[i].elevation !== undefined && routePoints[i + 1].elevation !== undefined) {
      const elevDiff = routePoints[i + 1].elevation! - routePoints[i].elevation!;
      if (elevDiff > 0) elevationGain += elevDiff;
    }
  }
  
  // Stima durata basata sulla proporzione del segmento
  const segmentRatio = totalDistance / activityData.distance;
  const estimatedDuration = activityData.duration * segmentRatio;
  const avgSpeed = totalDistance / (estimatedDuration / 3600); // km/h
  
  return {
    distance: totalDistance,
    duration: estimatedDuration,
    avgSpeed,
    elevationGain: elevationGain > 0 ? elevationGain : undefined,
    estimatedPower: activityData.avgPower // Per ora usiamo la potenza media dell'attività
  };
}

/**
 * Classifica automaticamente il tipo di segmento
 */
export function classifySegment(
  routePoints: GPS_Point[],
  startIndex: number,
  endIndex: number
): 'climb' | 'descent' | 'flat' | 'sprint' | 'mixed' {
  if (!routePoints[startIndex]?.elevation || !routePoints[endIndex]?.elevation) {
    return 'flat'; // Default se non abbiamo dati di elevazione
  }
  
  const totalElevationChange = routePoints[endIndex].elevation! - routePoints[startIndex].elevation!;
  let totalDistance = 0;
  
  // Calcola distanza totale
  for (let i = startIndex; i < endIndex && i < routePoints.length - 1; i++) {
    totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);
  }
  
  const gradientPercentage = (totalElevationChange / totalDistance) * 100;
  
  if (gradientPercentage > 3) return 'climb';
  if (gradientPercentage < -3) return 'descent';
  if (totalDistance < 2000) return 'sprint'; // Segmenti corti = sprint
  return 'flat';
}

/**
 * Crea un oggetto CommonSegment da due attività che condividono un percorso
 */
export function createCommonSegment(
  activity1: any,
  activity2: any,
  segmentMatch: {
    route1Segment: { start: number, end: number };
    route2Segment: { start: number, end: number };
    confidence: number;
    length: number;
  }
): CommonSegment | null {
  
  try {
    // Parse route points (assumendo che siano stringhe JSON)
    const route1 = typeof activity1.route_points === 'string' 
      ? JSON.parse(activity1.route_points) 
      : activity1.route_points;
    const route2 = typeof activity2.route_points === 'string' 
      ? JSON.parse(activity2.route_points) 
      : activity2.route_points;
      
    if (!route1 || !route2) return null;
    
    // Analizza performance per entrambe le attività
    const perf1 = analyzeSegmentPerformance(
      route1,
      segmentMatch.route1Segment.start,
      segmentMatch.route1Segment.end,
      activity1
    );
    
    const perf2 = analyzeSegmentPerformance(
      route2,
      segmentMatch.route2Segment.start,
      segmentMatch.route2Segment.end,
      activity2
    );
    
    // Crea ActivitySegment per entrambe
    const segment1: ActivitySegment = {
      activityId: activity1.id,
      athleteId: activity1.athlete_id || '',
      athleteName: activity1.athletes?.name ? `${activity1.athletes.name} ${activity1.athletes.surname}` : 'Atleta',
      startIndex: segmentMatch.route1Segment.start,
      endIndex: segmentMatch.route1Segment.end,
      startTime: activity1.activity_date,
      endTime: activity1.activity_date, // Approssimazione
      distance: perf1.distance,
      duration: perf1.duration,
      avgPower: perf1.estimatedPower,
      avgSpeed: perf1.avgSpeed,
      avgHeartRate: activity1.avg_heart_rate,
      elevationGain: perf1.elevationGain,
      performance_score: Math.round((perf1.avgSpeed / 40) * 100) // Score basico
    };
    
    const segment2: ActivitySegment = {
      activityId: activity2.id,
      athleteId: activity2.athlete_id || '',
      athleteName: activity2.athletes?.name ? `${activity2.athletes.name} ${activity2.athletes.surname}` : 'Atleta',
      startIndex: segmentMatch.route2Segment.start,
      endIndex: segmentMatch.route2Segment.end,
      startTime: activity2.activity_date,
      endTime: activity2.activity_date,
      distance: perf2.distance,
      duration: perf2.duration,
      avgPower: perf2.estimatedPower,
      avgSpeed: perf2.avgSpeed,
      avgHeartRate: activity2.avg_heart_rate,
      elevationGain: perf2.elevationGain,
      performance_score: Math.round((perf2.avgSpeed / 40) * 100)
    };
    
    // Crea il segmento comune
    const commonSegment: CommonSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Segmento comune (${(segmentMatch.length / 1000).toFixed(1)}km)`,
      type: 'auto_detected',
      path: route1.slice(segmentMatch.route1Segment.start, segmentMatch.route1Segment.end + 1),
      startPoint: route1[segmentMatch.route1Segment.start],
      endPoint: route1[segmentMatch.route1Segment.end],
      distance: segmentMatch.length,
      elevationGain: perf1.elevationGain,
      category: classifySegment(route1, segmentMatch.route1Segment.start, segmentMatch.route1Segment.end),
      confidence: segmentMatch.confidence,
      activitySegments: [segment1, segment2],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return commonSegment;
    
  } catch (error) {
    console.error('Errore nella creazione del segmento comune:', error);
    return null;
  }
}

/**
 * Trova tutti i segmenti comuni tra un array di attività
 */
export function findAllCommonSegments(activities: any[]): CommonSegment[] {
  const commonSegments: CommonSegment[] = [];
  
  console.log(`🔍 Starting analysis of ${activities.length} activities`);
  
  // Confronta ogni coppia di attività
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      try {
        const activity1 = activities[i];
        const activity2 = activities[j];
        
        console.log(`🆚 Comparing activity ${i+1} (${activity1.id?.slice(0,8)}) vs activity ${j+1} (${activity2.id?.slice(0,8)})`);
        
        // Skip se non hanno route_points
        if (!activity1.route_points || !activity2.route_points) {
          console.log(`❌ Missing route_points: Activity ${i+1}=${!!activity1.route_points}, Activity ${j+1}=${!!activity2.route_points}`);
          continue;
        }
        
        let route1, route2;
        
        try {
          route1 = typeof activity1.route_points === 'string' 
            ? JSON.parse(activity1.route_points) 
            : activity1.route_points;
          route2 = typeof activity2.route_points === 'string' 
            ? JSON.parse(activity2.route_points) 
            : activity2.route_points;
        } catch (parseError) {
          console.error(`❌ Error parsing route_points:`, parseError);
          continue;
        }
          
        if (!route1 || !route2 || !Array.isArray(route1) || !Array.isArray(route2)) {
          console.log(`❌ Invalid route data: route1=${!!route1} (array: ${Array.isArray(route1)}), route2=${!!route2} (array: ${Array.isArray(route2)})`);
          continue;
        }
        
        if (route1.length < 10 || route2.length < 10) {
          console.log(`❌ Routes too short: route1=${route1.length}, route2=${route2.length} points`);
          continue;
        }
        
        // Controllo formato dati GPS
        const sample1 = route1[0];
        const sample2 = route2[0];
        console.log(`📍 GPS Data format check:`);
        console.log(`   Route 1 sample:`, sample1);
        console.log(`   Route 2 sample:`, sample2);
        
        // Conversione formato se necessario
        const normalizedRoute1 = normalizeGPSRoute(route1);
        const normalizedRoute2 = normalizeGPSRoute(route2);
        
        if (!normalizedRoute1 || !normalizedRoute2) {
          console.log(`❌ Could not normalize GPS routes`);
          continue;
        }
        
        console.log(`✅ Normalized routes: ${normalizedRoute1.length} vs ${normalizedRoute2.length} points`);
        
        // Trova segmenti comuni con algoritmo principale
        console.log(`🔍 Trying sequential matching algorithm...`);
        let matches = findCommonSegments(normalizedRoute1, normalizedRoute2);
        
        console.log(`🎯 Sequential algorithm found ${matches.length} matches`);
        
        // Se l'algoritmo principale non trova nulla, prova quello basato su aree
        if (matches.length === 0) {
          console.log(`🗺️ Falling back to area-based matching...`);
          matches = findOverlappingAreas(normalizedRoute1, normalizedRoute2);
          console.log(`🎯 Area-based algorithm found ${matches.length} matches`);
        }
        
        console.log(`🏁 Total matches between activities ${i+1} and ${j+1}: ${matches.length}`);
        
        // Crea CommonSegment per ogni match
        matches.forEach((match, matchIndex) => {
          console.log(`📝 Creating segment ${matchIndex + 1}: ${match.length.toFixed(0)}m, ${match.confidence.toFixed(1)}% confidence`);
          const commonSegment = createCommonSegment(activity1, activity2, match);
          if (commonSegment) {
            commonSegments.push(commonSegment);
            console.log(`✅ Added segment: ${commonSegment.name}`);
          } else {
            console.log(`❌ Failed to create segment ${matchIndex + 1}`);
          }
        });
        
      } catch (error) {
        console.error(`❌ Error comparing activities ${i} and ${j}:`, error);
      }
    }
  }
  
  console.log(`🏁 Final result: ${commonSegments.length} common segments found`);
  return commonSegments;
}

/**
 * Normalizza un array di punti GPS in formato standard
 */
function normalizeGPSRoute(route: any[]): GPS_Point[] | null {
  if (!route || !Array.isArray(route) || route.length === 0) return null;
  
  try {
    return route.map(point => {
      // Gestisce diversi formati di dati GPS
      let lat, lng, elevation, time;
      
      if (point.lat !== undefined && point.lng !== undefined) {
        // Formato: { lat, lng, elevation?, time? }
        lat = point.lat;
        lng = point.lng;
        elevation = point.elevation;
        time = point.time;
      } else if (point.latitude !== undefined && point.longitude !== undefined) {
        // Formato: { latitude, longitude, elevation?, time? }
        lat = point.latitude;
        lng = point.longitude;
        elevation = point.elevation;
        time = point.time;
      } else if (Array.isArray(point) && point.length >= 2) {
        // Formato array: [lat, lng, elevation?, time?]
        lat = point[0];
        lng = point[1];
        elevation = point[2];
        time = point[3];
      } else {
        throw new Error(`Formato GPS non riconosciuto: ${JSON.stringify(point)}`);
      }
      
      if (typeof lat !== 'number' || typeof lng !== 'number' || 
          isNaN(lat) || isNaN(lng) || 
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error(`Coordinate GPS non valide: lat=${lat}, lng=${lng}`);
      }
      
      return {
        latitude: lat,
        longitude: lng,
        elevation: elevation && !isNaN(elevation) ? elevation : undefined,
        timestamp: time ? String(time) : undefined
      } as GPS_Point;
    });
  } catch (error) {
    console.error(`❌ Error normalizing GPS route:`, error);
    return null;
  }
}

/**
 * Algoritmo alternativo: cerca sovrapposizioni basate su aree geografiche
 * Più tollerante per percorsi simili ma non identici
 */
export function findOverlappingAreas(
  route1: GPS_Point[], 
  route2: GPS_Point[], 
  gridSize = 0.001 // ~100m di risoluzione
): Array<{
  route1Segment: { start: number, end: number };
  route2Segment: { start: number, end: number };
  confidence: number;
  length: number;
}> {
  console.log(`🗺️ Running area-based overlap detection...`);
  
  // Crea una griglia di celle geografiche
  const route1Cells = new Map<string, number[]>(); // cellId -> array di indici punti
  const route2Cells = new Map<string, number[]>();
  
  // Popola griglia per route1
  route1.forEach((point, index) => {
    const cellId = getCellId(point.latitude, point.longitude, gridSize);
    if (!route1Cells.has(cellId)) {
      route1Cells.set(cellId, []);
    }
    route1Cells.get(cellId)!.push(index);
  });
  
  // Popola griglia per route2
  route2.forEach((point, index) => {
    const cellId = getCellId(point.latitude, point.longitude, gridSize);
    if (!route2Cells.has(cellId)) {
      route2Cells.set(cellId, []);
    }
    route2Cells.get(cellId)!.push(index);
  });
  
  console.log(`📊 Grid analysis: Route1 spans ${route1Cells.size} cells, Route2 spans ${route2Cells.size} cells`);
  
  // Trova celle condivise
  const sharedCells = [];
  for (const [cellId, route1Indices] of route1Cells) {
    if (route2Cells.has(cellId)) {
      const route2Indices = route2Cells.get(cellId)!;
      sharedCells.push({
        cellId,
        route1Indices: route1Indices.sort((a, b) => a - b),
        route2Indices: route2Indices.sort((a, b) => a - b)
      });
    }
  }
  
  console.log(`🎯 Found ${sharedCells.length} shared grid cells`);
  
  if (sharedCells.length === 0) return [];
  
  // Raggruppa celle contigue in segmenti
  const segments = [];
  let currentSegment = null;
  
  for (const cell of sharedCells) {
    if (!currentSegment) {
      currentSegment = {
        route1Start: Math.min(...cell.route1Indices),
        route1End: Math.max(...cell.route1Indices),
        route2Start: Math.min(...cell.route2Indices),
        route2End: Math.max(...cell.route2Indices),
        sharedCells: 1,
        route1Points: cell.route1Indices.length,
        route2Points: cell.route2Indices.length
      };
    } else {
      // Controlla se questa cella è contigua al segmento corrente
      const route1Gap = Math.min(...cell.route1Indices) - currentSegment.route1End;
      const route2Gap = Math.min(...cell.route2Indices) - currentSegment.route2End;
      
      if (route1Gap <= 20 && route2Gap <= 20) { // Accetta gap di max 20 punti
        // Estendi il segmento corrente
        currentSegment.route1End = Math.max(currentSegment.route1End, Math.max(...cell.route1Indices));
        currentSegment.route2End = Math.max(currentSegment.route2End, Math.max(...cell.route2Indices));
        currentSegment.sharedCells++;
        currentSegment.route1Points += cell.route1Indices.length;
        currentSegment.route2Points += cell.route2Indices.length;
      } else {
        // Finalizza il segmento corrente e iniziane uno nuovo
        if (currentSegment.sharedCells >= 2) { // Almeno 2 celle condivise
          segments.push(currentSegment);
        }
        
        currentSegment = {
          route1Start: Math.min(...cell.route1Indices),
          route1End: Math.max(...cell.route1Indices),
          route2Start: Math.min(...cell.route2Indices),
          route2End: Math.max(...cell.route2Indices),
          sharedCells: 1,
          route1Points: cell.route1Indices.length,
          route2Points: cell.route2Indices.length
        };
      }
    }
  }
  
  // Aggiungi l'ultimo segmento
  if (currentSegment && currentSegment.sharedCells >= 2) {
    segments.push(currentSegment);
  }
  
  console.log(`📍 Found ${segments.length} area-based segments`);
  
  // Converte in formato standard e calcola metriche
  return segments.map(seg => {
    const route1Length = calculateTotalDistance(route1.slice(seg.route1Start, seg.route1End + 1));
    const route2Length = calculateTotalDistance(route2.slice(seg.route2Start, seg.route2End + 1));
    const avgLength = (route1Length + route2Length) / 2;
    
    const route1PointSpan = seg.route1End - seg.route1Start + 1;
    const route2PointSpan = seg.route2End - seg.route2Start + 1;
    const density = (seg.route1Points + seg.route2Points) / (route1PointSpan + route2PointSpan);
    
    const confidence = Math.min(100, density * seg.sharedCells * 10);
    
    console.log(`📏 Area segment: ${avgLength.toFixed(0)}m length, ${confidence.toFixed(1)}% confidence, ${seg.sharedCells} shared cells`);
    
    return {
      route1Segment: { start: seg.route1Start, end: seg.route1End },
      route2Segment: { start: seg.route2Start, end: seg.route2End },
      confidence,
      length: avgLength
    };
  }).filter(seg => seg.length >= 200 && seg.confidence >= 20); // Filtro finale
}

/**
 * Calcola la distanza totale di un array di punti GPS
 */
function calculateTotalDistance(points: GPS_Point[]): number {
  if (points.length < 2) return 0;
  
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Converte coordinate GPS in ID cella griglia
 */
function getCellId(lat: number, lng: number, gridSize: number): string {
  const gridLat = Math.floor(lat / gridSize);
  const gridLng = Math.floor(lng / gridSize);
  return `${gridLat},${gridLng}`;
} 