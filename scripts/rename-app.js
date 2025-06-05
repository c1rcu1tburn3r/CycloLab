#!/usr/bin/env node

/**
 * Script di Rinominazione App CycloLab
 * 
 * Uso: node scripts/rename-app.js "NuovoNome" "nuovo-nome-package"
 * Esempio: node scripts/rename-app.js "SportAnalytics" "sport-analytics"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colori per output console
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class AppRenamer {
  constructor(newAppName, newPackageName) {
    this.oldAppName = 'CycloLab';
    this.oldPackageName = 'cyclolab';
    this.newAppName = newAppName;
    this.newPackageName = newPackageName;
    
    this.replacements = [
      // Nomi visualizzati
      { from: 'CycloLab', to: newAppName },
      { from: 'CYCLOLAB', to: newAppName.toUpperCase() },
      
      // Nomi package/variabili
      { from: 'cyclolab', to: newPackageName },
      { from: 'CycloLabToast', to: `${newAppName}Toast` },
      { from: 'CycloLabCache', to: `${newAppName}Cache` },
      { from: 'useCycloLab', to: `use${newAppName}` },
      
      // File names
      { from: 'cyclolab-toast', to: `${newPackageName}-toast` },
      { from: 'cyclolab-cache', to: `${newPackageName}-cache` },
    ];
    
    // File da processare
    this.filePatterns = [
      '**/*.{ts,tsx,js,jsx}',
      '**/*.{json,md}',
      'src/**/*',
      'docs/**/*',
      'scripts/**/*',
      '*.md',
      'package.json',
      'package-lock.json'
    ];
    
    // Esclusioni
    this.excludePatterns = [
      'node_modules/**',
      '.next/**',
      '.git/**',
      'dist/**',
      'build/**'
    ];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    this.log(`\n${colors.bold}${colors.cyan}━━━ ${message} ━━━${colors.reset}\n`);
  }

  // Trova tutti i file da processare
  findFiles() {
    this.log('🔍 Scansione file...', 'yellow');
    
    const glob = require('glob');
    let allFiles = [];
    
    this.filePatterns.forEach(pattern => {
      const files = glob.sync(pattern, { 
        ignore: this.excludePatterns,
        absolute: true 
      });
      allFiles = [...allFiles, ...files];
    });
    
    // Rimuovi duplicati e file non esistenti
    allFiles = [...new Set(allFiles)].filter(file => {
      try {
        return fs.statSync(file).isFile();
      } catch {
        return false;
      }
    });
    
    this.log(`✅ Trovati ${allFiles.length} file da processare`, 'green');
    return allFiles;
  }

  // Sostituisce testo in un file
  replaceInFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      this.replacements.forEach(({ from, to }) => {
        if (content.includes(from)) {
          content = content.replace(new RegExp(from, 'g'), to);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
      }
      
      return false;
    } catch (error) {
      this.log(`❌ Errore processando ${filePath}: ${error.message}`, 'red');
      return false;
    }
  }

  // Rinomina file se necessario
  renameFile(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    let newFileName = fileName;
    let renamed = false;
    
    this.replacements.forEach(({ from, to }) => {
      if (fileName.includes(from)) {
        newFileName = fileName.replace(new RegExp(from, 'g'), to);
        renamed = true;
      }
    });
    
    if (renamed) {
      const newFilePath = path.join(dirName, newFileName);
      try {
        fs.renameSync(filePath, newFilePath);
        this.log(`📝 Rinominato: ${fileName} → ${newFileName}`, 'blue');
        return newFilePath;
      } catch (error) {
        this.log(`❌ Errore rinominando ${fileName}: ${error.message}`, 'red');
        return filePath;
      }
    }
    
    return filePath;
  }

  // Processo principale
  async run() {
    this.logHeader(`Rinominazione App: ${this.oldAppName} → ${this.newAppName}`);
    
    // Validazione input
    if (!this.newAppName || !this.newPackageName) {
      this.log('❌ Errore: Nome app e package name sono obbligatori', 'red');
      this.log('Uso: node scripts/rename-app.js "NuovoNome" "nuovo-nome-package"', 'yellow');
      process.exit(1);
    }
    
    this.log(`📱 Nome App: ${this.oldAppName} → ${this.newAppName}`, 'cyan');
    this.log(`📦 Package: ${this.oldPackageName} → ${this.newPackageName}`, 'cyan');
    
    // Conferma dall'utente
    this.log('\n⚠️  ATTENZIONE: Questa operazione modificherà molti file!', 'yellow');
    this.log('Assicurati di aver fatto un backup o di avere tutto commitato in Git.', 'yellow');
    
    // Trova tutti i file
    const files = this.findFiles();
    
    if (files.length === 0) {
      this.log('❌ Nessun file trovato da processare', 'red');
      return;
    }
    
    // Fase 1: Sostituzioni contenuto
    this.logHeader('Fase 1: Sostituzione Contenuto File');
    let modifiedFiles = 0;
    
    files.forEach(filePath => {
      if (this.replaceInFile(filePath)) {
        modifiedFiles++;
        this.log(`✅ Modificato: ${path.relative(process.cwd(), filePath)}`, 'green');
      }
    });
    
    this.log(`\n📊 File modificati: ${modifiedFiles}/${files.length}`, 'cyan');
    
    // Fase 2: Rinominazione file
    this.logHeader('Fase 2: Rinominazione File');
    let renamedFiles = 0;
    
    files.forEach(filePath => {
      const newPath = this.renameFile(filePath);
      if (newPath !== filePath) {
        renamedFiles++;
      }
    });
    
    this.log(`\n📊 File rinominati: ${renamedFiles}`, 'cyan');
    
    // Fase 3: Aggiornamenti speciali
    this.logHeader('Fase 3: Aggiornamenti Finali');
    
    try {
      // Pulisci cache Next.js
      this.log('🧹 Pulizia cache Next.js...', 'yellow');
      if (fs.existsSync('.next')) {
        fs.rmSync('.next', { recursive: true, force: true });
      }
      
      // Reinstalla dipendenze se package.json è cambiato
      this.log('📦 Reinstallazione dipendenze...', 'yellow');
      execSync('npm install', { stdio: 'inherit' });
      
      this.log('✅ Aggiornamenti completati', 'green');
      
    } catch (error) {
      this.log(`⚠️  Warning: ${error.message}`, 'yellow');
    }
    
    // Riepilogo finale
    this.logHeader('🎉 Rinominazione Completata!');
    
    this.log(`✅ App rinominata da "${this.oldAppName}" a "${this.newAppName}"`, 'green');
    this.log(`✅ Package rinominato da "${this.oldPackageName}" a "${this.newPackageName}"`, 'green');
    this.log(`✅ ${modifiedFiles} file modificati`, 'green');
    this.log(`✅ ${renamedFiles} file rinominati`, 'green');
    
    this.log('\n📋 Prossimi passi manuali:', 'cyan');
    this.log('1. Verifica che tutto compili: npm run build', 'blue');
    this.log('2. Testa l\'applicazione: npm run dev', 'blue');
    this.log('3. Aggiorna favicon e logo se necessario', 'blue');
    this.log('4. Committa le modifiche in Git', 'blue');
    
    // Test build automatico
    this.log('\n🔨 Test build automatico...', 'yellow');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      this.log('✅ Build riuscita! L\'app è pronta.', 'green');
    } catch (error) {
      this.log('❌ Build fallita. Controlla gli errori sopra.', 'red');
      this.log('Potrebbero esserci riferimenti mancati da aggiornare manualmente.', 'yellow');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const newAppName = args[0];
  const newPackageName = args[1];
  
  if (!newAppName || !newPackageName) {
    console.log(`${colors.red}❌ Errore: Parametri mancanti${colors.reset}`);
    console.log(`${colors.yellow}Uso: node scripts/rename-app.js "NuovoNome" "nuovo-nome-package"${colors.reset}`);
    console.log(`${colors.yellow}Esempio: node scripts/rename-app.js "SportAnalytics" "sport-analytics"${colors.reset}`);
    process.exit(1);
  }
  
  const renamer = new AppRenamer(newAppName, newPackageName);
  await renamer.run();
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AppRenamer; 