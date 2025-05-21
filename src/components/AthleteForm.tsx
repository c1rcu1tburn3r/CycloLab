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
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react'; // Per l'icona di caricamento nel bottone

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
      if (!user && !initialData) {
        console.warn("Utente non autenticato nel form atleti.");
      }
    };
    getUserAndSetData();
  }, [supabase, initialData]); // Tolto router dalle dipendenze se non usato direttamente qui

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
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      // Considera di revocare l'URL con URL.revokeObjectURL(previewUrl) in un useEffect cleanup
      // se l'immagine viene cambiata spesso o il componente smontato per evitare memory leaks.
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

    const athleteDataToSave = {
      ...formData,
      user_id: initialData?.user_id || submitUser.id,
      avatar_url: uploadedAvatarUrl,
      height_cm: formData.height_cm ? Number(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
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

  // Aggiornamento JSX per usare i componenti Shadcn/ui
  return (
    // Rimuovo la classe bg-white, p-*, rounded-lg, shadow-xl, border, max-w-2xl, mx-auto perché le Card ora gestiscono l'aspetto.
    // Eventuali stili specifici di layout o spaziatura possono essere mantenuti o aggiunti alle CardContent.
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
      {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-md text-sm mb-4">{successMessage}</p>}

      <div className="flex flex-col items-center space-y-4 border-b border-slate-200 pb-6 mb-6">
        <Label htmlFor="avatar" className="self-start text-sm font-medium text-slate-700">Avatar (Opzionale)</Label>
        <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-300 shadow-sm">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Anteprima avatar" className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A1.5 1.5 0 0 1 18 21.75H6a1.5 1.5 0 0 1-1.499-1.632Z" />
            </svg>
          )}
        </div>
        <Input
          id="avatar"
          name="avatar"
          type="file"
          onChange={handleAvatarChange}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Mario"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">Cognome</Label>
          <Input
            id="surname"
            name="surname"
            type="text"
            value={formData.surname}
            onChange={handleInputChange}
            placeholder="Rossi"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="birth_date">Data di Nascita</Label>
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            value={formData.birth_date || ''}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nazionalità</Label>
          <Input
            id="nationality"
            name="nationality"
            type="text"
            value={formData.nationality || ''}
            onChange={handleInputChange}
            placeholder="Italiana"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="height_cm">Altezza (cm)</Label>
          <Input
            id="height_cm"
            name="height_cm"
            type="number"
            value={formData.height_cm ?? ''} // Usa stringa vuota se null per l'input
            onChange={handleInputChange}
            placeholder="180"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight_kg">Peso (kg)</Label>
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            value={formData.weight_kg ?? ''} // Usa stringa vuota se null per l'input
            onChange={handleInputChange}
            placeholder="75"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            initialData?.id ? 'Salva Modifiche' : 'Aggiungi Atleta'
          )}
        </Button>
      </div>
    </form>
  );
}