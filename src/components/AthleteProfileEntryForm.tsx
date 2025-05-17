'use client';

import { useState, useTransition } from 'react';
import { saveAthleteProfileEntry, type SaveAthleteProfileEntryResult } from '../app/athletes/athleteProfileActions'; 
import { useRouter } from 'next/navigation';

interface AthleteProfileEntryFormProps {
  athleteId: string;
  onEntrySaved?: (result: SaveAthleteProfileEntryResult) => void; // Callback opzionale
}

export default function AthleteProfileEntryForm({ athleteId, onEntrySaved }: AthleteProfileEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default a oggi
  const [ftp, setFtp] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await saveAthleteProfileEntry(athleteId, {
        effectiveDate,
        ftp: ftp || null, // Invia null se stringa vuota
        weight: weight || null, // Invia null se stringa vuota
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Voce di profilo salvata con successo!' });
        setFtp('');
        setWeight('');
        router.refresh();
        if (onEntrySaved) {
          onEntrySaved(result);
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Si è verificato un errore sconosciuto.' });
        if (onEntrySaved) {
          onEntrySaved(result);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-700 mb-3">Aggiungi Nuova Voce al Profilo</h3>
      <div>
        <label htmlFor="effectiveDate" className="block text-sm font-medium text-slate-700 mb-1">
          Data Inizio Validità*
        </label>
        <input
          type="date"
          id="effectiveDate"
          name="effectiveDate"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
          disabled={isPending}
        />
      </div>
      <div>
        <label htmlFor="ftp" className="block text-sm font-medium text-slate-700 mb-1">
          FTP (watt)
        </label>
        <input
          type="number"
          id="ftp"
          name="ftp"
          value={ftp}
          onChange={(e) => setFtp(e.target.value)}
          placeholder="Es. 250"
          min="0"
          step="1"
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
          disabled={isPending}
        />
      </div>
      <div>
        <label htmlFor="weight" className="block text-sm font-medium text-slate-700 mb-1">
          Peso (kg)
        </label>
        <input
          type="number"
          id="weight"
          name="weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Es. 70.5"
          min="0"
          step="0.1"
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
          disabled={isPending}
        />
      </div>
      
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !effectiveDate}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        {isPending ? 'Salvataggio...' : 'Salva Voce Profilo'}
      </button>
    </form>
  );
} 