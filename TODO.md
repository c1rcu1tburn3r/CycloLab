# CycloLab - TODO List

## ✅ COMPLETATO

### Sistema Rilevamento Automatico Salite (COMPLETATO ✅)
- ✅ **Schema Database Completo**
  - Tabelle: `detected_climbs`, `master_climbs`, `climb_performances`, `personal_climb_rankings`
  - Trigger automatici per aggiornamento classifiche
  - Funzioni SQL: `calculate_climb_score()`, `categorize_climb()`
  - Indici ottimizzati e viste per query frequenti
  - Foreign key constraints con CASCADE per eliminazione

- ✅ **Algoritmi Rilevamento Avanzati**
  - Rilevamento automatico salite da dati GPS
  - Smoothing elevazione per ridurre rumore GPS
  - Calcolo metriche: distanza Haversine, pendenze, VAM
  - **Formula Climb Score ufficiale italiana**: `pendenza media × lunghezza in metri`
  - **Categorizzazione scala italiana**: HC (80000+), 1ª (64000+), 2ª (32000+), 3ª (16000+), 4ª (8000+)
  - Algoritmo sequenziale logico per seguire salite dall'inizio alla fine
  - Parametri configurabili e criteri permissivi per rilevamento

- ✅ **Server Actions Complete**
  - `detectAndSaveClimbs()`: rileva e salva automaticamente
  - `getActivityClimbs()`: recupera salite per attività
  - `updateClimbName()`, `toggleClimbFavorite()`: gestione salite
  - `recalculateClimbsWithNewAlgorithm()`: migrazione algoritmi
  - Gestione errori, autenticazione, revalidation cache

- ✅ **Componente UI Moderno**
  - `ClimbsSection.tsx`: visualizzazione salite con metriche complete
  - `ClimbSegmentMap`: mappa interattiva con marker inizio/fine salita
  - Editing inline nomi, sistema preferiti, badge categorizzazione
  - Integrazione completa nella pagina attività

- ✅ **Correzioni e Ottimizzazioni**
  - Fix calcolo tempo reale (non stime) per VAM corretta
  - Fix constraint UNIQUE per trigger database
  - **Implementazione scala ufficiale italiana** (v3.0)
  - **Migrazione database completata** con nuove soglie
  - **Pulizia progetto** - rimossi file SQL temporanei
  - Logging dettagliato per debugging

### UI/UX Miglioramenti (COMPLETATO ✅)
- ✅ **Form Profilo Atleta**
  - Rimossa duplicazione campo "Data di Nascita"
  - Riordinati campi: Nome, Cognome, Email, Data Nascita, Altezza, Peso
  - Ordine logico e user-friendly

- ✅ **Zone di Potenza**
  - Fix visualizzazione Z7: `423+ W` invece di range errato
  - Fix percentuali FTP: `151%+ FTP` per zone aperte
  - Zone continue senza gap: ogni zona inizia dove finisce la precedente
  - Calcolo preciso e visualizzazione corretta

## 🔄 IN CORSO

### Sistema Analisi Performance
- 🔄 **Grafici Avanzati**
  - PMC (Performance Management Chart) - base implementata
  - Analisi trend potenza/peso nel tempo
  - Confronto performance su salite ricorrenti

### Gestione Segmenti
- 🔄 **Segmenti Personalizzati**
  - Creazione segmenti custom da mappa
  - Confronto performance su segmenti
  - Leaderboard personali

## 📋 DA FARE

### Funzionalità Core
- [ ] **Sistema Allenamenti**
  - Pianificazione allenamenti strutturati
  - Template allenamenti (intervalli, soglia, resistenza)
  - Tracking aderenza al piano

- [ ] **Analisi Avanzate**
  - Analisi distribuzione potenza
  - Curve di potenza (5s, 1min, 5min, 20min, 1h)
  - Analisi efficienza pedalata

- [ ] **Social Features**
  - Condivisione attività
  - Gruppi e sfide
  - Commenti e kudos

### Miglioramenti Tecnici
- [ ] **Performance**
  - Lazy loading componenti pesanti
  - Caching intelligente dati GPS
  - Ottimizzazione query database

- [ ] **Mobile**
  - App mobile React Native
  - Sincronizzazione offline
  - Notifiche push

### Integrazioni
- [ ] **Dispositivi**
  - Garmin Connect IQ
  - Wahoo ELEMNT
  - Polar Flow

- [ ] **Piattaforme**
  - TrainingPeaks sync
  - Golden Cheetah export
  - Strava segments matching

## 🐛 BUG NOTI

### Risolti ✅
- ✅ VAM calcolata incorrettamente (era stimata invece di reale)
- ✅ Categorie salite con valori irrealistici (formula corretta)
- ✅ Constraint database mancante per trigger ON CONFLICT
- ✅ Campo Data Nascita duplicato nel form profilo
- ✅ Zone potenza Z7 con range errato e gap tra zone
- ✅ **Scala categorizzazione salite** - implementata scala ufficiale italiana
- ✅ **Migrazione algoritmo v3.0** - tutte le salite esistenti ricalcolate
- ✅ **Pulizia codebase** - rimossi file SQL temporanei dalla root

### Attivi
- [ ] Caricamento lento per file GPX molto grandi (>50MB)
- [ ] Timeout occasionali su query complesse con molte attività

## 📊 METRICHE PROGETTO

### Completamento Features
- **Sistema Base**: 95% ✅
- **Rilevamento Salite**: 100% ✅
- **Analisi Performance**: 70% 🔄
- **UI/UX**: 90% ✅
- **Mobile**: 0% ❌

### Stato Database
- **Tabelle Core**: 15/15 ✅
- **Indici Ottimizzati**: 25/25 ✅
- **Trigger/Funzioni**: 8/8 ✅
- **Viste**: 6/6 ✅

### Codebase
- **Componenti React**: 45+ ✅
- **Server Actions**: 25+ ✅
- **Algoritmi**: 8+ ✅
- **Test Coverage**: 60% 🔄

---

**Ultimo aggiornamento**: Maggio 2025
**Versione**: 3.0.0
**Stato**: Sviluppo Attivo 🚀 