'use client';

import { useState, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Card as DesignCard } from '@/components/design-system';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Check, Camera } from 'lucide-react';
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
  const [isDragOver, setIsDragOver] = useState(false);
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

  // Funzione per aggiornare la sidebar tramite evento personalizzato
  const updateSidebar = useCallback((avatarUrl: string | null) => {
    // Emette un evento personalizzato che la sidebar può ascoltare
    window.dispatchEvent(new CustomEvent('avatarUpdated', { 
      detail: { avatarUrl } 
    }));
    
    // Callback tradizionale se presente
    if (onAvatarUpdate) {
      onAvatarUpdate(avatarUrl || '');
    }
  }, [onAvatarUpdate]);

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

  const validateAndSetAvatar = (file: File) => {
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
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetAvatar(e.target.files[0]);
    }
  };

  // Gestione drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetAvatar(files[0]);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user.user_metadata?.avatar_url && !avatarPreview) {
      showError('Errore', 'Nessun avatar da rimuovere');
      return;
    }

    setIsRemovingAvatar(true);

    try {
      const currentAvatarUrl = user.user_metadata?.avatar_url;

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
      if (currentAvatarUrl) {
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
      }

      // Aggiorna lo stato locale
      setAvatarPreview(null);
      setAvatarFile(null);
      
      // Aggiorna la sidebar
      updateSidebar(null);

      showSuccess('Avatar rimosso', 'Il tuo avatar è stato rimosso con successo');
      
      // Forza il refresh della pagina per sincronizzare tutti i componenti
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
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
        // Aggiorna la sidebar
        updateSidebar(avatarUrl);
      }
      
      // Reset del file selezionato dopo upload riuscito
      setAvatarFile(null);
      
      // Forza il refresh della pagina per sincronizzare tutti i componenti
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      showError('Errore', error.message || 'Si è verificato un errore durante l\'aggiornamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section - Compatta ed elegante */}
      <DesignCard variant="default">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            Foto Profilo
          </CardTitle>
          <CardDescription className="text-sm">
            Personalizza il tuo profilo con una foto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Avatar Preview - Più compatto */}
            <div className="relative">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-sm">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
                    {user.user_metadata?.full_name 
                      ? user.user_metadata.full_name.charAt(0).toUpperCase()
                      : user.email?.charAt(0).toUpperCase() || 'U'
                    }
                  </div>
                )}
              </div>
              
              {/* Indicatore di stato - Più discreto */}
              {avatarFile && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            
            {/* Upload Controls - Layout compatto */}
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              
              {/* Area upload compatta */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
                  ${isDragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-3">
                  <Upload className={`w-5 h-5 ${
                    isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isDragOver ? 'Rilascia qui' : 'Carica nuova foto'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Trascina o clicca per selezionare
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Controlli e info */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  JPG, PNG, WEBP • Max 10MB • Min 50x50px
                </div>
                
                {/* Pulsante rimuovi discreto */}
                {(avatarPreview || user.user_metadata?.avatar_url) && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={isRemovingAvatar}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRemovingAvatar ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Rimuovendo...</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        <span>Rimuovi</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </DesignCard>

      {/* Informazioni Personali - Più compatta */}
      <DesignCard variant="default">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            Informazioni Personali
          </CardTitle>
          <CardDescription className="text-sm">
            Gestisci i tuoi dati personali e di contatto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-sm font-medium">Nome Completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Il tuo nome completo"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-9 opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  L'email non può essere modificata qui
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Telefono (Opzionale)</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+39 123 456 7890"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm font-medium">Bio (Opzionale)</Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Raccontaci qualcosa di te..."
                className="w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/70 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all resize-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading} size="sm" className="min-w-24">
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salva Modifiche'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </DesignCard>

      {/* Informazioni Account - Compatta */}
      <DesignCard variant="default">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Informazioni Account
          </CardTitle>
          <CardDescription className="text-sm">
            Dettagli del tuo account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">ID Utente</Label>
              <p className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded-md break-all">
                {user.id}
              </p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account creato</Label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'N/D'}
              </p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ultimo accesso</Label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('it-IT', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'N/D'}
              </p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Provider</Label>
              <p className="text-sm text-gray-900 dark:text-white capitalize">
                {user.app_metadata?.provider || 'Email'}
              </p>
            </div>
          </div>
        </CardContent>
      </DesignCard>
    </div>
  );
} 