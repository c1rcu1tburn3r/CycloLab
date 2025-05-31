/**
 * Componente per visualizzare VO2max calcolato scientificamente
 * Utilizza la nuova libreria vo2maxCalculations.ts
 */

'use client';

import { useMemo } from 'react';
import { calculateVO2max, evaluateVO2maxQuality, type VO2maxInput, type VO2maxResult } from '@/lib/vo2maxCalculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, AlertCircle } from 'lucide-react';

interface VO2maxDisplayProps {
  // Dati atleta
  birth_date?: string;
  sex?: 'M' | 'F';
  weight_kg?: number;
  
  // Dati performance
  ftp_watts?: number;
  
  // Personal bests
  pb_power_300s_watts?: number;  // PPO 5 min
  pb_power_60s_watts?: number;   // PPO 1 min
  pb_power_1200s_watts?: number; // PPO 20 min
  
  // Opzioni display
  showDetails?: boolean;
  className?: string;
}

export default function VO2maxDisplay({
  birth_date,
  sex,
  weight_kg,
  ftp_watts,
  pb_power_300s_watts,
  pb_power_60s_watts,
  pb_power_1200s_watts,
  showDetails = true,
  className = ""
}: VO2maxDisplayProps) {
  
  const vo2maxResult: VO2maxResult = useMemo(() => {
    const input: VO2maxInput = {
      birth_date,
      sex,
      weight_kg,
      ftp_watts,
      pb_power_300s_watts,
      pb_power_60s_watts,
      pb_power_1200s_watts
    };
    
    return calculateVO2max(input);
  }, [birth_date, sex, weight_kg, ftp_watts, pb_power_300s_watts, pb_power_60s_watts, pb_power_1200s_watts]);

  const quality = useMemo(() => {
    if (vo2maxResult.vo2max === 0) return null;
    
    const age = birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : undefined;
    return evaluateVO2maxQuality(vo2maxResult.vo2max, age, sex);
  }, [vo2maxResult.vo2max, birth_date, sex]);

  // Colori per confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Colori per categoria qualità
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'superior': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'very_good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'good': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
      case 'fair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'poor': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (vo2maxResult.vo2max === 0) {
    return (
      <Card className={`${className} border-amber-200 dark:border-amber-800`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            VO2max Non Calcolabile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {vo2maxResult.reasoning}
          </p>
          {vo2maxResult.adaptiveMessage && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              💡 {vo2maxResult.adaptiveMessage}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} stats-card-bg border-blue-200 dark:border-blue-800`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          VO2max Stimato
        </CardTitle>
        <CardDescription>
          Calcolo scientifico basato su {vo2maxResult.method === 'storer_ppo' ? 'Formula Storer' : 
                                        vo2maxResult.method === 'storer_cp' ? 'Formula Storer (CP)' :
                                        vo2maxResult.method === 'ftp_advanced' ? 'FTP Avanzato' : 'FTP Base'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Valore principale */}
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {vo2maxResult.vo2max}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            ml/kg/min
          </div>
        </div>

        {/* Qualità e percentile */}
        {quality && (
          <div className="flex flex-col items-center gap-2">
            <Badge className={getCategoryColor(quality.category)}>
              {quality.description}
            </Badge>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Percentile: {quality.percentile}
            </div>
          </div>
        )}

        {/* Confidence */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">Affidabilità:</span>
          <span className={`text-xs font-medium ${getConfidenceColor(vo2maxResult.confidence)}`}>
            {Math.round(vo2maxResult.confidence * 100)}%
          </span>
        </div>

        {/* Dettagli se richiesti */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Metodo utilizzato */}
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Metodo:</strong> {vo2maxResult.reasoning}
            </div>

            {/* Potenza utilizzata */}
            {vo2maxResult.powerUsed && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Potenza base:</strong> {vo2maxResult.powerUsed}W
              </div>
            )}

            {/* Messaggio adattivo */}
            {vo2maxResult.adaptiveMessage && (
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <Info className="w-3 h-3 inline mr-1 text-blue-600" />
                {vo2maxResult.adaptiveMessage}
              </div>
            )}

            {/* Suggerimenti per migliorare l'accuratezza */}
            {vo2maxResult.confidence < 0.8 && (
              <div className="text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3 h-3 inline mr-1 text-amber-600" />
                <strong>Per maggiore accuratezza:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  {!sex && <li>Aggiungi il sesso biologico</li>}
                  {!birth_date && <li>Aggiungi la data di nascita</li>}
                  {!pb_power_300s_watts && <li>Effettua un test PPO 5 minuti</li>}
                  {vo2maxResult.method === 'ftp_basic' && <li>Aggiungi età e sesso per calcoli avanzati</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 