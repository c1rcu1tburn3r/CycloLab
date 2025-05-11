// src/components/LogoutButtonClient.tsx
'use client';

import { useRouter } from 'next/navigation';
// Importa createBrowserClient da @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';

export default function LogoutButtonClient() {
  const router = useRouter();

  // Inizializza il client Supabase per il browser usando createBrowserClient
  // Assicurati che le tue variabili d'ambiente siano accessibili qui
  // (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      // Potresti voler gestire l'errore in modo più visibile per l'utente
    } else {
      router.push('/auth/login'); // Reindirizza alla pagina di login
      router.refresh(); // Assicura che lo stato del server sia aggiornato e il layout ricarichi lo stato utente
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
    >
      Logout
    </button>
  );
}