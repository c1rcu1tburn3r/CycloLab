# 🚀 Guida alla Migrazione del Design System

## Panoramica
Questa guida spiega come migrare dal sistema di stili inconsistente attuale al nuovo design system unificato di CycloLab.

## 📋 Mappa delle Sostituzioni

### 1. Classi CSS Custom → Componenti Design System

#### **stats-card** → **Card Component**
```tsx
// ❌ Prima (inconsistente)
<div className="stats-card">
  <div className="p-4">
    <h3>Titolo</h3>
    <p>Contenuto</p>
  </div>
</div>

// ✅ Dopo (design system)
<Card variant="default" hover="subtle">
  <CardContent>
    <CardTitle>Titolo</CardTitle>
    <CardDescription>Contenuto</CardDescription>
  </CardContent>
</Card>
```

#### **Metric Cards** → **MetricCard Component**
```tsx
// ❌ Prima (colori hardcoded)
<div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-4 text-center stats-card">
  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Attività</div>
  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">42</div>
</div>

// ✅ Dopo (standardizzato)
<MetricCard
  title="Attività"
  value={42}
  icon={<Activity />}
  accent="blue"
  trend={{ value: 12, isPositive: true }}
/>
```

### 2. Classi Inline → Design Tokens

#### **Spacing**
```tsx
// ❌ Prima (inconsistente)
<div className="p-4 mb-6 gap-3">
<div className="p-6 mb-8 gap-4">
<div className="p-8 mb-4 gap-6">

// ✅ Dopo (design system)
<div className={cn(spacing.md, spacing.bottom.lg, layoutSystem.inline.sm)}>
// O usando i componenti:
<Card padding="md">
  <CardContent spacing="lg">
```

#### **Border Radius**
```tsx
// ❌ Prima (inconsistente)
className="rounded-xl"
className="rounded-2xl"
className="rounded-lg"

// ✅ Dopo (standardizzato)
<Card radius="lg">  // rounded-lg
<Card radius="xl">  // rounded-xl
<Card radius="2xl"> // rounded-2xl
```

#### **Shadows & Effects**
```tsx
// ❌ Prima (hardcoded)
className="shadow-lg hover:shadow-xl"

// ✅ Dopo (design system)
<Card variant="elevated" hover="lift">
```

### 3. Bottoni → Button Component

#### **Bottoni Custom** → **Button Variants**
```tsx
// ❌ Prima (stili inline)
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
  Azione
</button>

// ✅ Dopo (standardizzato)
<Button variant="primary" size="md">
  Azione
</Button>
```

#### **Button Groups**
```tsx
// ❌ Prima (spacing manuale)
<div className="flex gap-2">
  <button>Primo</button>
  <button>Secondo</button>
</div>

// ✅ Dopo (componenti)
<ButtonGroup>
  <Button variant="outline">Primo</Button>
  <Button variant="primary">Secondo</Button>
</ButtonGroup>
```

### 4. Layout → Grid System

#### **Grid Inconsistenti** → **Grid Utilities**
```tsx
// ❌ Prima (hardcoded)
<div className="grid grid-cols-2 gap-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// ✅ Dopo (design system)
<div className={getGridClasses(2, 'sm')}>
<div className={getGridClasses({ base: 1, md: 3 }, 'lg')}>
```

## 🎯 Piano di Migrazione per Priority

### **Fase 1: Componenti Core (Settimana 1-2)**
1. **AthleteCard** ✅ (completato)
2. **MetricCard in Dashboard**
3. **Form Components**
4. **Navigation Components**

### **Fase 2: Pagine Principali (Settimana 3-4)**
1. **Homepage (`/app/page.tsx`)**
2. **Athletes List (`/app/athletes/page.tsx`)**
3. **Activities (`/app/activities/page.tsx`)**
4. **Settings Pages**

### **Fase 3: Componenti Avanzati (Settimana 5-6)**
1. **Charts e Analytics**
2. **Form complessi**
3. **Modali e Overlays**

## 🔧 Strumenti di Migrazione

### **Script di Find & Replace**

#### **1. Rimuovere stats-card**
```bash
# Trova tutti i file con stats-card
grep -r "stats-card" src/ --include="*.tsx"

# Replace con Card component
sed -i 's/className="stats-card"/className=""/g' src/**/*.tsx
```

#### **2. Sostituire colori hardcoded**
```bash
# Trova pattern di colori inline
grep -r "bg-.*-50/50.*dark:bg-.*-900/30" src/ --include="*.tsx"
```

### **VSCode Snippets**

