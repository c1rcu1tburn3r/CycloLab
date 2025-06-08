'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteActivityIconProps {
  activityId: string;
  activityTitle?: string;
  onDeleted?: () => void; // Callback per aggiornare la lista
  size?: 'sm' | 'md';
}

export default function DeleteActivityIcon({ 
  activityId, 
  activityTitle = 'questa attività',
  onDeleted,
  size = 'sm'
}: DeleteActivityIconProps) {
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
      
      // Chiama il callback se fornito, altrimenti ricarica la pagina
      if (onDeleted) {
        // Usa setTimeout per evitare conflitti con la navigazione
        setTimeout(() => {
          onDeleted();
        }, 100);
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Errore eliminazione attività:', error);
      alert('Errore durante l\'eliminazione dell\'attività: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Impedisce la navigazione
    e.stopPropagation(); // Impedisce il click sulla card
    e.nativeEvent.stopImmediatePropagation(); // Ferma completamente la propagazione
    setShowConfirmDialog(true);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <>
      {/* Icona di eliminazione */}
      <button
        onClick={handleIconClick}
        disabled={isDeleting}
        className={`${buttonSize} rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-200/50 hover:border-red-300 backdrop-blur-sm transition-all duration-200 flex items-center justify-center group hover:scale-110 shadow-lg`}
        title="Elimina attività"
      >
        {isDeleting ? (
          <div className={`${iconSize} border-2 border-red-500 border-t-transparent rounded-full animate-spin`} />
        ) : (
          <Trash2 className={`${iconSize} text-red-500 group-hover:text-red-600`} />
        )}
      </button>

      {/* Dialog di conferma - Rendered via Portal */}
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
                Sei sicuro di voler eliminare <span className="font-medium">"{activityTitle}"</span>?
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
                    Elimina
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