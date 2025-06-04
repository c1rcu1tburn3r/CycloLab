#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script di migrazione automatica per il Design System CycloLab
 * 
 * Questo script analizza i file .tsx e suggerisce/applica sostituzioni
 * per migrare dal vecchio sistema di stili al design system.
 */

// Colori per output console
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Pattern di migrazione
const migrationPatterns = [
  {
    name: 'stats-card → Card',
    pattern: /className="([^"]*\s*)?stats-card(\s+[^"]*)?"([^>]*>)/g,
    suggestion: 'Sostituire con <Card variant="default">',
    autoFix: false
  },
  {
    name: 'Metric cards inline',
    pattern: /className="bg-(blue|emerald|amber|red|purple)-50\/50\s+dark:bg-\1-900\/30\s+rounded-xl\s+p-[34]\s+text-center(\s+stats-card)?"/g,
    suggestion: 'Sostituire con <MetricCard accent="$1">',
    autoFix: false
  },
  {
    name: 'Spacing inconsistente',
    pattern: /(p-[3-8]|gap-[3-8]|mb-[4-8])/g,
    suggestion: 'Usare design tokens: spacing.sm, spacing.md, spacing.lg',
    autoFix: false
  },
  {
    name: 'Border radius hardcoded',
    pattern: /rounded-(xl|2xl|lg)/g,
    suggestion: 'Usare Card radius prop',
    autoFix: false
  },
  {
    name: 'Grid layout custom',
    pattern: /className="grid\s+grid-cols-(\d+)(\s+md:grid-cols-(\d+))?\s+gap-[3-8]"/g,
    suggestion: 'Usare getGridClasses() utility',
    autoFix: false
  }
];

// Funzione per trovare file recursivamente
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  const files = [];
  
  function walkDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignora errori di permessi
    }
  }
  
  walkDir(dir);
  return files;
}

// Import statements da aggiungere
const requiredImports = {
  'design-system': [
    'Card', 'CardContent', 'CardHeader', 'CardFooter', 'CardTitle', 'CardDescription',
    'MetricCard', 'Button', 'ButtonGroup', 'getGridClasses', 'cn', 'spacing', 'layoutSystem'
  ]
};

class StyleMigrator {
  constructor() {
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      filesWithIssues: 0,
      patterns: {}
    };
    
