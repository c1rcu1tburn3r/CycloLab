'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";
import { Card as DesignCard } from '@/components/design-system';

interface PreferencesTabProps {
  user: User;
}

export default function PreferencesTab({ user }: PreferencesTabProps) {
  const { showSuccess, showError } = useCycloLabToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [preferences, setPreferences] = useState({
    // Notifiche
    emailNotifications: user.user_metadata?.email_notifications ?? true,
    performanceAlerts: user.user_metadata?.performance_alerts ?? true,
    weeklyReports: user.user_metadata?.weekly_reports ?? true,
    coachUpdates: user.user_metadata?.coach_updates ?? true,
    
    // Interfaccia
    theme: user.user_metadata?.theme ?? 'system',
    language: user.user_metadata?.language ?? 'it',
    dateFormat: user.user_metadata?.date_format ?? 'dd/MM/yyyy',
    unitSystem: user.user_metadata?.unit_system ?? 'metric',
    
    // Analytics
    shareAnonymousData: user.user_metadata?.share_anonymous_data ?? false,
    advancedMetrics: user.user_metadata?.advanced_metrics ?? false,
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitchChange = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectChange = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...preferences,
          preferences_updated_at: new Date().toISOString(),
        }
      });

      if (error) {
        throw new Error(`Errore salvataggio preferenze: ${error.message}`);
      }

      showSuccess('Preferenze salvate', 'Le tue impostazioni sono state aggiornate con successo');
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a1.5 1.5 0 010-2.12l.7-.7a1 1 0 00.3-.7V6a6 6 0 10-12 0v4.58a1 1 0 00.3.7l.7.7a1.5 1.5 0 010 2.12L3 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            Notifiche
          </CardTitle>
          <CardDescription>
            Gestisci quando e come ricevere le notifiche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications" className="text-sm font-medium">
                  Notifiche Email
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ricevi aggiornamenti importanti via email
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => handleSwitchChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="performanceAlerts" className="text-sm font-medium">
                  Alert Performance
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notifiche per nuovi record e miglioramenti
                </p>
              </div>
              <Switch
                id="performanceAlerts"
                checked={preferences.performanceAlerts}
                onCheckedChange={(checked) => handleSwitchChange('performanceAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weeklyReports" className="text-sm font-medium">
                  Report Settimanali
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Riassunto delle attività della settimana
                </p>
              </div>
              <Switch
                id="weeklyReports"
                checked={preferences.weeklyReports}
                onCheckedChange={(checked) => handleSwitchChange('weeklyReports', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="coachUpdates" className="text-sm font-medium">
                  Aggiornamenti Coach
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notifiche per nuovi atleti e attività
                </p>
              </div>
              <Switch
                id="coachUpdates"
                checked={preferences.coachUpdates}
                onCheckedChange={(checked) => handleSwitchChange('coachUpdates', checked)}
              />
            </div>
          </div>
        </CardContent>
      </DesignCard>

      {/* Interface Preferences */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            Interfaccia
          </CardTitle>
          <CardDescription>
            Personalizza l'aspetto e il comportamento dell'app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Tema</Label>
              <Select value={preferences.theme} onValueChange={(value) => handleSelectChange('theme', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Chiaro</SelectItem>
                  <SelectItem value="dark">Scuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Lingua</Label>
              <Select value={preferences.language} onValueChange={(value) => handleSelectChange('language', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona lingua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Formato Data</Label>
              <Select value={preferences.dateFormat} onValueChange={(value) => handleSelectChange('dateFormat', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">31/12/2023</SelectItem>
                  <SelectItem value="MM/dd/yyyy">12/31/2023</SelectItem>
                  <SelectItem value="yyyy-MM-dd">2023-12-31</SelectItem>
                  <SelectItem value="dd MMM yyyy">31 Dec 2023</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitSystem">Sistema di Unità</Label>
              <Select value={preferences.unitSystem} onValueChange={(value) => handleSelectChange('unitSystem', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metrico (km, kg, °C)</SelectItem>
                  <SelectItem value="imperial">Imperiale (mi, lb, °F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </DesignCard>

      {/* Analytics Preferences */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            Analytics e Dati
          </CardTitle>
          <CardDescription>
            Controlla come vengono utilizzati i tuoi dati per migliorare il servizio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shareAnonymousData" className="text-sm font-medium">
                  Condivisione Dati Anonimi
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Aiutaci a migliorare il servizio condividendo statistiche anonime
                </p>
              </div>
              <Switch
                id="shareAnonymousData"
                checked={preferences.shareAnonymousData}
                onCheckedChange={(checked) => handleSwitchChange('shareAnonymousData', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="advancedMetrics" className="text-sm font-medium">
                  Metriche Avanzate
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mostra statistiche dettagliate e analisi approfondite
                </p>
              </div>
              <Switch
                id="advancedMetrics"
                checked={preferences.advancedMetrics}
                onCheckedChange={(checked) => handleSwitchChange('advancedMetrics', checked)}
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Privacy rispettata
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  I dati anonimi non contengono informazioni personali identificabili e vengono utilizzati solo per migliorare l'esperienza utente e le funzionalità della piattaforma.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </DesignCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSavePreferences}
          disabled={isLoading}
          className="min-w-32"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salva Preferenze
            </>
          )}
        </Button>
      </div>

      {/* Last Updated Info */}
      {user.user_metadata?.preferences_updated_at && (
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ultimo aggiornamento: {new Date(user.user_metadata.preferences_updated_at).toLocaleDateString('it-IT', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  );
} 