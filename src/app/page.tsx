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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-sm font-medium text-blue-600 dark:text-blue-400 mb-6">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Nuova versione disponibile
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Analisi</span>
                  <span className="block text-gray-900 dark:text-white">Ciclistica</span>
                  <span className="block bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">Avanzata</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                  Trasforma i tuoi dati in <span className="font-semibold text-blue-600 dark:text-blue-400">performance eccezionali</span>. 
                  La piattaforma più avanzata per coach e atleti professionisti.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {session ? (
                  <Link
                    href="/athletes"
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center">
                      Vai alla Dashboard
                      <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/signup"
                      className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center">
                        Inizia Gratis
                        <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </Link>
                    
                    <Link
                      href="/auth/login"
                      className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
                    >
                      Accedi
                      <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </Link>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">10k+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Attività Analizzate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">500+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Coach Attivi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">99.9%</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Uptime</div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative animate-fade-in">
              <div className="relative">
                {/* Main Dashboard Mockup */}
                <div className="stats-card transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">CycloLab Dashboard</div>
                    </div>
                    
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potenza Media</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">285W</div>
                        <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full mt-2">
                          <div className="w-3/4 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                        </div>
                      </div>
                      
                      <div className="bg-orange-50/50 dark:bg-orange-900/30 rounded-xl p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">FC Media</div>
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">156 bpm</div>
                        <div className="w-full h-2 bg-orange-100 dark:bg-orange-900/50 rounded-full mt-2">
                          <div className="w-4/5 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Chart Area */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 h-32">
                      <div className="flex items-end space-x-1 h-full">
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-sm animate-pulse"
                            style={{
                              height: `${Math.random() * 80 + 20}%`,
                              width: '8%',
                              animationDelay: `${i * 100}ms`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-lg animate-bounce">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 shadow-lg animate-pulse">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Funzionalità</span> Avanzate
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Strumenti professionali per analisi complete, monitoraggio in tempo reale e ottimizzazione delle performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Analisi FIT Avanzata",
                description: "Parser nativo per file FIT con calcolo automatico di metriche avanzate come TSS, IF, NP e zone di potenza personalizzate.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                iconBg: "bg-blue-100 dark:bg-blue-900/30",
                iconColor: "text-blue-600 dark:text-blue-400"
              },
              {
                title: "Mappe Interattive", 
                description: "Visualizzazione GPS ad alta precisione con analisi di segmenti, elevazione e gradienti in tempo reale.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                iconBg: "bg-orange-100 dark:bg-orange-900/30",
                iconColor: "text-orange-600 dark:text-orange-400"
              },
              {
                title: "Personal Bests",
                description: "Tracking automatico dei record personali su tutte le durate di potenza con analisi delle progressioni.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
                iconColor: "text-emerald-600 dark:text-emerald-400"
              },
              {
                title: "Gestione Atleti",
                description: "Sistema completo per coach con gestione profili, monitoraggio progressi e assegnazione allenamenti.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                ),
                iconBg: "bg-purple-100 dark:bg-purple-900/30",
                iconColor: "text-purple-600 dark:text-purple-400"
              },
              {
                title: "Grafici Performance",
                description: "Visualizzazioni interattive di potenza, frequenza cardiaca, velocità e cadenza con zoom e analisi dettagliate.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                ),
                iconBg: "bg-pink-100 dark:bg-pink-900/30",
                iconColor: "text-pink-600 dark:text-pink-400"
              },
              {
                title: "API Integrata",
                description: "API REST completa per integrazioni con dispositivi esterni e sincronizzazione automatica dei dati.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
                iconColor: "text-indigo-600 dark:text-indigo-400"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="stats-card group animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <div className={feature.iconColor}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach Section */}
      <section id="coaches" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0V9a1 1 0 011-1h4a1 1 0 011 1v11" />
                  </svg>
                  Per Coach Professionali
                </div>
                
                <h2 className="text-4xl lg:text-5xl font-bold">
                  Gestisci il tuo <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Team</span> come un Pro
                </h2>
                
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Strumenti avanzati per monitorare, analizzare e ottimizzare le performance di tutti i tuoi atleti da un'unica dashboard intelligente.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    title: "Dashboard Unificata",
                    description: "Visualizza le performance di tutti i tuoi atleti in tempo reale con metriche aggregate e comparazioni automatiche.",
                    icon: "📊"
                  },
                  {
                    title: "Analisi Comparativa",
                    description: "Confronta le progressioni tra atleti e identifica automaticamente aree di miglioramento con AI integrata.",
                    icon: "🔍"
                  },
                  {
                    title: "Pianificazione Avanzata",
                    description: "Crea e assegna allenamenti personalizzati basati sui dati storici e obiettivi specifici di ogni atleta.",
                    icon: "📅"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Diventa Coach
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Coach Dashboard Mockup */}
            <div className="relative animate-fade-in">
              <div className="stats-card">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Team Performance</h3>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">5 atleti online</span>
                    </div>
                  </div>
                  
                  {/* Athlete Cards */}
                  {[
                    { name: "Marco R.", power: 320, trend: "+5%", color: "from-green-400 to-green-600" },
                    { name: "Sofia T.", power: 285, trend: "+8%", color: "from-blue-400 to-blue-600" },
                    { name: "Luca M.", power: 295, trend: "+3%", color: "from-purple-400 to-purple-600" }
                  ].map((athlete, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${athlete.color} rounded-xl flex items-center justify-center text-white font-semibold text-sm`}>
                          {athlete.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{athlete.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">FTP: {athlete.power}W</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-500">{athlete.trend}</div>
                        <div className="text-xs text-gray-400">questa settimana</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10"></div>
        
        <div className="container mx-auto px-6 text-center relative">
          <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <h2 className="text-4xl lg:text-6xl font-bold">
              Pronto a <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Dominare</span> le Tue Performance?
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Unisciti a centinaia di coach e atleti che stanno già utilizzando CycloLab per raggiungere risultati straordinari.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Link
                href="/auth/signup"
                className="group relative inline-flex items-center justify-center px-10 py-5 text-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  Inizia la Prova Gratuita
                  <svg className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-10 py-5 text-xl font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
              >
                Scopri di Più
              </Link>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 pt-4">
              ✓ 14 giorni gratuiti • ✓ Nessuna carta richiesta • ✓ Cancellazione immediata
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}