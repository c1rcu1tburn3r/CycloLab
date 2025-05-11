// src/components/AthleteForm.tsx
'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js'; // User da supabase-js è ok
import type { Athlete } from '@/app/athletes/page'; // Importa l'interfaccia Athlete

type AthleteFormData = Omit<Athlete, 'id' | 'created_at' | 'user_id' | 'avatar_url'>;

interface AthleteFormProps {
  initialData?: Athlete;
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

  const [formData, setFormData] = useState<AthleteFormData>({
    name: initialData?.name || '',
    surname: initialData?.surname || '',
    birth_date: initialData?.birth_date || '',
    height_cm: initialData?.height_cm || null,
    weight_kg: initialData?.weight_kg || null,
    nationality: initialData?.nationality || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null);

  useEffect(() => {
    const getUserAndSetData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (!user && !initialData) { // Se non c'è utente e non siamo in modalità modifica con dati iniziali
        // router.push('/auth/login'); // Potrebbe essere troppo aggressivo, dipende dalla UX desiderata
        console.warn("Utente non autenticato nel form atleti.");
      }
      // Se initialData è presente, i campi sono già stati pre-popolati
    };
    getUserAndSetData();
  }, [supabase, router, initialData]); // Aggiunto initialData alle dipendenze se influenza il setup

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | null = value;

    if (type === 'number') {
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
      // Crea un URL oggetto per l'anteprima locale
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      // Ricorda di revocare l'URL oggetto quando il componente viene smontato o l'anteprima cambia
      // per evitare memory leak, se necessario (non implementato qui per brevità).
    } else {
      setAvatarFile(null);
      setAvatarPreview(initialData?.avatar_url || null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // È buona pratica ri-verificare l'utente al momento del submit
    const { data: { user: submitUser } } = await supabase.auth.getUser();
    if (!submitUser) {
      setError("Sessione utente scaduta o non valida. Per favore, effettua nuovamente il login.");
      setIsLoading(false);
      return;
    }
    setCurrentUser(submitUser); // Aggiorna lo stato dell'utente corrente

    let uploadedAvatarUrl: string | null = initialData?.avatar_url || null;

    if (avatarFile) { // Solo se un nuovo file avatar è stato selezionato
      const fileExt = avatarFile.name.split('.').pop();
      const uniqueFileName = `${submitUser.id}_${Date.now()}.${fileExt}`; // Usa submitUser.id
      const filePath = `${submitUser.id}/${uniqueFileName}`; // Usa submitUser.id

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true, // Se `initialData` aveva un avatar, questo lo sovrascriverà se il path è lo stesso.
                       // Usare `uniqueFileName` con `Date.now()` aiuta a evitare collisioni.
        });

      if (uploadError) {
        console.error('Errore Supabase Storage Upload:', uploadError);
        setError(`Errore nel caricamento dell'avatar: ${uploadError.message}`);
        setIsLoading(false);
        return;
      }

      // Ottieni l'URL pubblico del file appena caricato
      // `uploadData.path` contiene il path usato per l'upload
      if (uploadData?.path) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        uploadedAvatarUrl = urlData?.publicUrl || null;
      } else {
        // Fallback se uploadData.path non è disponibile per qualche motivo
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        uploadedAvatarUrl = urlData?.publicUrl || null;
      }
      console.log('Avatar caricato, URL pubblico:', uploadedAvatarUrl);
    }

    const athleteDataToSave = {
      ...formData,
      user_id: initialData?.user_id || submitUser.id, // Usa submitUser.id
      avatar_url: uploadedAvatarUrl, // Usa l'URL aggiornato (o quello iniziale se non caricato nuovo avatar)
      height_cm: formData.height_cm ? Number(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
    };

    let operationError = null;

    if (initialData?.id) {
      // Modalità Modifica
      const { error: updateError } = await supabase
        .from('athletes')
        .update(athleteDataToSave)
        .eq('id', initialData.id)
        .eq('user_id', submitUser.id); // Verifica che l'utente che modifica sia il proprietario
      operationError = updateError;
    } else {
      // Modalità Aggiunta
      const { error: insertError } = await supabase
        .from('athletes')
        .insert([{ ...athleteDataToSave, user_id: submitUser.id }]); // Assicura che user_id sia quello dell'utente corrente
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
        // Ricarica i dati e reindirizza (o semplicemente ricarica)
        router.refresh(); // Invalida la cache dei Server Component
        if (!initialData?.id) { // Se è un nuovo atleta, reindirizza alla lista
            setTimeout(() => router.push('/athletes'), 1500);
        }
        // Se è una modifica, potresti voler rimanere sulla pagina o reindirizzare al dettaglio.
        // router.refresh() è spesso sufficiente per aggiornare la vista.
      }
    }
  };

  // Il resto del tuo JSX del form rimane invariato
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-xl border border-slate-200 space-y-6 max-w-2xl mx-auto">
      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
      {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-md text-sm mb-4">{successMessage}</p>}

      <div className="flex flex-col items-center space-y-3 border-b border-slate-200 pb-6">
        <label htmlFor="avatar" className="block text-sm font-medium text-slate-700 self-start">Avatar (Opzionale)</label>
        <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-300 shadow-sm">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Anteprima avatar" className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A1.5 1.5 0 0 1 18 21.75H6a1.5 1.5 0 0 1-1.499-1.632Z" />
            </svg>
          )}
        </div>
        <input
          type="file"
          id="avatar"
          name="avatar"
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleAvatarChange}
          className="block w-full max-w-xs text-sm text-slate-500 file:cursor-pointer
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-600
                     hover:file:bg-blue-100 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nome*</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required
                 className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500" placeholder="Mario" />
        </div>
        <div>
          <label htmlFor="surname" className="block text-sm font-medium text-slate-700 mb-1">Cognome*</label>
          <input type="text" name="surname" id="surname" value={formData.surname} onChange={handleInputChange} required
                 className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500" placeholder="Rossi" />
        </div>
        <div>
          <label htmlFor="birth_date" className="block text-sm font-medium text-slate-700 mb-1">Data di Nascita*</label>
          <input type="date" name="birth_date" id="birth_date" value={formData.birth_date} onChange={handleInputChange} required
                 className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1">Nazionalità</label>
          <input type="text" name="nationality" id="nationality" value={formData.nationality || ''} onChange={handleInputChange}
                 className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500" placeholder="Italiana" />
        </div>
        <div>
          <label htmlFor="height_cm" className="block text-sm font-medium text-slate-700 mb-1">Altezza (cm)</label>
          <input type="number" name="height_cm" id="height_cm" value={formData.height_cm ?? ''} onChange={handleInputChange} min="0"
                 className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500" placeholder="Es. 180" />
        </div>
        <div>
          <label htmlFor="weight_kg" className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
          <input type="number" step="0.1" name="weight_kg" id="weight_kg" value={formData.weight_kg ?? ''} onChange={handleInputChange} min="0"
                 className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-slate-500" placeholder="Es. 70.5"/>
        </div>
      </div>

      <div className="pt-3">
        <button type="submit" disabled={isLoading || (!currentUser && !initialData)} // Modificato per usare currentUser
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
          {isLoading ? 'Salvataggio in corso...' : (initialData?.id ? 'Aggiorna Atleta' : 'Aggiungi Atleta')}
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center">* Campi obbligatori</p>
    </form>
  );
}