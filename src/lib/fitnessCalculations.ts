import { PmcActivity } from '../app/athletes/[id]/pmcActions'; // Importa il tipo PmcActivity
import { differenceInDays, addDays, format as formatDate, parseISO } from 'date-fns';
import type { RoutePoint } from './types'; // AGGIUNTO: Importa RoutePoint

const CTL_DAYS = 42; // Periodo standard per Chronic Training Load
const ATL_DAYS = 7;  // Periodo standard per Acute Training Load

// Costanti per la media mobile esponenziale
// K = 2 / (N + 1), dove N è il periodo
const CTL_K = 2 / (CTL_DAYS + 1);
const ATL_K = 2 / (ATL_DAYS + 1);

export interface DailyPmcStats {
  date: string; // Formato YYYY-MM-DD
  tss: number;  // TSS del giorno (0 se nessun allenamento)
  ctl: number;
  atl: number;
  tsb: number;
}

export function calculatePmcStats(
  activities: PmcActivity[],
  initialCtl: number = 0, // Valore iniziale di CTL (opzionale)
  initialAtl: number = 0  // Valore iniziale di ATL (opzionale)
): DailyPmcStats[] {
  if (!activities || activities.length === 0) {
    return [];
  }

  // Ordina le attività per data, anche se dovrebbero già esserlo dalla query
  const sortedActivities = [...activities].sort((a, b) => 
    parseISO(a.activity_date).getTime() - parseISO(b.activity_date).getTime()
  );

  const pmcData: DailyPmcStats[] = [];
  let currentDate = parseISO(sortedActivities[0].activity_date);
  const endDate = parseISO(sortedActivities[sortedActivities.length - 1].activity_date);

  let ctl = initialCtl;
  let atl = initialAtl;

  let activityIndex = 0;

  // Itera per ogni giorno dal primo all'ultimo giorno di attività registrata
  // Potremmo estendere il grafico per X giorni dopo l'ultima attività se necessario
  while (currentDate <= endDate) {
    const formattedCurrentDate = formatDate(currentDate, 'yyyy-MM-dd');
    let dailyTss = 0;

    // Somma il TSS di tutte le attività del giorno corrente
    while (
      activityIndex < sortedActivities.length &&
      sortedActivities[activityIndex].activity_date === formattedCurrentDate
    ) {
      dailyTss += sortedActivities[activityIndex].tss;
      activityIndex++;
    }

    // Calcolo della media mobile esponenziale (EMA)
    // CTLt = CTLt-1 + (TSSt - CTLt-1) * K_ctl
    // ATLt = ATLt-1 + (TSSt - ATLt-1) * K_atl
    ctl = ctl + (dailyTss - ctl) * CTL_K;
    atl = atl + (dailyTss - atl) * ATL_K;

    // TSB (Training Stress Balance) = CTL - ATL
    // Spesso si usa il CTL e ATL del giorno *precedente* per calcolare il TSB del giorno corrente *prima* dell'allenamento.
    // Tuttavia, per la visualizzazione grafica, è comune calcolare TSB dopo aver aggiornato CTL e ATL con il TSS del giorno.
    // Qui usiamo CTL e ATL aggiornati del giorno corrente.
    const tsb = ctl - atl;

    pmcData.push({
      date: formattedCurrentDate,
      tss: dailyTss,
      ctl: parseFloat(ctl.toFixed(1)), // Arrotonda per la visualizzazione
      atl: parseFloat(atl.toFixed(1)),
      tsb: parseFloat(tsb.toFixed(1)),
    });

    currentDate = addDays(currentDate, 1);
  }

  return pmcData;
}

// --- Calcolo Personal Bests (PBs) di Potenza ---

export const PB_DURATIONS_SECONDS = [
  // 1, // Per picco massimo, se non si usa un campo dedicato come max_power
  5,
  15,
  30,
  60,    // 1 min
  300,   // 5 min
  600,   // 10 min
  1200,  // 20 min
  1800,  // 30 min
  3600,  // 60 min
  5400,  // 90 min
];

