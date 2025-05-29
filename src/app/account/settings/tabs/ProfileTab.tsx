'use client';

import { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";

interface ProfileTabProps {
  user: User;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

export default function ProfileTab({ user, onAvatarUpdate }: ProfileTabProps) {
  const { showSuccess, showError } = useCycloLabToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.user_metadata?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: user.user_metadata?.full_name || '',
    email: user.email || '',
    phone: user.user_metadata?.phone || '',
    bio: user.user_metadata?.bio || '',
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Funzione per comprimere l'immagine
  const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> => {
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        console.log(`Immagine caricata: ${img.width}x${img.height}, ${fileSizeMB}MB. Verrà compressa durante l'upload.`);
      };
      
      img.onerror = () => {
        showError('Errore', 'File immagine non valido o corrotto');
      };
      
      img.src = URL.createObjectURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user.user_metadata?.avatar_url) {
      showError('Errore', 'Nessun avatar da rimuovere');
      return;
    }

    if (!confirm('Sei sicuro di voler rimuovere il tuo avatar?')) {
      return;
    }

    setIsRemovingAvatar(true);

    try {
      const currentAvatarUrl = user.user_metadata.avatar_url;

      // Aggiorna prima i metadati utente per rimuovere l'avatar
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          avatar_url: null,
        }
      });

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
            console.warn('Avatar rimosso dal profilo ma errore eliminazione file:', deleteError.message);
            // Non blocchiamo per questo errore, l'avatar è stato comunque rimosso dal profilo
          }
        }
      } catch (deleteError) {
        console.warn('Avatar rimosso dal profilo ma errore durante eliminazione file:', deleteError);
        // Non blocchiamo per questo errore, l'avatar è stato comunque rimosso dal profilo
      }

      // Aggiorna lo stato locale
      setAvatarPreview(null);
      setAvatarFile(null);
      
      // Aggiorna l'header se c'è la callback
      if (onAvatarUpdate) {
        onAvatarUpdate(''); // Passa stringa vuota per indicare rimozione
      }

      showSuccess('Avatar rimosso', 'Il tuo avatar è stato rimosso con successo');
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante la rimozione');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let avatarUrl = user.user_metadata?.avatar_url;
      let newFilePath: string | null = null;
      let oldAvatarUrl: string | null = null;

      // Upload avatar se presente
      if (avatarFile) {
        const compressedFile = await compressImage(avatarFile);
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `avatar_${Date.now()}.${fileExt}`;
        // Organizziamo i file in cartelle per user ID
        newFilePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(newFilePath, compressedFile, { 
            upsert: true,
            contentType: compressedFile.type
          });

        if (uploadError) {
          throw new Error(`Errore upload avatar: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(newFilePath);
        
        // Salva il vecchio URL prima di sovrascriverlo
        oldAvatarUrl = user.user_metadata?.avatar_url || null;
        avatarUrl = urlData.publicUrl;
      }

      // Aggiorna metadati utente
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: avatarUrl,
        }
      });

      if (updateError) {
        // ROLLBACK: Se l'update fallisce e abbiamo caricato un nuovo file, eliminalo
        if (newFilePath) {
          try {
            await supabase.storage.from('avatars').remove([newFilePath]);
            console.log('Rollback: Nuovo avatar eliminato dopo errore update metadata');
          } catch (rollbackError) {
            console.error('Errore durante rollback:', rollbackError);
          }
        }
        throw new Error(`Errore aggiornamento profilo: ${updateError.message}`);
      }

      // Se tutto è andato a buon fine e c'era un avatar nuovo, elimina quello precedente
      if (avatarFile && oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
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
              console.warn('Avviso: Non è stato possibile eliminare il vecchio avatar:', deleteError.message);
              // Non interrompiamo il flusso per questo errore non critico
            }
          }
        } catch (deleteError) {
          console.warn('Avviso: Errore durante l\'eliminazione del vecchio avatar:', deleteError);
          // Non interrompiamo il flusso per questo errore non critico
        }
      }

      showSuccess('Profilo aggiornato', 'Le tue informazioni sono state salvate con successo');
      
      // Aggiorna lo stato locale dell'avatar per riflettere il cambiamento immediatamente
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
        if (onAvatarUpdate) {
          onAvatarUpdate(avatarUrl);
        }
      }
      
      // Reset del file selezionato dopo upload riuscito
      setAvatarFile(null);
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante l\'aggiornamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card className="stats-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            Foto Profilo
          </CardTitle>
          <CardDescription>
            Carica una foto per personalizzare il tuo profilo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {avatarFile && (
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div className="space-y-2">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Carica Foto
                </Button>
                
                {(avatarPreview || user.user_metadata?.avatar_url) && (
                  <button 
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
                      'Rimuovi'
                    )}
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG o WEBP. Massimo 10MB. L'immagine verrà automaticamente ottimizzata.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="stats-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            Informazioni Personali
          </CardTitle>
          <CardDescription>
            Gestisci i tuoi dati personali e di contatto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Mario Rossi"
                  className="stats-card-bg-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="stats-card-bg-input bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  L'email non può essere modificata qui. Contatta il supporto se necessario.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono (Opzionale)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+39 123 456 7890"
                className="stats-card-bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Opzionale)</Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Raccontaci qualcosa di te..."
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all stats-card-bg-input resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading} className="min-w-32">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salva Modifiche'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="stats-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Informazioni Account
          </CardTitle>
          <CardDescription>
            Dettagli del tuo account e statistiche
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">ID Utente</Label>
              <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded-lg break-all">
                {user.id}
              </p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account creato il</Label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/D'}
              </p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Ultimo accesso</Label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('it-IT', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/D'}
              </p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email verificata</Label>
              <div className="flex items-center gap-2">
                {user.email_confirmed_at ? (
                  <>
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">Verificata</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-sm text-red-600 dark:text-red-400">Non verificata</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 