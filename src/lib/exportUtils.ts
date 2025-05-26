import type { Activity, Athlete } from './types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Utility per formattare la durata
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return 'N/D';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Utility per formattare la distanza
function formatDistance(meters: number | null | undefined): string {
  if (!meters) return 'N/D';
  return `${(meters / 1000).toFixed(2)} km`;
}

// Export CSV per attività
export function exportActivitiesToCSV(activities: Activity[], filename?: string): void {
  const headers = [
    'Data',
    'Titolo',
    'Tipo',
    'Distanza (km)',
    'Durata',
    'Velocità Media (km/h)',
    'Velocità Max (km/h)',
    'Dislivello (m)',
    'Potenza Media (W)',
    'Potenza Max (W)',
    'FC Media (bpm)',
    'FC Max (bpm)',
    'Cadenza Media (rpm)',
    'TSS',
    'IF',
    'Calorie',
    'Descrizione'
  ];

  const csvData = activities.map(activity => [
    format(new Date(activity.activity_date), 'dd/MM/yyyy', { locale: it }),
    activity.title || 'N/D',
    activity.activity_type || 'N/D',
    activity.distance_meters ? (activity.distance_meters / 1000).toFixed(2) : '0',
    formatDuration(activity.duration_seconds),
    activity.avg_speed_kph?.toFixed(1) || 'N/D',
    activity.max_speed_kph?.toFixed(1) || 'N/D',
    activity.elevation_gain_meters?.toFixed(0) || '0',
    activity.avg_power_watts?.toFixed(0) || 'N/D',
    activity.max_power_watts?.toFixed(0) || 'N/D',
    activity.avg_heart_rate?.toString() || 'N/D',
    activity.max_heart_rate?.toString() || 'N/D',
    activity.avg_cadence?.toFixed(0) || 'N/D',
    activity.tss?.toFixed(0) || 'N/D',
    activity.intensity_factor?.toFixed(3) || 'N/D',
    activity.calories?.toString() || 'N/D',
    activity.description || ''
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadFile(csvContent, filename || `attivita_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

// Export JSON per attività (per backup completo)
export function exportActivitiesToJSON(activities: Activity[], filename?: string): void {
  const jsonData = {
    exportDate: new Date().toISOString(),
    totalActivities: activities.length,
    activities: activities.map(activity => ({
      ...activity,
      // Rimuovi dati sensibili se necessario
      fit_file_path: undefined,
      fit_file_url: undefined
    }))
  };

  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, filename || `attivita_backup_${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
}

// Export statistiche aggregate
export function exportActivityStats(activities: Activity[], filename?: string): void {
  const stats = calculateActivityStats(activities);
  
  const csvHeaders = [
    'Metrica',
    'Valore',
    'Unità'
  ];

  const csvData = [
    ['Totale Attività', stats.totalActivities.toString(), 'numero'],
    ['Distanza Totale', stats.totalDistance.toFixed(2), 'km'],
    ['Tempo Totale', formatDuration(stats.totalDuration), 'ore:minuti'],
    ['Dislivello Totale', stats.totalElevation.toFixed(0), 'm'],
    ['Velocità Media', stats.avgSpeed.toFixed(1), 'km/h'],
    ['Potenza Media', stats.avgPower.toFixed(0), 'W'],
    ['FC Media', stats.avgHeartRate.toFixed(0), 'bpm'],
    ['TSS Medio', stats.avgTSS.toFixed(0), 'punti'],
    ['Calorie Totali', stats.totalCalories.toString(), 'kcal'],
    ['Attività per Tipo - Cycling', stats.activityTypes.cycling.toString(), 'numero'],
    ['Attività per Tipo - Running', stats.activityTypes.running.toString(), 'numero'],
    ['Attività per Tipo - Swimming', stats.activityTypes.swimming.toString(), 'numero'],
    ['Attività per Tipo - Strength', stats.activityTypes.strength.toString(), 'numero']
  ];

  const csvContent = [csvHeaders, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadFile(csvContent, filename || `statistiche_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

// Calcola statistiche aggregate
function calculateActivityStats(activities: Activity[]) {
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance_meters || 0), 0) / 1000;
  const totalDuration = activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
  const totalElevation = activities.reduce((sum, a) => sum + (a.elevation_gain_meters || 0), 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.calories || 0), 0);

  const activitiesWithSpeed = activities.filter(a => a.avg_speed_kph);
  const avgSpeed = activitiesWithSpeed.length > 0 
    ? activitiesWithSpeed.reduce((sum, a) => sum + (a.avg_speed_kph || 0), 0) / activitiesWithSpeed.length 
    : 0;

  const activitiesWithPower = activities.filter(a => a.avg_power_watts);
  const avgPower = activitiesWithPower.length > 0 
    ? activitiesWithPower.reduce((sum, a) => sum + (a.avg_power_watts || 0), 0) / activitiesWithPower.length 
    : 0;

  const activitiesWithHR = activities.filter(a => a.avg_heart_rate);
  const avgHeartRate = activitiesWithHR.length > 0 
    ? activitiesWithHR.reduce((sum, a) => sum + (a.avg_heart_rate || 0), 0) / activitiesWithHR.length 
    : 0;

  const activitiesWithTSS = activities.filter(a => a.tss);
  const avgTSS = activitiesWithTSS.length > 0 
    ? activitiesWithTSS.reduce((sum, a) => sum + (a.tss || 0), 0) / activitiesWithTSS.length 
    : 0;

  const activityTypes = {
    cycling: activities.filter(a => a.activity_type === 'cycling').length,
    running: activities.filter(a => a.activity_type === 'running').length,
    swimming: activities.filter(a => a.activity_type === 'swimming').length,
    strength: activities.filter(a => a.activity_type === 'strength').length
  };

  return {
    totalActivities,
    totalDistance,
    totalDuration,
    totalElevation,
    totalCalories,
    avgSpeed,
    avgPower,
    avgHeartRate,
    avgTSS,
    activityTypes
  };
}

// Export profilo atleta completo
export function exportAthleteProfile(
  athlete: Athlete, 
  activities: Activity[], 
  profileEntries?: any[], 
  personalBests?: any[],
  filename?: string
): void {
  const stats = calculateActivityStats(activities);
  
  const data = {
    exportDate: new Date().toISOString(),
    athlete: {
      name: athlete.name,
      surname: athlete.surname,
      birthDate: athlete.birth_date,

      height: athlete.height_cm,
      weight: athlete.weight_kg
    },
    statistics: stats,
    activities: activities.length,
    profileHistory: profileEntries || [],
    personalBests: personalBests || [],
    recentActivities: activities.slice(0, 10).map(a => ({
      date: a.activity_date,
      title: a.title,
      type: a.activity_type,
      distance: a.distance_meters ? (a.distance_meters / 1000).toFixed(2) + ' km' : 'N/D',
      duration: formatDuration(a.duration_seconds),
      avgPower: a.avg_power_watts ? a.avg_power_watts + ' W' : 'N/D'
    }))
  };

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(
    jsonContent, 
    filename || `profilo_${athlete.name}_${athlete.surname}_${format(new Date(), 'yyyy-MM-dd')}.json`, 
    'application/json'
  );
}

// Utility per scaricare file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Export per singola attività con dettagli completi
export function exportSingleActivity(activity: Activity, filename?: string): void {
  const data = {
    exportDate: new Date().toISOString(),
    activity: {
      ...activity,
      // Formatta i dati per leggibilità
      formattedDate: format(new Date(activity.activity_date), 'dd/MM/yyyy HH:mm', { locale: it }),
      formattedDistance: formatDistance(activity.distance_meters),
      formattedDuration: formatDuration(activity.duration_seconds),
      // Rimuovi dati sensibili
      fit_file_path: undefined,
      fit_file_url: undefined
    }
  };

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(
    jsonContent, 
    filename || `attivita_${activity.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'senza_titolo'}_${format(new Date(activity.activity_date), 'yyyy-MM-dd')}.json`, 
    'application/json'
  );
} 