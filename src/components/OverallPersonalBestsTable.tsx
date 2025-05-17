'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAthleteOverallPersonalBests, OverallPbRecord } from '@/app/athletes/[id]/pbActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assumendo che Card sia disponibile
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
  // Fallback per altre durate, anche se per ora usiamo solo quelle standard
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
      <Card>
        <CardHeader>
          <CardTitle>Record Personali di Potenza</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Caricamento record personali...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Record Personali di Potenza</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Errore nel caricamento dei record: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (pbData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Record Personali di Potenza</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Nessun record personale di potenza trovato per questo atleta.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Personali di Potenza (Complessivi)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durata
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Potenza (W)
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Record
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attività
                </th>
                 <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrato il
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pbData.map((pb) => (
                <tr key={pb.duration_seconds}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPbDuration(pb.duration_seconds)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {pb.value_watts}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {format(new Date(pb.activity_date), 'dd MMM yyyy', { locale: it })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 hover:underline">
                    <Link href={`/activities/${pb.activity_id}`}>
                      {pb.activity_title || 'Vedi attività'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                     {format(new Date(pb.achieved_at), 'dd MMM yyyy, HH:mm', { locale: it })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverallPersonalBestsTable; 