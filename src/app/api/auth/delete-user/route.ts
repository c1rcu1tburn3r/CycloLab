import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utente richiesto' },
        { status: 400 }
      )
    }

    // Verifica che l'utente corrente sia quello che sta chiedendo di eliminare il proprio account
    const cookieStore = cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Ignore cookie errors
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    // Client Supabase con service_role key per eliminare utenti e accedere allo storage
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Questa chiave ha permessi admin
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // FASE 1: Pulizia Storage - Raccogli e elimina i file dell'utente
    const storageCleanupResults = {
      avatars: { deleted: 0, errors: [] as string[] },
      fitFiles: { deleted: 0, errors: [] as string[] }
    }

    try {
      // PULIZIA AVATARS - Elimina tutti i file nella cartella userId/
      console.log(`Inizio pulizia avatars per utente: ${userId}`)
      const { data: avatarFiles, error: avatarListError } = await supabaseAdmin.storage
        .from('avatars')
        .list(userId, { limit: 1000 }) // Lista tutti i file nella cartella dell'utente

      if (avatarListError) {
        console.warn('Errore nel listare avatar:', avatarListError.message)
        storageCleanupResults.avatars.errors.push(`Errore lista: ${avatarListError.message}`)
      } else if (avatarFiles && avatarFiles.length > 0) {
        // Prepara i percorsi per l'eliminazione
        const avatarPaths = avatarFiles.map(file => `${userId}/${file.name}`)
        
        console.log(`Eliminando ${avatarPaths.length} avatar:`, avatarPaths)
        const { error: avatarDeleteError } = await supabaseAdmin.storage
          .from('avatars')
          .remove(avatarPaths)

        if (avatarDeleteError) {
          console.warn('Errore eliminazione avatar:', avatarDeleteError.message)
          storageCleanupResults.avatars.errors.push(`Errore eliminazione: ${avatarDeleteError.message}`)
        } else {
          storageCleanupResults.avatars.deleted = avatarPaths.length
          console.log(`✅ Eliminati ${avatarPaths.length} file avatar`)
        }
      } else {
        console.log('Nessun file avatar da eliminare')
      }

      // PULIZIA FIT-FILES - Elimina tutti i file nelle cartelle userId/*/
      console.log(`Inizio pulizia fit-files per utente: ${userId}`)
      const { data: userFolder, error: userFolderError } = await supabaseAdmin.storage
        .from('fit-files')
        .list(userId, { limit: 1000 }) // Lista tutte le cartelle atleta

      if (userFolderError) {
        console.warn('Errore nel listare cartelle fit-files:', userFolderError.message)
        storageCleanupResults.fitFiles.errors.push(`Errore lista cartelle: ${userFolderError.message}`)
      } else if (userFolder && userFolder.length > 0) {
        // Per ogni cartella atleta, elimina tutti i file
        for (const athleteFolder of userFolder) {
          if (athleteFolder.name) {
            try {
              const { data: fitFiles, error: fitListError } = await supabaseAdmin.storage
                .from('fit-files')
                .list(`${userId}/${athleteFolder.name}`, { limit: 1000 })

              if (fitListError) {
                console.warn(`Errore nel listare file in ${userId}/${athleteFolder.name}:`, fitListError.message)
                storageCleanupResults.fitFiles.errors.push(`Errore lista ${athleteFolder.name}: ${fitListError.message}`)
                continue
              }

              if (fitFiles && fitFiles.length > 0) {
                const fitPaths = fitFiles.map(file => `${userId}/${athleteFolder.name}/${file.name}`)
                
                console.log(`Eliminando ${fitPaths.length} file .fit da atleta ${athleteFolder.name}:`, fitPaths)
                const { error: fitDeleteError } = await supabaseAdmin.storage
                  .from('fit-files')
                  .remove(fitPaths)

                if (fitDeleteError) {
                  console.warn(`Errore eliminazione fit-files per ${athleteFolder.name}:`, fitDeleteError.message)
                  storageCleanupResults.fitFiles.errors.push(`Errore eliminazione ${athleteFolder.name}: ${fitDeleteError.message}`)
                } else {
                  storageCleanupResults.fitFiles.deleted += fitPaths.length
                  console.log(`✅ Eliminati ${fitPaths.length} file .fit da atleta ${athleteFolder.name}`)
                }
              }
            } catch (error: any) {
              console.warn(`Errore processing atleta ${athleteFolder.name}:`, error.message)
              storageCleanupResults.fitFiles.errors.push(`Errore processing ${athleteFolder.name}: ${error.message}`)
            }
          }
        }
      } else {
        console.log('Nessuna cartella fit-files da eliminare')
      }

    } catch (storageError: any) {
      console.error('Errore generale pulizia storage:', storageError)
      // Non blocchiamo l'eliminazione dell'utente per errori di storage
    }

    // FASE 2: Elimina l'utente dal database Auth
    console.log(`Eliminando utente dal database Auth: ${userId}`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Errore eliminazione utente:', deleteError)
      return NextResponse.json(
        { error: `Errore eliminazione account: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // RISULTATO FINALE
    const totalFilesDeleted = storageCleanupResults.avatars.deleted + storageCleanupResults.fitFiles.deleted
    const totalErrors = storageCleanupResults.avatars.errors.length + storageCleanupResults.fitFiles.errors.length

    console.log(`✅ Account eliminato con successo. File eliminati: ${totalFilesDeleted}`)
    if (totalErrors > 0) {
      console.warn(`⚠️ Alcuni file potrebbero non essere stati eliminati (${totalErrors} errori)`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account eliminato con successo',
      storageCleanup: {
        filesDeleted: totalFilesDeleted,
        avatarsDeleted: storageCleanupResults.avatars.deleted,
        fitFilesDeleted: storageCleanupResults.fitFiles.deleted,
        errors: totalErrors > 0 ? {
          avatars: storageCleanupResults.avatars.errors,
          fitFiles: storageCleanupResults.fitFiles.errors
        } : null
      }
    })

  } catch (error: any) {
    console.error('Errore API delete-user:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
} 