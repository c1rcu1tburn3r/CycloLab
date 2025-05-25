# CycloLab - Documentazione Completa del Progetto

## 🏗️ Architettura Tecnica

### Stack Tecnologico
- **Framework**: Next.js 14.2.29 con App Router
- **Linguaggio**: TypeScript 5.x
- **Database**: Supabase (PostgreSQL) con Row Level Security
- **Autenticazione**: Supabase Auth con middleware personalizzato
- **UI Framework**: Tailwind CSS 4.x + shadcn/ui (Radix UI)
- **Mappe**: Leaflet 1.9.4 + react-leaflet 4.2.1
- **Charts**: ECharts 5.6.0 + Recharts 2.15.3
- **File Parsing**: fit-file-parser 1.21.0
- **Date Handling**: date-fns 4.1.0
- **Storage**: Supabase Storage per file .fit

### Configurazione Ambiente
```bash
# Variabili ambiente richieste (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📁 Struttura Dettagliata del Progetto

```
cyclolab/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Layout principale con sidebar
│   │   ├── page.tsx                 # Dashboard homepage (451 righe)
│   │   ├── globals.css              # Stili globali Tailwind (487 righe)
│   │   ├── middleware.ts            # Auth middleware (55 righe)
│   │   │
│   │   ├── activities/              # Modulo Gestione Attività
│   │   │   ├── page.tsx            # Lista attività con filtri
│   │   │   ├── ActivitiesClientManager.tsx  # Manager client-side (492 righe)
│   │   │   ├── actions.ts          # Server actions (919 righe)
│   │   │   ├── segmentAnalysisActions.ts    # Analisi segmenti (296 righe)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx        # Dettaglio singola attività
│   │   │   ├── compare/
│   │   │   │   └── page.tsx        # Sistema comparazione attività
│   │   │   └── upload/
│   │   │       └── page.tsx        # Upload file .fit
│   │   │
│   │   ├── athletes/                # Modulo Gestione Atleti
│   │   │   ├── page.tsx            # Lista atleti con overview
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Profilo dettagliato atleta
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx    # Modifica dati atleta
│   │   │   └── new/
│   │   │       └── page.tsx        # Creazione nuovo atleta
│   │   │
│   │   ├── auth/                    # Sistema Autenticazione
│   │   │   ├── login/page.tsx      # Pagina login
│   │   │   ├── signup/page.tsx     # Pagina registrazione
│   │   │   └── callback/route.ts   # OAuth callback handler
│   │   │
│   │   ├── api/                     # API Routes
│   │   │   └── activities/
│   │   │       └── [id]/
│   │   │           └── route-points/
│   │   │               └── route.ts # Endpoint GPS data
│   │   │
│   │   └── actions/                 # Server Actions globali
│   │       └── searchActions.ts    # Ricerca attività
│   │
│   ├── components/                  # Componenti Riutilizzabili
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   │
│   │   ├── charts/                 # Componenti grafici
│   │   │   └── ...
│   │   │
│   │   ├── ActivityMap.tsx         # Mappa interattiva (603 righe)
│   │   ├── ActivityElevationChart.tsx  # Grafico altimetria (574 righe)
│   │   ├── VisualSegmentSelector.tsx   # Selezione segmenti (775 righe)
│   │   ├── ActivityPreviewCard.tsx     # Card anteprima attività (342 righe)
│   │   ├── AthleteForm.tsx            # Form gestione atleti (564 righe)
│   │   ├── ActivityUploadForm.tsx     # Form upload .fit (328 righe)
│   │   └── ...
│   │
│   ├── lib/                        # Utilities e Configurazioni
│   │   ├── types.ts               # Definizioni TypeScript (237 righe)
│   │   ├── database.types.ts      # Tipi generati Supabase (427 righe)
│   │   ├── segmentUtils.ts        # Algoritmi analisi segmenti (631 righe)
│   │   ├── fitnessCalculations.ts # Calcoli metriche fitness (202 righe)
│   │   ├── utils.ts               # Utility generiche
│   │   └── countries.json         # Dati paesi per form
│   │
│   ├── utils/                     # Helper functions
│   │   └── supabase/
│   │       ├── server.ts         # Client Supabase server-side
│   │       └── client.ts         # Client Supabase client-side
│   │
│   └── hooks/                     # Custom React Hooks
│
├── public/                        # Asset statici
├── package.json                   # Dipendenze e scripts
├── tsconfig.json                  # Configurazione TypeScript
├── tailwind.config.js            # Configurazione Tailwind
├── next.config.js                # Configurazione Next.js
└── components.json               # Configurazione shadcn/ui
```

## 🗄️ Schema Database Completo

### Tabelle Principali

#### `athletes`
```sql
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  birth_date DATE,
  nationality TEXT,
  height_cm INTEGER,
  weight_kg DECIMAL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `activities`
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  athlete_id UUID REFERENCES athletes(id),
  activity_type TEXT NOT NULL, -- 'cycling', 'running', 'swimming', 'strength'
  title TEXT,
  description TEXT,
  activity_date DATE NOT NULL,
  
  -- File .fit
  fit_file_name TEXT,
  fit_file_path TEXT,
  fit_file_url TEXT,
  
  -- Metriche base
  distance_meters DECIMAL,
  duration_seconds INTEGER,
  elevation_gain_meters DECIMAL,
  calories INTEGER,
  
  -- GPS coordinates
  start_lat DECIMAL,
  start_lon DECIMAL,
  end_lat DECIMAL,
  end_lon DECIMAL,
  route_points JSONB, -- Array di RoutePoint
  
  -- Metriche velocità
  avg_speed_kph DECIMAL,
  max_speed_kph DECIMAL,
  
  -- Metriche potenza
  avg_power_watts DECIMAL,
  max_power_watts DECIMAL,
  normalized_power_watts DECIMAL,
  intensity_factor DECIMAL,
  tss DECIMAL,
  
  -- Personal Bests potenza attività
  pb_power_5s_watts DECIMAL,
  pb_power_15s_watts DECIMAL,
  pb_power_30s_watts DECIMAL,
  pb_power_60s_watts DECIMAL,
  pb_power_300s_watts DECIMAL,
  pb_power_600s_watts DECIMAL,
  pb_power_1200s_watts DECIMAL,
  pb_power_1800s_watts DECIMAL,
  pb_power_3600s_watts DECIMAL,
  pb_power_5400s_watts DECIMAL,
  
  -- Metriche frequenza cardiaca
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  
  -- Metriche cadenza
  avg_cadence DECIMAL,
  max_cadence DECIMAL,
  
  -- Flags
  is_indoor BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `athlete_profile_entries`
