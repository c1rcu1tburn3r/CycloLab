'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Card as DesignCard } from '@/components/design-system';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PrivacyTabProps {
  user: User;
}

export default function PrivacyTab({ user }: PrivacyTabProps) {
  const { showSuccess, showError } = useCycloLabToast();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleExportData = async () => {
    setIsExporting(true);

    try {
      // Raccoglie tutti i dati dell'utente
      const userDataExport: any = {
        account: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          user_metadata: user.user_metadata,
        },
        exported_at: new Date().toISOString(),
        version: '1.0'
      };

      // Ottieni dati atleti
      const { data: athletes, error: athletesError } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', user.id);

      if (!athletesError && athletes) {
        userDataExport.athletes = athletes;

        // Per ogni atleta, ottieni le voci del profilo e le attività
        for (const athlete of athletes) {
          const { data: profileEntries } = await supabase
            .from('athlete_profile_entries')
            .select('*')
            .eq('athlete_id', athlete.id);

          const { data: activities } = await supabase
            .from('activities')
            .select('*')
            .eq('athlete_id', athlete.id);

          userDataExport[`athlete_${athlete.id}_profile_entries`] = profileEntries || [];
          userDataExport[`athlete_${athlete.id}_activities`] = activities || [];
        }
      }

      // Crea e scarica il file JSON
      const dataStr = JSON.stringify(userDataExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cyclolab-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Esportazione completata', 'I tuoi dati sono stati scaricati con successo');
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante l\'esportazione');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = 'ELIMINA IL MIO ACCOUNT';
    const userInput = prompt(
      `⚠️ ATTENZIONE: Questa azione è IRREVERSIBILE!\n\n` +
      `Tutti i tuoi dati verranno eliminati permanentemente:\n` +
      `• Account utente\n` +
      `• Tutti gli atleti associati\n` +
      `• Tutte le attività e misurazioni\n` +
      `• Cronologia e statistiche\n\n` +
      `Se sei assolutamente sicuro, scrivi esattamente:\n"${confirmText}"`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        showError('Eliminazione annullata', 'Il testo inserito non è corretto');
      }
      return;
    }

    setIsDeletingAccount(true);

    try {
      // Prima elimina tutti i dati collegati (gli atleti e le loro attività)
      const { data: athletes } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', user.id);

      if (athletes && athletes.length > 0) {
        const athleteIds = athletes.map(a => a.id);
        
        // Elimina le performance climb
        await supabase
          .from('climb_performances')
          .delete()
          .in('athlete_id', athleteIds);

        // Elimina le attività degli atleti
        await supabase
          .from('activities')
          .delete()
          .in('athlete_id', athleteIds);

        // Elimina le voci del profilo degli atleti
        await supabase
          .from('athlete_profile_entries')
          .delete()
          .in('athlete_id', athleteIds);

        // Elimina gli atleti
        await supabase
          .from('athletes')
          .delete()
          .eq('user_id', user.id);
      }

      // Elimina le detected climbs dell'utente
      await supabase
        .from('detected_climbs')
        .delete()
        .eq('user_id', user.id);

      // Elimina le associazioni coach-atleta
      await supabase
        .from('coach_athletes')
        .delete()
        .eq('coach_user_id', user.id);

      // Elimina l'account usando la nostra API route che ha i permessi service_role
      const response = await fetch('/api/auth/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore eliminazione account');
      }

      showSuccess('Account eliminato', 'Il tuo account è stato eliminato con successo');
      
      // L'utente è stato eliminato dal database Auth, il logout avverrà automaticamente
      // ma facciamo anche logout esplicito per sicurezza
      await supabase.auth.signOut();
      router.push('/');
      
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante l\'eliminazione dell\'account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Esportazione Dati
          </CardTitle>
          <CardDescription>
            Scarica una copia completa di tutti i tuoi dati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Cosa include l'esportazione:
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Informazioni account e profilo
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Dati di tutti gli atleti associati
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Storico completo delle attività
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Misurazioni e parametri fisiologici
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Statistiche e personal best
              </li>
            </ul>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Download in formato JSON</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">File leggibile e compatibile con altri servizi</p>
            </div>
            <Button 
              onClick={handleExportData}
              disabled={isExporting}
              className="min-w-32"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Esportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Esporta Dati
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </DesignCard>

      {/* Privacy Settings */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            Impostazioni Privacy
          </CardTitle>
          <CardDescription>
            Controlla la visibilità e la condivisione dei tuoi dati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Visibilità Profilo</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Privato</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Condivisione Dati</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Solo coach autorizzati</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Analytics</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Anonimi per miglioramenti</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Backup</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Automatico e crittografato</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-1">
                  Privacy garantita
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  I tuoi dati sono protetti secondo il GDPR e non vengono mai condivisi con terze parti senza il tuo consenso esplicito.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </DesignCard>

      {/* Data Retention */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Conservazione Dati
          </CardTitle>
          <CardDescription>
            Informazioni su come gestiamo la conservazione dei tuoi dati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Dati Account</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">Conservati finché l'account è attivo</p>
              </div>

              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Attività</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">Conservate indefinitamente per analisi</p>
              </div>

              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Backup</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">30 giorni in sistemi sicuri</p>
              </div>

              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Log Sistema</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">90 giorni per sicurezza</p>
              </div>
            </div>
          </div>
        </CardContent>
      </DesignCard>

      {/* Account Deletion */}
      <DesignCard variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-900 dark:text-red-100">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            Zona Pericolosa
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            Azioni irreversibili che eliminano definitivamente i tuoi dati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-700">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                ⚠️ Eliminazione Account Permanente
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                Una volta eliminato, il tuo account e tutti i dati associati verranno rimossi permanentemente e non potranno essere recuperati.
              </p>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 mb-4">
                <li>• Tutti gli atleti e le loro attività</li>
                <li>• Storico completo delle performance</li>
                <li>• Misurazioni e parametri fisiologici</li>
                <li>• Associazioni con coach</li>
                <li>• File caricati e avatar</li>
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Elimina il mio account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Questa azione non può essere annullata</p>
              </div>
              <Button 
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="min-w-32"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Elimina Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </DesignCard>
    </div>
  );
} 