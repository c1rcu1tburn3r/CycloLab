// src/components/AthleteForm.tsx
'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js'; // User da supabase-js è ok
// import type { Athlete } from '@/app/athletes/page'; // Vecchio percorso, il tipo è ora in @/lib/types
import type { Athlete } from '@/lib/types'; // Importa l'interfaccia Athlete dal percorso centralizzato

// Importa i componenti Shadcn/ui
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react'; // Per l'icona di caricamento nel bottone
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";
import { Card, MetricCard, getGridClasses, spacing } from '@/components/design-system';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserX } from 'lucide-react';

// Validazione range FTP realistici per tutti i livelli
const FTP_VALIDATION_RANGES = {
  absolute: { min: 80, max: 600 }, // 80W (principiante) - 600W (professionista elite)
  wPerKg: { 
    min: 1.0,  // Principiante assoluto o in riabilitazione
    max: 8.5   // Elite mondiale (Pogačar, Vingegaard territory)
  }
};

// AthleteFormData ora si basa su Athlete, omettendo i campi non gestiti dal form + aggiungendo FTP e note
type AthleteFormData = Omit<Athlete, 'id' | 'created_at' | 'user_id' | 'avatar_url' | 'phone_number' | 'nationality'> & {
  initial_ftp?: number;
  ftp_source?: 'test' | 'estimate' | 'none';
  notes?: string;
};

interface AthleteFormProps {
  // initialData?: Athlete & { email?: string; phone_number?: string }; // Aggiorniamo anche initialData
  initialData?: Athlete; // initialData ora usa il tipo Athlete completo
  onFormSubmitSuccess?: () => void;
  mode?: 'simple' | 'registration'; // Modalità semplice o registrazione con FTP
}

