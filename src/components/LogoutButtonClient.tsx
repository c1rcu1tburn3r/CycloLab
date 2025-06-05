// src/components/LogoutButtonClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/design-system';

interface LogoutButtonClientProps {
  children: React.ReactNode;
}

export default function LogoutButtonClient({ children }: LogoutButtonClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Rimuovi eventuali dati locali
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect alla home
        router.push('/');
        router.refresh();
      } else {
        console.error('Errore durante il logout');
      }
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
      className="text-sm font-medium"
    >
      {isLoading ? 'Disconnessione...' : children}
    </Button>
  );
}