# CycloLab - Project Context

## 🎯 **PANORAMICA PROGETTO**

**CycloLab** è una piattaforma web avanzata per l'analisi delle performance ciclistiche, sviluppata con **Next.js 14**, **TypeScript**, **Supabase** e **Tailwind CSS**. Il progetto si focalizza su analisi dettagliate dei dati GPS, rilevamento automatico salite, gestione atleti e comparazione performance.

---

## 🏗️ **ARCHITETTURA TECNICA**

### **Stack Tecnologico**
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Mappe**: Leaflet, React-Leaflet
- **Charts**: Recharts, Chart.js
- **File Processing**: Custom parsers per GPX/TCX/FIT

### **Struttura Database**
```sql
-- Tabelle Core (15/15 ✅)
users (auth.users)           -- Autenticazione Supabase
athletes                     -- Profili atleti
activities                   -- Attività sportive
route_points                 -- Dati GPS dettagliati
personal_bests              -- Record personali
activity_comparisons        -- Comparazioni attività

-- Sistema Salite (4/4 ✅)
detected_climbs             -- Salite rilevate automaticamente
master_climbs               -- Database salite famose
climb_performances          -- Performance su salite
personal_climb_rankings     -- Classifiche personali salite

-- Sistema Coach (2/2 ✅)
coach_athlete_associations  -- Relazioni coach-atleta
team_invitations           -- Inviti team
```

---

## 🚀 **FEATURES PRINCIPALI COMPLETATE**

### **1. Sistema Rilevamento Automatico Salite** ✅ **COMPLETATO**

#### **Schema Database Completo**
- **4 tabelle specializzate**: `detected_climbs`, `master_climbs`, `climb_performances`, `personal_climb_rankings`
- **Trigger automatici** per aggiornamento classifiche personali
- **Funzioni SQL**: `calculate_climb_score()`, `categorize_climb()` con formule realistiche
- **Indici ottimizzati** per performance e viste per query frequenti
- **Foreign key constraints** con CASCADE per eliminazione pulita

#### **Algoritmi Rilevamento Avanzati**
```typescript
// Formula Climb Score ufficiale italiana (v3.0)
const climbScore = avgGradient * distance; // pendenza × lunghezza in metri

// Categorizzazione scala italiana (IMPLEMENTATA ✅)
HC: ≥80000 punti    // Fuori Categoria (es: 8% × 10000m = 80000)
1ª: ≥64000 punti    // 1ª Categoria (es: 8% × 8000m = 64000)
2ª: ≥32000 punti    // 2ª Categoria (es: 6% × 5333m = 32000)
3ª: ≥16000 punti    // 3ª Categoria (es: 4% × 4000m = 16000)
4ª: ≥8000 punti     // 4ª Categoria (es: 4% × 2000m = 8000)
```

- **Rilevamento automatico** salite da array RoutePoint GPS
- **Smoothing elevazione** con finestra mobile per ridurre rumore GPS
- **Calcolo metriche**: distanza Haversine, pendenze, VAM (tempo reale, non stimato)
- **Algoritmo sequenziale logico** per seguire salite dall'inizio alla fine
- **Parametri configurabili** e criteri permissivi per rilevamento accurato

#### **Server Actions Complete**
```typescript
// Server Actions principali
detectAndSaveClimbs()           // Rileva e salva automaticamente
getActivityClimbs()             // Recupera salite per attività
updateClimbName()               // Gestione nomi salite
toggleClimbFavorite()           // Sistema preferiti
recalculateClimbsWithNewAlgorithm() // Migrazione algoritmi v2.0
```

#### **Componente UI Moderno**
- **`ClimbsSection.tsx`**: Visualizzazione salite con metriche complete
- **`ClimbSegmentMap`**: Mappa interattiva con marker inizio/fine salita
- **Editing inline** nomi salite, sistema preferiti con stelle
- **Badge categorizzazione** colorati per ogni categoria
- **Integrazione completa** nella pagina attività

#### **Correzioni e Ottimizzazioni**
- ✅ **Fix calcolo tempo reale** (non stime) per VAM corretta
- ✅ **Fix constraint UNIQUE** per trigger database ON CONFLICT
- ✅ **Implementazione scala ufficiale italiana** (algoritmo v3.0)
- ✅ **Migrazione database completata** - tutte le salite ricalcolate
- ✅ **Pulizia progetto** - rimossi file SQL temporanei dalla root
- ✅ **Logging dettagliato** per debugging e monitoraggio

