// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Se NextRequest è stato mutato, clona prima di impostare il cookie
          const newReqHeaders = new Headers(req.headers);
          const newRes = NextResponse.next({
            request: {
              headers: newReqHeaders,
            },
          });
          newRes.cookies.set({ name, value, ...options });
          // Qui è importante gestire la response.
          // Dato che questo middleware potrebbe essere chiamato più volte o in contesti
          // dove la response originale `res` è già stata utilizzata o non è quella
          // che vogliamo modificare, dobbiamo essere cauti.
          // Per `@supabase/ssr` l'importante è che i cookie siano scritti nella response
          // che alla fine verrà inviata al browser.
          // Il modo più semplice è modificare direttamente `res` se possibile.
          res.cookies.set({name, value, ...options});
        },
        remove(name: string, options: CookieOptions) {
          const newReqHeaders = new Headers(req.headers);
          const newRes = NextResponse.next({
            request: {
              headers: newReqHeaders,
            },
          });
          newRes.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Se l'utente non è loggato e cerca di accedere a una pagina protetta
  if (!session && !pathname.startsWith('/auth') && pathname !== '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Se l'utente è loggato e cerca di accedere a /auth/login o /auth/signup
  if (session && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/athletes'; // O la tua dashboard principale
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};