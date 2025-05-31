'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Athlete } from '@/lib/types';

interface AthleteCardProps {
  athlete: Athlete;
  index: number;
}

// Funzione per calcolare l'età
function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'N/D';
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age.toString() : 'N/D';
  } catch {
    return 'N/D';
  }
}

export default function AthleteCard({ athlete, index }: AthleteCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setIsLoading(true);
  };

  const handleMouseEnter = () => {
    // Preload della pagina quando l'utente fa hover
    router.prefetch(`/athletes/${athlete.id}/edit`);
  };

  return (
    <div
      className="stats-card group animate-slide-up hover:scale-[1.02] transition-all duration-300 relative"
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.3s' }}></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Caricamento...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Preparazione dati atleta</p>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}

      <Link href={`/athletes/${athlete.id}/edit`} onClick={handleClick} className="block h-full flex flex-col">
        {/* Avatar Section */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            {athlete.avatar_url ? (
              <div className="w-20 h-20 mx-auto overflow-hidden rounded-2xl border-2 border-blue-200/50 dark:border-blue-700/50 shadow-lg group-hover:border-blue-400/50 dark:group-hover:border-blue-500/50 transition-all duration-300">
                <img 
                  src={athlete.avatar_url} 
                  alt={`${athlete.name} ${athlete.surname}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:shadow-xl transition-all duration-300">
                {athlete.name.charAt(0).toUpperCase()}{athlete.surname.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Status Indicator */}
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {athlete.name} {athlete.surname}
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 flex-grow">
          <div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Età</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{calculateAge(athlete.birth_date)}</div>
          </div>
          
          <div className="bg-orange-50/50 dark:bg-orange-900/30 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">FTP</div>
            <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {athlete.current_ftp ? `${athlete.current_ftp}W` : 'N/D'}
            </div>
          </div>
          
          <div className="bg-emerald-50/50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Altezza</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{athlete.height_cm ? `${athlete.height_cm}cm` : 'N/D'}</div>
          </div>
          
          <div className="bg-purple-50/50 dark:bg-purple-900/30 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Peso</div>
            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{athlete.weight_kg ? `${athlete.weight_kg}kg` : 'N/D'}</div>
          </div>
        </div>
      </Link>
    </div>
  );
} 