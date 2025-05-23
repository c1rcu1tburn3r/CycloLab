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
import { Loader2 } from 'lucide-react'; // Per l'icona di caricamento nel bottone
// Importa Select da Shadcn/UI
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Import per Combobox
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button"; // Importa Button
import { Check, ChevronsUpDown } from 'lucide-react'; // Importa icone

// Importa i dati dei paesi dal file JSON
import countryDataJson from '@/lib/countries.json';

interface Country {
  countryName: string;
  prefix: string;
  nationality: string;
  code: string;
}

const countryData: Country[] = countryDataJson;

// Trova un default per il prefisso e la nazionalità (es. Italia se presente, altrimenti il primo della lista)
const defaultCountry = countryData.find(c => c.code === 'IT') || countryData[0];

// AthleteFormData ora si basa su Athlete, che già include email e phone_number.
// Omettiamo le stesse proprietà che non sono gestite direttamente dal form.
// Se AthleteRow includesse già email e phone_number, si potrebbe usare Omit<AthleteRow, ...> e poi aggiungere i campi opzionali.
// Ma dato che Athlete è AthleteRow & { email, phone_number }, Omit<Athlete, ...> è corretto.
type AthleteFormData = Omit<Athlete, 'id' | 'created_at' | 'user_id' | 'avatar_url' | 'phone_number' | 'nationality'> & {
  phone_number_numeric: string; // Solo la parte numerica del telefono
  nationality_value: string; // Il valore selezionato per la nazionalità
};

interface AthleteFormProps {
  // initialData?: Athlete & { email?: string; phone_number?: string }; // Aggiorniamo anche initialData
  initialData?: Athlete; // initialData ora usa il tipo Athlete completo
  onFormSubmitSuccess?: () => void;
}