export default function AthleteForm({ initialData, onFormSubmitSuccess, mode = 'simple' }: AthleteFormProps) {
  const router = useRouter();
  const { showAthleteAdded, showAthleteUpdated, showError, showSuccess } = useCycloLabToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<AthleteFormData>({
    name: initialData?.name || '',
    surname: initialData?.surname || '',
    birth_date: initialData?.birth_date || '',
    height_cm: initialData?.height_cm || null,
    weight_kg: initialData?.weight_kg || null,
    sex: initialData?.sex || null,
    email: initialData?.email || '',
    initial_ftp: undefined,
    ftp_source: 'none',
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null);

  useEffect(() => {
    const getUserAndSetData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (!user && !initialData) {
        console.warn("Utente non autenticato nel form atleti.");
      }
      // La logica di inizializzazione è ora gestita nelle funzioni getInitial*
      // e passata direttamente a useState, quindi non è più necessario qui
      // se initialData cambia, i valori saranno ricalcolati se il componente si rimonta
      // o se si aggiungono initialData alle dipendenze di useState specifici (ma non è standard)
    };
    getUserAndSetData();
  }, [supabase, initialData]); // Manteniamo initialData qui per coerenza se getUserAndSetData dovesse evolvere

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | null = value;

    // Gestisci solo i campi numerici, lascia gli altri (incluso date) come stringhe
    if (type === 'number' && name !== 'birth_date') {
      processedValue = value === '' ? null : parseFloat(value);
      if (isNaN(processedValue as number)) processedValue = null;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validazione file più robusta
      if (file.size > 10 * 1024 * 1024) { // 10MB massimo per il file originale
        showError('Errore', 'L\'immagine deve essere inferiore a 10MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        showError('Errore', 'Seleziona un file immagine valido (JPG, PNG, WEBP)');
        return;
      }

      // Verifica che sia un'immagine valida
      const img = new Image();
      img.onload = () => {
        // Verifica dimensioni minime
        if (img.width < 50 || img.height < 50) {
          showError('Errore', 'L\'immagine deve essere almeno 50x50 pixel');
          return;
        }
        
        setAvatarFile(file);
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        
        // Mostra info sulla compressione che avverrà
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        console.log(`Avatar atleta caricato: ${img.width}x${img.height}, ${fileSizeMB}MB. Verrà compresso durante l'upload.`);
      };
      
      img.onerror = () => {
        showError('Errore', 'File immagine non valido o corrotto');
      };
      
      img.src = URL.createObjectURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreview(initialData?.avatar_url || null);
    }
  };

  // Regex per la validazione
  const nameRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/; // Lettere, spazi, apostrofi, trattini (per nomi composti/stranieri)
  const emailRegex = /^\S+@\S+\.\S+$/;
  const weightRegex = /^\d+(\.\d{1})?$/; // Numeri con al massimo un decimale

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); // Resetta errori precedenti
    setSuccessMessage(null); // Resetta messaggi di successo precedenti

    // --- INIZIO BLOCCO VALIDAZIONE ---
    const validationErrors: string[] = [];
    const { name, surname, email, birth_date, height_cm, weight_kg, sex, initial_ftp, ftp_source } = formData;

    // Nome
    if (!name.trim()) validationErrors.push("Il nome è obbligatorio.");
    else if (!nameRegex.test(name)) validationErrors.push("Il nome può contenere solo lettere, spazi, apostrofi o trattini.");

    // Cognome
    if (!surname.trim()) validationErrors.push("Il cognome è obbligatorio.");
    else if (!nameRegex.test(surname)) validationErrors.push("Il cognome può contenere solo lettere, spazi, apostrofi o trattini.");

    // Email
    if (!email?.trim()) validationErrors.push("L'email è obbligatoria.");
    else if (!emailRegex.test(email)) validationErrors.push("Inserisci un indirizzo email valido.");

    // Data di Nascita
    if (!birth_date) {
      validationErrors.push("La data di nascita è obbligatoria.");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Per confronto solo date
      const dob = new Date(birth_date);
      if (dob >= today) validationErrors.push("La data di nascita non può essere oggi o una data futura.");
      // Potremmo aggiungere un controllo sull'età minima/massima se necessario
    }

    // Sesso
    if (!sex || (sex !== 'M' && sex !== 'F')) {
      validationErrors.push("Il sesso biologico è obbligatorio per calcoli VO2max accurati.");
    }

    // Altezza (cm)
    if (height_cm === null || height_cm === undefined || String(height_cm).trim() === '') {
      validationErrors.push("L'altezza è obbligatoria.");
    } else {
      const height = Number(height_cm);
      if (isNaN(height) || height <= 0) validationErrors.push("L'altezza deve essere un numero positivo.");
      else if (height < 50 || height > 280) validationErrors.push("L'altezza deve essere compresa tra 50cm e 280cm.");
      else if (!Number.isInteger(height)) validationErrors.push("L'altezza deve essere un numero intero (in cm).");
    }

    // Peso (kg)
    if (weight_kg === null || weight_kg === undefined || String(weight_kg).trim() === '') {
      validationErrors.push("Il peso è obbligatorio.");
    } else {
      const weightStr = String(weight_kg);
      if (!weightRegex.test(weightStr)) {
        validationErrors.push("Il peso deve essere un numero con al massimo un decimale (es. 70 o 70.5).");
      } else {
        const weight = parseFloat(weightStr);
        if (weight < 3 || weight > 300) validationErrors.push("Il peso deve essere compreso tra 3kg e 300kg.");
      }
    }

    // Validazione FTP se fornito (solo in modalità registrazione)
    if (mode === 'registration' && initial_ftp !== undefined && initial_ftp !== null) {
      const ftp = Number(initial_ftp);
      if (isNaN(ftp) || ftp < FTP_VALIDATION_RANGES.absolute.min || ftp > FTP_VALIDATION_RANGES.absolute.max) {
        validationErrors.push(`FTP deve essere tra ${FTP_VALIDATION_RANGES.absolute.min}W e ${FTP_VALIDATION_RANGES.absolute.max}W`);
      }

      // Validazione W/kg se entrambi peso e FTP sono presenti
      if (weight_kg && !isNaN(ftp)) {
        const wPerKg = ftp / Number(weight_kg);
        if (wPerKg < FTP_VALIDATION_RANGES.wPerKg.min || wPerKg > FTP_VALIDATION_RANGES.wPerKg.max) {
          validationErrors.push(`W/kg risultante (${wPerKg.toFixed(2)}) deve essere tra ${FTP_VALIDATION_RANGES.wPerKg.min} e ${FTP_VALIDATION_RANGES.wPerKg.max}`);
        }
      }

      // Se FTP fornito, source è obbligatoria
      if (ftp_source === 'none') {
        validationErrors.push("Se inserisci un FTP, specifica come lo hai ottenuto.");
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      setIsLoading(false); // Assicurati che isLoading sia false se la validazione fallisce
      return;
    }
    // --- FINE BLOCCO VALIDAZIONE ---

    setIsLoading(true); // Spostato dopo la validazione

    const { data: { user: submitUser } } = await supabase.auth.getUser();
    if (!submitUser) {
      setError("Sessione utente scaduta o non valida. Per favore, effettua nuovamente il login.");
      setIsLoading(false);
      return;
    }
    setCurrentUser(submitUser);

    let uploadedAvatarUrl: string | null = initialData?.avatar_url || null;
    let newFilePath: string | null = null;
    let oldAvatarUrl: string | null = null;

    if (avatarFile) {
      try {
        const compressedFile = await compressImage(avatarFile);
        const fileExt = compressedFile.name.split('.').pop();
        const uniqueFileName = `${submitUser.id}_${Date.now()}.${fileExt}`;
        newFilePath = `${submitUser.id}/${uniqueFileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(newFilePath, compressedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: compressedFile.type
          });

        if (uploadError) {
          console.error('Errore Supabase Storage Upload:', uploadError);
          setError(`Errore nel caricamento dell'avatar: ${uploadError.message}`);
          setIsLoading(false);
          return;
        }

        // Salva il vecchio URL prima di sovrascriverlo
        oldAvatarUrl = initialData?.avatar_url || null;

        if (uploadData?.path) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
          uploadedAvatarUrl = urlData?.publicUrl || null;
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(newFilePath);
          uploadedAvatarUrl = urlData?.publicUrl || null;
        }
      } catch (compressionError) {
        console.error('Errore compressione avatar:', compressionError);
        setError('Errore durante l\'ottimizzazione dell\'immagine');
        setIsLoading(false);
        return;
      }
    }

    const athleteDataToSave = {
      name: formData.name,
      surname: formData.surname,
      birth_date: formData.birth_date,
      height_cm: formData.height_cm ? Number(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      sex: formData.sex,
      email: formData.email,
      user_id: initialData?.user_id || submitUser.id,
      avatar_url: uploadedAvatarUrl,
    };

    let operationError = null;
    let athleteResult = null;

    if (initialData?.id) {
      const { error: updateError } = await supabase
        .from('athletes')
        .update(athleteDataToSave)
        .eq('id', initialData.id)
        .eq('user_id', submitUser.id);
      operationError = updateError;
      athleteResult = initialData; // Per update, usiamo i dati esistenti
    } else {
      const { data: insertResult, error: insertError } = await supabase
        .from('athletes')
        .insert([{ ...athleteDataToSave, user_id: submitUser.id }])
        .select()
        .single();
      operationError = insertError;
      athleteResult = insertResult;

      // ASSOCIAZIONE AUTOMATICA: Se l'atleta è stato creato con successo,
      // associa automaticamente l'atleta al coach che lo ha creato
      if (!insertError && insertResult) {
        try {
          const { error: associationError } = await supabase
            .from('coach_athletes')
            .insert({
              coach_user_id: submitUser.id,
              athlete_id: insertResult.id,
              assigned_at: new Date().toISOString()
            });

          if (associationError) {
            console.warn('Atleta creato ma errore nell\'associazione automatica al coach:', associationError);
            // Non blocchiamo per questo errore, l'atleta è stato comunque creato
            // Il coach potrà associarlo manualmente se necessario
          }
        } catch (associationException) {
          console.warn('Eccezione durante l\'associazione automatica:', associationException);
          // Non blocchiamo, l'atleta è stato creato
        }
      }
    }

    // In modalità registrazione, crea sempre il profilo iniziale con i dati inseriti
    if (mode === 'registration' && athleteResult && !operationError) {
      const initialProfile: any = {
        athlete_id: athleteResult.id,
        effective_date: new Date().toISOString().split('T')[0],
      };

      // Aggiungi peso se fornito (sempre richiesto in registrazione)
      if (formData.weight_kg) {
        initialProfile.weight_kg = Number(formData.weight_kg);
      }

      // Aggiungi FTP solo se fornito
      if (formData.initial_ftp) {
        initialProfile.ftp_watts = Number(formData.initial_ftp);
      }

      // Salva il profilo iniziale solo se c'è almeno un dato da salvare
      if (initialProfile.weight_kg || initialProfile.ftp_watts) {
        const { error: profileError } = await supabase
          .from('athlete_profile_entries')
          .insert([initialProfile]);

        if (profileError) {
          console.warn('Atleta creato ma errore nel salvataggio profilo iniziale:', profileError);
          // Non blocchiamo per questo errore, l'atleta è stato comunque creato
        }
      }
    }

    setIsLoading(false);

    if (operationError) {
      // ROLLBACK: Se l'operazione DB fallisce e abbiamo caricato un nuovo file, eliminalo
      if (newFilePath) {
        try {
          await supabase.storage.from('avatars').remove([newFilePath]);
          console.log('Rollback: Nuovo avatar eliminato dopo errore database');
        } catch (rollbackError) {
          console.error('Errore durante rollback:', rollbackError);
        }
      }
      
      console.error('Errore operazione DB:', operationError);
      const errorMessage = `Errore nel salvataggio dei dati dell'atleta: ${operationError.message}`;
      setError(errorMessage);
      showError("Errore nel salvataggio", errorMessage);
    } else {
      // Se tutto è andato a buon fine e c'era un avatar nuovo, elimina quello precedente
      if (newFilePath && oldAvatarUrl && oldAvatarUrl !== uploadedAvatarUrl) {
        try {
          // Estrai il path dal vecchio URL
          const urlParts = oldAvatarUrl.split('/');
          const bucketIndex = urlParts.findIndex((part: string) => part === 'avatars');
          
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            // Ricostruisci il path: userId/filename
            const oldFilePath = urlParts.slice(bucketIndex + 1).join('/');
            
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldFilePath]);
              
            if (deleteError) {
              console.warn('Avviso: Non è stato possibile eliminare il vecchio avatar atleta:', deleteError.message);
              // Non interrompiamo il flusso per questo errore non critico
            }
          }
        } catch (deleteError) {
          console.warn('Avviso: Errore durante l\'eliminazione del vecchio avatar atleta:', deleteError);
          // Non interrompiamo il flusso per questo errore non critico
        }
      }
      
      const athleteName = `${formData.name} ${formData.surname}`;
      if (initialData?.id) {
        setSuccessMessage('Atleta aggiornato con successo!');
        showAthleteUpdated(athleteName);
      } else {
        setSuccessMessage('Atleta creato e associato automaticamente al tuo account coach!');
        showAthleteAdded(athleteName);
      }
      
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      } else {
        router.refresh();
        if (!initialData?.id) {
            setTimeout(() => router.push('/athletes'), 1500);
        }
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!initialData?.avatar_url && !avatarPreview) {
      showError('Errore', 'Nessun avatar da rimuovere');
      return;
    }

    showConfirm({
      title: 'Rimuovi Avatar',
      description: 'Sei sicuro di voler rimuovere l\'avatar di questo atleta? L\'immagine verrà eliminata permanentemente.',
      confirmText: 'Rimuovi Avatar',
      cancelText: 'Annulla',
      variant: 'warning',
      icon: <UserX className="w-6 h-6" />,
      onConfirm: async () => {
        setIsRemovingAvatar(true);

        try {
          const currentAvatarUrl = initialData?.avatar_url;
          
          if (!currentAvatarUrl) {
            // Se non c'è avatar nel DB, solo reset locale
            setAvatarPreview(null);
            setAvatarFile(null);
            showSuccess('Avatar rimosso', 'Avatar rimosso con successo');
            setIsRemovingAvatar(false);
            return;
          }

          // Se c'è un atleta esistente, aggiorna il database
          if (initialData?.id) {
            const { data: { user: submitUser } } = await supabase.auth.getUser();
            if (!submitUser) {
              throw new Error('Sessione utente non valida');
            }

            const { error: updateError } = await supabase
              .from('athletes')
              .update({ avatar_url: null })
              .eq('id', initialData.id)
              .eq('user_id', submitUser.id);

            if (updateError) {
              throw new Error(`Errore rimozione avatar: ${updateError.message}`);
            }

            // Se l'update è riuscito, elimina il file dal storage
            try {
              const urlParts = currentAvatarUrl.split('/');
              const bucketIndex = urlParts.findIndex((part: string) => part === 'avatars');
              
              if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                const filePath = urlParts.slice(bucketIndex + 1).join('/');
                
                const { error: deleteError } = await supabase.storage
                  .from('avatars')
                  .remove([filePath]);
                  
                if (deleteError) {
                  console.warn('Avatar rimosso dal database ma errore eliminazione file:', deleteError.message);
                  // Non blocchiamo per questo errore, l'avatar è stato comunque rimosso
                }
              }
            } catch (deleteError) {
              console.warn('Avatar rimosso dal database ma errore durante eliminazione file:', deleteError);
              // Non blocchiamo per questo errore, l'avatar è stato comunque rimosso
            }
          }

          // Aggiorna lo stato locale
          setAvatarPreview(null);
          setAvatarFile(null);

          showSuccess('Avatar rimosso', 'Avatar dell\'atleta rimosso con successo');
        } catch (error: any) {
          showError('Errore', error.message || 'Si è verificato un errore durante la rimozione');
        } finally {
          setIsRemovingAvatar(false);
        }
      }
    });
  };

  // Calcolo W/kg per preview (solo in modalità registrazione)
  const calculatedWPerKg = mode === 'registration' && formData.weight_kg && formData.initial_ftp 
    ? (Number(formData.initial_ftp) / Number(formData.weight_kg)).toFixed(2)
    : null;

  const baseInputClassName = `w-full px-3 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all ${spacing.all.sm}`;
  const commonInputClassName = `${baseInputClassName} py-2`; // Per tutti gli input normali
  const fileInputClassName = `${baseInputClassName} flex items-center`; // Per l'input file, senza py-2 generale, flex per allineare contenuto interno
  const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  // Funzione per comprimere l'immagine
  const compressImage = async (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calcola le nuove dimensioni mantenendo l'aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Disegna l'immagine ridimensionata
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converte a blob con compressione
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Forza JPEG per migliore compressione
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback al file originale
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <>
      <ConfirmDialog />
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className={`${spacing.bottom.md} ${spacing.all.sm} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-xl text-sm`}>{error.split('\n').map((line, idx) => <span key={idx}>{line}<br/></span>)}</p>}
        {successMessage && <p className={`${spacing.bottom.md} ${spacing.all.sm} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-xl text-sm`}>{successMessage}</p>}

        {/* Avatar section - solo se non in modalità registrazione */}
        {mode !== 'registration' && (
          <div className="flex flex-col items-center space-y-3 border-b border-gray-200 dark:border-gray-700/50 pb-6 mb-6">
            <Label htmlFor="avatar" className={`${labelClassName} self-start`}>Avatar (Opzionale)</Label>
            <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-800/40 flex items-center justify-center overflow-hidden border-2 border-gray-300 dark:border-gray-700/50 shadow-sm">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Anteprima avatar" className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-400 dark:text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A1.5 1.5 0 0 1 18 21.75H6a1.5 1.5 0 0 1-1.499-1.632Z" />
                </svg>
              )}
            </div>
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={`${fileInputClassName} text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-800/40`}
            />
            
            {/* Pulsante rimuovi avatar */}
            {(avatarPreview || initialData?.avatar_url) && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isRemovingAvatar}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRemovingAvatar ? (
                  <span className="flex items-center">
                    <Loader2 className="w-2 h-2 mr-1 animate-spin" />
                    Rimuovendo...
                  </span>
                ) : (
                  'Rimuovi avatar'
                )}
              </button>
            )}
            
            <p className="text-xs text-gray-500 dark:text-gray-400 self-start">
              JPG, PNG o WEBP. Massimo 10MB. L'immagine verrà automaticamente ottimizzata.
            </p>
          </div>
        )}

        {/* Sezione Dati Personali */}
        <div className="space-y-6">
          <div className={getGridClasses(2, 'md')}>
            <div className="space-y-1.5">
              <Label htmlFor="name" className={labelClassName}>Nome <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Mario"
                required
                className={commonInputClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="surname" className={labelClassName}>Cognome <span className="text-red-500">*</span></Label>
              <Input
                id="surname"
                name="surname"
                type="text"
                value={formData.surname}
                onChange={handleInputChange}
                placeholder="Rossi"
                required
                className={commonInputClassName}
              />
            </div>
          </div>

          <div className={getGridClasses(2, 'md')}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className={labelClassName}>Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="mario.rossi@esempio.com"
                required
                className={commonInputClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birth_date" className={labelClassName}>Data di Nascita <span className="text-red-500">*</span></Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                value={formData.birth_date || ''}
                onChange={handleInputChange}
                required
                className={commonInputClassName}
              />
            </div>
          </div>

          <div className={getGridClasses(2, 'md')}>
            <div className="space-y-1.5">
              <Label htmlFor="sex" className={labelClassName}>Sesso <span className="text-red-500">*</span></Label>
              <Select value={formData.sex || ''} onValueChange={(value) => handleSelectChange('sex', value)}>
                <SelectTrigger className={commonInputClassName}>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Maschio</SelectItem>
                  <SelectItem value="F">Femmina</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Necessario per calcoli VO2max scientificamente accurati
              </p>
            </div>
            <div></div>
          </div>
        </div>

        {/* Sezione Misurazioni */}
        <div className="space-y-6">
          <div className={getGridClasses(2, 'md')}>
            <div className="space-y-1.5">
              <Label htmlFor="height_cm" className={labelClassName}>Altezza (cm) <span className="text-red-500">*</span></Label>
              <Input
                id="height_cm"
                name="height_cm"
                type="number"
                value={formData.height_cm || ''}
                onChange={handleInputChange}
                placeholder="175"
                required
                className={commonInputClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight_kg" className={labelClassName}>Peso (kg) <span className="text-red-500">*</span></Label>
              <Input
                id="weight_kg"
                name="weight_kg"
                type="number"
                value={formData.weight_kg || ''}
                onChange={handleInputChange}
                placeholder="70.5"
                step="0.1"
                required
                className={commonInputClassName}
              />
            </div>
          </div>

          {/* Sezione FTP - solo in modalità registrazione */}
          {mode === 'registration' && (
            <div className="space-y-4">            
              <div className={getGridClasses(2, 'md')}>
                <div className="space-y-1.5">
                  <Label htmlFor="initial_ftp" className={labelClassName}>FTP (W) - Opzionale</Label>
                  <Input
                    id="initial_ftp"
                    name="initial_ftp"
                    type="number"
                    min={FTP_VALIDATION_RANGES.absolute.min}
                    max={FTP_VALIDATION_RANGES.absolute.max}
                    value={formData.initial_ftp || ''}
                    onChange={handleInputChange}
                    placeholder="250"
                    className={commonInputClassName}
                  />
                  <p className="text-xs text-gray-500">
                    Verrà rilevato automaticamente dalle attività se non specificato
                  </p>
                </div>

                {formData.initial_ftp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ftp-source" className={labelClassName}>Origine FTP <span className="text-red-500">*</span></Label>
                    <Select value={formData.ftp_source} onValueChange={(value) => handleSelectChange('ftp_source', value)}>
                      <SelectTrigger className={commonInputClassName}>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test specifico</SelectItem>
                        <SelectItem value="estimate">Stima precedente</SelectItem>
                        <SelectItem value="none">Non specificato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {calculatedWPerKg && (
                <div className={`${spacing.all.sm} bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700`}>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    W/kg: <span className="text-lg font-bold">{calculatedWPerKg}</span>
                    <span className="ml-3 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                      {Number(calculatedWPerKg) >= 4.0 ? 'Competitivo' : 
                       Number(calculatedWPerKg) >= 3.0 ? 'Buono' : 
                       'In sviluppo'}
                    </span>
                  </p>
                </div>
              )}

              {/* Note opzionali */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className={labelClassName}>Note (opzionale)</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Obiettivi, note mediche, preferenze..."
                  className={commonInputClassName}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-white font-semibold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {mode === 'registration' ? 'Registrazione in corso...' : 'Salvataggio...'}
              </span>
            ) : (initialData?.id ? 'Aggiorna Atleta' : mode === 'registration' ? 'Completa Registrazione' : 'Aggiungi Atleta')}
          </button>
        </div>
      </form>
    </>
  );
}