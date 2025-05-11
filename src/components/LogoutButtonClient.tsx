// src/components/LogoutButtonClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutButtonClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login'); // Reindirizza alla pagina di login
    router.refresh(); // Assicura che lo stato del server sia aggiornato
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