'use client';

import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system';
import { spacing } from '@/lib/design-system';

interface PowerZonesDisplayProps {
  currentFtp: number | null;
}

interface PowerZone {
  name: string;
  description: string;
  minPercent: number;
  maxPercent: number | null;
  wattsLow: number;
  wattsHigh: string;
  color: string;
}

const PowerZonesDisplay: React.FC<PowerZonesDisplayProps> = ({ currentFtp }) => {
  if (currentFtp === null || currentFtp <= 0) {
    return (
      <div className="text-center py-8">
        <Zap className={`w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto ${spacing.bottom.md}`} />
        <p className={`text-gray-500 dark:text-gray-400 ${spacing.bottom.sm}`}>FTP non disponibile</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Aggiungi un valore FTP per visualizzare le zone di potenza
        </p>
      </div>
    );
  }

  const zonesDefinition = [
    { name: "Z1", description: "Recupero Attivo", minPercent: 0, maxPercent: 55, color: "text-gray-500" },
    { name: "Z2", description: "Resistenza", minPercent: 56, maxPercent: 75, color: "text-blue-500" },
    { name: "Z3", description: "Tempo", minPercent: 76, maxPercent: 90, color: "text-green-500" },
    { name: "Z4", description: "Soglia Lattacida", minPercent: 91, maxPercent: 105, color: "text-yellow-500" },
    { name: "Z5", description: "VO2 Max", minPercent: 106, maxPercent: 120, color: "text-orange-500" },
    { name: "Z6", description: "Capacità Anaerobica", minPercent: 121, maxPercent: 150, color: "text-red-500" },
    { name: "Z7", description: "Potenza Neuromuscolare", minPercent: 151, maxPercent: null, color: "text-purple-500" },
  ];

  const calculatedZones: PowerZone[] = zonesDefinition.map((zone, index) => {
    const low = index === 0 ? 0 : Math.round((zone.minPercent / 100) * currentFtp);
    const high = zone.maxPercent ? Math.round((zone.maxPercent / 100) * currentFtp) : null;
    
    // Per zone continue, la zona successiva inizia dove finisce la precedente
    const adjustedLow = index === 0 ? 0 : 
      index === 1 ? Math.round((zonesDefinition[0].maxPercent! / 100) * currentFtp) + 1 :
      Math.round((zonesDefinition[index - 1].maxPercent! / 100) * currentFtp) + 1;
    
    return {
      ...zone,
      wattsLow: adjustedLow,
      wattsHigh: high ? `${adjustedLow} - ${high} W` : `${adjustedLow}+ W`
    };
  });

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className={spacing.bottom.md}>Zone di Potenza</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`space-y-3 ${spacing.all.md}`}>
          <div className={`space-y-2 ${spacing.vertical.sm}`}>
            {calculatedZones.map((zone, index) => (
              <Card key={index} variant="glass">
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg w-8 ${zone.color} group-hover:scale-110 transition-transform`}>
                      {zone.name}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {zone.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {zone.maxPercent ? `${zone.minPercent}% - ${zone.maxPercent}% FTP` : `${zone.minPercent}%+ FTP`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {zone.wattsHigh}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PowerZonesDisplay; 