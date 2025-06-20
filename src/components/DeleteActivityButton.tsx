'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeleteActivityButtonProps {
  activityId: string;
}

export default function DeleteActivityButton({ activityId }: DeleteActivityButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gestisce il body scroll quando il dialog è aperto
  useEffect(() => {
    if (showConfirmDialog) {
      document.body.style.overflow = 'hidden';
      
      // Gestisce il tasto Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isDeleting) {
          setShowConfirmDialog(false);
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup quando il componente viene smontato
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showConfirmDialog, isDeleting]);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'eliminazione');
      }

      setShowConfirmDialog(false);
      
      // Torna alla lista attività dopo l'eliminazione
      window.location.href = '/activities';
    } catch (error: any) {
      console.error('Errore eliminazione attività:', error);
      alert('Errore durante l\'eliminazione dell\'attività: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 dark:border-red-800 dark:hover:border-red-700"
      >
        {isDeleting ? (
          <>
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
            Eliminando...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Elimina
          </>
        )}
      </Button>

      {/* Modern Confirmation Dialog - Rendered via Portal */}
      {mounted && showConfirmDialog && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowConfirmDialog(false)}
          ></div>
          
          {/* Dialog */}
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700" style={{ zIndex: 100000 }}>
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-foreground">Elimina Attività</h3>
              <p className="text-muted-foreground">
                Sei sicuro di voler eliminare questa attività?
              </p>
              <div className="text-sm text-muted-foreground bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Azione irreversibile
                </div>
                <p className="text-xs">
                  Questa azione non può essere annullata e tutti i dati associati verranno persi permanentemente.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isDeleting}
              >
                Annulla
              </Button>
              
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="lg"
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Eliminando...
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Elimina Attività
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
} 