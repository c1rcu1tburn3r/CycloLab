// src/app/auth/signup/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, X, AlertCircle, Shield, Clock } from 'lucide-react';

// Tipi per la validazione
interface ValidationResult {
  isValid: boolean;
  message: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 3,
  WINDOW_MS: 15 * 60 * 1000, // 15 minuti
  STORAGE_KEY: 'signup_attempts',
};

// Lista domini email temporanei (sample - in produzione usare API)
const TEMP_EMAIL_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'temp-mail.org', 
  'throwaway.email', 'mailinator.com', 'tempmail.plus',
  'getnada.com', 'yopmail.com', 'mailtrap.io', 'mohmal.com',
  'sharklasers.com', 'grr.la', 'dispostable.com', 'tempail.com'
];

// Criteri di validazione password
const PASSWORD_CRITERIA = {
  minLength: { test: (pwd: string) => pwd.length >= 8, label: 'Almeno 8 caratteri' },
  hasUppercase: { test: (pwd: string) => /[A-Z]/.test(pwd), label: 'Una lettera maiuscola' },
  hasLowercase: { test: (pwd: string) => /[a-z]/.test(pwd), label: 'Una lettera minuscola' },
  hasNumber: { test: (pwd: string) => /\d/.test(pwd), label: 'Un numero' },
  hasSpecial: { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), label: 'Un carattere speciale' },
};

