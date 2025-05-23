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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Seleziona un file .fit esportato da Garmin, Wahoo, Strava o altri dispositivi compatibili.
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