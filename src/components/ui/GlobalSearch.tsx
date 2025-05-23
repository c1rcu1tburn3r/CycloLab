'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchGlobal, GlobalSearchResult } from '@/app/actions/searchActions';
import { useDebounce } from '@/hooks/useDebounce'; // Creeremo questo hook

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (currentQuery: string) => {
    if (currentQuery.length < 2) {
      setResults([]);
      setIsDropdownVisible(false);
      return;
    }
    setIsLoading(true);
    try {
      const searchResults = await searchGlobal(currentQuery);
      setResults(searchResults);
      setIsDropdownVisible(searchResults.length > 0 || currentQuery.length > 0); // Mostra se ci sono risultati o testo
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
      setResults([]);
      setIsDropdownVisible(true); // Mostra comunque il dropdown per un eventuale messaggio di errore
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Gestione chiusura dropdown cliccando fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleResultClick = (href: string) => {
    router.push(href);
    setQuery('');
    setResults([]);
    setIsDropdownVisible(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery.length === 0) {
        setIsDropdownVisible(false);
        setResults([]);
    } else if (newQuery.length >=2 ){
        setIsDropdownVisible(true);
    }
  }

  return (
    <div className="relative w-64" ref={searchContainerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsDropdownVisible(true)}
          placeholder="Cerca atleti, attività..."
          className="w-full px-4 py-2 pl-10 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
      </div>

      {isDropdownVisible && (
        <div className="absolute mt-2 w-full max-h-96 overflow-y-auto stats-card shadow-2xl z-50">
          {results.length > 0 ? (
            <ul>
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button // Usiamo un button per l'accessibilità e gestione evento onClick
                    onClick={() => handleResultClick(result.href)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors rounded-lg flex items-center space-x-3"
                  >
                    <div className="flex-shrink-0">
                        {result.type === 'athlete' ? (
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.type === 'athlete' ? `${result.name} ${result.surname}` : result.title}
                      </p>
                      {result.type === 'activity' && result.athleteName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Atleta: {result.athleteName}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            debouncedQuery.length >= 2 && !isLoading && (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Nessun risultato per "<strong>{debouncedQuery}</strong>".
              </div>
            )
          )}
          {query.length > 0 && query.length < 2 && !isLoading && (
             <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Continua a digitare per cercare...
              </div>
          )}
        </div>
      )}
    </div>
  );
} 