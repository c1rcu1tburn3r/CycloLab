// src/components/DeleteAthleteButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Athlete } from '@/app/athletes/page'; // Assicurati che questo import sia corretto

interface DeleteAthleteButtonProps {
  athlete: Athlete;
  onDeleteSuccess?: () => void;
}

export default function DeleteAthleteButton({ athlete, onDeleteSuccess }: DeleteAthleteButtonProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'atleta ${athlete.name} ${athlete.surname}? Questa azione è irreversibile.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from('athletes')
        .delete()
        .eq('id', athlete.id)
        .eq('user_id', athlete.user_id); // Sicurezza aggiuntiva

      if (dbError) {
        throw dbError;
      }

      if (athlete.avatar_url) {
        const urlParts = athlete.avatar_url.split('/');
        // Trova l'indice di 'avatars' e prendi tutto ciò che segue, che è il path nel bucket
        const bucketNameIndex = urlParts.indexOf('avatars');
        if (bucketNameIndex !== -1 && bucketNameIndex < urlParts.length -1) {
            const filePathInBucket = urlParts.slice(bucketNameIndex + 1).join('/');
             if (filePathInBucket) { // Assicurati che il path non sia vuoto
                const { error: storageError } = await supabase.storage
                .from('avatars') // Nome del bucket
                .remove([filePathInBucket]); // remove si aspetta un array di path

                if (storageError) {
                console.warn(`Atleta eliminato dal DB, ma errore nell'eliminare l'avatar (${filePathInBucket}) dallo storage: ${storageError.message}`);
                }
            } else {
                console.warn(`Path avatar non valido o non trovato per l'eliminazione dallo storage: ${athlete.avatar_url}`);
            }
        } else {
             console.warn(`Impossibile estrarre il path dell'avatar dall'URL: ${athlete.avatar_url}`);
        }
      }

      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        router.refresh();
      }

    } catch (e: any) {
      console.error('Errore durante l_eliminazione dell_atleta:', e);
      setError(`Errore: ${e.message}`);
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