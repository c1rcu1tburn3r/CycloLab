# 🎨 CycloLab Design System

Questo documento definisce il sistema di design di CycloLab per garantire consistenza visiva e di codice in tutto il progetto.

## 📋 Indice

- [🎯 Obiettivi](#-obiettivi)
- [🏗️ Architettura](#️-architettura)
- [🎨 Design Tokens](#-design-tokens)
- [🧩 Componenti](#-componenti)
- [📐 Layout System](#-layout-system)
- [🔧 Utility Classes](#-utility-classes)
- [📖 Esempi di Utilizzo](#-esempi-di-utilizzo)
- [✅ Best Practices](#-best-practices)

## 🎯 Obiettivi

Il design system di CycloLab è stato creato per:

- **Consistenza**: Garantire un aspetto uniforme in tutto il progetto
- **Efficienza**: Ridurre il tempo di sviluppo con componenti riutilizzabili  
- **Manutenibilità**: Centralizzare gli stili per facilitare aggiornamenti
- **Scalabilità**: Permettere crescita del progetto mantenendo la qualità
- **TypeSafety**: Utilizzare TypeScript per prevenire errori

## 🏗️ Architettura

```
src/
├── lib/
│   └── design-system.ts        # Core tokens e utilities
├── components/
│   └── design-system/
│       ├── index.ts            # Esportazioni centrali
│       ├── Button.tsx          # Componente Button standardizzato
│       └── Card.tsx            # Componente Card standardizzato
└── docs/
    └── DESIGN_SYSTEM.md        # Questa documentazione
```

## 🎨 Design Tokens

### Spacing Scale
```typescript
const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px  
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
}
```

### Border Radius
```typescript
const radius = {
  none: '0',
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px  
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
}
```

### Typography Scale
```typescript
const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
}
```

### Semantic Colors
```typescript
const semanticColors = {
  primary: { 50: '...', 500: 'rgb(59 130 246)', 600: '...', ... },
  success: { 50: '...', 500: 'rgb(16 185 129)', 600: '...', ... },
  warning: { 50: '...', 500: 'rgb(245 158 11)', 600: '...', ... },
  danger:  { 50: '...', 500: 'rgb(239 68 68)', 600: '...', ... },
}
```

## 🧩 Componenti

### Button

Il componente Button standardizzato con varianti consistenti:

```tsx
import { Button } from '@/components/design-system';

// Varianti disponibili
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>

// Dimensioni
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Con icone e loading
<Button leftIcon={<SaveIcon />}>Salva</Button>
<Button loading loadingText="Salvando...">Salva</Button>
<Button size="icon"><SaveIcon /></Button>
```

### Card

Il componente Card con varianti per diversi contesti:

```tsx
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription, MetricCard } from '@/components/design-system';

// Card base
<Card variant="default" padding="md" radius="lg" hover="lift">
  <CardHeader>
    <CardTitle>Titolo</CardTitle>
    <CardDescription>Descrizione</CardDescription>
  </CardHeader>
  <CardContent>
    Contenuto della card
  </CardContent>
  <CardFooter justify="end">
    <Button>Azione</Button>
  </CardFooter>
</Card>

// Metric Card specializzata
<MetricCard
  title="Potenza Media"
  value="245W"
  subtitle="Negli ultimi 30 giorni"
  icon={<PowerIcon />}
  trend={{ value: 5.2, isPositive: true }}
  accent="blue"
/>
```

### Varianti Card

- `default`: Card standard con bordo sottile
- `elevated`: Card con shadow prominente  
- `glass`: Card con effetto glassmorphism
- `metric`: Card specializzata per metriche
- `gradient`: Card con sfondo gradiente

## 📐 Layout System

### Container
```tsx
import { getContainerClasses } from '@/components/design-system';

<div className={getContainerClasses('xl')}>
  Contenuto centrato con max-width
</div>
```

### Grid System
```tsx
import { getGridClasses } from '@/components/design-system';

<div className={getGridClasses(3, 'md')}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Stack e Inline
```tsx
import { getStackClasses, getInlineClasses } from '@/components/design-system';

// Layout verticale
<div className={getStackClasses('md')}>
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Layout orizzontale
<div className={getInlineClasses('md', 'center')}>
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 🔧 Utility Classes

### Spacing
```tsx
import { Spacing } from '@/components/design-system';

<div className={`${Spacing.md}`}>Spacing medio</div>
```

### Borders
```tsx
import { Borders } from '@/components/design-system';

<div className={Borders.thin}>Bordo sottile</div>
<div className={Borders.accent}>Bordo accent sinistro</div>
```

### Shadows
```tsx
import { Shadows } from '@/components/design-system';

<div className={Shadows.lg}>Shadow grande</div>
<div className={Shadows.glow}>Shadow con glow</div>
```

### Theme Utilities
```tsx
import { themeUtils } from '@/components/design-system';

<div className={themeUtils.hover('medium')}>Hover medium</div>
<div className={themeUtils.transition('all')}>Transizione smooth</div>
<div className={themeUtils.focusRing('primary')}>Focus ring primary</div>
```

## 📖 Esempi di Utilizzo

### Sostituire Card Inconsistenti

❌ **Prima (inconsistente):**
```tsx
<div className="bg-white dark:bg-gray-800 p-5 md:p-8 rounded-xl shadow-lg mt-8">
  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">
    Titolo
  </h3>
  Contenuto...
</div>
```

✅ **Dopo (standardizzato):**
```tsx
<Card variant="elevated" padding="lg" radius="xl" className="mt-8">
  <CardHeader>
    <CardTitle size="lg">Titolo</CardTitle>
  </CardHeader>
  <CardContent>
    Contenuto...
  </CardContent>
</Card>
```

### Sostituire Button Inconsistenti

❌ **Prima (inconsistente):**
```tsx
<button className="w-full font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white">
  Salva
</button>
```

✅ **Dopo (standardizzato):**
```tsx
<Button variant="primary" size="lg" fullWidth>
  Salva
</Button>
```

### Grid di Metriche

```tsx
<div className={getGridClasses(3, 'md')}>
  <MetricCard
    title="Distanza"
    value="45.2 km"
    icon={<RouteIcon />}
    accent="blue"
  />
  <MetricCard
    title="Tempo"
    value="1h 23m"
    icon={<ClockIcon />}
    accent="emerald"
  />
  <MetricCard
    title="Potenza"
    value="245W"
    icon={<PowerIcon />}
    trend={{ value: 5.2, isPositive: true }}
    accent="amber"
  />
</div>
```

## ✅ Best Practices

### 1. Usa sempre il Design System
- **DO**: `<Button variant="primary">Salva</Button>`
- **DON'T**: `<button className="bg-blue-500 hover:bg-blue-600...">Salva</button>`

### 2. Rispetta le Scale di Spacing
- **DO**: `<div className={getStackClasses('md')}>`
- **DON'T**: `<div className="space-y-5">`

### 3. Usa Componenti Semantici
- **DO**: `<MetricCard title="Potenza" value="245W" />`
- **DON'T**: `<Card><div className="text-sm">Potenza</div><div className="text-2xl">245W</div></Card>`

### 4. Mantieni Consistenza nei Colori
- **DO**: Usa varianti semantiche (`primary`, `success`, `danger`)
- **DON'T**: Usa colori custom (`bg-red-400`, `text-green-500`)

### 5. Leverage TypeScript
- Il design system è completamente tipizzato
- Usa l'autocompletamento dell'IDE per le prop disponibili
- TypeScript ti avviserà di varianti non valide

### 6. Testa Responsiveness
- Tutti i componenti sono mobile-first
- Usa le utility responsive quando necessario
- Testa su diversi breakpoint

### 7. Documenta Deviazioni
- Se devi deviare dal design system, documenta il perché
- Considera se la deviazione dovrebbe diventare parte del sistema
- Evita hack CSS che bypassano il sistema

## 🔄 Migrazione Graduale

Per migrare il codice esistente:

1. **Identifica pattern ripetuti** nel codebase attuale
2. **Sostituisci gradualmente** con componenti del design system
3. **Rimuovi classi custom** non più necessarie  
4. **Testa accuratamente** ogni sostituzione
5. **Documenta nuovi pattern** se emergono esigenze non coperte

## 📝 Contributing

Quando aggiungi nuovi componenti o varianti:

1. Segui le convenzioni esistenti
2. Aggiungi tipizzazione completa
3. Documenta nuove prop e varianti
4. Aggiungi esempi di utilizzo
5. Testa su desktop e mobile

---

**Ricorda**: Il design system è un work-in-progress. Quando trovi inconsistenze o mancanze, contribuisci per migliorarlo! 🚀 