'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAthleteOverallPersonalBests, OverallPbRecord } from '@/app/athletes/[id]/pbActions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { spacing } from '@/lib/design-system';

interface OverallPersonalBestsTableProps {
  athleteId: string;
}

// Funzione helper per formattare le durate dei PB in modo leggibile
function formatPbDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds === 60) return '1min';
  if (seconds === 300) return '5min';
  if (seconds === 600) return '10min';
  if (seconds === 1200) return '20min';
  if (seconds === 1800) return '30min';
  if (seconds === 3600) return '1h';
  if (seconds === 5400) return '1h 30min';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${minutes}min`;
  return `${minutes}m ${secs}s`;
}

const OverallPersonalBestsTable: React.FC<OverallPersonalBestsTableProps> = ({ athleteId }) => {
  const [pbData, setPbData] = useState<OverallPbRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) return;

    const fetchPBs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAthleteOverallPersonalBests(athleteId);
        if (result.error) {
          setError(result.error);
          setPbData([]);
        } else if (result.data) {
          setPbData(result.data);
        }
      } catch (err: any) {
        setError('Si è verificato un errore imprevisto durante il caricamento dei PB.');
        console.error(err);
        setPbData([]);
      }
      setIsLoading(false);
    };

    fetchPBs();
  }, [athleteId]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Caricamento record personali...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 text-red-300 dark:text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-600 dark:text-red-400 mb-2">Errore nel caricamento</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
      </div>
    );
  }

  if (pbData.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 mb-2">Nessun record trovato</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Non sono ancora stati registrati personal best per questo atleta
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
          <thead className="bg-gray-50/50 dark:bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Durata
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Potenza
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Data Record
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Attività
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Registrato il
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/30 dark:divide-gray-700/30">
            {pbData.map((pb, index) => (
              <tr 
                key={pb.duration_seconds} 
                className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-125 transition-transform"></div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatPbDuration(pb.duration_seconds)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-bold text-orange-600 dark:text-orange-400">
                    {pb.value_watts} W
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-700 dark:text-gray-300">
                    {format(new Date(pb.activity_date), 'dd MMM yyyy', { locale: it })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    href={`/activities/${pb.activity_id}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
                  >
                    {pb.activity_title || 'Vedi attività'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(pb.achieved_at), 'dd MMM yyyy, HH:mm', { locale: it })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OverallPersonalBestsTable; 