'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCycloLabToast } from '@/hooks/use-cyclolab-toast';
import { Trash2 } from 'lucide-react';

interface DeleteActivityButtonProps {
  activityId: string;
  activityTitle?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

async function deleteActivity(activityId: string) {
  const response = await fetch(`/api/activities/${activityId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Errore durante l\'eliminazione');
  }

  return response.json();
}

export default function DeleteActivityButton({ 
  activityId, 
  activityTitle = 'questa attività',
  onSuccess,
  variant = 'destructive',
  size = 'default',
  className = ''
}: DeleteActivityButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSuccess, showError } = useCycloLabToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const router = useRouter();

  const handleDeleteClick = () => {
    showConfirm({
      title: 'Elimina Attività',
      description: `Sei sicuro di voler eliminare "${activityTitle}"? Questa azione non può essere annullata e tutti i dati associati verranno persi permanentemente.`,
      confirmText: 'Elimina Attività',
      cancelText: 'Annulla',
      variant: 'destructive',
      icon: <Trash2 className="w-6 h-6" />,
      onConfirm: async () => {
        setIsDeleting(true);

        try {
          await deleteActivity(activityId);
          
          showSuccess(
            'Attività eliminata', 
            `L'attività "${activityTitle}" è stata eliminata con successo`
          );

          if (onSuccess) {
            onSuccess();
          } else {
            // Se non c'è callback, torna alla lista attività
            router.push('/activities');
          }
        } catch (error: any) {
          console.error('Errore eliminazione attività:', error);
          showError(
            'Errore eliminazione',
            error.message || 'Si è verificato un errore durante l\'eliminazione dell\'attività'
          );
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  return (
    <>
      <ConfirmDialog />
      <Button
        variant={variant}
        size={size}
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className={className}
      >
        {isDeleting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Eliminando...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Elimina
          </>
        )}
      </Button>
    </>
  );
} 