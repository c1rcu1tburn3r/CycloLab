// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Importa le utility necessarie da @supabase/ssr e next/headers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers'; // L'import rimane lo stesso

import LogoutButtonClient from "@/components/LogoutButtonClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cycling Coach App",
  description: "Gestione Atleti e Allenamenti",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // USA AWAIT QUI, perché TypeScript nel tuo ambiente pensa che cookies() sia async
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Il console.warn è stato rimosso qui
        }
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="it">
      <body className={`${inter.className} bg-gray-100`}>
        <header className="bg-slate-800 text-white shadow-md">
          <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold hover:text-slate-300">
              CyclingApp
            </Link>
            <div className="space-x-4 flex items-center">
              {user ? (
                <>
                  <Link href="/athletes" className="hover:text-slate-300">
                    Atleti
                  </Link>
                  {user.email && (
                    <span className="text-sm text-slate-300 hidden sm:inline">
                      {user.email.split('@')[0]}
                    </span>
                  )}
                  <LogoutButtonClient />
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="hover:text-slate-300">
                    Login
                  </Link>
                  <Link href="/auth/signup" className="hover:text-slate-300">
                    Registrati
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="container mx-auto p-4 sm:p-6 min-h-[calc(100vh-120px)]">
          {children}
        </main>
        <footer className="bg-slate-700 text-white p-4 text-center text-sm">
          © {new Date().getFullYear()} Cycling Coach App
        </footer>
      </body>
    </html>
  );
}