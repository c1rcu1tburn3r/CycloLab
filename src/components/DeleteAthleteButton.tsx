// src/components/DeleteAthleteButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import type { Athlete } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useCycloLabCacheInvalidation } from '@/hooks/use-cyclolab-cache';
import { useCycloLabToast } from '@/hooks/use-cyclolab-toast';

interface DeleteAthleteButtonProps {
  athlete: Athlete;
  onDeleteSuccess?: () => void;
}

export default function DeleteAthleteButton({ athlete, onDeleteSuccess }: DeleteAthleteButtonProps) {
  const router = useRouter();
  const { invalidateOnAthleteChange } = useCycloLabCacheInvalidation();
  const { showSuccess, showError, showWarning } = useCycloLabToast();
  
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [isLoading, setIsLoading] = useState(false);
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

    try {
      // Verifica che l'utente sia ancora autenticato prima di procedere con operazioni sensibili
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== athlete.user_id) {
        // Questo controllo è una sicurezza aggiuntiva lato client,
        // la vera sicurezza è gestita dalle Row Level Security Policies su Supabase.
        showError("Accesso negato", "Non sei autorizzato o la sessione è scaduta.");
        return;
      }

      // Step 1: Elimina tutte le attività associate all'atleta
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('athlete_id', athlete.id);

      if (activitiesError) {
        console.error('Errore eliminazione attività:', activitiesError);
        showError("Errore", "Impossibile eliminare le attività associate all'atleta.");
        return;
      }

      // Step 2: Elimina i personal bests dell'atleta
      const { error: pbError } = await supabase
        .from('athlete_personal_bests')
        .delete()
        .eq('athlete_id', athlete.id);

      if (pbError) {
        console.error('Errore eliminazione personal bests:', pbError);
        showWarning("Attenzione", "Alcune informazioni sui personal best potrebbero non essere state eliminate correttamente.");
      }

      // Step 3: Elimina le voci del profilo dell'atleta
      const { error: profileError } = await supabase
        .from('athlete_profile_entries')
        .delete()
        .eq('athlete_id', athlete.id);

      if (profileError) {
        console.error('Errore eliminazione profilo:', profileError);
        showWarning("Attenzione", "Alcune voci del profilo potrebbero non essere state eliminate correttamente.");
      }

      // Step 4: Elimina eventuali prestazioni di salita
      const { error: climbError } = await supabase
        .from('climb_performances')
        .delete()
        .eq('athlete_id', athlete.id);

      if (climbError) {
        console.error('Errore eliminazione climb performances:', climbError);
        showWarning("Attenzione", "Alcune prestazioni di salita potrebbero non essere state eliminate correttamente.");
      }

      // Step 5: Elimina eventuali salite rilevate
      const { error: detectedClimbError } = await supabase
        .from('detected_climbs')
        .delete()
        .eq('user_id', athlete.user_id);

      if (detectedClimbError) {
        console.error('Errore eliminazione detected climbs:', detectedClimbError);
        showWarning("Attenzione", "Alcune salite rilevate potrebbero non essere state eliminate correttamente.");
      }

      // Step 6: Elimina eventuali classifiche personali di salita
      const { error: rankingError } = await supabase
        .from('personal_climb_rankings')
        .delete()
        .eq('athlete_id', athlete.id);

      if (rankingError) {
        console.error('Errore eliminazione ranking:', rankingError);
        showWarning("Attenzione", "Alcune classifiche potrebbero non essere state eliminate correttamente.");
      }

      // Step 7: Elimina l'associazione coach-atleta se presente
      const { error: coachError } = await supabase
        .from('coach_athletes')
        .delete()
        .eq('athlete_id', athlete.id);

      if (coachError) {
        console.error('Errore eliminazione associazione coach:', coachError);
        showWarning("Attenzione", "L'associazione con il coach potrebbe non essere stata eliminata correttamente.");
      }

      // Step 8: Elimina l'atleta dal database
      const { error: dbError } = await supabase
        .from('athletes')
        .delete()
        .eq('id', athlete.id)
        .eq('user_id', athlete.user_id); // Sicurezza aggiuntiva client-side

      if (dbError) {
        console.error('Errore eliminazione atleta:', dbError);
        showError("Errore", `Impossibile eliminare l'atleta: ${dbError.message}`);
        return;
      }

      // Step 9: Elimina l'avatar dallo storage
      if (athlete.avatar_url) {
        try {
          // Estrai il nome del file dall'URL completo.
          const avatarPath = new URL(athlete.avatar_url).pathname.split('/avatars/')[1];

          if (avatarPath) {
            const { error: storageError } = await supabase.storage
              .from('avatars')
              .remove([avatarPath]);

            if (storageError) {
              console.warn(`Errore nell'eliminare l'avatar dallo storage: ${storageError.message}`);
              showWarning("Avatar", "L'avatar potrebbe non essere stato eliminato correttamente dallo storage.");
            }
          }
        } catch(e) {
          console.warn(`Errore durante l'eliminazione dell'avatar: ${e}`);
          showWarning("Avatar", "Errore durante l'eliminazione dell'avatar.");
        }
      }

      setShowConfirmDialog(false);
      
      // Mostra toast di successo
      showSuccess(
        "Atleta eliminato",
        `${athlete.name} ${athlete.surname} e tutti i dati associati sono stati eliminati definitivamente.`
      );
      
      // Invalida la cache degli atleti per aggiornare automaticamente la lista
      invalidateOnAthleteChange(athlete.user_id);
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        // Reindirizza alla lista atleti dopo l'eliminazione
        router.push('/athletes');
        router.refresh();
      }

    } catch (e: any) {
      console.error('Errore durante l_eliminazione dell_atleta:', e);
      showError(
        "Errore imprevisto",
        `Si è verificato un errore durante l'eliminazione: ${e.message || 'Errore sconosciuto'}`
      );
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
        className="h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-300 transition-colors"
        title={`Elimina ${athlete.name} ${athlete.surname}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Elimina
      </Button>

      {/* Modern Confirmation Dialog */}
      {showConfirmDialog && (
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
              <div className="text-sm text-muted-foreground bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Azione irreversibile
                </div>
                <p className="text-xs">
                  Verranno eliminati definitivamente:
                </p>
                <ul className="text-xs text-left space-y-1 ml-4">
                  <li>• Tutte le attività dell'atleta</li>
                  <li>• Personal bests e record</li>
                  <li>• Profilo e misurazioni</li>
                  <li>• Prestazioni di salita</li>
                  <li>• Avatar e file associati</li>
                </ul>
              </div>
            </div>

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
        </div>
      )}
    </>
  );
}