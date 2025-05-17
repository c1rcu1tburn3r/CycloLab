'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'; // Icone per trend (esempio)

interface CurrentAthleteStatsProps {
  currentWeight: number | null;
  currentFtp: number | null;
  currentWPerKg: number | null;
  // Potremmo aggiungere in futuro valori precedenti per calcolare e mostrare un trend
  // previousWeight?: number | null;
  // previousFtp?: number | null;
}

const StatCard: React.FC<{
  title: string;
  value: string | number | null;
  unit: string;
  icon?: React.ReactNode;
  trendIcon?: React.ReactNode;
  description?: string;
}> = ({ title, value, unit, icon, trendIcon, description }) => {
  const displayValue = value !== null && value !== undefined ? value : "N/D";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800">
          {displayValue} <span className="text-xs font-normal text-slate-500">{value !== null && value !== undefined ? unit : ''}</span>
        </div>
        {description && (
          <p className="text-xs text-slate-500 pt-1">{description}</p>
        )}
        {/* Esempio di visualizzazione trend (da implementare con logica se necessario) */}
        {/* {trendIcon && <div className="flex items-center text-xs text-slate-500">{trendIcon} Dall'ultima misurazione</div>} */}
      </CardContent>
    </Card>
  );
};

const CurrentAthleteStats: React.FC<CurrentAthleteStatsProps> = ({ 
  currentWeight,
  currentFtp,
  currentWPerKg 
}) => {
  // Icone di esempio da lucide-react (possono essere personalizzate o rimosse)
  // const WeightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-slate-500"><path d="M12 3L12 21M5 12H19M12 3C14.7614 3 17 5.23858 17 8C17 10.7614 14.7614 13 12 13C9.23858 13 7 10.7614 7 8C7 5.23858 9.23858 3 12 3Z"/></svg>; // Esempio icona bilancia
  // const FtpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-slate-500"><path d="M12 2L12 7M12 22L12 17M22 12L17 12M2 12L7 12M19.09 19.09L15.54 15.54M4.91 4.91L8.46 8.46M19.09 4.91L15.54 8.46M4.91 19.09L8.46 15.54M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"/></svg>; // Esempio icona potenza

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <StatCard 
        title="Peso Attuale"
        value={currentWeight}
        unit="kg"
        // icon={<WeightIcon/>}
        description="Ultima misurazione registrata"
      />
      <StatCard 
        title="FTP Attuale"
        value={currentFtp}
        unit="W"
        // icon={<FtpIcon/>}
        description="Ultima misurazione registrata"
      />
      <StatCard 
        title="W/kg Attuali"
        value={currentWPerKg}
        unit="W/kg"
        // icon={<TrendingUp className="h-4 w-4 text-green-500"/>}
        description="Calcolato da FTP e Peso attuali"
      />
    </div>
  );
};

export default CurrentAthleteStats; 