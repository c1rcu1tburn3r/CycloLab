'use client';

import { useState, FormEvent, ChangeEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Athlete } from '@/lib/types';
import { processAndCreateActivity } from '@/app/activities/actions';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";

interface ActivityUploadFormProps {
  userId: string;
  athletes: Athlete[];
}

interface FormDataType {
  user_id: string;
  athlete_id: string;
  title: string;
  description?: string;
  activity_date: string;
  activity_type: string;
  is_indoor: boolean;
  is_public: boolean;
  status?: string;
}

export default function ActivityUploadForm({ userId, athletes }: ActivityUploadFormProps) {
  const router = useRouter();
  const { showActivityUploaded, showError, showWarning } = useCycloLabToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationDetails, setValidationDetails] = useState<{
    fileSize: string;
    isValid: boolean;
    details: string[];
  } | null>(null);
  const maxRetries = 3;
  const [formData, setFormData] = useState<FormDataType>({
    user_id: userId,
    athlete_id: '',
    title: '',
    description: '',
    activity_date: new Date().toISOString().split('T')[0],
    activity_type: 'cycling',
    is_indoor: false,
    is_public: false,
    status: 'active'
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      setValidationDetails(null);
      setIsValidating(true);

      // Validazione asincrona del file
      validateFitFile(file).then(validation => {
        setValidationDetails(validation);
        setIsValidating(false);
        
        if (!validation.isValid) {
          const errorMsg = 'File .fit non valido. Controlla i dettagli di validazione.';
          setError(errorMsg);
          setSelectedFile(null);
          showError("File non valido", errorMsg);
        } else {
          // Auto-popola il titolo se non presente
          if (!formData.title) {
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            setFormData(prev => ({ ...prev, title: fileName }));
          }
        }
      }).catch(error => {
        setIsValidating(false);
        setError('Errore durante la validazione del file');
        setSelectedFile(null);
      });
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Per favore seleziona un file .fit');
      return;
    }
    if (!formData.athlete_id) {
      setError('Per favore seleziona un atleta.');
      return;
    }
    if (!userId) {
      setError('ID utente non disponibile. Impossibile procedere.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setRetryCount(0);
    setUploadProgress(0);

    try {
      const fileExtension = selectedFile.name.split('.').pop();
      const baseFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
      const cleanBaseFileName = baseFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileNameInStorage = `${Date.now()}_${cleanBaseFileName}.${fileExtension}`;
      const filePath = `${userId}/${formData.athlete_id}/${fileNameInStorage}`;
      
      // Usa la nuova funzione con retry automatico
      await uploadWithRetry(selectedFile, filePath);

      setIsUploading(false);

      const activityDataForAction = {
        athlete_id: formData.athlete_id,
        title: formData.title || cleanBaseFileName,
        description: formData.description || undefined,
        activity_date: formData.activity_date,
        activity_type: formData.activity_type,
        is_indoor: formData.is_indoor,
        is_public: formData.is_public,
        status: formData.status
      };

      startTransition(async () => {
        const result = await processAndCreateActivity(activityDataForAction, filePath);

        if (result?.error) {
          setError(result.error);
          showError("Errore nel caricamento", result.error);
        } else if (result?.success) {
          const successMsg = result.message || 'Attività caricata con successo!';
          setSuccessMessage(successMsg);
          showActivityUploaded(formData.title || 'Attività');
          setTimeout(() => {
            router.push('/activities');
          }, 1500);
        }
      });

    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Si è verificato un errore durante il caricamento');
      console.error('Errore durante il caricamento dell\'attività:', err);
    }
  };

  const isSubmitDisabled = isUploading || isPending || isValidating || (validationDetails ? !validationDetails.isValid : false);

  // Funzione per validare il file .fit
  const validateFitFile = async (file: File): Promise<{ isValid: boolean; details: string[]; fileSize: string }> => {
    const details: string[] = [];
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    // Controllo estensione
    if (!file.name.toLowerCase().endsWith('.fit')) {
      details.push('❌ Estensione file non valida (deve essere .fit)');
      return { isValid: false, details, fileSize };
    }
    details.push('✅ Estensione file corretta (.fit)');

    // Controllo dimensione file (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      details.push('❌ File troppo grande (max 50MB)');
      return { isValid: false, details, fileSize };
    }
    details.push(`✅ Dimensione file accettabile (${fileSize})`);

    // Controllo dimensione minima (almeno 1KB)
    if (file.size < 1024) {
      details.push('❌ File troppo piccolo (min 1KB)');
      return { isValid: false, details, fileSize };
    }

    // Controllo header FIT (primi 4 bytes dovrebbero contenere informazioni FIT)
    try {
      const headerBuffer = await file.slice(0, 14).arrayBuffer();
      const headerView = new DataView(headerBuffer);
      
      // Controllo signature FIT
      const signature = String.fromCharCode(
        headerView.getUint8(8),
        headerView.getUint8(9),
        headerView.getUint8(10),
        headerView.getUint8(11)
      );
      
      if (signature === '.FIT') {
        details.push('✅ Header FIT valido');
      } else {
        details.push('⚠️ Header FIT non standard (potrebbe funzionare comunque)');
      }
    } catch (error) {
      details.push('⚠️ Impossibile leggere header file');
    }

    return { isValid: true, details, fileSize };
  };

  // Funzione per upload con retry automatico
  const uploadWithRetry = async (file: File, filePath: string, attempt: number = 1): Promise<void> => {
    try {
      setUploadProgress(0);
      
      // Simula progress per upload (Supabase non supporta progress nativo)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const { error: fileError } = await supabase.storage
        .from('fit-files')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (fileError) {
        throw new Error(`Errore upload: ${fileError.message}`);
      }
    } catch (error) {
      setUploadProgress(0);
      
      if (attempt < maxRetries) {
        setRetryCount(attempt);
        setError(`Tentativo ${attempt} fallito. Riprovo automaticamente...`);
        
        // Attendi prima del retry (backoff esponenziale)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        
        return uploadWithRetry(file, filePath, attempt + 1);
      } else {
        throw new Error(`Upload fallito dopo ${maxRetries} tentativi: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg">
          {successMessage}
        </div>
      )}
      
      <div>
        <label htmlFor="fit_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          File FIT <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          id="fit_file"
          accept=".fit"
          onChange={handleFileChange}
          className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
          required
          disabled={isSubmitDisabled}
        />
        
        {/* Stato validazione */}
        {isValidating && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-blue-700 dark:text-blue-300">Validazione file in corso...</span>
            </div>
          </div>
        )}

        {/* Dettagli validazione */}
        {validationDetails && (
          <div className={`mt-2 p-3 border rounded-lg ${
            validationDetails.isValid 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center mb-2">
              {validationDetails.isValid ? (
                <svg className="h-4 w-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
              <span className={`text-sm font-medium ${
                validationDetails.isValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              }`}>
                File {validationDetails.isValid ? 'valido' : 'non valido'} ({validationDetails.fileSize})
              </span>
            </div>
            <ul className="text-xs space-y-1">
              {validationDetails.details.map((detail, index) => (
                <li key={index} className={`${
                  validationDetails.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress bar upload */}
        {isUploading && uploadProgress > 0 && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {retryCount > 0 ? `Tentativo ${retryCount + 1}/${maxRetries}` : 'Caricamento file...'}
              </span>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Seleziona un file .fit esportato da Garmin, Wahoo, Strava o altri dispositivi compatibili.
          <br />
          <span className="font-medium">Dimensione massima: 50MB</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="athlete_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Atleta <span className="text-red-500">*</span>
          </label>
          <select
            id="athlete_id"
            name="athlete_id"
            value={formData.athlete_id}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all appearance-none stats-card-bg-input pr-8"
            required
            disabled={isSubmitDisabled}
          >
            <option value="">Seleziona un atleta</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name} {athlete.surname}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="activity_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="activity_date"
            name="activity_date"
            value={formData.activity_date}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
            required
            disabled={isSubmitDisabled}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Titolo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
          required
          disabled={isSubmitDisabled}
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrizione
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input"
          rows={3}
          disabled={isSubmitDisabled}
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="activity_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo di attività <span className="text-red-500">*</span>
          </label>
          <select
            id="activity_type"
            name="activity_type"
            value={formData.activity_type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all appearance-none stats-card-bg-input pr-8"
            required
            disabled={isSubmitDisabled}
          >
            <option value="cycling">Ciclismo</option>
            <option value="running">Corsa</option>
            <option value="swimming">Nuoto</option>
            <option value="strength">Forza</option>
            <option value="other">Altro</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_indoor"
            name="is_indoor"
            checked={formData.is_indoor}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 mr-2 cursor-pointer"
            disabled={isSubmitDisabled}
          />
          <label htmlFor="is_indoor" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            Attività indoor
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            name="is_public"
            checked={formData.is_public}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 mr-2 cursor-pointer"
            disabled={isSubmitDisabled}
          />
          <label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            Attività pubblica
          </label>
        </div>
      </div>
      
      <div className="mt-8">
        <button
          type="submit"
          className="w-full text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          disabled={isSubmitDisabled}
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Caricamento file...
            </span>
          ) : isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Salvataggio attività...
            </span>
          ) : (
            'Carica Attività'
          )}
        </button>
      </div>
    </form>
  );
} 