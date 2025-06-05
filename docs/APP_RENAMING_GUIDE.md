# 🏷️ Guida Completa Rinominazione App CycloLab

## 📋 Overview

Questa guida spiega come rinominare l'applicazione CycloLab in un nuovo nome in modo sistematico e sicuro, mantenendo tutte le funzionalità intatte.

### **📊 Complessità: MEDIA**
- ⏱️ **Tempo stimato**: 15-30 minuti
- 🔧 **Competenze**: Base conoscenza file di progetto
- 🛠️ **Strumenti**: Script automatico + verifiche manuali

---

## 🚀 **METODO AUTOMATICO (RACCOMANDATO)**

### **Step 1: Preparazione**
```bash
# 1. Fai backup del progetto
git add . && git commit -m "Backup prima di rinominazione app"

# 2. Installa dipendenza per script (se necessario)  
npm install glob

# 3. Assicurati che tutto funzioni
npm run build
```

### **Step 2: Esecuzione Script**
```bash
# Sintassi generale
node scripts/rename-app.js "NuovoNome" "nuovo-package-name"

# Esempi pratici:
node scripts/rename-app.js "SportAnalytics" "sport-analytics"
node scripts/rename-app.js "BikeMetrics" "bike-metrics"  
node scripts/rename-app.js "ProCycling" "pro-cycling"
node scripts/rename-app.js "VeloTech" "velo-tech"
```

### **Step 3: Verifica Automatica**
Lo script eseguirà automaticamente:
- ✅ Sostituzione in 35+ file
- ✅ Rinominazione file hook (`use-cyclolab-*` → `use-nuovonome-*`)
- ✅ Pulizia cache Next.js
- ✅ Reinstallazione dipendenze
- ✅ Test build automatico

---

## 🔧 **METODO MANUALE (Se script non funziona)**

### **Fase 1: File di Configurazione CRITICI**
```json
// package.json
{
  "name": "cyclolab" → "name": "sport-analytics"
}

// package-lock.json  
{
  "name": "cyclolab" → "name": "sport-analytics"
}
```

### **Fase 2: Hook e File Core (4 file)**
```bash
# Rinomina file
mv src/hooks/use-cyclolab-toast.tsx src/hooks/use-sportanalytics-toast.tsx
mv src/hooks/use-cyclolab-cache.ts src/hooks/use-sportanalytics-cache.ts

# Modifica contenuto file
# use-sportanalytics-toast.tsx:
export function useCycloLabToast() → export function useSportAnalyticsToast()

# use-sportanalytics-cache.ts:  
useCycloLabCacheInvalidation() → useSportAnalyticsCacheInvalidation()
```

### **Fase 3: Import in 25+ File**
Trova e sostituisci in tutti i file `.tsx/.ts`:
```typescript
// Da:
import { useCycloLabToast } from '@/hooks/use-cyclolab-toast';
const { showSuccess } = useCycloLabToast();

// A:
import { useSportAnalyticsToast } from '@/hooks/use-sportanalytics-toast'; 
const { showSuccess } = useSportAnalyticsToast();
```

### **Fase 4: Testi UI Visibili (8 file)**
```tsx
// src/components/ui/ModernSidebar.tsx
<span>CycloLab</span> → <span>SportAnalytics</span>

// src/app/layout.tsx
title: "CycloLab - Professional..." → title: "SportAnalytics - Professional..."

// src/app/page.tsx  
"CycloLab Dashboard" → "SportAnalytics Dashboard"

// src/app/auth/signup/page.tsx + login/page.tsx
<h1>CycloLab</h1> → <h1>SportAnalytics</h1>
"© 2025 CycloLab" → "© 2025 SportAnalytics"
```

### **Fase 5: Documentazione (8+ file)**
```markdown
# Tutti i file .md in docs/ e root
"CycloLab Design System" → "SportAnalytics Design System"
"progetto CycloLab" → "progetto SportAnalytics"  
"l'applicazione CycloLab" → "l'applicazione SportAnalytics"
```

---

## 📋 **CHECKLIST VERIFICHE POST-RINOMINAZIONE**

### **✅ Verifiche Tecniche**
- [ ] `npm run build` - Build senza errori
- [ ] `npm run dev` - Server di sviluppo si avvia
- [ ] `npm run lint` - Nessun errore linting
- [ ] TypeScript compilation clean

### **✅ Verifiche UI**
- [ ] Titolo browser aggiornato (tab title)
- [ ] Nome app in sidebar aggiornato  
- [ ] Header e footer aggiornati
- [ ] Pagine login/signup aggiornate
- [ ] Toast e notifiche funzionanti

### **✅ Verifiche Funzionalità**
- [ ] Sistema authentication funzionante
- [ ] Upload attività funzionante
- [ ] Dashboard analytics caricano
- [ ] Toast system funziona (nuovo nome hook)
- [ ] Export dati funziona

