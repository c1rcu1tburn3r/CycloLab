// src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  return (
    <div className="min-h-screen">
      {/* Header con nav */}
      <header className="bg-[#1e2e42] text-white">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-[#b4cad6] rounded-full flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1e2e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-xl">CycloLab</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#features" className="hover:text-[#b4cad6] transition-colors">Funzionalità</a>
            <a href="#coaches" className="hover:text-[#b4cad6] transition-colors">Per Coach</a>
            <a href="#athletes" className="hover:text-[#b4cad6] transition-colors">Per Atleti</a>
          </nav>
          <div>
            {session ? (
              <Link
                href="/athletes"
                className="bg-[#4a6b85] hover:bg-[#5d7f9a] text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="bg-[#4a6b85] hover:bg-[#5d7f9a] text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all"
              >
                Accedi
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-b from-[#1e2e42] to-[#4a6b85] text-white py-20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Potenzia la tua performance ciclistica con dati avanzati
            </h1>
            <p className="text-xl mb-8 text-[#b4cad6]">
              Analisi professionale, monitoraggio preciso e coaching personalizzato per ciclisti di ogni livello
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {session ? (
                <Link
                  href="/athletes"
                  className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-bold py-3 px-8 rounded-lg shadow-lg transition-transform hover:scale-105 text-center"
                >
                  Vai alla Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-bold py-3 px-8 rounded-lg shadow-lg transition-transform hover:scale-105 text-center"
                  >
                    Inizia Ora
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-transparent hover:bg-[#4a6b85] border-2 border-[#b4cad6] text-[#b4cad6] font-bold py-3 px-8 rounded-lg shadow-lg transition-all hover:border-white hover:text-white text-center"
                  >
                    Prova Gratuita
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="md:w-1/2 relative h-64 md:h-96">
            <div className="absolute inset-0 bg-[#4a6b85] rounded-xl overflow-hidden shadow-2xl transform rotate-3">
              <div className="w-full h-full bg-gradient-to-br from-[#4a6b85] to-[#b4cad6] opacity-70"></div>
            </div>
            <div className="absolute inset-0 transform -rotate-2">
              <div className="w-full h-full bg-[#1e2e42] rounded-xl flex items-center justify-center p-6">
                <div className="bg-[#e9f1f5] p-4 rounded-lg w-full h-[90%] shadow-inner overflow-hidden">
                  <div className="h-3 w-24 bg-[#4a6b85] rounded-full mb-4"></div>
                  <div className="flex space-x-2 mb-6">
                    <div className="h-8 w-8 rounded-full bg-[#b4cad6]"></div>
                    <div className="h-8 bg-[#b4cad6] rounded w-32"></div>
                  </div>
                  <div className="h-40 bg-[#b4cad6] rounded-lg"></div>
                  <div className="mt-6 space-y-2">
                    <div className="h-2 bg-[#b4cad6] rounded w-full"></div>
                    <div className="h-2 bg-[#b4cad6] rounded w-5/6"></div>
                    <div className="h-2 bg-[#b4cad6] rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Funzionalità */}
      <section id="features" className="py-20 bg-[#e9f1f5]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[#1e2e42] mb-16">
            Funzionalità Avanzate per il Tuo Allenamento
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Analisi Dettagliata",
                description: "Esamina ogni aspetto della tua performance con grafici interattivi e dati precisi.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )
              },
              {
                title: "Tracciamento GPS",
                description: "Visualizza percorsi, altitudine e altri dati geografici con mappe interattive ad alta precisione.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )
              },
              {
                title: "Pianificazione Intelligente",
                description: "Crea e segui piani di allenamento personalizzati basati sui tuoi obiettivi e progressi.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8 transform transition-transform hover:-translate-y-2">
                <div className="text-[#4a6b85] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[#1e2e42] mb-3">{feature.title}</h3>
                <p className="text-[#4a6b85]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per Coach */}
      <section id="coaches" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0 md:pr-12">
              <h2 className="text-3xl font-bold text-[#1e2e42] mb-6">Per Allenatori e Coach</h2>
              <p className="text-lg text-[#4a6b85] mb-6">
                Gestisci facilmente il tuo team di atleti con strumenti professionali che ti permettono di:
              </p>
              <ul className="space-y-4">
                {[
                  "Monitorare le performance di tutti i tuoi atleti in tempo reale",
                  "Assegnare allenamenti personalizzati basati su obiettivi specifici",
                  "Analizzare dati storici e progressi con grafici avanzati",
                  "Comunicare direttamente con gli atleti attraverso la piattaforma"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mr-3 mt-1 text-[#b4cad6]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#4a6b85]">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/auth/signup?role=coach"
                  className="inline-block bg-[#4a6b85] hover:bg-[#1e2e42] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
                >
                  Inizia come Coach
                </Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-[#e9f1f5] p-4 rounded-xl shadow-lg">
                <div className="bg-white rounded-lg p-6">
                  <div className="h-8 bg-[#b4cad6] w-32 rounded mb-6"></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-[#e9f1f5] rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#4a6b85]"></div>
                        <div className="ml-3">
                          <div className="h-4 w-24 bg-[#b4cad6] rounded"></div>
                          <div className="h-3 w-16 bg-[#b4cad6] rounded mt-1 opacity-70"></div>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-[#b4cad6] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4a6b85]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#e9f1f5] rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#4a6b85]"></div>
                        <div className="ml-3">
                          <div className="h-4 w-32 bg-[#b4cad6] rounded"></div>
                          <div className="h-3 w-20 bg-[#b4cad6] rounded mt-1 opacity-70"></div>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-[#b4cad6] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4a6b85]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#e9f1f5] rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#4a6b85]"></div>
                        <div className="ml-3">
                          <div className="h-4 w-28 bg-[#b4cad6] rounded"></div>
                          <div className="h-3 w-14 bg-[#b4cad6] rounded mt-1 opacity-70"></div>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-[#b4cad6] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4a6b85]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Per Atleti */}
      <section id="athletes" className="py-20 bg-[#1e2e42] text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center">
            <div className="md:w-1/2 mb-10 md:mb-0 md:pl-12">
              <h2 className="text-3xl font-bold mb-6">Per Ciclisti e Atleti</h2>
              <p className="text-lg text-[#b4cad6] mb-6">
                Porta il tuo allenamento al livello successivo con strumenti professionali di monitoraggio e analisi:
              </p>
              <ul className="space-y-4">
                {[
                  "Traccia ogni aspetto delle tue sessioni di allenamento",
                  "Analizza i tuoi dati con grafici dettagliati e metriche avanzate",
                  "Segui piani personalizzati creati dal tuo coach",
                  "Visualizza i tuoi progressi nel tempo e identificare aree di miglioramento"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mr-3 mt-1 text-[#b4cad6]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#e9f1f5]">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/auth/signup?role=athlete"
                  className="inline-block bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
                >
                  Inizia come Atleta
                </Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-[#4a6b85] p-6 rounded-xl shadow-lg">
                <div className="bg-[#e9f1f5] rounded-lg overflow-hidden">
                  <div className="h-40 bg-[#b4cad6]"></div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="space-y-1">
                        <div className="h-5 w-32 bg-[#4a6b85] rounded"></div>
                        <div className="h-3 w-24 bg-[#4a6b85] rounded opacity-70"></div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 rounded-full bg-[#4a6b85]"></div>
                        <div className="h-8 w-8 rounded-full bg-[#4a6b85]"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3 w-full bg-[#4a6b85] rounded"></div>
                      <div className="h-3 w-full bg-[#4a6b85] rounded"></div>
                      <div className="h-3 w-3/4 bg-[#4a6b85] rounded"></div>
                    </div>
                    <div className="flex justify-between mt-6">
                      <div className="text-center">
                        <div className="h-8 w-8 mx-auto rounded-full bg-[#4a6b85]"></div>
                        <div className="h-3 w-12 mx-auto mt-2 bg-[#4a6b85] rounded"></div>
                      </div>
                      <div className="text-center">
                        <div className="h-8 w-8 mx-auto rounded-full bg-[#4a6b85]"></div>
                        <div className="h-3 w-12 mx-auto mt-2 bg-[#4a6b85] rounded"></div>
                      </div>
                      <div className="text-center">
                        <div className="h-8 w-8 mx-auto rounded-full bg-[#4a6b85]"></div>
                        <div className="h-3 w-12 mx-auto mt-2 bg-[#4a6b85] rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonianze */}
      <section className="py-20 bg-[#e9f1f5]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[#1e2e42] mb-16">
            Cosa Dicono i Nostri Utenti
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Da quando uso CycloLab ho migliorato le mie performance del 20%. L'analisi dettagliata mi ha aiutato a identificare le mie debolezze.",
                name: "Marco R.",
                role: "Ciclista Amatoriale"
              },
              {
                quote: "Come coach, posso finalmente gestire tutti i miei atleti in modo efficiente. La piattaforma è intuitiva e ricca di funzionalità.",
                name: "Laura B.",
                role: "Coach Professionista"
              },
              {
                quote: "La visualizzazione dei dati è incredibile. Posso vedere ogni dettaglio del mio allenamento con grafici interattivi molto chiari.",
                name: "Antonio M.",
                role: "Ciclista Agonista"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-[#4a6b85] mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="text-[#4a6b85] mb-6">{testimonial.quote}</p>
                <div>
                  <p className="font-bold text-[#1e2e42]">{testimonial.name}</p>
                  <p className="text-sm text-[#4a6b85]">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-20 bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto a Migliorare le Tue Performance?</h2>
          <p className="text-xl text-[#b4cad6] mb-10 max-w-2xl mx-auto">
            Unisciti a migliaia di atleti e coach che utilizzano CycloLab per raggiungere il massimo potenziale
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {session ? (
              <Link
                href="/athletes"
                className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-bold py-4 px-10 rounded-lg shadow-lg transition-transform hover:scale-105 text-lg"
              >
                Vai alla Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-bold py-4 px-10 rounded-lg shadow-lg transition-transform hover:scale-105 text-lg"
                >
                  Registrati Ora
                </Link>
                <Link
                  href="/auth/login"
                  className="bg-transparent hover:bg-[#4a6b85] border-2 border-[#b4cad6] text-[#b4cad6] font-bold py-4 px-10 rounded-lg shadow-lg transition-all hover:border-white hover:text-white text-lg"
                >
                  Accedi
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e2e42] text-[#b4cad6] py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-[#b4cad6] rounded-full flex items-center justify-center mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1e2e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-bold text-lg text-white">CycloLab</span>
              </div>
              <p className="text-sm">
                La piattaforma professionale per l'analisi e il miglioramento delle performance ciclistiche.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Piattaforma</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Funzionalità</a></li>
                <li><a href="#coaches" className="hover:text-white transition-colors">Per Coach</a></li>
                <li><a href="#athletes" className="hover:text-white transition-colors">Per Atleti</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Piani e Prezzi</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Risorse</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Supporto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentazione API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Legale</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termini di Servizio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contattaci</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#4a6b85] mt-12 pt-6 text-sm text-center">
            &copy; {new Date().getFullYear()} CycloLab. Tutti i diritti riservati.
          </div>
        </div>
      </footer>
    </div>
  );
}