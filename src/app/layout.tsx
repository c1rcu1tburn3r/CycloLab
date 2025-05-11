// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"; // Helper corretto
import { cookies } from "next/headers"; // Importa cookies direttamente
import LogoutButtonClient from "@/components/LogoutButtonClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cycling Coach App",
  description: "Gestione Atleti e Allenamenti",
};

export default async function RootLayout({ // La funzione deve essere async
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Crea il client Supabase per Server Components, passando la funzione cookies direttamente
  const supabase = createServerComponentClient({ cookies });

  // Usa getUser() per ottenere l'utente. Se l'utente non è loggato, user sarà null.
  // Non c'è bisogno di un reindirizzamento qui perché il layout deve sempre essere renderizzato.
  // Il middleware gestisce i reindirizzamenti per le pagine protette.
  // Qui vogliamo solo sapere se c'è una sessione per mostrare i link corretti.
  const { data: { user } } = await supabase.auth.getUser(); // Usiamo user per controllare se c'è una sessione attiva

  return (
    <html lang="it">
      <body className={`${inter.className} bg-gray-100`}>
        <header className="bg-slate-800 text-white shadow-md">
          <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold hover:text-slate-300">
              CyclingApp
            </Link>
            <div className="space-x-4 flex items-center">
              {user ? ( // Controlla direttamente user invece di session
                <>
                  <Link href="/athletes" className="hover:text-slate-300">
                    Atleti
                  </Link>
                  {user.email && ( // Verifica che user.email esista
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