### **✅ Verifiche File**
- [ ] package.json nome aggiornato
- [ ] Hook rinominati correttamente
- [ ] Import aggiornati in tutti i file
- [ ] Nessun riferimento "CycloLab" rimasto nel codice

---

## 🚨 **POSSIBILI PROBLEMI E SOLUZIONI**

### **Problema 1: Build Fails - Import Errors**
```bash
Error: Cannot resolve module '@/hooks/use-cyclolab-toast'
```
**Soluzione**:
```bash
# Cerca tutti i file con import vecchio
grep -r "use-cyclolab-toast" src/
# Sostituisci manualmente i rimanenti
```

### **Problema 2: Hook Non Funzionano**
```bash
Error: useCycloLabToast is not a function
```
**Soluzione**:
```typescript
// Verifica che nel file hook rinominato:
export function useSportAnalyticsToast() { // Nome corretto
  // ... resto del codice invariato
}
```

### **Problema 3: Cache Next.js**
```bash
Error: Module build failed
```
**Soluzione**:
```bash
# Pulisci completamente cache
rm -rf .next
rm -rf node_modules  
npm install
npm run build
```

### **Problema 4: TypeScript Errors**
```bash
Error: Type 'undefined' is not assignable...
```
**Soluzione**: 
```bash
# Riavvia TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

---

## 🎯 **ESEMPI DI RINOMINAZIONE POPOLARI**

### **1. SportAnalytics** (Analytics sportive generiche)
```bash
node scripts/rename-app.js "SportAnalytics" "sport-analytics"
```
- ✅ Nome generico, espandibile ad altri sport
- ✅ Branding professionale
- ✅ Domain facile da trovare

### **2. BikeMetrics** (Focus su metriche ciclismo)
```bash
node scripts/rename-app.js "BikeMetrics" "bike-metrics"
```
- ✅ Specifico al ciclismo
- ✅ Sottolinea aspetto analitico
- ✅ Nome breve e memorabile

### **3. ProCycling** (Ciclismo professionale)
```bash
node scripts/rename-app.js "ProCycling" "pro-cycling"
```
- ✅ Target coach e atleti pro
- ✅ Nome prestigioso
- ✅ Chiaramente identificabile

### **4. VeloTech** (Tecnologia + Velocità)
```bash
node scripts/rename-app.js "VeloTech" "velo-tech"
```
- ✅ Combina tech e ciclismo
- ✅ Suona moderno
- ✅ Internazionale (velo = bike in francese)

---

## ⚡ **TIPS PER SCELTA DEL NOME**

### **✅ Best Practices**
- **Breve e memorabile** (max 2-3 parole)
- **Facile da pronunciare** in italiano e inglese
- **Dominio disponibile** (.com/.it)
- **Non conflitti** con marchi esistenti
- **Scalabile** per future features

### **❌ Da Evitare**
- Nomi troppo lunghi (>15 caratteri)
- Caratteri speciali o numeri
- Parole con copyright/trademark
- Nomi troppo generici ("Analytics", "App")
- Hard-to-spell names

---

## 🔄 **ROLLBACK (Se qualcosa va storto)**

### **Metodo 1: Git Reset**
```bash
# Se hai committato prima della rinominazione
git reset --hard HEAD~1
```

### **Metodo 2: Restore Manuale**  
```bash
# Ripristina package.json
git checkout HEAD -- package.json

# Rinomina hook al nome originale
mv src/hooks/use-nuovonome-toast.tsx src/hooks/use-cyclolab-toast.tsx
mv src/hooks/use-nuovonome-cache.ts src/hooks/use-cyclolab-cache.ts

# Pulisci e reinstalla
rm -rf .next node_modules
npm install
```

---

## 📈 **BENEFICI DELLA RINOMINAZIONE**

### **🎯 Branding**
- Nome personalizzato per il tuo business
- Branding coerente con la tua identità
- Maggiore riconoscibilità del prodotto

### **🚀 Marketing**
- Domain name personalizzato
- Social media handles coordinati  
- Material marketing con nome proprio

### **💼 Business**
- Ownership completa del brand
- Espandibilità del nome per altri prodotti
- Protezione legale marchio registrabile

---

## 🏆 **CONCLUSIONI**

La rinominazione dell'app CycloLab è un processo:
- **✅ Fattibile** con lo script automatico
- **⚡ Veloce** (15-30 minuti)
- **🔒 Sicuro** se fatto con backup Git
- **🎯 Efficace** per personalizzazione branding

**Il progetto manterrà tutte le sue funzionalità al 100%** - cambierà solo il nome visualizzato e gli identificatori interni.

### **Prossimi passi dopo rinominazione:**
1. **Aggiorna favicon** e logo (se hai asset grafici)
2. **Registra dominio** con il nuovo nome
3. **Setup social media** con handle coordinato
4. **Deploy con nuovo nome** su Vercel/hosting

**La rinominazione non compromette MAI la qualità tecnica del progetto!** 🚀 