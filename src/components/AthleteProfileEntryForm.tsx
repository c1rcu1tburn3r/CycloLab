'use client';

import { useState, useTransition } from 'react';
import { saveAthleteProfileEntry, type SaveAthleteProfileEntryResult } from '../app/athletes/athleteProfileActions'; 
import { useRouter } from 'next/navigation';
import { getGridClasses, spacing } from '@/lib/design-system';

// Importa i componenti Shadcn/ui
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

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
        // Non serve più router.refresh() qui, lo fa il componente padre EditAthleteClientPage
        // router.refresh(); 
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
    // Rimuovo le classi dal tag form, dato che sarà dentro CardContent
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rimuovo il titolo h3 perché ora è gestito da CardHeader nel componente padre */}
      {/* <h3 className="text-lg font-semibold text-slate-700 mb-3">Aggiungi Nuova Voce al Profilo</h3> */}
      
      <div className="space-y-2">
        <Label htmlFor="effectiveDate">
          Data Inizio Validità*
        </Label>
        <Input
          type="date"
          id="effectiveDate"
          name="effectiveDate"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      
      <div className={getGridClasses(2, 'md')}>
        <div className="space-y-2">
          <Label htmlFor="ftp">
            FTP (watt)
          </Label>
          <Input
            type="number"
            id="ftp"
            name="ftp"
            value={ftp}
            onChange={(e) => setFtp(e.target.value)}
            placeholder="Es. 250"
            min="0"
            step="1"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">
            Peso (kg)
          </Label>
          <Input
            type="number"
            id="weight"
            name="weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Es. 70.5"
            min="0"
            step="0.1"
            disabled={isPending}
          />
        </div>
      </div>
      
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || !effectiveDate}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvataggio...
          </>
        ) : (
          'Salva Voce Profilo'
        )}
      </Button>
    </form>
  );
} 