Aggiungi al tuo `.vscode/snippets/typescript.json`:

```json
{
  "Design System Card": {
    "prefix": "ds-card",
    "body": [
      "<Card variant=\"$1\" hover=\"$2\">",
      "  <CardContent spacing=\"$3\">",
      "    <CardTitle>$4</CardTitle>",
      "    <CardDescription>$5</CardDescription>",
      "  </CardContent>",
      "</Card>"
    ]
  },
  "Metric Card": {
    "prefix": "ds-metric",
    "body": [
      "<MetricCard",
      "  title=\"$1\"",
      "  value={$2}",
      "  icon={<$3 />}",
      "  accent=\"$4\"",
      "/>"
    ]
  }
}
```

## 📊 Checklist di Migrazione

### **Per ogni componente:**
- [ ] Sostituire `stats-card` con `<Card>`
- [ ] Convertire spacing inline con design tokens
- [ ] Sostituire colori hardcoded con variants
- [ ] Aggiungere hover effects standardizzati
- [ ] Verificare responsive design
- [ ] Test su dark mode
- [ ] Aggiornare TypeScript types

### **Per ogni pagina:**
- [ ] Audit completo degli stili
- [ ] Sostituire grid layout inconsistenti
- [ ] Unificare spacing e padding
- [ ] Convertire bottoni custom
- [ ] Verificare accessibilità
- [ ] Test cross-browser

## 🎨 Pattern di Design Ricorrenti

### **Dashboard Cards**
```tsx
// Standard per metriche dashboard
<div className={getGridClasses({ base: 1, sm: 2, lg: 4 }, 'lg')}>
  <MetricCard title="Totale Atleti" value={athletes.length} accent="blue" />
  <MetricCard title="Attività Oggi" value={todayActivities} accent="emerald" />
  <MetricCard title="Distanza Mese" value={`${monthDistance}km`} accent="amber" />
  <MetricCard title="Obiettivi Raggiunti" value={`${goals}%`} accent="purple" />
</div>
```

### **Form Layouts**
```tsx
// Standard per form sections
<Card variant="default">
  <CardHeader>
    <CardTitle level={2}>Informazioni Personali</CardTitle>
    <CardDescription>Aggiorna i dettagli del profilo</CardDescription>
  </CardHeader>
  <CardContent spacing="lg">
    {/* Form fields */}
  </CardContent>
  <CardFooter justify="end">
    <ButtonGroup>
      <Button variant="outline">Annulla</Button>
      <Button variant="primary">Salva</Button>
    </ButtonGroup>
  </CardFooter>
</Card>
```

### **List Items**
```tsx
// Standard per elementi lista
<Card hover="subtle" className="group">
  <CardContent>
    <div className={layoutSystem.inline.between}>
      <div>
        <CardTitle size="sm">{item.title}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </div>
      <Button variant="ghost" size="sm">
        Azioni
      </Button>
    </div>
  </CardContent>
</Card>
```

## 🚨 Errori Comuni da Evitare

1. **Non mescolare sistemi**
   ```tsx
   // ❌ Non fare così
   <Card className="stats-card bg-blue-50 p-4">
   
   // ✅ Usa solo design system
   <Card variant="metric" accent="blue">
   ```

2. **Non hardcodare dimensioni**
   ```tsx
   // ❌ Evita
   <div className="w-[320px] h-[240px]">
   
   // ✅ Usa il sistema
   <Card className={cn(containerClasses.maxW.sm)}>
   ```

3. **Non ignorare il dark mode**
   ```tsx
   // ✅ Il design system gestisce automaticamente dark mode
   <Card variant="default"> // ✅ Supporta dark mode
   ```

## 📈 Metriche di Successo

### **Obiettivi della Migrazione:**
- ✅ **Riduzione del 80%** delle classi CSS custom
- ✅ **Tempo di sviluppo -50%** per nuovi componenti
- ✅ **Consistenza 100%** tra le pagine
- ✅ **0 errori** di accessibilità
- ✅ **Performance** mantenute o migliorate

### **Come misurare:**
```bash
# Conta le occorrenze di classi inconsistenti
grep -r "stats-card\|bg-.*-50/50" src/ --include="*.tsx" | wc -l

# Verifica utilizzo design system
grep -r "import.*design-system" src/ --include="*.tsx" | wc -l
```

---

## 🤝 Supporto

Per domande sulla migrazione:
1. Consulta la documentazione del design system: `/docs/DESIGN_SYSTEM.md`
2. Guarda gli esempi nei componenti già migrati
3. Testa sempre in dark mode e mobile

**Happy coding! 🚀** 