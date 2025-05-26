'use client';

import type { Athlete } from "@/lib/types";
import { differenceInYears, parseISO } from 'date-fns';
import { UserCircle2 } from 'lucide-react';

interface AthleteSummaryCardProps {
  athlete: Athlete | null;
}

const AthleteSummaryCard: React.FC<AthleteSummaryCardProps> = ({ athlete }) => {
  if (!athlete) {
    return (
      <div className="text-center py-8">
        <UserCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">Dati non disponibili</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Informazioni atleta non caricate</p>
      </div>
    );
  }

  const calculateAge = (birthDate: string | null): string => {
    if (!birthDate) return "N/D";
    try {
      const age = differenceInYears(new Date(), parseISO(birthDate));
      return age >= 0 ? `${age} anni` : "N/D";
    } catch (error) {
      console.error("Error parsing birth date:", error);
      return "N/D";
    }
  };

  const age = calculateAge(athlete.birth_date);

  return (
    <div className="space-y-4">
      {/* Avatar e Nome */}
      <div className="flex items-center gap-4">
        {athlete.avatar_url ? (
          <img 
            src={athlete.avatar_url} 
            alt={`Avatar di ${athlete.name}`} 
            className="w-12 h-12 rounded-2xl object-cover border-2 border-gray-200 dark:border-gray-700" 
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <UserCircle2 className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {athlete.name} {athlete.surname}
          </h3>
          
        </div>
      </div>

      {/* Informazioni Principali */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Età</p>
          <p className="font-semibold text-gray-900 dark:text-white">{age}</p>
        </div>
        
        <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Altezza</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {athlete.height_cm ? `${athlete.height_cm} cm` : 'N/D'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AthleteSummaryCard; 