export default function SignupPage() {
  const router = useRouter();
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Stati del form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState(0);

  // Rate limiting check
  const checkRateLimit = (): { allowed: boolean; timeLeft: number } => {
    const stored = localStorage.getItem(RATE_LIMIT.STORAGE_KEY);
    if (!stored) return { allowed: true, timeLeft: 0 };

    const { attempts, firstAttempt } = JSON.parse(stored);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.WINDOW_MS;

    // Se la finestra è scaduta, resetta
    if (firstAttempt < windowStart) {
      localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
      return { allowed: true, timeLeft: 0 };
    }

    // Se ha superato il limite
    if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
      const timeLeft = Math.ceil((firstAttempt + RATE_LIMIT.WINDOW_MS - now) / 1000);
      return { allowed: false, timeLeft };
    }

    return { allowed: true, timeLeft: 0 };
  };

  // Aggiorna rate limit
  const updateRateLimit = () => {
    const stored = localStorage.getItem(RATE_LIMIT.STORAGE_KEY);
    const now = Date.now();

    if (!stored) {
      localStorage.setItem(RATE_LIMIT.STORAGE_KEY, JSON.stringify({
        attempts: 1,
        firstAttempt: now
      }));
    } else {
      const { attempts, firstAttempt } = JSON.parse(stored);
      localStorage.setItem(RATE_LIMIT.STORAGE_KEY, JSON.stringify({
        attempts: attempts + 1,
        firstAttempt
      }));
    }
  };

  // Timer per rate limit
  useEffect(() => {
    if (isRateLimited && timeUntilReset > 0) {
      const timer = setInterval(() => {
        setTimeUntilReset(prev => {
          if (prev <= 1) {
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isRateLimited, timeUntilReset]);

  // Validazione domini temporanei
  const isTemporaryEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    return TEMP_EMAIL_DOMAINS.includes(domain);
  };

  // Validazione MX record (ripristinata - più permissiva)
  const validateMXRecord = async (domain: string): Promise<boolean> => {
    try {
      // Controlli base per formato dominio
      const domainLower = domain.toLowerCase();
      
      // Deve avere almeno un punto e non essere vuoto
      if (!domainLower || !domainLower.includes('.')) {
        return false;
      }
      
      // Deve avere almeno 2 parti (nome.tld)
      const parts = domainLower.split('.');
      if (parts.length < 2 || parts.some(part => part.length === 0)) {
        return false;
      }
      
      // Blocca solo pattern chiaramente fake/test (molto specifici)
      const obviousFakePatterns = [
        /test\.test/i, /fake\.fake/i, /spam\.spam/i, /temp\.temp/i,
        /esempio\.esempio/i, /prova\.prova/i, /falso\.falso/i
      ];
      
      if (obviousFakePatterns.some(pattern => pattern.test(domain))) {
        return false;
      }
      
      // Accetta tutti gli altri domini - la validazione sarà tramite email di conferma
      return true;
    } catch {
      return true; // Più permissivo in caso di errore
    }
  };

  // Validazione email avanzata
  const validateEmail = async (email: string): Promise<ValidationResult> => {
    if (!email) {
      return { isValid: false, message: 'Email è obbligatoria' };
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Formato email non valido' };
    }

    const domain = email.split('@')[1];
    if (!domain) {
      return { isValid: false, message: 'Dominio email mancante' };
    }

    // Check email temporanee
    if (isTemporaryEmail(email)) {
      return { 
        isValid: false, 
        message: 'Email temporanee non sono consentite. Usa un indirizzo permanente.' 
      };
    }

    // Validazione MX record
    const hasMX = await validateMXRecord(domain);
    if (!hasMX) {
      return { 
        isValid: false, 
        message: `Dominio "${domain}" non supportato. Usa Gmail, Outlook, Yahoo o altri provider principali.` 
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Validazione nome
  const validateFirstName = (firstName: string): ValidationResult => {
    if (!firstName.trim()) {
      return { isValid: false, message: 'Il nome è obbligatorio' };
    }
    if (firstName.trim().length < 2) {
      return { isValid: false, message: 'Il nome deve avere almeno 2 caratteri' };
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(firstName.trim())) {
      return { isValid: false, message: 'Il nome contiene caratteri non validi' };
    }
    return { isValid: true, message: '' };
  };

  // Validazione cognome
  const validateLastName = (lastName: string): ValidationResult => {
    if (!lastName.trim()) {
      return { isValid: false, message: 'Il cognome è obbligatorio' };
    }
    if (lastName.trim().length < 2) {
      return { isValid: false, message: 'Il cognome deve avere almeno 2 caratteri' };
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(lastName.trim())) {
      return { isValid: false, message: 'Il cognome contiene caratteri non validi' };
    }
    return { isValid: true, message: '' };
  };

  // Validazione password
  const validatePassword = (password: string): ValidationResult => {
    if (!password) {
      return { isValid: false, message: 'Password è obbligatoria' };
    }

    const failedCriteria = Object.entries(PASSWORD_CRITERIA)
      .filter(([_, criterion]) => !criterion.test(password))
      .map(([_, criterion]) => criterion.label);

    if (failedCriteria.length > 0) {
      return { isValid: false, message: `Requisiti mancanti: ${failedCriteria.join(', ')}` };
    }

    // Check per password comuni
    const commonPasswords = ['password', '12345678', 'qwertyui', 'password123', 'admin123', 'welcome123'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      return { isValid: false, message: 'Password troppo comune, scegline una più originale' };
    }

    // Check per pattern sequenziali
    if (/(.)\1{2,}/.test(password)) {
      return { isValid: false, message: 'Evita caratteri ripetuti consecutivamente' };
    }

    return { isValid: true, message: 'Password sicura!' };
  };

  // Validazione conferma password
  const validateConfirmPassword = (confirmPassword: string, password: string): ValidationResult => {
    if (!confirmPassword) {
      return { isValid: false, message: 'Conferma password è obbligatoria' };
    }
    
    if (confirmPassword !== password) {
      return { isValid: false, message: 'Le password non corrispondono' };
    }
    
    return { isValid: true, message: 'Password corrispondono!' };
  };

  // Calcolo forza password
  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    const criteriaCount = Object.values(PASSWORD_CRITERIA).filter(criterion => criterion.test(password)).length;
    
    // Bonus per lunghezza extra
    const lengthBonus = password.length > 12 ? 1 : 0;
    // Malus per pattern comuni
    const commonPatterns = /(.)\1{2,}|123|abc|qwe/i.test(password) ? -1 : 0;
    
    const totalScore = criteriaCount + lengthBonus + commonPatterns;
    
    if (totalScore <= 1) return { score: 0, label: 'Molto debole', color: 'bg-red-500' };
    if (totalScore <= 2) return { score: 25, label: 'Debole', color: 'bg-red-400' };
    if (totalScore <= 3) return { score: 50, label: 'Media', color: 'bg-yellow-400' };
    if (totalScore <= 4) return { score: 75, label: 'Forte', color: 'bg-blue-500' };
    return { score: 100, label: 'Molto forte', color: 'bg-green-500' };
  };

  // Validazione form completa
  useEffect(() => {
    const validateForm = async () => {
      const errors: FormErrors = {};
      
      // Validazione nome
      if (touched.firstName) {
        const firstNameValidation = validateFirstName(formData.firstName);
        if (!firstNameValidation.isValid) {
          errors.firstName = firstNameValidation.message;
        }
      }
      
      // Validazione cognome
      if (touched.lastName) {
        const lastNameValidation = validateLastName(formData.lastName);
        if (!lastNameValidation.isValid) {
          errors.lastName = lastNameValidation.message;
        }
      }
      
      // Validazione email
      if (touched.email && formData.email) {
        const emailValidation = await validateEmail(formData.email);
        if (!emailValidation.isValid) {
          errors.email = emailValidation.message;
        }
      }
      
      // Validazione password
      if (touched.password) {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.message;
        }
      }
      
      // Validazione conferma password
      if (touched.confirmPassword) {
        const confirmPasswordValidation = validateConfirmPassword(formData.confirmPassword, formData.password);
        if (!confirmPasswordValidation.isValid) {
          errors.confirmPassword = confirmPasswordValidation.message;
        }
      }
      
      setFormErrors(errors);
    };

    validateForm();
  }, [formData, touched]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    // Check rate limiting
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setIsRateLimited(true);
      setTimeUntilReset(rateLimitCheck.timeLeft);
      setError(`Troppi tentativi di registrazione. Riprova tra ${Math.ceil(rateLimitCheck.timeLeft / 60)} minuti.`);
      setIsLoading(false);
      return;
    }

    // Segna tutti i campi come touched per mostrare errori
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });

    // Validazione finale
    const firstNameValidation = validateFirstName(formData.firstName);
    const lastNameValidation = validateLastName(formData.lastName);
    const emailValidation = await validateEmail(formData.email);
    const passwordValidation = validatePassword(formData.password);
    const confirmPasswordValidation = validateConfirmPassword(formData.confirmPassword, formData.password);

    if (!firstNameValidation.isValid || !lastNameValidation.isValid || !emailValidation.isValid || !passwordValidation.isValid || !confirmPasswordValidation.isValid) {
      setError('Correggi gli errori nel form prima di continuare');
      setIsLoading(false);
      updateRateLimit(); // Conta come tentativo fallito
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            registration_timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            registration_ip: 'hidden', // In produzione ottenere IP dal server
          }
        }
      });

      if (signUpError) {
        updateRateLimit(); // Conta come tentativo fallito
        
        // Gestisci errori specifici di Supabase
        if (signUpError.message.includes('User already registered') || 
            signUpError.message.includes('already been registered')) {
          setError('Questa email è già registrata. Prova a fare login o usa un\'altra email.');
        } else if (signUpError.message.includes('Invalid email')) {
          setError('Formato email non valido');
        } else if (signUpError.message.includes('Password')) {
          setError('Password non valida secondo i criteri di sicurezza');
        } else if (signUpError.message.includes('rate limit') || 
                   signUpError.message.includes('too many')) {
          setError('Troppi tentativi di registrazione. Attendi prima di riprovare.');
        } else if (signUpError.message.includes('network')) {
          setError('Errore di connessione. Verifica la tua connessione internet.');
        } else {
          setError(`Errore registrazione: ${signUpError.message}`);
        }
      } else if (data.user && !data.user.email_confirmed_at) {
        // Reset rate limit in caso di successo
        localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
        setIsSuccess(true);
      } else if (data.user && data.user.email_confirmed_at) {
        // Reset rate limit e redirect se email già confermata
        localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
        router.push('/athletes');
        router.refresh();
      }
    } catch (error: any) {
      updateRateLimit(); // Conta come tentativo fallito
      
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        setError('Errore di connessione. Verifica la tua connessione internet e riprova.');
      } else {
        setError('Errore imprevisto. Se il problema persiste, contatta il supporto.');
      }
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Componente Criterio Password
  const PasswordCriterion = ({ test, label }: { test: boolean; label: string }) => (
    <div className={`flex items-center space-x-2 text-xs transition-colors ${test ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
      {test ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  const passwordStrength = getPasswordStrength(formData.password);
  const isFormValid = Object.keys(formErrors).length === 0 && 
                     formData.firstName && formData.lastName && formData.email && formData.password && formData.confirmPassword;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 grid-dots pointer-events-none"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Success Card */}
            <div className="stats-card text-center animate-fade-in">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registrazione Completata!</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Abbiamo inviato un email di conferma a <strong>{formData.email}</strong>. 
                    Clicca sul link nell&apos;email per attivare il tuo account.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Link href="/auth/login">
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      Torna al Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none"></div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo Header */}
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">CycloLab</h1>
            <p className="text-gray-600 dark:text-gray-300">Inizia il tuo viaggio verso l'eccellenza</p>
          </div>

          {/* Signup Card */}
          <div className="stats-card animate-fade-in">
            <div className="space-y-6">
              {error && (
                <div className={`border rounded-xl text-sm animate-slide-up ${
                  isRateLimited 
                    ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                } p-4`}>
                  <div className="flex items-center">
                    {isRateLimited ? (
                      <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                    )}
                    <div>
                      <span>{error}</span>
                      {isRateLimited && timeUntilReset > 0 && (
                        <div className="mt-2 text-xs opacity-75">
                          Tempo rimasto: {Math.floor(timeUntilReset / 60)}:{(timeUntilReset % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Security Badge */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Sicurezza Avanzata</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Validazione email, protezione anti-spam, password sicure
                    </p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-4">
                  {/* Campo Nome */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        onBlur={() => handleBlur('firstName')}
                        required
                        className={`w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          formErrors.firstName 
                            ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
                            : touched.firstName && !formErrors.firstName
                            ? 'border-green-300 focus:ring-green-500/50 focus:border-green-500'
                            : 'border-gray-200/50 dark:border-gray-700/50 focus:ring-emerald-500/50 focus:border-transparent'
                        }`}
                        placeholder="Mario"
                      />
                      {touched.firstName && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {formErrors.firstName ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {formErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        {formErrors.firstName}
                      </p>
                    )}
                  </div>
                  
                  {/* Campo Cognome */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Cognome <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        onBlur={() => handleBlur('lastName')}
                        required
                        className={`w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          formErrors.lastName 
                            ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
                            : touched.lastName && !formErrors.lastName
                            ? 'border-green-300 focus:ring-green-500/50 focus:border-green-500'
                            : 'border-gray-200/50 dark:border-gray-700/50 focus:ring-emerald-500/50 focus:border-transparent'
                        }`}
                        placeholder="Rossi"
                      />
                      {touched.lastName && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {formErrors.lastName ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {formErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        {formErrors.lastName}
                      </p>
                    )}
                  </div>
                  
                  {/* Campo Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        required
                        className={`w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          formErrors.email 
                            ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
                            : touched.email && !formErrors.email
                            ? 'border-green-300 focus:ring-green-500/50 focus:border-green-500'
                            : 'border-gray-200/50 dark:border-gray-700/50 focus:ring-emerald-500/50 focus:border-transparent'
                        }`}
                        placeholder="tuamail@esempio.com"
                      />
                      {touched.email && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {formErrors.email ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  
                  {/* Campo Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        required
                        className={`w-full px-4 py-3 pr-12 bg-white/50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          formErrors.password 
                            ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
                            : touched.password && !formErrors.password
                            ? 'border-green-300 focus:ring-green-500/50 focus:border-green-500'
                            : 'border-gray-200/50 dark:border-gray-700/50 focus:ring-emerald-500/50 focus:border-transparent'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Forza password:</span>
                          <span className={`text-xs font-medium ${
                            passwordStrength.score >= 75 ? 'text-green-600 dark:text-green-400' :
                            passwordStrength.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.score}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Password Criteria */}
                    {touched.password && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Requisiti password:
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {Object.entries(PASSWORD_CRITERIA).map(([key, criterion]) => (
                            <PasswordCriterion
                              key={key}
                              test={criterion.test(formData.password)}
                              label={criterion.label}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {formErrors.password && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        {formErrors.password}
                      </p>
                    )}
                  </div>
                  
                  {/* Campo Conferma Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Conferma Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        required
                        className={`w-full px-4 py-3 pr-12 bg-white/50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                          formErrors.confirmPassword 
                            ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
                            : touched.confirmPassword && !formErrors.confirmPassword
                            ? 'border-green-300 focus:ring-green-500/50 focus:border-green-500'
                            : 'border-gray-200/50 dark:border-gray-700/50 focus:ring-emerald-500/50 focus:border-transparent'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        {formErrors.confirmPassword}
                      </p>
                    )}
                    {touched.confirmPassword && !formErrors.confirmPassword && formData.confirmPassword && (
                      <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center">
                        <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                        Le password corrispondono!
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !isFormValid || isRateLimited}
                  className={`w-full font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                    isRateLimited
                      ? 'bg-yellow-400 text-yellow-900 cursor-not-allowed'
                      : isFormValid && !isLoading
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white' 
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isRateLimited ? (
                    <div className="flex items-center justify-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Rate limit attivo
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Registrazione in corso...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Crea Account Sicuro
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200/50 dark:border-gray-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-lg">
                    Hai già un account?
                  </span>
                </div>
              </div>

              <Link href="/auth/login">
                <Button variant="outline" className="w-full border-gray-200/50 dark:border-gray-700/50 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all py-3">
                  Accedi
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm animate-fade-in">
            <p>&copy; {new Date().getFullYear()} CycloLab. Tutti i diritti riservati.</p>
            <div className="flex justify-center space-x-6 mt-4">
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Termini</a>
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Supporto</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}