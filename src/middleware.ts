// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
        get(name: string) {
          console.log(`Middleware Cookie GET: ${name}`);
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`Middleware Cookie SET: ${name}, Value: ${value.substring(0,15)}...`);
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          console.log(`Middleware Cookie REMOVE: ${name}`);
          req.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
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