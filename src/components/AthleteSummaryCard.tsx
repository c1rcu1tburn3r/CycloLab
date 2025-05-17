'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Athlete } from "@/lib/types";
import { differenceInYears, parseISO } from 'date-fns';
import { UserCircle2 } from 'lucide-react'; // Icona utente

interface AthleteSummaryCardProps {
  athlete: Athlete | null;
}

const AthleteSummaryCard: React.FC<AthleteSummaryCardProps> = ({ athlete }) => {
  if (!athlete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-600">Riepilogo Atleta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Dati atleta non disponibili.</p>
        </CardContent>
      </Card>
    );
  }

  const calculateAge = (birthDate: string | null): string => {
    if (!birthDate) return "N/D";
    try {
      // Assumiamo che birthDate sia in formato YYYY-MM-DD come da input type="date"
      const age = differenceInYears(new Date(), parseISO(birthDate));
      return age >= 0 ? `${age} anni` : "N/D";
    } catch (error) {
      console.error("Error parsing birth date:", error);
      return "N/D";
    }
  };

  const age = calculateAge(athlete.birth_date);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          {athlete.avatar_url ? (
            <img src={athlete.avatar_url} alt={`Avatar di ${athlete.name}`} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <UserCircle2 className="h-12 w-12 text-slate-400" />
          )}
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800">
              {athlete.name} {athlete.surname}
            </CardTitle>
            {athlete.nationality && (
                 <p className="text-xs text-slate-500">{athlete.nationality}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm md:grid-cols-2">
          <div className="flex justify-between py-1 border-b border-slate-100 md:border-none">
            <dt className="text-slate-500">Età:</dt>
            <dd className="text-slate-700 font-medium">{age}</dd>
          </div>
          {/* Aggiungere altre info qui se necessario, es. altezza/peso più recenti se non sono nel cruscotto stats */}
          {/* <div className="flex justify-between py-1 border-b border-slate-100 md:border-none">
            <dt className="text-slate-500">Altezza:</dt>
            <dd className="text-slate-700 font-medium">{athlete.height_cm ? `${athlete.height_cm} cm` : 'N/D'}</dd>
          </div> */}
        </dl>
      </CardContent>
    </Card>
  );
};

export default AthleteSummaryCard; 