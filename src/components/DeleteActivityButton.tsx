'use client';

import { deleteActivity } from '@/app/activities/actions';
import { useState, useTransition } from 'react';

interface DeleteActivityButtonProps {
  activityId: string;
  activityTitle: string;
  fitFilePath: string | null; // Es: "user_id/athlete_id/file_name.fit" o null se non c'è file
}

export default function DeleteActivityButton({ activityId, activityTitle, fitFilePath }: DeleteActivityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Sei sicuro di voler eliminare l'attività "${activityTitle}"? Questa azione è irreversibile e rimuoverà anche il file FIT associato, se presente.`)) {
      return;
    }
    
    setError(null);
    startTransition(async () => {
      const result = await deleteActivity(activityId, fitFilePath);
      if (result?.error) {
        setError(result.error);
      }
      // Il reindirizzamento e la revalidazione avvengono nella server action in caso di successo
    });
  };

  return (
    <div className="flex flex-col items-start">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md text-sm disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {isPending ? 'Eliminazione...' : 'Elimina Attività'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">Errore: {error}</p>}
    </div>
  );
} 