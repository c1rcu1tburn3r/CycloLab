'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";
import { estimateFTPFromActivities, shouldSuggestFTPUpdate, formatFTPSuggestionMessage, type FTPEstimationResult } from "@/lib/ftpEstimation";
import { createClient } from '@/utils/supabase/client';
import { saveAthleteProfileEntry } from '@/app/athletes/athleteProfileActions';

// Import dei componenti per ogni tab
import OverviewTab from './tabs/OverviewTab';
import PowerAnalysisTab from './tabs/PowerAnalysisTab';
import TrainingLoadTab from './tabs/TrainingLoadTab';
import PerformanceTrendsTab from './tabs/PerformanceTrendsTab';
import ClimbingAnalysisTab from './tabs/ClimbingAnalysisTab';

type TabId = 'overview' | 'power' | 'training-load' | 'trends' | 'climbing';

interface PerformanceAnalyticsDashboardProps {
  athleteId: string;
  athlete: Athlete;
  userId: string;
}

interface TabConfig {
  id: TabId;
  label: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

// Validazione range FTP realistici per tutti i livelli
const FTP_VALIDATION_RANGES = {
  absolute: { min: 80, max: 600 }, // 80W (principiante) - 600W (professionista elite)
  wPerKg: { 
    min: 1.0,  // Principiante assoluto o in riabilitazione
    max: 8.5   // Elite mondiale (Pogačar, Vingegaard territory)
  }
};

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Riepilogo generale e Performance Management Chart',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'power',
    label: 'Power Analysis',
    description: 'Curve di potenza, distribuzione e personal bests',
    badge: 'Nuovo',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'training-load',
    label: 'Training Load',
    description: 'Carico di allenamento, fatica e forma fisica',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'trends',
    label: 'Performance Trends',
    description: 'Confronti temporali e analisi miglioramenti',
    badge: 'Nuovo',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    id: 'climbing',
    label: 'Climbing Analysis',
    description: 'Analisi salite e performance su segmenti',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
];