### **2. UI/UX Miglioramenti** ✅ **COMPLETATO**

#### **Form Profilo Atleta**
- ✅ **Rimossa duplicazione** campo "Data di Nascita"
- ✅ **Riordinati campi** secondo ordine logico: Nome, Cognome, Email, Data Nascita, Altezza, Peso
- ✅ **Validazione migliorata** e UX più user-friendly

#### **Zone di Potenza**
- ✅ **Fix visualizzazione Z7**: `423+ W` invece di range errato `423 - > 422 W`
- ✅ **Fix percentuali FTP**: `151%+ FTP` per zone aperte invece di `151% - 150%+ FTP`
- ✅ **Zone continue senza gap**: ogni zona inizia esattamente dove finisce la precedente
- ✅ **Calcolo preciso** e visualizzazione corretta per tutte le zone

### **3. Sistema Gestione Atleti e Coach** ✅ **COMPLETATO**
- **Dashboard coach professionale** (`/app/coach/manage-athletes/`)
- **Associazione/dissociazione atleti** con sistema inviti
- **Ricerca atleti potenziali** con filtri avanzati
- **Statistiche aggregate team** e quick stats
- **Gestione permessi** e accesso dati atleti

### **4. Sistema Comparazione Attività** ✅ **COMPLETATO**
- **Selezione visuale segmenti** su mappa interattiva
- **Analisi prestazioni avanzate** con algoritmi GPS
- **Comparazione side-by-side** con metriche dettagliate
- **Riconoscimento automatico segmenti** comuni
- **Analisi qualità comparazione** e scoring

### **5. Sistema Upload e Processing** ✅ **COMPLETATO**
- **Parser multi-formato**: GPX, TCX, FIT files
- **Processing robusto** con retry automatico e backoff esponenziale
- **Validazione completa** formato e integrità dati
- **Progress tracking** e feedback dettagliati
- **Gestione errori avanzata** con 3 tentativi automatici

### **6. Sistema Export Dati** ✅ **COMPLETATO**
- **Export CSV** per Excel/Google Sheets
- **Export JSON** per backup completi
- **Export statistiche aggregate** per analisi
- **Export profilo atleta** con storico completo
- **Componente `ExportControls`** con UI moderna

---

## 🔄 **FEATURES IN CORSO**

### **Sistema Analisi Performance** (70% completato)
- **PMC (Performance Management Chart)** - base implementata
- **Analisi trend potenza/peso** nel tempo
- **Confronto performance** su salite ricorrenti
- **Grafici avanzati** con Recharts

### **Gestione Segmenti** (60% completato)
- **Creazione segmenti custom** da mappa
- **Confronto performance** su segmenti
- **Leaderboard personali** e classifiche

---

## 📁 **STRUTTURA PROGETTO**

```
cyclolab/
├── src/
│   ├── app/                    # App Router Next.js 14
│   │   ├── athletes/          # Gestione atleti
│   │   ├── activities/        # Attività e analisi
│   │   ├── coach/            # Dashboard coach
│   │   └── upload/           # Upload files
│   ├── components/           # Componenti React
│   │   ├── ui/              # Shadcn/ui components
│   │   ├── charts/          # Grafici personalizzati
│   │   └── maps/            # Componenti mappa
│   ├── lib/                 # Utilities e algoritmi
│   │   ├── climbDetection.ts # Algoritmi rilevamento salite
│   │   ├── gpsUtils.ts      # Utility GPS
│   │   └── types.ts         # TypeScript types
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
├── database_climbs_schema.sql # Schema database salite
├── database_optimization.sql  # Ottimizzazioni DB
└── supabase/               # Configurazione Supabase
```

---

## 🎯 **ALGORITMI CHIAVE**

### **Rilevamento Salite**
```typescript
export function detectClimbs(routePoints: RoutePoint[]): DetectedClimb[] {
  // 1. Smooth elevazione per ridurre rumore GPS
  const smoothedElevations = smoothElevation(routePoints, 5);
  
  // 2. Calcola distanze cumulative e pendenze
  const distances = calculateCumulativeDistances(routePoints);
  const gradients = calculateGradients(distances, smoothedElevations);
  
  // 3. Algoritmo sequenziale: segui salita dall'inizio alla fine
  const climbSegments = findClimbSegments(routePoints, distances, smoothedElevations);
  
  // 4. Analizza e filtra segmenti significativi
  const detectedClimbs = climbSegments
    .map(segment => analyzeClimbSegment(segment))
    .filter(climb => climb.isSignificant);
  
  // 5. Merge salite vicine se necessario
  return mergeNearbyClimbs(detectedClimbs);
}
```

