// src/components/DeleteAthleteButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import type { Athlete } from '@/app/athletes/page'; // Assicurati che il percorso sia corretto

interface DeleteAthleteButtonProps {
  athlete: Athlete;
  onDeleteSuccess?: () => void;
}

export default function DeleteAthleteButton({ athlete, onDeleteSuccess }: DeleteAthleteButtonProps) {
  const router = useRouter();
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'atleta ${athlete.name} ${athlete.surname}? Questa azione è irreversibile.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verifica che l'utente sia ancora autenticato prima di procedere con operazioni sensibili
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== athlete.user_id) {
        // Questo controllo è una sicurezza aggiuntiva lato client,
        // la vera sicurezza è gestita dalle Row Level Security Policies su Supabase.
        throw new Error("Non autorizzato o sessione scaduta.");
      }

      const { error: dbError } = await supabase
        .from('athletes')
        .delete()
        .eq('id', athlete.id)
        .eq('user_id', athlete.user_id); // Sicurezza aggiuntiva client-side, ma la RLS è la vera guardia

      if (dbError) {
        throw dbError;
      }

      // Logica per eliminare l'avatar dallo storage
      if (athlete.avatar_url) {
        try {
            // Estrai il nome del file dall'URL completo.
            // Esempio URL: https://<project-ref>.supabase.co/storage/v1/object/public/avatars/user-id/avatar-filename.png
            // Vogliamo "user-id/avatar-filename.png"
            const avatarPath = new URL(athlete.avatar_url).pathname.split('/avatars/')[1];

            if (avatarPath) {
                const { error: storageError } = await supabase.storage
                .from('avatars') // Nome del bucket
                .remove([avatarPath]); // remove si aspetta un array di path

                if (storageError) {
                    // Non bloccare l'intero processo se l'eliminazione dell'avatar fallisce,
                    // ma logga l'errore.
                    console.warn(`Atleta eliminato dal DB, ma errore nell'eliminare l'avatar (${avatarPath}) dallo storage: ${storageError.message}`);
                }
            } else {
                 console.warn(`Path avatar non valido o non trovato per l'eliminazione dallo storage: ${athlete.avatar_url}`);
            }
        } catch(e) {
            console.warn(`Errore durante il parsing dell'URL dell'avatar o nell'eliminazione: ${e}`);
        }
      }

      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        router.refresh(); // Aggiorna i dati nella pagina corrente (es. la lista atleti)
      }

    } catch (e: any) {
      console.error('Errore durante l_eliminazione dell_atleta:', e);
      setError(`Errore: ${e.message || 'Si è verificato un errore imprevisto.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-3 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
        title={`Elimina ${athlete.name} ${athlete.surname}`}
      >
        {isLoading ? 'Eliminazione...' : 'Elimina'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}