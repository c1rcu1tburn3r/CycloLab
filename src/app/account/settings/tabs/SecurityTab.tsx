'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";

interface SecurityTabProps {
  user: User;
}

export default function SecurityTab({ user }: SecurityTabProps) {
  const { showSuccess, showError } = useCycloLabToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      // Validazioni
      if (!passwordData.currentPassword) {
        throw new Error('Inserisci la password corrente');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('La nuova password deve essere di almeno 8 caratteri');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Le password non corrispondono');
      }

      // Prima verifica la password corrente riautenticando l'utente
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordData.currentPassword,
      });

      if (reauthError) {
        throw new Error('Password corrente non corretta');
      }

      // Se la riautenticazione è riuscita, cambia la password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw new Error(`Errore cambio password: ${error.message}`);
      }

      showSuccess('Password aggiornata', 'La tua password è stata modificata con successo');
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante il cambio password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    if (!confirm('Sei sicuro di voler disconnettere tutti i dispositivi? Dovrai effettuare nuovamente il login ovunque.')) {
      return;
    }

    setIsSigningOutEverywhere(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        throw new Error(`Errore disconnessione: ${error.message}`);
      }

      showSuccess('Disconnessione completata', 'Sei stato disconnesso da tutti i dispositivi');
      
      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante la disconnessione');
    } finally {
      setIsSigningOutEverywhere(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { label: 'Debole', color: 'bg-red-500', width: '33%' };
    if (strength <= 3) return { label: 'Media', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Forte', color: 'bg-emerald-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card className="stats-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            Cambia Password
          </CardTitle>
          <CardDescription>
            Aggiorna la tua password per mantenere il tuo account sicuro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Corrente</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Inserisci la password corrente"
                className="stats-card-bg-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nuova Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Inserisci la nuova password"
                className="stats-card-bg-input"
                required
              />
              {passwordData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Sicurezza password:</span>
                    <span className={`font-medium ${
                      passwordStrength.label === 'Forte' ? 'text-emerald-600' :
                      passwordStrength.label === 'Media' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Conferma la nuova password"
                className="stats-card-bg-input"
                required
              />
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Le password non corrispondono
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Requisiti password sicura:
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${passwordData.newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  Almeno 8 caratteri
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${/[A-Z]/.test(passwordData.newPassword) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  Una lettera maiuscola
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${/[a-z]/.test(passwordData.newPassword) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  Una lettera minuscola
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${/[0-9]/.test(passwordData.newPassword) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  Un numero
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${/[^A-Za-z0-9]/.test(passwordData.newPassword) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  Un carattere speciale
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isChangingPassword || !passwordData.currentPassword || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 8}
                className="min-w-32"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aggiornando...
                  </>
                ) : (
                  'Aggiorna Password'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="stats-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            Sicurezza Account
          </CardTitle>
          <CardDescription>
            Gestisci la sicurezza e le sessioni attive del tuo account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stato Account</Label>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Attivo</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Verificata</Label>
              <div className="flex items-center gap-2">
                {user.email_confirmed_at ? (
                  <>
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Verificata</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 9v2m0 4h.01" />
                      </svg>
                    </div>
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Da verificare</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Session Management */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Gestione Sessioni</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Disconnettiti da tutti i dispositivi per maggiore sicurezza
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Tutti i Dispositivi</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sessione attiva corrente inclusa</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleSignOutEverywhere}
                disabled={isSigningOutEverywhere}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                {isSigningOutEverywhere ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnettendo...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Disconnetti Ovunque
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="stats-card border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-900 dark:text-blue-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Consigli per la Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Password Uniche</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Usa una password diversa per ogni servizio</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Aggiornamenti Regolari</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cambia la password periodicamente</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Reti Sicure</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Evita Wi-Fi pubblici per dati sensibili</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Logout Sicuro</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Disconnettiti sempre dai dispositivi condivisi</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 