export type PowerBests = {
  peak_power: number | null; // Separato per chiarezza
  p5s: number | null;
  p15s: number | null;
  p30s: number | null;
  p60s: number | null;
  p300s: number | null;
  p600s: number | null;
  p1200s: number | null;
  p1800s: number | null;
  p3600s: number | null;
  p5400s: number | null;
  // Potremmo aggiungere altre durate specifiche qui se necessario
  // Esempio per durate non standard o come indice generico se preferito:
  // [durationKey: string]: number | null; 
};

/**
 * Calcola la potenza media massima per diverse durate da una serie di punti di percorso.
 * Assumendo che i routePoints siano ordinati per tempo e campionati circa ogni secondo.
 */
export function calculatePowerBests(routePoints: RoutePoint[]): PowerBests {
  // Inizializza tutti i campi PB a null
  const pbs: PowerBests = {
    peak_power: null,
    p5s: null, p15s: null, p30s: null, p60s: null,
    p300s: null, p600s: null, p1200s: null, p1800s: null,
    p3600s: null, p5400s: null
  };

  if (!routePoints || routePoints.length === 0) {
    return pbs;
  }

  // Trova il picco di potenza istantaneo
  let peakPower = 0;
  for (const point of routePoints) {
    if (point.power !== undefined && point.power !== null && point.power > peakPower) {
      peakPower = point.power;
    }
  }
  pbs.peak_power = peakPower > 0 ? Math.round(peakPower) : null;

  // Assicurati che i punti abbiano 'power' e 'time' e siano ordinati per 'time'
  const validPoints = routePoints
    .filter(p => p.time !== undefined && p.power !== undefined && p.power !== null)
    .sort((a, b) => a.time - b.time);

  if (validPoints.length === 0) {
    return pbs;
  }

  for (const duration of PB_DURATIONS_SECONDS) {
    if (validPoints.length < duration) { // Non abbastanza punti per questa durata se campionamento 1Hz
      // Potremmo stimare o lasciare null. Per ora null se i dati sono insufficienti.
      // Questo controllo è approssimativo se il campionamento non è 1Hz.
      console.warn(`[calculatePowerBests] Non abbastanza punti (${validPoints.length}) per calcolare PB di ${duration}s. Campionamento assunto a 1Hz.`);
      continue;
    }

    let maxAveragePower = 0;
    
    // Implementazione semplice con finestra scorrevole (rolling window)
    // Questo assume che i punti siano campionati a intervalli di 1 secondo.
    // Se il campionamento non è regolare, questo approccio è un'approssimazione.
    // Per un calcolo preciso con campionamento irregolare, bisognerebbe interpolare
    // o usare un approccio basato sul tempo effettivo della finestra.

    for (let i = 0; i <= validPoints.length - duration; i++) {
      let currentWindowPowerSum = 0;
      let actualPointsInWindow = 0; // Per gestire il caso di campionamento non perfettamente a 1Hz

      // Idealmente, la finestra dovrebbe essere basata sul tempo (es. validPoints[i].time + duration)
      // ma per semplicità, se il campionamento è a 1Hz, basta prendere `duration` punti.
      for (let j = 0; j < duration; j++) {
        if (validPoints[i+j] && validPoints[i+j].power !== undefined) {
            currentWindowPowerSum += validPoints[i+j].power!;
            actualPointsInWindow++;
        }
      }
      
      if (actualPointsInWindow > 0) {
        const averagePowerInWindow = currentWindowPowerSum / actualPointsInWindow;
        if (averagePowerInWindow > maxAveragePower) {
          maxAveragePower = averagePowerInWindow;
        }
      }
    }

    if (maxAveragePower > 0) {
      // Assicura che la chiave esista nel tipo PowerBests
      const key = `p${duration}s` as keyof Omit<PowerBests, 'peak_power'>;
      if (key in pbs) { // Controllo aggiuntivo per sicurezza del tipo
        pbs[key] = Math.round(maxAveragePower);
      }
    }
  }
  // console.log("[calculatePowerBests] PBs calcolati:", pbs);
  return pbs;
}

// Potremmo aggiungere altre funzioni di calcolo qui in futuro 