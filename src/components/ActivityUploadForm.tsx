'use client';

import { useState, FormEvent, ChangeEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Athlete } from '@/lib/types';
import { processAndCreateActivity } from '@/app/activities/actions';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";
import { Button } from '@/components/ui/button';
import { spacing } from '@/lib/design-system';

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
  
  // NUOVO: Stati per gestione data dal file .fit
  const [fitFileDate, setFitFileDate] = useState<string | null>(null);
  const [dateModified, setDateModified] = useState<boolean>(false);
  
  // NUOVO: Stati per gestione FTP retroattivo
  const [ftpWarning, setFtpWarning] = useState<{
    show: boolean;
    message: string;
    type: 'missing' | 'future';
    suggestedFTP: number | null;
    closestFTP?: { value: number; date: string; daysDiff: number } | null;
    closestWeight?: { value: number; date: string; daysDiff: number } | null;
  } | null>(null);
  const [isCheckingFTP, setIsCheckingFTP] = useState(false);
  
  // NUOVO: Stati per inserimento manuale FTP
  const [showManualFTPInput, setShowManualFTPInput] = useState(false);
  const [manualFTP, setManualFTP] = useState<string>('');
  const [manualWeight, setManualWeight] = useState<string>('');
  const [isAddingManualData, setIsAddingManualData] = useState(false);
  
  // NUOVO: Stati per gestione dati atleta mancanti
  const [athleteDataWarning, setAthleteDataWarning] = useState<{
    show: boolean;
    missingFTP: boolean;
    missingWeight: boolean;
    activityDate: string;
    closestFTP?: { value: number; date: string; daysDiff: number } | null;
    closestWeight?: { value: number; date: string; daysDiff: number } | null;
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

      // NUOVO: Reset stati data quando si cambia file
      setFitFileDate(null);
      setDateModified(false);
      setAthleteDataWarning(null);

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

          // NUOVO: Auto-popola la data dal file .fit se estratta
          if (validation.extractedDate) {
            setFitFileDate(validation.extractedDate);
            setFormData(prev => ({ 
              ...prev, 
              activity_date: validation.extractedDate! 
            }));
            setDateModified(false); // Reset flag
            console.log('Data auto-popolata dal file .fit:', validation.extractedDate);
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

    // NUOVO: Rileva modifica manuale della data
    if (name === 'activity_date') {
      if (fitFileDate && value !== fitFileDate) {
        setDateModified(true);
      } else if (fitFileDate && value === fitFileDate) {
        setDateModified(false);
      }
    }

    // NUOVO: Controlla FTP quando cambiano atleta o data
    if (name === 'athlete_id' || name === 'activity_date') {
      const newFormData = { ...formData, [name]: value };
      if (newFormData.athlete_id && newFormData.activity_date) {
        checkFTPAvailability(newFormData.athlete_id, newFormData.activity_date);
      }
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

  // Funzione per validare il file .fit E estrarre la data
  const validateFitFile = async (file: File): Promise<{ 
    isValid: boolean; 
    details: string[]; 
    fileSize: string;
    extractedDate?: string;
  }> => {
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

    let extractedDate: string | undefined;

    // NUOVO: Estrazione data dal file .fit usando FitParser
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Importa FitParser dinamicamente per evitare errori SSR
      const FitParser = (await import('fit-file-parser')).default;
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'both',
      });

      // Parsa il file per estrarre la data
      const parsedData = await new Promise<any>((resolve, reject) => {
        fitParser.parse(buffer, (error: any, data: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
      });

      // Estrai la data dalla prima sessione o dal primo record
      let activityDate: Date | null = null;
      
      if (parsedData.sessions && parsedData.sessions.length > 0) {
        const session = parsedData.sessions[0];
        if (session.start_time) {
          activityDate = new Date(session.start_time);
        }
      }
      
      if (!activityDate && parsedData.records && parsedData.records.length > 0) {
        const firstRecord = parsedData.records[0];
        if (firstRecord.timestamp) {
          activityDate = firstRecord.timestamp instanceof Date 
            ? firstRecord.timestamp 
            : new Date(firstRecord.timestamp);
        }
      }

      if (activityDate && !isNaN(activityDate.getTime())) {
        extractedDate = activityDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        details.push(`✅ Data estratta: ${extractedDate}`);
      } else {
        details.push('⚠️ Impossibile estrarre data dal file');
      }

    } catch (error) {
      details.push('⚠️ Errore nell\'estrazione della data dal file');
      console.warn('Errore estrazione data FIT:', error);
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

    return { isValid: true, details, fileSize, extractedDate };
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

  // NUOVO: Funzione per controllare disponibilità FTP per la data
  const checkFTPAvailability = async (athleteId: string, activityDate: string) => {
    if (!athleteId || !activityDate) return;

    setIsCheckingFTP(true);
    setFtpWarning(null);

    try {
      // Cerca TUTTI gli FTP e pesi dell'atleta
      const { data: allEntries, error } = await supabase
        .from('athlete_profile_entries')
        .select('ftp_watts, weight_kg, effective_date')
        .eq('athlete_id', athleteId)
        .order('effective_date', { ascending: true });

      if (error) {
        console.error('Errore recupero profili atleta:', error);
        return;
      }

      if (!allEntries || allEntries.length === 0) {
        setFtpWarning({
          show: true,
          type: 'missing',
          message: 'Nessun dato FTP/peso disponibile',
          suggestedFTP: 200
        });
        return;
      }

      const activityDateObj = new Date(activityDate);
      
      // Controlla se abbiamo dati per la data esatta dell'attività
      const exactDateEntry = allEntries.find(entry => 
        entry.effective_date === activityDate
      );

      if (exactDateEntry && exactDateEntry.ftp_watts && exactDateEntry.weight_kg) {
        // Abbiamo entrambi FTP e peso, tutto OK
        setDateModified(false);
        setAthleteDataWarning(null);
        return;
      }

      if (exactDateEntry) {
        // Abbiamo dati per la data ma non completi
        if (exactDateEntry.ftp_watts && !exactDateEntry.weight_kg) {
          // Solo FTP, manca peso
          setAthleteDataWarning({
            show: true,
            missingFTP: false,
            missingWeight: true,
            activityDate: activityDate,
            closestFTP: null,
            closestWeight: null
          });
          return;
        } else if (exactDateEntry.weight_kg && !exactDateEntry.ftp_watts) {
          // Solo peso, manca FTP
          setAthleteDataWarning({
            show: true,
            missingFTP: true,
            missingWeight: false,
            activityDate: activityDate,
            closestFTP: null,
            closestWeight: null
          });
          return;
        }
      }

      // Trova dati retroattivi completi (data <= attività)
      const retroFTP = allEntries
        .filter(entry => entry.ftp_watts && new Date(entry.effective_date) <= activityDateObj)
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
      
      const retroWeight = allEntries
        .filter(entry => entry.weight_kg && new Date(entry.effective_date) <= activityDateObj)
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];

      // Se abbiamo entrambi FTP e peso retroattivi, tutto ok
      if (retroFTP && retroWeight) {
        setDateModified(false);
        setAthleteDataWarning(null);
        return;
      }

      // Se abbiamo solo FTP retroattivo, manca peso
      if (retroFTP && !retroWeight) {
        setDateModified(false);
        setAthleteDataWarning({
          show: true,
          missingFTP: false,
          missingWeight: true,
          activityDate: activityDate,
          closestFTP: null,
          closestWeight: null
        });
        return;
      }

      // Se abbiamo solo peso retroattivo, manca FTP
      if (retroWeight && !retroFTP) {
        setDateModified(false);
        setAthleteDataWarning({
          show: true,
          missingFTP: true,
          missingWeight: false,
          activityDate: activityDate,
          closestFTP: null,
          closestWeight: null
        });
        return;
      }

      // Altrimenti trova il più vicino (temporalmente)
      let closestFTP: { value: number; date: string; daysDiff: number } | null = null;
      let closestWeight: { value: number; date: string; daysDiff: number } | null = null;
      let minFTPDiff = Infinity;
      let minWeightDiff = Infinity;

      allEntries.forEach(entry => {
        const entryDate = new Date(entry.effective_date);
        const daysDiff = Math.abs((entryDate.getTime() - activityDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (entry.ftp_watts && daysDiff < minFTPDiff) {
          minFTPDiff = daysDiff;
          closestFTP = {
            value: entry.ftp_watts,
            date: entry.effective_date,
            daysDiff: Math.round(daysDiff)
          };
        }
        
        if (entry.weight_kg && daysDiff < minWeightDiff) {
          minWeightDiff = daysDiff;
          closestWeight = {
            value: entry.weight_kg,
            date: entry.effective_date,
            daysDiff: Math.round(daysDiff)
          };
        }
      });

      if (closestFTP || closestWeight) {
        setDateModified(false);
        setAthleteDataWarning({
          show: true,
          missingFTP: !closestFTP,
          missingWeight: !closestWeight,
          activityDate: activityDate,
          closestFTP,
          closestWeight
        });
      } else {
        setDateModified(false);
        setAthleteDataWarning({
          show: true,
          missingFTP: true,
          missingWeight: true,
          activityDate: activityDate,
          closestFTP: null,
          closestWeight: null
        });
      }

    } catch (error) {
      console.error('Errore controllo FTP:', error);
    } finally {
      setIsCheckingFTP(false);
    }
  };

  // NUOVO: Funzione per utilizzare FTP suggerito
  const applyClosestFTP = async (ftpValue: number, originalDate: string) => {
    if (!formData.athlete_id || !formData.activity_date) return;

    try {
      // Recupera user_id per popolare il campo
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Errore", "Utente non autenticato");
        return;
      }

      const { error } = await supabase
        .from('athlete_profile_entries')
        .upsert({
          athlete_id: formData.athlete_id,
          effective_date: formData.activity_date,
          ftp_watts: ftpValue,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'athlete_id, effective_date'
        });

      if (error) {
        console.error('Errore inserimento FTP:', error);
        showError("Errore FTP", `Impossibile salvare l'FTP: ${error.message}`);
      } else {
        showWarning("FTP applicato", `FTP di ${ftpValue}W applicato per la data ${formData.activity_date}`);
        // Ricontrolla FTP per nascondere il warning
        await checkFTPAvailability(formData.athlete_id, formData.activity_date);
      }
    } catch (error) {
      console.error('Errore:', error);
      showError("Errore", "Errore durante il salvataggio");
    }
  };

  // NUOVO: Funzione per utilizzare peso suggerito
  const applyClosestWeight = async (weightValue: number, originalDate: string) => {
    if (!formData.athlete_id || !formData.activity_date) return;

    try {
      // Recupera user_id per popolare il campo
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Errore", "Utente non autenticato");
        return;
      }

      const { error } = await supabase
        .from('athlete_profile_entries')
        .upsert({
          athlete_id: formData.athlete_id,
          effective_date: formData.activity_date,
          weight_kg: weightValue,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'athlete_id, effective_date'
        });

      if (error) {
        console.error('Errore inserimento peso:', error);
        showError("Errore Peso", `Impossibile salvare il peso: ${error.message}`);
      } else {
        showWarning("Peso applicato", `Peso di ${weightValue}kg applicato per la data ${formData.activity_date}`);
        // Ricontrolla FTP per aggiornare il warning
        await checkFTPAvailability(formData.athlete_id, formData.activity_date);
      }
    } catch (error) {
      console.error('Errore:', error);
      showError("Errore", "Errore durante il salvataggio");
    }
  };

  // NUOVO: Funzione per aggiungere dati manuali
  const addManualData = async () => {
    if (!formData.athlete_id || !formData.activity_date) return;
    if (!manualFTP && !manualWeight) {
      showError("Dati mancanti", "Inserisci almeno FTP o peso");
      return;
    }

    setIsAddingManualData(true);

    try {
      // Recupera user_id per popolare il campo
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Errore", "Utente non autenticato");
        return;
      }

      const dataToInsert: any = {
        athlete_id: formData.athlete_id,
        effective_date: formData.activity_date,
        created_at: new Date().toISOString(),
      };

      if (manualFTP) {
        const ftpValue = parseInt(manualFTP);
        if (ftpValue > 0 && ftpValue <= 600) {
          dataToInsert.ftp_watts = ftpValue;
        } else {
          showError("FTP non valido", "FTP deve essere tra 1 e 600 watt");
          return;
        }
      }

      if (manualWeight) {
        const weightValue = parseFloat(manualWeight);
        if (weightValue > 0 && weightValue <= 200) {
          dataToInsert.weight_kg = weightValue;
        } else {
          showError("Peso non valido", "Peso deve essere tra 1 e 200 kg");
          return;
        }
      }

      const { error } = await supabase
        .from('athlete_profile_entries')
        .upsert(dataToInsert, {
          onConflict: 'athlete_id, effective_date'
        });

      if (error) {
        console.error('Errore inserimento dati manuali:', error);
        showError("Errore Salvataggio", `Impossibile salvare i dati: ${error.message}`);
      } else {
        showWarning("Dati salvati", "Dati aggiunti correttamente");
        setShowManualFTPInput(false);
        setManualFTP('');
        setManualWeight('');
        // Ricontrolla FTP per nascondere il warning
        await checkFTPAvailability(formData.athlete_id, formData.activity_date);
      }
    } catch (error) {
      console.error('Errore:', error);
      showError("Errore", "Errore durante il salvataggio");
    } finally {
      setIsAddingManualData(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className={`${spacing.bottom.md} ${spacing.all.sm} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-xl`}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className={`${spacing.bottom.md} ${spacing.all.sm} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-xl`}>
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
          className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all "
          required
          disabled={isSubmitDisabled}
        />
        
        {/* Stato validazione */}
        {isValidating && (
          <div className={`mt-2 ${spacing.all.sm} bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl`}>
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
          <div className={`mt-2 ${spacing.all.sm} border rounded-xl ${
            validationDetails.isValid 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className={`flex items-center ${spacing.bottom.sm}`}>
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
          <div className={`mt-2 ${spacing.all.sm} bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl`}>
            <div className={`flex items-center justify-between ${spacing.bottom.sm}`}>
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
            className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all appearance-none  pr-8"
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
            className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all "
            required
            disabled={isSubmitDisabled}
          />
          
          {/* NUOVO: Warning per data modificata manualmente */}
          {dateModified && fitFileDate && (
            <div className={`mt-2 ${spacing.all.sm} bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-400 rounded-r-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Data diversa dal file .fit (<strong>{fitFileDate}</strong>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, activity_date: fitFileDate }));
                      setDateModified(false);
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded transition-colors"
                  >
                    Ripristina
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateModified(false)}
                    className="text-amber-600 hover:text-amber-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* NUOVO: Warning FTP retroattivo */}
          {isCheckingFTP && (
            <div className={`mt-2 ${spacing.all.sm} bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl`}>
              <div className="flex items-center">
                <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-blue-700 dark:text-blue-300">Verifica FTP per questa data...</span>
              </div>
            </div>
          )}
          
          {athleteDataWarning?.show && (
            <div className="mt-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm">
              <div className={`flex items-start justify-between ${spacing.bottom.sm}`}>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Dati Performance Mancanti
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      {athleteDataWarning.missingFTP && athleteDataWarning.missingWeight 
                        ? `FTP e Peso mancanti per ${athleteDataWarning.activityDate}`
                        : athleteDataWarning.missingFTP 
                        ? `FTP mancante per ${athleteDataWarning.activityDate}`
                        : `Peso mancante per ${athleteDataWarning.activityDate}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAthleteDataWarning(null)}
                  className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Badge dati richiesti */}
              <div className="flex flex-wrap gap-2 mb-4">
                {athleteDataWarning.missingFTP && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                    FTP Mancante
                  </div>
                )}
                {athleteDataWarning.missingWeight && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Peso Mancante
                  </div>
                )}
              </div>

              {/* Dati disponibili da altre date */}
              {(athleteDataWarning.closestFTP || athleteDataWarning.closestWeight) && (
                <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-xl border border-amber-200/50 dark:border-amber-700/50 mb-4">
                  <div className={`text-xs font-medium text-amber-800 dark:text-amber-200 ${spacing.bottom.sm}`}>
                    📊 Dati disponibili da altre date:
                  </div>
                  <div className="space-y-2">
                    {athleteDataWarning.closestFTP && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          <span className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>{athleteDataWarning.closestFTP.value}W</strong> FTP del {athleteDataWarning.closestFTP.date}
                            <span className="text-blue-600 dark:text-blue-400 ml-1">
                              (±{athleteDataWarning.closestFTP.daysDiff} giorni)
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyClosestFTP(athleteDataWarning.closestFTP!.value, athleteDataWarning.closestFTP!.date)}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          Applica
                        </button>
                      </div>
                    )}
                    {athleteDataWarning.closestWeight && (
                      <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          <span className="text-xs text-green-800 dark:text-green-200">
                            <strong>{athleteDataWarning.closestWeight.value}kg</strong> peso del {athleteDataWarning.closestWeight.date}
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (±{athleteDataWarning.closestWeight.daysDiff} giorni)
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyClosestWeight(athleteDataWarning.closestWeight!.value, athleteDataWarning.closestWeight!.date)}
                          className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          Applica
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Azioni disponibili */}
              <div className="flex flex-wrap gap-2">
                {!showManualFTPInput ? (
                  <button
                    type="button"
                    onClick={() => setShowManualFTPInput(true)}
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-800/30 border border-amber-300 dark:border-amber-600 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-700/50 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Inserisci Manualmente
                  </button>
                ) : (
                  <div className="w-full bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl border border-amber-200 dark:border-amber-700">
                    <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-3">
                      ✏️ Inserisci dati per {athleteDataWarning.activityDate}:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {athleteDataWarning.missingFTP && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            FTP (Watt):
                          </label>
                          <input
                            type="number"
                            value={manualFTP}
                            onChange={(e) => setManualFTP(e.target.value)}
                            placeholder="250"
                            min="50"
                            max="600"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                      )}
                      {athleteDataWarning.missingWeight && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Peso (kg):
                          </label>
                          <input
                            type="number"
                            value={manualWeight}
                            onChange={(e) => setManualWeight(e.target.value)}
                            placeholder="70"
                            min="30"
                            max="200"
                            step="0.1"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addManualData}
                        disabled={isAddingManualData || (!manualFTP && !manualWeight)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                      >
                        {isAddingManualData && (
                          <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        Salva Dati
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualFTPInput(false);
                          setManualFTP('');
                          setManualWeight('');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
          className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all "
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
          className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all "
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
            className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all appearance-none  pr-8"
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
