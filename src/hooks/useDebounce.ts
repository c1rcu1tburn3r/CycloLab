'use client'; // Anche se è un hook, se usato in componenti client, può essere utile marcarlo

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Imposta un timeout per aggiornare il valore debounced dopo il delay specificato
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Pulisci il timeout se il valore cambia (o il componente si smonta)
    // Questo è importante per evitare aggiornamenti dopo che il componente è stato smontato
    // o se il valore cambia rapidamente prima che il delay sia trascorso
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Riesegui l'effetto solo se value o delay cambiano

  return debouncedValue;
} 