import { useState, useEffect } from 'react';

interface FilterPreferences {
  selectedAthleteId?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  minDistance?: string;
  maxDistance?: string;
  activityTypeFilter?: string;
  sortBy?: string;
}

interface UseFilterPreferencesOptions {
  storageKey: string;
  defaultValues?: FilterPreferences;
  autoSave?: boolean;
  saveDelay?: number; // milliseconds
}

export function useFilterPreferences({
  storageKey,
  defaultValues = {},
  autoSave = true,
  saveDelay = 1000
}: UseFilterPreferencesOptions) {
  const [preferences, setPreferences] = useState<FilterPreferences>(defaultValues);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carica le preferenze dal localStorage al mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...defaultValues, ...parsed });
      }
    } catch (error) {
      console.warn('Errore nel caricamento preferenze filtri:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]); // Rimuovo defaultValues dalle dipendenze per evitare loop infiniti

  // Salva automaticamente le preferenze quando cambiano (con debounce)
  useEffect(() => {
    if (!isLoaded || !autoSave) return;

    const timeoutId = setTimeout(() => {
      try {
        // Filtra i valori vuoti per non salvare preferenze inutili
        const filteredPreferences = Object.entries(preferences).reduce((acc, [key, value]) => {
          if (value && value !== 'all' && value !== 'date_desc') {
            acc[key as keyof FilterPreferences] = value;
          }
          return acc;
        }, {} as FilterPreferences);

        if (Object.keys(filteredPreferences).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(filteredPreferences));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('Errore nel salvataggio preferenze filtri:', error);
      }
    }, saveDelay);

    return () => clearTimeout(timeoutId);
  }, [preferences, isLoaded, autoSave, saveDelay, storageKey]);

  // Funzione per aggiornare una singola preferenza
  const updatePreference = <K extends keyof FilterPreferences>(
    key: K,
    value: FilterPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  // Funzione per aggiornare multiple preferenze
  const updatePreferences = (updates: Partial<FilterPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  // Funzione per resettare le preferenze
  const resetPreferences = () => {
    setPreferences(defaultValues);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Errore nella rimozione preferenze filtri:', error);
    }
  };

  // Funzione per salvare manualmente (se autoSave è false)
  const savePreferences = () => {
    try {
      const filteredPreferences = Object.entries(preferences).reduce((acc, [key, value]) => {
        if (value && value !== 'all' && value !== 'date_desc') {
          acc[key as keyof FilterPreferences] = value;
        }
        return acc;
      }, {} as FilterPreferences);

      if (Object.keys(filteredPreferences).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(filteredPreferences));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Errore nel salvataggio manuale preferenze filtri:', error);
    }
  };

  return {
    preferences,
    isLoaded,
    updatePreference,
    updatePreferences,
    resetPreferences,
    savePreferences
  };
} 