    migrationPatterns.forEach(pattern => {
      this.stats.patterns[pattern.name] = 0;
    });
  }

  async scanProject() {
    console.log(`${colors.cyan}🔍 Scansione progetto per problemi di stile...${colors.reset}\n`);

    const files = findFiles('./src');
    
    for (const file of files) {
      await this.analyzeFile(file);
    }

    this.printReport();
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = this.findIssues(content, filePath);
      
      this.stats.filesScanned++;
      
      if (issues.length > 0) {
        this.stats.filesWithIssues++;
        this.stats.issuesFound += issues.length;
        
        console.log(`${colors.yellow}📁 ${filePath}${colors.reset}`);
        issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${colors.red}${issue.type}${colors.reset} (Linea ${issue.line})`);
          console.log(`     ${colors.blue}Trovato:${colors.reset} ${issue.found}`);
          console.log(`     ${colors.green}Suggerimento:${colors.reset} ${issue.suggestion}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error(`${colors.red}❌ Errore analizzando ${filePath}: ${error.message}${colors.reset}`);
    }
  }

  findIssues(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    migrationPatterns.forEach(pattern => {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        issues.push({
          type: pattern.name,
          line: lineNumber,
          found: match[0].length > 100 ? match[0].substring(0, 100) + '...' : match[0],
          suggestion: pattern.suggestion,
          canAutoFix: pattern.autoFix
        });

        this.stats.patterns[pattern.name]++;
      }
    });

    // Controlla se mancano import design system
    if (content.includes('stats-card') || content.includes('bg-blue-50/50')) {
      if (!content.includes("from '@/components/design-system'")) {
        issues.push({
          type: 'Import mancanti',
          line: 1,
          found: 'Design system components usati senza import',
          suggestion: "Aggiungere: import { Card, MetricCard, ... } from '@/components/design-system'",
          canAutoFix: true
        });
      }
    }

    return issues;
  }

  async generateMigrationPlan() {
    console.log(`${colors.magenta}📋 Generazione piano di migrazione...${colors.reset}\n`);

    const plan = {
      timestamp: new Date().toISOString(),
      totalFiles: this.stats.filesScanned,
      filesNeedingMigration: this.stats.filesWithIssues,
      estimatedHours: Math.ceil(this.stats.issuesFound * 0.1), // 6 minuti per issue
      phases: [
        {
          name: 'Fase 1: Componenti Core',
          priority: 'Alta',
          files: [
            'src/components/AthleteCard.tsx',
            'src/components/AthleteSummaryCard.tsx',
            'src/components/LoadingSkeleton.tsx'
          ],
          estimatedHours: 4
        },
        {
          name: 'Fase 2: Pagine Dashboard',
          priority: 'Alta',
          files: [
            'src/app/page.tsx',
            'src/app/athletes/page.tsx',
            'src/app/activities/ActivitiesClientManager.tsx'
          ],
          estimatedHours: 8
        },
        {
          name: 'Fase 3: Form e Settings',
          priority: 'Media',
          files: [
            'src/app/account/settings/**/*.tsx',
            'src/components/AthleteForm.tsx',
            'src/components/ActivityUploadForm.tsx'
          ],
          estimatedHours: 12
        }
      ]
    };

    fs.writeFileSync(
      'migration-plan.json',
      JSON.stringify(plan, null, 2)
    );

    console.log(`${colors.green}✅ Piano salvato in: migration-plan.json${colors.reset}`);
    return plan;
  }

  printReport() {
    console.log(`\n${colors.cyan}📊 REPORT MIGRAZIONE${colors.reset}`);
    console.log(`${colors.white}═══════════════════════════════════════${colors.reset}\n`);
    
    console.log(`📁 File scansionati: ${colors.white}${this.stats.filesScanned}${colors.reset}`);
    console.log(`🚨 File con problemi: ${colors.yellow}${this.stats.filesWithIssues}${colors.reset}`);
    console.log(`🔍 Problemi totali: ${colors.red}${this.stats.issuesFound}${colors.reset}\n`);

    console.log(`${colors.blue}📋 Breakdown per pattern:${colors.reset}`);
    Object.entries(this.stats.patterns).forEach(([pattern, count]) => {
      if (count > 0) {
        console.log(`  • ${pattern}: ${colors.yellow}${count}${colors.reset} occorrenze`);
      }
    });

    const urgency = this.getUrgencyLevel();
    console.log(`\n${colors.magenta}🎯 Livello di urgenza: ${urgency.color}${urgency.level}${colors.reset}`);
    console.log(`${colors.white}💡 ${urgency.recommendation}${colors.reset}\n`);
  }

  getUrgencyLevel() {
    const issueRatio = this.stats.issuesFound / this.stats.filesScanned;
    
    if (issueRatio > 5) {
      return {
        level: 'CRITICO',
        color: colors.red,
        recommendation: 'Iniziare migrazione immediatamente. Troppi stili inconsistenti.'
      };
    } else if (issueRatio > 2) {
      return {
        level: 'ALTO',
        color: colors.yellow,
        recommendation: 'Pianificare migrazione entro 1-2 settimane.'
      };
    } else {
      return {
        level: 'MEDIO',
        color: colors.green,
        recommendation: 'Migrazione graduale durante lo sviluppo normale.'
      };
    }
  }

  async createMigrationExample(filePath) {
    console.log(`${colors.cyan}📝 Creazione esempio di migrazione per: ${filePath}${colors.reset}\n`);

    if (!fs.existsSync(filePath)) {
      console.error(`${colors.red}❌ File non trovato: ${filePath}${colors.reset}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const migratedContent = this.applyBasicMigrations(content);

    const examplePath = filePath.replace('.tsx', '.migrated.tsx');
    fs.writeFileSync(examplePath, migratedContent);

    console.log(`${colors.green}✅ Esempio creato: ${examplePath}${colors.reset}`);
    console.log(`${colors.blue}💡 Confronta i file per vedere le modifiche suggerite${colors.reset}`);
  }

  applyBasicMigrations(content) {
    let migrated = content;

    // Aggiungi import se necessario
    if (!migrated.includes("from '@/components/design-system'")) {
      const importLine = "import { Card, CardContent, CardHeader, CardTitle, CardDescription, MetricCard, Button, getGridClasses, cn } from '@/components/design-system';\n";
      migrated = migrated.replace(
        /(import.*?from\s+['"][^'"]+['"];\s*\n)/,
        `$1${importLine}`
      );
    }

    // Sostituzioni di base
    migrated = migrated
      .replace(/className="([^"]*\s*)?stats-card(\s+[^"]*)?"/g, 'className="$1$2"')
      .replace(/bg-blue-50\/50\s+dark:bg-blue-900\/30\s+rounded-xl\s+p-4\s+text-center/g, 'metric-card-blue')
      .replace(/bg-emerald-50\/50\s+dark:bg-emerald-900\/30\s+rounded-xl\s+p-4\s+text-center/g, 'metric-card-emerald')
      .replace(/bg-amber-50\/50\s+dark:bg-amber-900\/30\s+rounded-xl\s+p-4\s+text-center/g, 'metric-card-amber')
      .replace(/bg-purple-50\/50\s+dark:bg-purple-900\/30\s+rounded-xl\s+p-4\s+text-center/g, 'metric-card-purple');

    // Aggiungi commenti con suggerimenti
    migrated = `// 🚨 MIGRAZIONE AUTOMATICA - RIVEDERE MANUALMENTE\n// Sostituire metric-card-* con <MetricCard accent="color" />\n// Sostituire <div> cards con <Card variant="..." />\n\n${migrated}`;

    return migrated;
  }
}

// Funzioni CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const migrator = new StyleMigrator();

  switch (command) {
    case 'scan':
      await migrator.scanProject();
      break;
      
    case 'plan':
      await migrator.scanProject();
      await migrator.generateMigrationPlan();
      break;
      
    case 'example':
      const filePath = args[1];
      if (!filePath) {
        console.error(`${colors.red}❌ Specificare il path del file: npm run migrate:example <file>${colors.reset}`);
        process.exit(1);
      }
      await migrator.createMigrationExample(filePath);
      break;
      
    default:
      console.log(`${colors.cyan}🚀 CycloLab Design System Migration Tool${colors.reset}\n`);
      console.log('Comandi disponibili:');
      console.log(`  ${colors.green}scan${colors.reset}     - Scansiona il progetto per trovare problemi di stile`);
      console.log(`  ${colors.green}plan${colors.reset}     - Genera un piano di migrazione dettagliato`);
      console.log(`  ${colors.green}example${colors.reset}  - Crea un esempio di migrazione per un file specifico`);
      console.log('\nEsempi:');
      console.log(`  ${colors.blue}node scripts/migrate-styles.js scan${colors.reset}`);
      console.log(`  ${colors.blue}node scripts/migrate-styles.js plan${colors.reset}`);
      console.log(`  ${colors.blue}node scripts/migrate-styles.js example src/components/AthleteCard.tsx${colors.reset}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { StyleMigrator }; 