export default function PerformanceAnalyticsDashboard({
  athleteId,
  athlete,
  userId,
}: PerformanceAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [ftpEstimation, setFtpEstimation] = useState<FTPEstimationResult | null>(null);
  const [showFtpSuggestion, setShowFtpSuggestion] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<{
    ftp: number | null;
    weight: number | null;
    lastMeasurementDate: string | null;
  }>({
    ftp: null,
    weight: null,
    lastMeasurementDate: null
  });

  // Quick Update Panel states
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newFTP, setNewFTP] = useState('');
  const [ftpSource, setFtpSource] = useState<'test' | 'estimate' | 'activity'>('test');
  const [isUpdating, setIsUpdating] = useState(false);

  const { showSuccess, showError } = useCycloLabToast();

  // Calcola metriche dalle informazioni del profilo corrente
  const currentFTP = currentProfile.ftp;
  const currentWeight = currentProfile.weight;
  const currentWPerKg = currentFTP && currentWeight ? (currentFTP / currentWeight).toFixed(2) : 'N/A';
  const lastMeasurementDate = currentProfile.lastMeasurementDate;

  // Carica dati e analizza FTP automaticamente
  useEffect(() => {
    const loadDataAndAnalyzeFTP = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // Carica il profilo più recente dell'atleta
        const { data: profileEntry, error: profileError } = await supabase
          .from('athlete_profile_entries')
          .select('ftp_watts, weight_kg, effective_date')
          .eq('athlete_id', athleteId)
          .order('effective_date', { ascending: false })
          .limit(1)
          .single();
        
        if (profileEntry && !profileError) {
          setCurrentProfile({
            ftp: profileEntry.ftp_watts || null,
            weight: profileEntry.weight_kg || null,
            lastMeasurementDate: profileEntry.effective_date || null
          });
        } else {
          console.log('Nessun profilo trovato per l\'atleta:', profileError?.message);
        }
        
        // Carica attività reali dell'atleta (ultimi 3 mesi per analisi FTP)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            id,
            activity_date,
            title,
            duration_seconds,
            avg_power_watts,
            max_power_watts,
            normalized_power_watts,
            intensity_factor
          `)
          .eq('athlete_id', athleteId)
          .gte('activity_date', threeMonthsAgo.toISOString().split('T')[0])
          .order('activity_date', { ascending: false })
          .limit(100); // Limit ragionevole per analisi
        
        if (activitiesError) {
          console.warn('Errore caricamento attività:', activitiesError.message);
        }
        
        const loadedActivities = activities || [];
        setActivities(loadedActivities);
        
        // Stima FTP dalle attività se ci sono dati sufficienti
        if (loadedActivities.length > 0) {
          const estimation = estimateFTPFromActivities(loadedActivities as any[], profileEntry?.ftp_watts || null);
          
          if (estimation && shouldSuggestFTPUpdate(estimation, profileEntry?.ftp_watts || null)) {
            setFtpEstimation(estimation);
            setShowFtpSuggestion(true);
            setNewFTP(estimation.estimatedFTP.toString());
            setFtpSource('activity');
          }
        }
        
      } catch (error) {
        console.error('Errore caricamento dati:', error);
        showError('Errore nel caricamento dei dati del profilo');
      } finally {
        setIsLoading(false);
      }
    };

    loadDataAndAnalyzeFTP();
  }, [athleteId]);

  // Gestisci suggerimento FTP automatico
  const handleAcceptFTPSuggestion = () => {
    if (ftpEstimation) {
      setNewFTP(ftpEstimation.estimatedFTP.toString());
      setFtpSource('activity');
      setShowUpdatePanel(true);
      setShowFtpSuggestion(false);
    }
  };

  const handleDismissFTPSuggestion = () => {
    setShowFtpSuggestion(false);
    setFtpEstimation(null);
  };

  // Validazione misurazioni
  const validateMeasurements = () => {
    const errors: string[] = [];
    const ftp = parseFloat(newFTP);
    const weight = parseFloat(newWeight);

    if (newFTP && (isNaN(ftp) || ftp < FTP_VALIDATION_RANGES.absolute.min || ftp > FTP_VALIDATION_RANGES.absolute.max)) {
      errors.push(`FTP deve essere tra ${FTP_VALIDATION_RANGES.absolute.min}W e ${FTP_VALIDATION_RANGES.absolute.max}W`);
    }

    if (newWeight && (isNaN(weight) || weight < 30 || weight > 200)) {
      errors.push('Peso deve essere tra 30kg e 200kg');
    }

    if (newFTP && newWeight) {
      const wPerKg = ftp / weight;
      if (wPerKg < FTP_VALIDATION_RANGES.wPerKg.min || wPerKg > FTP_VALIDATION_RANGES.wPerKg.max) {
        errors.push(`W/kg risultante (${wPerKg.toFixed(2)}) deve essere tra ${FTP_VALIDATION_RANGES.wPerKg.min} e ${FTP_VALIDATION_RANGES.wPerKg.max}`);
      }
    }

    return errors.length === 0;
  };

  const handleUpdateMeasurements = async () => {
    if (!validateMeasurements()) return;

    setIsUpdating(true);
    
    try {
      // Usa l'API reale per salvare il profilo atleta
      const result = await saveAthleteProfileEntry(athleteId, {
        effectiveDate: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        ftp: newFTP ? parseFloat(newFTP) : null,
        weight: newWeight ? parseFloat(newWeight) : null,
      });
      
      if (result.success) {
        // Aggiorna lo stato locale con i nuovi valori
        setCurrentProfile({
          ftp: newFTP ? parseFloat(newFTP) : currentProfile.ftp,
          weight: newWeight ? parseFloat(newWeight) : currentProfile.weight,
          lastMeasurementDate: new Date().toISOString().split('T')[0]
        });
        
        // Reset form e chiudi dialog
        setNewFTP('');
        setNewWeight('');
        setFtpSource('test');
        setShowUpdatePanel(false);
        
        // Messaggio di successo specifico per stima automatica
        if (ftpSource === 'activity' && ftpEstimation) {
          showSuccess(`FTP aggiornato a ${newFTP}W tramite stima automatica (${ftpEstimation.method.replace('_', ' ')})`);
        } else {
          showSuccess('Misurazioni aggiornate con successo');
        }
      } else {
        showError(result.error || 'Errore durante il salvataggio');
      }
      
    } catch (error) {
      console.error('Errore aggiornamento misurazioni:', error);
      showError('Errore durante il salvataggio delle misurazioni');
    } finally {
      setIsUpdating(false);
    }
  };

  // Determina se le misurazioni sono obsolete (più di 30 giorni)
  const measurementsAreOld = () => {
    if (!lastMeasurementDate) return true; // Se non c'è data, considera obsoleto
    const lastDate = new Date(lastMeasurementDate!);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastDate < thirtyDaysAgo;
  };

  return (
    <div className="space-y-6">
      {/* Quick Update Panel */}
      <Card className={`border-2 ${measurementsAreOld() ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' : 'border-blue-200 bg-blue-50 dark:bg-blue-900/10'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${measurementsAreOld() ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                <svg className={`w-4 h-4 ${measurementsAreOld() ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Ultima misurazione:</span>
                  <span className="font-semibold">
                    FTP: {currentFTP ? `${currentFTP}W` : 'N/D'} • Peso: {currentWeight ? `${currentWeight}kg` : 'N/D'} • W/kg: {currentWPerKg || 'N/D'}
                  </span>
                  <span className="text-gray-500">
                    {lastMeasurementDate ? `(${new Date(lastMeasurementDate).toLocaleDateString('it-IT')})` : '(Nessuna misurazione)'}
                  </span>
                </div>
                {measurementsAreOld() && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ I dati sono vecchi di oltre 30 giorni. Aggiorna per analisi più accurate.
                  </p>
                )}
              </div>
            </div>
            
            <Dialog open={showUpdatePanel} onOpenChange={setShowUpdatePanel}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Aggiorna Misurazioni
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Aggiorna Misurazioni</DialogTitle>
                  <DialogDescription>
                    Inserisci nuovi valori di FTP e/o peso per mantenere aggiornate le analisi.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* FTP */}
                  <div className="space-y-2">
                    <Label htmlFor="ftp">FTP (Watt)</Label>
                    <Input
                      id="ftp"
                      type="number"
                      min={FTP_VALIDATION_RANGES.absolute.min}
                      max={FTP_VALIDATION_RANGES.absolute.max}
                      placeholder={currentFTP ? `Attuale: ${currentFTP}W` : 'Es. 250W'}
                      value={newFTP}
                      onChange={(e) => setNewFTP(e.target.value)}
                    />
                    {ftpSource === 'activity' && ftpEstimation && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Valore stimato automaticamente ({ftpEstimation.method.replace('_', ' ')})
                      </div>
                    )}
                  </div>

                  {/* Fonte FTP */}
                  {newFTP && (
                    <div className="space-y-2">
                      <Label htmlFor="ftp-source">Come hai ottenuto questo FTP?</Label>
                      <Select value={ftpSource} onValueChange={(value: 'test' | 'estimate' | 'activity') => setFtpSource(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">Test specifico (20min, 8min, etc.)</SelectItem>
                          <SelectItem value="activity">Da attività recente</SelectItem>
                          <SelectItem value="estimate">Stima personale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Peso */}
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="30"
                      max="200"
                      step="0.1"
                      placeholder={currentWeight ? `Attuale: ${currentWeight}kg` : 'Es. 70.5kg'}
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                    />
                  </div>

                  {/* W/kg Preview */}
                  {newFTP && newWeight && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium">
                        W/kg risultante: {(parseFloat(newFTP) / parseFloat(newWeight)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowUpdatePanel(false)}>
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleUpdateMeasurements}
                    disabled={(!newFTP && !newWeight) || isUpdating}
                  >
                    {isUpdating ? 'Aggiornamento...' : 'Salva Misurazioni'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Banner Suggerimento FTP Automatico */}
      {showFtpSuggestion && ftpEstimation && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  🎯 FTP Stimato Automaticamente
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                  {formatFTPSuggestionMessage(ftpEstimation, currentFTP)}
                </p>
                <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
                  <span>
                    <strong>Metodo:</strong> {ftpEstimation.method.replace('_', ' ')}
                  </span>
                  <span>
                    <strong>Confidenza:</strong> {Math.round(ftpEstimation.confidence * 100)}%
                  </span>
                  {ftpEstimation.sourceActivity && (
                    <span>
                      <strong>Da attività:</strong> {ftpEstimation.sourceActivity.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismissFTPSuggestion}
                className="text-blue-600 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
              >
                Ignora
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptFTPSuggestion}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Aggiorna FTP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Metriche Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">FTP Attuale</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentFTP ? `${currentFTP} W` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">W/kg</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentWPerKg}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Forma Attuale</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    In Forma
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {TABS_CONFIG.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-400"
            >
              {tab.icon}
              <span className="hidden md:block">{tab.label}</span>
              <span className="md:hidden text-xs">{tab.label.split(' ')[0]}</span>
              {tab.badge && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Contents */}
        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            <Suspense fallback={<LoadingSkeleton />}>
              <OverviewTab athleteId={athleteId} athlete={athlete} />
            </Suspense>
          </TabsContent>

          <TabsContent value="power" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {TABS_CONFIG[1].icon}
                  Power Analysis
                  <Badge variant="secondary">Nuovo</Badge>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {TABS_CONFIG[1].description}
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSkeleton />}>
                  <PowerAnalysisTab athleteId={athleteId} athlete={athlete} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training-load" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {TABS_CONFIG[2].icon}
                  Training Load
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {TABS_CONFIG[2].description}
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSkeleton />}>
                  <TrainingLoadTab athleteId={athleteId} athlete={athlete} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {TABS_CONFIG[3].icon}
                  Performance Trends
                  <Badge variant="secondary">Nuovo</Badge>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {TABS_CONFIG[3].description}
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSkeleton />}>
                  <PerformanceTrendsTab athleteId={athleteId} athlete={athlete} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="climbing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {TABS_CONFIG[4].icon}
                  Climbing Analysis
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {TABS_CONFIG[4].description}
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSkeleton />}>
                  <ClimbingAnalysisTab athleteId={athleteId} athlete={athlete} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 