// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function middleware(req: NextRequest) {
  console.log(`\n--- SUPABASE MIDDLEWARE START FOR: ${req.nextUrl.pathname} ---\n`);

  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          console.log('Middleware Cookie getAll');
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: ResponseCookie[]) {
          console.log('Middleware Cookie setAll:', cookiesToSet.map(c => c.name));
          cookiesToSet.forEach((cookie) => {
            req.cookies.set(cookie);
            res.cookies.set(cookie);
          });
        }
      },
    }
  );

  console.log('Middleware: Before supabase.auth.getSession()');
  await supabase.auth.getSession(); // Cruciale
  const { data: { session } } = await supabase.auth.getSession(); // Prendi la sessione aggiornata
  console.log('Middleware: After supabase.auth.getSession()');
  if (session) {
    console.log('Middleware: Session found, user ID:', session.user.id);
  } else {
    console.log('Middleware: No session found after getSession()');
  }

  const { pathname } = req.nextUrl;

  if (!session && !pathname.startsWith('/auth') && pathname !== '/' && !pathname.startsWith('/_next')) {
    if (pathname.startsWith('/api/auth')) { // Non reindirizzare le rotte API di Supabase
        return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    console.log(`Middleware (no session): Redirecting from ${pathname} to /auth/login`);
    return NextResponse.redirect(url);
  }

  if (session && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/athletes';
    console.log(`Middleware (session): Redirecting from ${pathname} to /athletes`);
    return NextResponse.redirect(url);
  }

  console.log(`\n--- SUPABASE MIDDLEWARE END FOR: ${req.nextUrl.pathname} ---\n`);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/callback|api/.*).*)',
  ],
};