```sql
CREATE TABLE athlete_profile_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id),
  effective_date DATE NOT NULL,
  ftp_watts INTEGER,
  weight_kg DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `athlete_personal_bests`
```sql
CREATE TABLE athlete_personal_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id),
  activity_id UUID REFERENCES activities(id),
  metric_type TEXT NOT NULL, -- 'power_5s', 'power_60s', etc.
  duration_seconds INTEGER NOT NULL,
  value DECIMAL NOT NULL,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Relazioni e Indici
- **RLS (Row Level Security)** attivo su tutte le tabelle
- **Foreign Keys** con CASCADE DELETE appropriati
- **Indici** su campi frequentemente interrogati (user_id, athlete_id, activity_date)

## 🔧 Funzionalità Implementate

### ✅ Sistema Autenticazione
- **Login/Signup** con email/password
- **Middleware** per protezione route automatica
- **Session management** con Supabase Auth
- **Redirect** automatici post-login
- **OAuth callback** handling

### ✅ Gestione Atleti
- **CRUD completo** atleti con validazione
- **Profili dettagliati** con statistiche aggregate
- **Storico profilo prestativo** (FTP, peso nel tempo)
- **Personal Bests** tracking automatico
- **Dashboard overview** con KPI
- **Avatar** upload e gestione
- **Form validazione** completa con feedback

### ✅ Sistema Attività
- **Upload file .fit** con parsing completo
- **Estrazione metriche** automatica (potenza, FC, GPS, etc.)
- **Visualizzazione dettagli** con mappe interattive
- **Filtri avanzati** (atleta, data, ricerca, tipo)
- **Preview cards** responsive con hover effects
- **Calcolo automatico** Personal Bests di potenza
- **Gestione file** con Supabase Storage
- **URL firmati** per sicurezza file

### ✅ Sistema Comparazione Attività
- **Selezione intelligente** max 2 attività
- **Analisi qualità** comparazione (stesso tipo, durata simile)
- **Comparazione metriche** side-by-side
- **Selezione visuale segmenti** su mappa interattiva
- **Analisi prestazioni** segmento con calcoli avanzati
- **Evidenziazione vincitore** per ogni metrica

### ✅ Mappe e Visualizzazioni
- **Leaflet integration** con react-leaflet
- **Tracce GPS** color-coded per attività
- **Marker interattivi** per selezione segmenti
- **Effetti glow** per segmenti evidenziati
- **Gestione SSR** con dynamic imports
- **Responsive design** per mobile

### ✅ Charts e Analytics
- **Grafici altimetria** con ECharts
- **Performance charts** atleti
- **Zone di potenza** visualization
- **Trend analysis** nel tempo
- **Responsive charts** per tutti i dispositivi

### ✅ UI/UX Design System
- **Design moderno** con gradients e glassmorphism
- **Sidebar navigazione** collassabile
- **Dark/Light mode** support
- **Loading states** e skeleton loaders
- **Error handling** con feedback utente
- **Responsive grid** layouts
- **Hover effects** e micro-interactions
- **Sistema colori** semantico per tipi attività

## 🎯 Pattern di Sviluppo e Best Practices

### Architettura Componenti
- **Server Components** per data fetching
- **Client Components** per interattività (`'use client'`)
- **Server Actions** per mutazioni dati
- **Custom hooks** per logica riutilizzabile
- **Separation of concerns** tra UI e business logic

