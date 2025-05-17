'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from 'lucide-react'; // Icona per potenza

interface PowerZonesDisplayProps {
  currentFtp: number | null;
}

interface PowerZone {
  name: string;
  description: string;
  minPercent: number;
  maxPercent: number | null; // Null per l'ultima zona (es. >150%)
  wattsLow: number;
  wattsHigh: string; // Può essere un numero o un formato tipo " > X W"
}

const PowerZonesDisplay: React.FC<PowerZonesDisplayProps> = ({ currentFtp }) => {
  if (currentFtp === null || currentFtp <= 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium text-slate-600">Zone di Potenza</CardTitle>
          <Zap className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            FTP non disponibile o non valido per calcolare le zone di potenza.
          </p>
        </CardContent>
      </Card>
    );
  }

  const zonesDefinition = [
    { name: "Z1", description: "Recupero Attivo", minPercent: 0, maxPercent: 55 },
    { name: "Z2", description: "Resistenza", minPercent: 56, maxPercent: 75 },
    { name: "Z3", description: "Tempo", minPercent: 76, maxPercent: 90 },
    { name: "Z4", description: "Soglia Lattacida", minPercent: 91, maxPercent: 105 },
    { name: "Z5", description: "VO2 Max", minPercent: 106, maxPercent: 120 },
    { name: "Z6", description: "Capacità Anaerobica", minPercent: 121, maxPercent: 150 },
    { name: "Z7", description: "Potenza Neuromuscolare", minPercent: 151, maxPercent: null },
  ];

  const calculatedZones: PowerZone[] = zonesDefinition.map(zone => {
    const low = Math.round((zone.minPercent / 100) * currentFtp);
    const high = zone.maxPercent ? Math.round((zone.maxPercent / 100) * currentFtp) : null;
    return {
      ...zone,
      wattsLow: low,
      wattsHigh: high ? `${high} W` : `> ${low -1} W` // Per l'ultima zona mostriamo > X
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-slate-600">Zone di Potenza (FTP: {currentFtp}W)</CardTitle>
        <Zap className="h-5 w-5 text-amber-500" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {calculatedZones.map((zone) => (
            <li key={zone.name} className="flex justify-between items-center py-1.5 px-2 rounded-md hover:bg-slate-50">
              <div className="flex items-center">
                <span className="font-semibold text-slate-700 w-8">{zone.name}</span>
                <span className="text-slate-500 text-xs md:text-sm truncate" title={zone.description}>{zone.description}</span>
              </div>
              <span className="font-medium text-slate-700 whitespace-nowrap">
                {zone.wattsLow} - {zone.wattsHigh}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PowerZonesDisplay; 