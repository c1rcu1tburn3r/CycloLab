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

    // Client Supabase con service_role key per eliminare utenti
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

    // Elimina l'utente dal database Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Errore eliminazione utente:', deleteError)
      return NextResponse.json(
        { error: `Errore eliminazione account: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account eliminato con successo' 
    })

  } catch (error: any) {
    console.error('Errore API delete-user:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
} 