### Gestione Stato
- **React useState** per stato locale
- **useMemo** per calcoli pesanti
- **useCallback** per ottimizzazione re-render
- **useEffect** per side effects
- **Supabase real-time** per aggiornamenti live

### Performance Optimization
- **Dynamic imports** per Leaflet (SSR compatibility)
- **Image optimization** con Next.js Image
- **Code splitting** automatico con App Router
- **Memoization** di componenti pesanti
- **Lazy loading** per componenti non critici

### Error Handling
- **Try/catch** wrapping per async operations
- **Error boundaries** per componenti React
- **Graceful fallbacks** per dati mancanti
- **User feedback** per errori e successi
- **Logging** dettagliato per debugging

### Type Safety
- **TypeScript strict mode** abilitato
- **Tipi generati** da Supabase automaticamente
- **Interface definitions** per tutti i dati
- **Type guards** per runtime validation
- **Generic types** per riusabilità

## 🔄 Workflow di Sviluppo

### 1. Identificazione Feature/Bug
- Analisi requisiti utente
- Definizione acceptance criteria
- Stima complessità implementazione

### 2. Ricerca Codebase
- **Semantic search** per codice esistente
- **Pattern matching** per soluzioni simili
- **Dependency analysis** per impatti

### 3. Implementazione
- **Feature branch** per sviluppo
- **Incremental commits** con messaggi descrittivi
- **Testing** manuale durante sviluppo
- **Code review** prima del merge

### 4. Testing e Deploy
- **Local testing** con dati reali
- **Cross-browser testing** per compatibility
- **Mobile testing** per responsiveness
- **Production deploy** con Vercel

## 💡 Note Tecniche Specifiche

### Gestione File .fit
```typescript
// Parsing con fit-file-parser
const fitParser = new FitParser();
const parsedData = fitParser.parse(buffer);

// Estrazione route points
const routePoints: RoutePoint[] = records.map(record => ({
  lat: record.position_lat / 11930465, // Conversione semicircoli
  lng: record.position_long / 11930465,
  elevation: record.altitude,
  time: record.timestamp,
  power: record.power,
  heart_rate: record.heart_rate,
  cadence: record.cadence,
  speed: record.speed * 3.6 // m/s to km/h
}));
```

### Calcoli Fitness Avanzati
```typescript
// Normalized Power (NP)
const normalizedPower = Math.pow(
  powerData.reduce((sum, p) => sum + Math.pow(p, 4), 0) / powerData.length,
  0.25
);

// Training Stress Score (TSS)
const tss = (durationHours * normalizedPower * intensityFactor) / (ftp * 0.1);

// Intensity Factor (IF)
const intensityFactor = normalizedPower / ftp;
```

### Algoritmi Segmenti GPS
```typescript
// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
```

### Gestione SSR con Leaflet
```typescript
// Dynamic import per evitare errori SSR
const DynamicMap = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div>Caricamento mappa...</div>
});
```

## 🐛 Problemi Risolti e Soluzioni

### PostgREST Query Optimization
**Problema**: Filtri `.or()` misti tra tabelle diverse causavano errori parsing
**Soluzione**: Separazione filtri per tabella e combinazione lato client

### Gradient Border Radius
**Problema**: Linee colorate sopra card non seguivano border-radius
**Soluzione**: Aggiunta classi `rounded-t-3xl` per matching radius

### Leaflet SSR Compatibility
**Problema**: Leaflet non compatibile con Server-Side Rendering
**Soluzione**: Dynamic imports con `ssr: false` e loading fallbacks

### Stale Closure in Event Handlers
**Problema**: Event handlers catturavano valori stato obsoleti
**Soluzione**: `useCallback` con dipendenze corrette e cleanup eventi

### Performance Caricamento Iniziale
**Problema**: Query sequenziali causavano tempi lunghi
**Soluzione**: Parallelizzazione con `Promise.all()` per query multiple

## 🚀 Roadmap e Sviluppi Futuri

### Priorità Alta
- [ ] **Ottimizzazione performance** caricamento iniziale
- [ ] **Sistema notifiche** real-time con Supabase
- [ ] **Export dati** attività (PDF/Excel)
- [ ] **Backup automatico** dati utente

### Features Avanzate
- [ ] **Dashboard analytics** avanzate con ML insights
- [ ] **Sistema allenamenti** programmati e periodizzazione
- [ ] **Integrazione API** Garmin Connect / Strava
- [ ] **Coaching tools** con AI suggestions
- [ ] **Social features** (gruppi, sfide, leaderboard)

### Miglioramenti Tecnici
- [ ] **Testing suite** completa (Jest + Cypress)
- [ ] **CI/CD pipeline** automatizzata
- [ ] **Monitoring** e alerting produzione
- [ ] **Database optimization** con indici avanzati
- [ ] **Caching strategy** con Redis

### Espansioni Platform
- [ ] **App mobile** React Native
- [ ] **API pubblica** per integrazioni terze parti
- [ ] **Plugin system** per estensibilità
- [ ] **Multi-tenant** architecture per team

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione progetto: 0.1.0* 