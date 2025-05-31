'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Interfacce per le notifiche
export interface TabNotification {
  tabId: string;
  isNew: boolean;
  lastUpdate: Date | null;
  reason?: string;
  lastVisited?: Date | null;
}

export interface NotificationStatus {
  power: TabNotification;
  cadence: TabNotification;
  trends: TabNotification;
  climbing: TabNotification;
}

// Aggiungo nuovo tipo per le visite
export interface TabVisit {
  athleteId: string;
  tabId: string;
  visitedAt: Date;
}

/**
 * Marca un tab come visitato dall'utente
 */
export async function markTabAsVisited(
  athleteId: string, 
  tabId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Per ora, salviamo la visita in localStorage lato client
    // In futuro potremmo creare una tabella tab_visits nel database
    console.log(`[markTabAsVisited] Tab ${tabId} visitato per atleta ${athleteId}`);
    
    return { success: true };
  } catch (error) {
    console.error('[markTabAsVisited] Errore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore nel marcare tab visitato' 
    };
  }
}

/**
 * Calcola se una scheda deve mostrare il badge "Nuovo" basato sui dati reali
 */
export async function getTabNotifications(athleteId: string): Promise<{
  data?: NotificationStatus;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Data di riferimento per considerare qualcosa "nuovo" (7 giorni fa)
    const newThreshold = new Date();
    newThreshold.setDate(newThreshold.getDate() - 7);

    // Verifica attività recenti con nuovi personal bests
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, activity_date, pb_power_5s_watts, pb_power_15s_watts, pb_power_30s_watts, pb_power_60s_watts, pb_power_300s_watts, pb_power_600s_watts, pb_power_1200s_watts, pb_power_1800s_watts, pb_power_3600s_watts, pb_power_5400s_watts, avg_cadence, route_points')
      .eq('athlete_id', athleteId)
      .gte('activity_date', newThreshold.toISOString().split('T')[0])
      .order('activity_date', { ascending: false });

    if (activitiesError) {
      console.error('[getTabNotifications] Errore DB activities:', activitiesError);
      return { error: activitiesError.message };
    }

    // Verifica aggiornamenti profilo atleta
    const { data: profileEntries, error: profileError } = await supabase
      .from('athlete_profile_entries')
      .select('effective_date, ftp_watts, weight_kg')
      .eq('athlete_id', athleteId)
      .gte('effective_date', newThreshold.toISOString().split('T')[0])
      .order('effective_date', { ascending: false });

    if (profileError) {
      console.error('[getTabNotifications] Errore DB profile:', profileError);
      return { error: profileError.message };
    }

    const notifications: NotificationStatus = {
      // Power Analysis - nuovo se ci sono stati personal bests recenti
      power: {
        tabId: 'power',
        isNew: checkForNewPowerData(recentActivities || []),
        lastUpdate: getLatestPowerUpdate(recentActivities || []),
        reason: 'Nuovi personal bests disponibili'
      },

      // Cadence Analysis - nuovo se ci sono attività con dati cadenza
      cadence: {
        tabId: 'cadence',
        isNew: checkForNewCadenceData(recentActivities || []),
        lastUpdate: getLatestCadenceUpdate(recentActivities || []),
        reason: 'Nuovi dati cadenza per analisi'
      },

      // Performance Trends - nuovo se ci sono aggiornamenti profilo o performance
      trends: {
        tabId: 'trends',
        isNew: (profileEntries && profileEntries.length > 0) || checkForSignificantChanges(recentActivities || []),
        lastUpdate: getLatestTrendsUpdate(recentActivities || [], profileEntries || []),
        reason: 'Aggiornamenti profilo o performance significative'
      },

      // Climbing Analysis - nuovo se ci sono salite nel periodo
      climbing: {
        tabId: 'climbing',
        isNew: checkForNewClimbingData(recentActivities || []),
        lastUpdate: getLatestClimbingUpdate(recentActivities || []),
        reason: 'Nuove salite completate'
      }
    };

    return { data: notifications };

  } catch (error) {
    console.error('[getTabNotifications] Errore inaspettato:', error);
    return { 
      error: error instanceof Error ? error.message : 'Errore nel calcolo notifiche' 
    };
  }
}

/**
 * Verifica se ci sono nuovi personal bests nelle attività recenti
 */
