'use client';

import { Zap } from 'lucide-react';

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
        <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">FTP non disponibile</p>
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

  const calculatedZones: PowerZone[] = zonesDefinition.map(zone => {
    const low = Math.round((zone.minPercent / 100) * currentFtp);
    const high = zone.maxPercent ? Math.round((zone.maxPercent / 100) * currentFtp) : null;
    return {
      ...zone,
      wattsLow: low,
      wattsHigh: high ? `${high} W` : `> ${low - 1} W`
    };
  });

  return (
    <div className="space-y-3">
      {calculatedZones.map((zone, index) => (
        <div 
          key={zone.name} 
          className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200 group"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={`font-bold text-lg w-8 ${zone.color} group-hover:scale-110 transition-transform`}>
                {zone.name}
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {zone.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {zone.minPercent}% - {zone.maxPercent ? `${zone.maxPercent}%` : '150%+'} FTP
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-bold text-gray-900 dark:text-white">
              {zone.wattsLow} - {zone.wattsHigh}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PowerZonesDisplay; 