### **Calcolo Metriche Performance**
```typescript
// VAM (Velocità Ascensionale Media) - tempo reale
const vam = (elevationGain / (duration / 3600)); // m/h

// Climb Score realistico
const climbScore = elevationGain * avgGradient + distanceBonus;

// Categorizzazione basata su criteri reali del ciclismo
const category = categorizeClimb(climbScore);
```

---

## 🔧 **CONFIGURAZIONE SVILUPPO**

### **Environment Variables**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Scripts Principali**
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

---

## 📊 **METRICHE PROGETTO**

### **Completamento Features**
- **Sistema Base**: 95% ✅
- **Rilevamento Salite**: 100% ✅
- **Analisi Performance**: 70% 🔄
- **UI/UX**: 90% ✅
- **Mobile**: 0% ❌

### **Stato Database**
- **Tabelle Core**: 15/15 ✅
- **Indici Ottimizzati**: 25/25 ✅
- **Trigger/Funzioni**: 8/8 ✅
- **Viste**: 6/6 ✅

### **Codebase**
- **Componenti React**: 45+ ✅
- **Server Actions**: 25+ ✅
- **Algoritmi**: 8+ ✅
- **Test Coverage**: 60% 🔄

---

## 🐛 **BUG RISOLTI RECENTEMENTE**

### **Sistema Rilevamento Salite**
- ✅ **VAM calcolata incorrettamente** - Era stimata invece di usare tempo reale
- ✅ **Categorie salite irrealistiche** - Formula corretta con valori reali del ciclismo
- ✅ **Constraint database mancante** - Fix trigger ON CONFLICT per performance
- ✅ **Algoritmo rilevamento impreciso** - Riscritto con approccio sequenziale logico
- ✅ **Scala categorizzazione errata** - Implementata scala ufficiale italiana
- ✅ **Migrazione algoritmo v3.0** - Tutte le salite esistenti ricalcolate

### **UI/UX**
- ✅ **Campo Data Nascita duplicato** - Rimossa duplicazione nel form profilo
- ✅ **Zone potenza Z7 errata** - Fix range e percentuali FTP
- ✅ **Gap tra zone di potenza** - Zone ora continue senza interruzioni
- ✅ **Visualizzazione percentuali FTP** - Corrette per zone aperte

---

## 🚀 **PROSSIMI PASSI PRIORITARI**

### **1. Sistema Allenamenti** (Priorità Alta)
- Pianificazione allenamenti strutturati
- Template allenamenti (intervalli, soglia, resistenza)
- Tracking aderenza al piano

### **2. Analisi Avanzate** (Priorità Media)
- Analisi distribuzione potenza
- Curve di potenza (5s, 1min, 5min, 20min, 1h)
- Analisi efficienza pedalata

### **3. Mobile Responsiveness** (Priorità Media)
- App mobile React Native
- Sincronizzazione offline
- Notifiche push

### **4. Integrazioni** (Priorità Bassa)
- Garmin Connect IQ
- Strava segments matching
- TrainingPeaks sync

---

## 📝 **NOTE TECNICHE IMPORTANTI**

### **Performance Ottimizzazioni**
- **Caching intelligente** con TTL e stale-while-revalidate
- **Lazy loading** per componenti pesanti
- **Query ottimizzate** con indici compositi
- **Bundle splitting** per ridurre dimensioni

### **Sicurezza**
- **Row Level Security** (RLS) su tutte le tabelle
- **Validazione input** lato client e server
- **Sanitizzazione dati** per prevenire XSS
- **Rate limiting** su API endpoints

### **Scalabilità**
- **Database partitioning** per tabelle grandi
- **CDN** per asset statici
- **Horizontal scaling** con Supabase
- **Monitoring** con logging dettagliato

---

**Ultimo aggiornamento**: Maggio 2025  
**Versione**: 3.0.0  
**Stato**: Sviluppo Attivo 🚀 