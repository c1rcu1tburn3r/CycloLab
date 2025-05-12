// src/app/auth/callback/route.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/athletes'; // Default redirect

  if (code) {
    // USA AWAIT QUI, come negli altri file
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Ora che cookieStore è 'awaitato', possiamo usare i suoi metodi
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try { // Aggiungiamo try/catch per sicurezza anche qui
              cookieStore.set({ name, value, ...options });
            } catch (error) {
               console.error(`Auth Callback Route Handler Error setting cookie ${name}:`, error);
            }
          },
          remove(name: string, options: CookieOptions) {
             try {
               cookieStore.set({ name, value: '', ...options }); // Usa set con valore vuoto per rimuovere
             } catch (error) {
                console.error(`Auth Callback Route Handler Error removing cookie ${name}:`, error);
             }
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Se lo scambio va a buon fine, i metodi set/remove sopra
      // dovrebbero essere stati chiamati da exchangeCodeForSession per impostare il cookie.
      return NextResponse.redirect(`${origin}${next}`);
    }
     console.error('Auth Callback Error exchanging code:', error.message);
     return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  console.error('Auth Callback: No code found in request URL');
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}