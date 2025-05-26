'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Activity, Athlete } from '@/lib/types';
import { 
  exportActivitiesToCSV, 
  exportActivitiesToJSON, 
  exportActivityStats,
  exportAthleteProfile,
  exportSingleActivity 
} from '@/lib/exportUtils';

interface ExportControlsProps {
  activities: Activity[];
  athlete?: Athlete;
  profileEntries?: any[];
  personalBests?: any[];
  className?: string;
}

type ExportFormat = 'csv' | 'json' | 'stats' | 'profile' | 'single';

export default function ExportControls({ 
  activities, 
  athlete, 
  profileEntries, 
  personalBests,
  className = '' 
}: ExportControlsProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (activities.length === 0) {
      alert('Nessuna attività da esportare');
      return;
    }

    setIsExporting(true);
    
    try {
      switch (selectedFormat) {
        case 'csv':
          exportActivitiesToCSV(activities);
          break;
        case 'json':
          exportActivitiesToJSON(activities);
          break;
        case 'stats':
          exportActivityStats(activities);
          break;
        case 'profile':
          if (athlete) {
            exportAthleteProfile(athlete, activities, profileEntries, personalBests);
          } else {
            alert('Dati atleta non disponibili per questo tipo di export');
            return;
          }
          break;
        case 'single':
          if (activities.length === 1) {
            exportSingleActivity(activities[0]);
          } else {
            alert('Seleziona una singola attività per questo tipo di export');
            return;
          }
          break;
        default:
          alert('Formato di export non supportato');
          return;
      }
      
      // Feedback positivo
      setTimeout(() => {
        alert('Export completato con successo!');
      }, 100);
      
    } catch (error) {
      console.error('Errore durante l\'export:', error);
      alert('Errore durante l\'export. Riprova.');
    } finally {
      setIsExporting(false);
    }
  };

  const getExportDescription = (format: ExportFormat): string => {
    switch (format) {
      case 'csv':
        return `Esporta ${activities.length} attività in formato CSV per Excel/Fogli Google`;
      case 'json':
        return `Backup completo di ${activities.length} attività in formato JSON`;
      case 'stats':
        return `Statistiche aggregate di ${activities.length} attività in formato CSV`;
      case 'profile':
        return athlete 
          ? `Profilo completo di ${athlete.name} ${athlete.surname} con tutte le statistiche`
          : 'Profilo atleta non disponibile';
      case 'single':
        return activities.length === 1 
          ? `Dettagli completi dell'attività selezionata`
          : `Seleziona una singola attività (attualmente: ${activities.length})`;
      default:
        return '';
    }
  };

  const isFormatDisabled = (format: ExportFormat): boolean => {
    switch (format) {
      case 'profile':
        return !athlete;
      case 'single':
        return activities.length !== 1;
      default:
        return activities.length === 0;
    }
  };

  return (
    <Card className={`${className} stats-card`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Dati
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selezione formato */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Formato Export
          </label>
          <Select value={selectedFormat} onValueChange={(value: ExportFormat) => setSelectedFormat(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv" disabled={isFormatDisabled('csv')}>
                📊 CSV - Attività per Excel
              </SelectItem>
              <SelectItem value="json" disabled={isFormatDisabled('json')}>
                💾 JSON - Backup Completo
              </SelectItem>
              <SelectItem value="stats" disabled={isFormatDisabled('stats')}>
                📈 CSV - Statistiche Aggregate
              </SelectItem>
              {athlete && (
                <SelectItem value="profile" disabled={isFormatDisabled('profile')}>
                  👤 JSON - Profilo Atleta Completo
                </SelectItem>
              )}
              <SelectItem value="single" disabled={isFormatDisabled('single')}>
                🎯 JSON - Singola Attività
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Descrizione formato selezionato */}
        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {getExportDescription(selectedFormat)}
          </p>
        </div>

        {/* Informazioni aggiuntive */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="font-medium text-gray-900 dark:text-white">Attività</div>
            <div className="text-gray-600 dark:text-gray-400">{activities.length} selezionate</div>
          </div>
          {athlete && (
            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="font-medium text-gray-900 dark:text-white">Atleta</div>
              <div className="text-gray-600 dark:text-gray-400">{athlete.name} {athlete.surname}</div>
            </div>
          )}
        </div>

        {/* Pulsante export */}
        <Button 
          onClick={handleExport}
          disabled={isExporting || activities.length === 0 || isFormatDisabled(selectedFormat)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isExporting ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Esportazione in corso...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Esporta Dati
            </>
          )}
        </Button>

        {/* Note informative */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• I file CSV possono essere aperti con Excel, Google Sheets o LibreOffice</p>
          <p>• I file JSON contengono tutti i dati strutturati per backup o analisi avanzate</p>
          <p>• I dati sensibili (percorsi file) vengono automaticamente rimossi dall'export</p>
        </div>
      </CardContent>
    </Card>
  );
} 