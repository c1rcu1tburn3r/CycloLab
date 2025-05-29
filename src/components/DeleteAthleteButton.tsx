// src/components/DeleteAthleteButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import type { Athlete } from '@/lib/types'; // MODIFICATO PERCORSO IMPORT
import { Button } from '@/components/ui/button';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Gestisce il body scroll quando il dialog è aperto
  useEffect(() => {
    if (showConfirmDialog) {
      document.body.style.overflow = 'hidden';
      
      // Gestisce il tasto Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) {
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
  }, [showConfirmDialog, isLoading]);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verifica che l'utente sia ancora autenticato prima di procedere con operazioni sensibili
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== athlete.user_id) {
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

      setShowConfirmDialog(false);
      
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
      <Button
        onClick={() => setShowConfirmDialog(true)}
        variant="outline"
        size="sm"
        className="group relative overflow-hidden border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-all duration-200"
        title={`Elimina ${athlete.name} ${athlete.surname}`}
      >
        <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="text-sm font-medium">Elimina</span>
      </Button>

      {/* Modern Confirmation Dialog - Renderizzato nel body usando Portal */}
      {showConfirmDialog && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isLoading && setShowConfirmDialog(false)}
          ></div>
          
          {/* Dialog */}
          <div className="relative z-[10000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200/20 dark:border-gray-700/20 animate-scale-in">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-foreground">Conferma Eliminazione</h3>
              <p className="text-muted-foreground">
                Sei sicuro di voler eliminare <span className="font-semibold text-foreground">{athlete.name} {athlete.surname}</span>?
              </p>
              <p className="text-sm text-muted-foreground bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                ⚠️ Questa azione è <strong>irreversibile</strong>. Tutti i dati dell'atleta verranno persi permanentemente.
              </p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center animate-slide-up">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isLoading}
              >
                Annulla
              </Button>
              
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="lg"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Eliminazione...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Elimina Definitivamente
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