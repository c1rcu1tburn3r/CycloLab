'use client';

import { useState, FormEvent, ChangeEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Athlete } from '@/lib/types';
import { processAndCreateActivity } from '@/app/activities/actions';

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      if (file.name.toLowerCase().endsWith('.fit')) {
        setSelectedFile(file);
        setError(null);
        if (!formData.title) {
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          setFormData(prev => ({ ...prev, title: fileName }));
        }
      } else {
        setError('Per favore seleziona un file .fit valido');
        setSelectedFile(null);
      }
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

    try {
      const fileExtension = selectedFile.name.split('.').pop();
      const baseFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
      const cleanBaseFileName = baseFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileNameInStorage = `${Date.now()}_${cleanBaseFileName}.${fileExtension}`;
      const filePath = `${userId}/${formData.athlete_id}/${fileNameInStorage}`;
      
      const { error: fileError } = await supabase.storage
        .from('fit-files')
        .upload(filePath, selectedFile);

      setIsUploading(false);

      if (fileError) {
        console.error('Dettagli errore Supabase Storage Upload:', fileError);
        throw new Error(`Errore durante il caricamento del file: ${fileError.message}`);
      }

      const activityDataForAction = {
        athlete_id: formData.athlete_id,
        title: formData.title || cleanBaseFileName,
        description: formData.description || undefined,
        activity_date: formData.activity_date,
        activity_type: formData.activity_type,
        is_indoor: formData.is_indoor,
        is_public: formData.is_public,
      };

      startTransition(async () => {
        const result = await processAndCreateActivity(activityDataForAction, filePath);

        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          setSuccessMessage(result.message || 'Attività caricata con successo!');
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

  const isSubmitDisabled = isUploading || isPending;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md">
          {successMessage}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-slate-700 font-medium mb-2">
          File FIT <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept=".fit"
          onChange={handleFileChange}
          className="w-full p-2 border border-slate-300 rounded-md"
          required
          disabled={isSubmitDisabled}
        />
        <p className="text-xs text-slate-500 mt-1">
          Seleziona un file .fit esportato da Garmin, Wahoo, Strava o altri dispositivi compatibili.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="athlete_id" className="block text-slate-700 font-medium mb-2">
            Atleta <span className="text-red-500">*</span>
          </label>
          <select
            id="athlete_id"
            name="athlete_id"
            value={formData.athlete_id}
            onChange={handleInputChange}
            className="w-full p-2 border border-slate-300 rounded-md"
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
          <label htmlFor="activity_date" className="block text-slate-700 font-medium mb-2">
            Data <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="activity_date"
            name="activity_date"
            value={formData.activity_date}
            onChange={handleInputChange}
            className="w-full p-2 border border-slate-300 rounded-md"
            required
            disabled={isSubmitDisabled}
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label htmlFor="title" className="block text-slate-700 font-medium mb-2">
          Titolo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="w-full p-2 border border-slate-300 rounded-md"
          required
          disabled={isSubmitDisabled}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="description" className="block text-slate-700 font-medium mb-2">
          Descrizione
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="w-full p-2 border border-slate-300 rounded-md"
          rows={3}
          disabled={isSubmitDisabled}
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="activity_type" className="block text-slate-700 font-medium mb-2">
            Tipo di attività <span className="text-red-500">*</span>
          </label>
          <select
            id="activity_type"
            name="activity_type"
            value={formData.activity_type}
            onChange={handleInputChange}
            className="w-full p-2 border border-slate-300 rounded-md"
            required
            disabled={isSubmitDisabled}
          >
            <option value="cycling">Ciclismo</option>
            <option value="running">Corsa</option>
            <option value="other">Altro</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_indoor"
            name="is_indoor"
            checked={formData.is_indoor}
            onChange={handleInputChange}
            className="mr-2"
            disabled={isSubmitDisabled}
          />
          <label htmlFor="is_indoor" className="text-slate-700">
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
            className="mr-2"
            disabled={isSubmitDisabled}
          />
          <label htmlFor="is_public" className="text-slate-700">
            Attività pubblica
          </label>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md disabled:opacity-75 disabled:cursor-not-allowed"
          disabled={isSubmitDisabled}
        >
          {isUploading ? 'Caricamento file...' : (isPending ? 'Salvataggio attività...' : 'Carica Attività')}
        </button>
      </div>
    </form>
  );
} 