function checkForNewPowerData(activities: any[]): boolean {
  return activities.some(activity => 
    activity.pb_power_5s_watts !== null ||
    activity.pb_power_15s_watts !== null ||
    activity.pb_power_30s_watts !== null ||
    activity.pb_power_60s_watts !== null ||
    activity.pb_power_300s_watts !== null ||
    activity.pb_power_600s_watts !== null ||
    activity.pb_power_1200s_watts !== null ||
    activity.pb_power_1800s_watts !== null ||
    activity.pb_power_3600s_watts !== null ||
    activity.pb_power_5400s_watts !== null
  );
}

/**
 * Verifica se ci sono nuovi dati cadenza significativi
 */
function checkForNewCadenceData(activities: any[]): boolean {
  return activities.some(activity => 
    activity.avg_cadence !== null && 
    activity.route_points !== null &&
    activity.route_points.length > 0
  );
}

/**
 * Verifica se ci sono cambiamenti significativi nelle performance
 */
function checkForSignificantChanges(activities: any[]): boolean {
  // Considera significativo se ci sono più di 3 attività nel periodo
  return activities.length >= 3;
}

/**
 * Verifica se ci sono nuovi dati di salita (elevazione significativa)
 */
function checkForNewClimbingData(activities: any[]): boolean {
  return activities.some(activity => {
    try {
      if (!activity.route_points) return false;
      const routePoints = JSON.parse(activity.route_points);
      
      // Controlla se c'è elevazione significativa (>300m)
      const elevations = routePoints
        .filter((p: any) => p.elevation !== undefined && p.elevation !== null)
        .map((p: any) => p.elevation);
      
      if (elevations.length < 2) return false;
      
      const minElevation = Math.min(...elevations);
      const maxElevation = Math.max(...elevations);
      const totalElevationGain = maxElevation - minElevation;
      
      return totalElevationGain > 300; // Considera "salita" se >300m dislivello
    } catch (e) {
      return false;
    }
  });
}

/**
 * Funzioni helper per ottenere l'ultima data di aggiornamento
 */
function getLatestPowerUpdate(activities: any[]): Date | null {
  const powerActivities = activities.filter(activity => 
    activity.pb_power_5s_watts !== null ||
    activity.pb_power_15s_watts !== null ||
    activity.pb_power_30s_watts !== null ||
    activity.pb_power_60s_watts !== null ||
    activity.pb_power_300s_watts !== null ||
    activity.pb_power_600s_watts !== null ||
    activity.pb_power_1200s_watts !== null ||
    activity.pb_power_1800s_watts !== null ||
    activity.pb_power_3600s_watts !== null ||
    activity.pb_power_5400s_watts !== null
  );
  
  return powerActivities.length > 0 ? new Date(powerActivities[0].activity_date) : null;
}

function getLatestCadenceUpdate(activities: any[]): Date | null {
  const cadenceActivities = activities.filter(activity => 
    activity.avg_cadence !== null && activity.route_points !== null
  );
  
  return cadenceActivities.length > 0 ? new Date(cadenceActivities[0].activity_date) : null;
}

function getLatestTrendsUpdate(activities: any[], profileEntries: any[]): Date | null {
  const activityDate = activities.length > 0 ? new Date(activities[0].activity_date) : null;
  const profileDate = profileEntries.length > 0 ? new Date(profileEntries[0].effective_date) : null;
  
  if (!activityDate && !profileDate) return null;
  if (!activityDate) return profileDate;
  if (!profileDate) return activityDate;
  
  return activityDate > profileDate ? activityDate : profileDate;
}

function getLatestClimbingUpdate(activities: any[]): Date | null {
  const climbingActivities = activities.filter(activity => {
    try {
      if (!activity.route_points) return false;
      const routePoints = JSON.parse(activity.route_points);
      
      const elevations = routePoints
        .filter((p: any) => p.elevation !== undefined && p.elevation !== null)
        .map((p: any) => p.elevation);
      
      if (elevations.length < 2) return false;
      
      const minElevation = Math.min(...elevations);
      const maxElevation = Math.max(...elevations);
      const totalElevationGain = maxElevation - minElevation;
      
      return totalElevationGain > 300;
    } catch (e) {
      return false;
    }
  });
  
  return climbingActivities.length > 0 ? new Date(climbingActivities[0].activity_date) : null;
} 