export default function AthleteForm({ initialData, onFormSubmitSuccess }: AthleteFormProps) {
  const router = useRouter();
  // Inizializza il client Supabase per il browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Funzione per trovare il prefisso iniziale o usare il default
  const getInitialPhonePrefix = () => {
    if (initialData?.phone_number) {
      const match = initialData.phone_number.match(/^(\+\d+)/);
      if (match && match[0] && countryData.some(c => c.prefix === match[0])) {
        return match[0];
      }
    }
    return defaultCountry.prefix;
  };

  // Funzione per trovare la nazionalità iniziale o usare il default
  const getInitialNationality = () => {
    if (initialData?.nationality && countryData.some(c => c.nationality === initialData.nationality)) {
      return initialData.nationality;
    }
    return defaultCountry.nationality;
  };
  
  const getInitialNumericPhoneNumber = () => {
    if (initialData?.phone_number) {
        // Rimuove il prefisso se presente e corrisponde a uno dei prefissi noti
        const knownPrefix = countryData.find(c => initialData.phone_number!.startsWith(c.prefix));
        if (knownPrefix) {
            return initialData.phone_number.substring(knownPrefix.prefix.length).trim();
        }
        // Altrimenti, prova a rimuovere un prefisso generico se non corrisponde a uno noto, per pulizia
        return initialData.phone_number.replace(/^(\+\d+)/, '').trim();
    }
    return '';
  }

  const [selectedPhonePrefix, setSelectedPhonePrefix] = useState<string>(getInitialPhonePrefix());

  const [formData, setFormData] = useState<AthleteFormData>({
    name: initialData?.name || '',
    surname: initialData?.surname || '',
    birth_date: initialData?.birth_date || '',
    height_cm: initialData?.height_cm || null,
    weight_kg: initialData?.weight_kg || null,
    nationality_value: getInitialNationality(),
    email: initialData?.email || '',
    phone_number_numeric: getInitialNumericPhoneNumber(),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null);

  // Stato per il Combobox della nazionalità
  const [nationalityPopoverOpen, setNationalityPopoverOpen] = useState(false);

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

    if (name === 'phone_number_numeric') {
      // Consenti solo numeri per il campo telefono numerico
      processedValue = value.replace(/[^0-9]/g, '');
    } else if (type === 'number') {
      processedValue = value === '' ? null : parseFloat(value);
      if (isNaN(processedValue as number)) processedValue = null;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      // Considera di revocare l'URL con URL.revokeObjectURL(previewUrl) in un useEffect cleanup
      // se l'immagine viene cambiata spesso o il componente smontato per evitare memory leaks.
    } else {
      setAvatarFile(null);
      setAvatarPreview(initialData?.avatar_url || null);
    }
  };

  // Regex per la validazione
  const nameRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/; // Lettere, spazi, apostrofi, trattini (per nomi composti/stranieri)
  const emailRegex = /^\S+@\S+\.\S+$/;
  const numericOnlyRegex = /^[0-9]+$/; // Per la parte numerica del telefono
  const weightRegex = /^\d+(\.\d{1})?$/; // Numeri con al massimo un decimale

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); // Resetta errori precedenti
    setSuccessMessage(null); // Resetta messaggi di successo precedenti

    // --- INIZIO BLOCCO VALIDAZIONE ---
    const validationErrors: string[] = [];
    const { name, surname, email, phone_number_numeric, birth_date, nationality_value, height_cm, weight_kg } = formData;

    // Nome
    if (!name.trim()) validationErrors.push("Il nome è obbligatorio.");
    else if (!nameRegex.test(name)) validationErrors.push("Il nome può contenere solo lettere, spazi, apostrofi o trattini.");

    // Cognome
    if (!surname.trim()) validationErrors.push("Il cognome è obbligatorio.");
    else if (!nameRegex.test(surname)) validationErrors.push("Il cognome può contenere solo lettere, spazi, apostrofi o trattini.");

    // Email
    if (!email?.trim()) validationErrors.push("L'email è obbligatoria.");
    else if (!emailRegex.test(email)) validationErrors.push("Inserisci un indirizzo email valido.");

    // Telefono
    if (!selectedPhonePrefix) validationErrors.push("Seleziona un prefisso telefonico.");
    if (!phone_number_numeric.trim()) {
      validationErrors.push("Il numero di telefono è obbligatorio.");
    } else if (!numericOnlyRegex.test(phone_number_numeric)) {
      validationErrors.push("Il numero di telefono può contenere solo cifre.");
    }

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

    // Nazionalità
    if (!nationality_value) validationErrors.push("La nazionalità è obbligatoria.");
    else if (!countryData.some(c => c.nationality === nationality_value)) {
        validationErrors.push("Seleziona una nazionalità valida dalla lista.");
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

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const uniqueFileName = `${submitUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `${submitUser.id}/${uniqueFileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Errore Supabase Storage Upload:', uploadError);
        setError(`Errore nel caricamento dell'avatar: ${uploadError.message}`);
        setIsLoading(false);
        return;
      }

      if (uploadData?.path) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        uploadedAvatarUrl = urlData?.publicUrl || null;
      } else {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        uploadedAvatarUrl = urlData?.publicUrl || null;
      }
    }

    const fullPhoneNumber = `${selectedPhonePrefix}${formData.phone_number_numeric.trim()}`;

    const athleteDataToSave = {
      name: formData.name,
      surname: formData.surname,
      birth_date: formData.birth_date,
      height_cm: formData.height_cm ? Number(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      nationality: formData.nationality_value,
      email: formData.email,
      phone_number: fullPhoneNumber,
      user_id: initialData?.user_id || submitUser.id,
      avatar_url: uploadedAvatarUrl,
    };

    let operationError = null;

    if (initialData?.id) {
      const { error: updateError } = await supabase
        .from('athletes')
        .update(athleteDataToSave)
        .eq('id', initialData.id)
        .eq('user_id', submitUser.id);
      operationError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('athletes')
        .insert([{ ...athleteDataToSave, user_id: submitUser.id }]);
      operationError = insertError;
    }

    setIsLoading(false);

    if (operationError) {
      console.error('Errore operazione DB:', operationError);
      setError(`Errore nel salvataggio dei dati dell'atleta: ${operationError.message}`);
    } else {
      setSuccessMessage(initialData?.id ? 'Atleta aggiornato con successo!' : 'Atleta aggiunto con successo!');
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

  const baseInputClassName = "w-full px-3 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input";
  const commonInputClassName = `${baseInputClassName} py-2`; // Per tutti gli input normali
  const fileInputClassName = `${baseInputClassName} flex items-center`; // Per l'input file, senza py-2 generale, flex per allineare contenuto interno
  const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg text-sm">{error.split('\n').map((line, idx) => <span key={idx}>{line}<br/></span>)}</p>}
      {successMessage && <p className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg text-sm">{successMessage}</p>}

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
          onChange={handleAvatarChange}
          className={`${fileInputClassName} text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-800/40`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <Label htmlFor="phone_number_numeric" className={labelClassName}>Telefono <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Select value={selectedPhonePrefix} onValueChange={setSelectedPhonePrefix}>
              <SelectTrigger className={`${commonInputClassName} w-[150px]`}> {/* Larghezza fissa per il prefisso */}
                <SelectValue placeholder="Prefisso" />
              </SelectTrigger>
              <SelectContent>
                {countryData.map((country) => (
                  <SelectItem key={country.code} value={country.prefix}>
                    {country.countryName} ({country.prefix})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="phone_number_numeric"
              name="phone_number_numeric"
              type="tel" // type="tel" è più semantico, il filtraggio avviene in handleInputChange
              value={formData.phone_number_numeric}
              onChange={handleInputChange}
              placeholder="1234567890"
              required
              className={`${commonInputClassName} flex-grow`} // Occupa lo spazio rimanente
              pattern="[0-9]*" // Utile per la tastiera mobile e validazione browser base
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="space-y-1.5">
          <Label htmlFor="nationality_value" className={labelClassName}>Nazionalità <span className="text-red-500">*</span></Label>
          <Popover open={nationalityPopoverOpen} onOpenChange={setNationalityPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={nationalityPopoverOpen}
                className={`${commonInputClassName} w-full justify-between font-normal`}
              >
                {formData.nationality_value
                  ? countryData.find((country) => country.nationality.toLowerCase() === formData.nationality_value.toLowerCase())?.nationality
                  : "Seleziona nazionalità..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Cerca nazionalità..." />
                <CommandList>
                  <CommandEmpty>Nessuna nazionalità trovata.</CommandEmpty>
                  <CommandGroup>
                    {countryData.map((country) => (
                      <CommandItem
                        key={country.code}
                        value={country.nationality}
                        onSelect={(currentValue: string) => {
                          const selectedNationality = countryData.find(c => c.nationality.toLowerCase() === currentValue.toLowerCase())?.nationality || '';
                          setFormData(prev => ({ 
                            ...prev, 
                            nationality_value: selectedNationality 
                          }));
                          setNationalityPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${formData.nationality_value.toLowerCase() === country.nationality.toLowerCase() ? "opacity-100" : "opacity-0"}`}
                        />
                        {country.nationality}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            step="0.1" // Per consentire decimali
            required
            className={commonInputClassName}
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Salvataggio...
            </span>
          ) : (initialData?.id ? 'Aggiorna Atleta' : 'Aggiungi Atleta')}
        </button>
      </div>
    </form>
  );
}