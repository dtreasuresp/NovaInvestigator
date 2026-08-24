#!/usr/bin/env node
/**
 * Auto-migración de strings hardcodeadas a t() keys
 * Lee audit + diccionario, genera patches para archivos TSX
 */

const fs = require('fs');
const path = require('path');

// ============ CONFIGURACIÓN ============
const AUDIT_FILE = 'audit-results.txt';
const ES_LOCALE = 'src/locales/es.ts';
const DRY_RUN = false; // true = solo muestra cambios, false = aplica

// ============ 1. PARSEAR AUDIT ============
function parseAudit() {
  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  let currentFile = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detectar archivo
    const fileMatch = line.match(/^📁\s+(.+?)\s+\((\d+)\s+textos? pendientes?\)/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    // Detectar jsx-text: L265 [jsx-text]: "Texto"
    const textMatch = line.match(/^L(\d+)\s+\[jsx-text\]:\s+"(.+)"/);
    if (textMatch && currentFile) {
      entries.push({
        file: currentFile,
        line: parseInt(textMatch[1]),
        text: textMatch[2],
        type: 'jsx-text'
      });
      continue;
    }

    // Detectar prop: L419 [prop:placeholder]: "texto"
    const propMatch = line.match(/^L(\d+)\s+\[prop:([a-zA-Z-]+)\]:\s+"(.+)"/);
    if (propMatch && currentFile) {
      entries.push({
        file: currentFile,
        line: parseInt(propMatch[1]),
        prop: propMatch[2],
        text: propMatch[3],
        type: 'jsx-prop'
      });
      continue;
    }
  }

  console.log(`📊 Audit parseado: ${entries.length} entradas en ${new Set(entries.map(e => e.file)).size} archivos`);
  return entries;
}

// ============ 2. CARGAR DICCIONARIO ES (texto -> key) ============
function loadDictionary() {
  const content = fs.readFileSync(ES_LOCALE, 'utf8');

  // Extraer la parte de valores (después de "export const es:")
  // Buscar el objeto es = { ... }
  const esMatch = content.match(/export const es:\s*TranslationSchema\s*=\s*(\{[\s\S]*?\})\s*export default/);
  if (!esMatch) {
    throw new Error('No se encontró el objeto es en el locale');
  }

  // Evaluar el objeto de forma segura (es TypeScript, no JSON puro)
  // Usaremos regex para extraer key: 'value' pairs
  const dict = {};
  const esObjectStr = esMatch[1];

  // Regex para encontrar "key: 'value'" o 'key: "value"'
  // Maneja keys con puntos (investigator.dafoDominant) pero en el objeto están anidados
  // Mejor: parsear recursivamente el objeto

  // Enfoque más robusto: usar Function constructor para evaluar
  // Pero el objeto tiene interpolación {count}, etc. Vamos a extraer manualmente

  // Buscar todas las líneas tipo "    key: 'value'," o '    key: "value",'
  const lines = esObjectStr.split('\n');
  let currentPath = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detectar inicio de objeto anidado: "investigator: {"
    const objStart = trimmed.match(/^(\w+):\s*\{$/);
    if (objStart) {
      currentPath.push(objStart[1]);
      continue;
    }

    // Detectar fin de objeto: "  },"
    if (trimmed === '},' || trimmed === '}') {
      currentPath.pop();
      continue;
    }

    // Detectar key-value: "key: 'value'," o 'key: "value",'
    const kvMatch = trimmed.match(/^([\w]+):\s*["'](.+)["'],\s*$/);
    if (kvMatch && currentPath.length > 0) {
      const fullKey = [...currentPath, kvMatch[1]].join('.');
      const value = kvMatch[2];
      dict[value] = fullKey;
    }
  }

  console.log(`📚 Diccionario cargado: ${Object.keys(dict).length} entradas (texto -> key)`);
  return dict;
}

// ============ 3. MATCH STRINGS A KEYS ============
function matchEntries(entries, dict) {
  const matches = [];
  const noMatch = [];

  for (const entry of entries) {
    const text = entry.text.trim();

    // 1. Match exacto
    if (dict[text]) {
      matches.push({ ...entry, key: dict[text], matchType: 'exact' });
      continue;
    }

    // 2. Match ignorando mayúsculas/minúsculas
    const lowerText = text.toLowerCase();
    const lowerDict = {};
    for (const [k, v] of Object.entries(dict)) {
      lowerDict[k.toLowerCase()] = v;
    }
    if (lowerDict[lowerText]) {
      matches.push({ ...entry, key: lowerDict[lowerText], matchType: 'case-insensitive' });
      continue;
    }

    // 3. Match parcial (el texto contiene la key o viceversa)
    // Buscar key cuyo value esté contenido en el texto o viceversa
    let partialMatch = null;
    for (const [dictText, dictKey] of Object.entries(dict)) {
      if (text.includes(dictText) || dictText.includes(text)) {
        if (!partialMatch || dictText.length > partialMatch.text.length) {
          partialMatch = { text: dictText, key: dictKey };
        }
      }
    }
    if (partialMatch) {
      matches.push({ ...entry, key: partialMatch.key, matchType: 'partial', matchedText: partialMatch.text });
      continue;
    }

    noMatch.push(entry);
  }

  console.log(`✅ Matches exactos: ${matches.filter(m => m.matchType === 'exact').length}`);
  console.log(`✅ Matches case-insensitive: ${matches.filter(m => m.matchType === 'case-insensitive').length}`);
  console.log(`✅ Matches parciales: ${matches.filter(m => m.matchType === 'partial').length}`);
  console.log(`❌ Sin match: ${noMatch.length}`);

  return { matches, noMatch };
}

// ============ 4. GENERAR PATCHES ============
function generatePatches(matches) {
  // Agrupar por archivo
  const byFile = {};
  for (const m of matches) {
    if (!byFile[m.file]) byFile[m.file] = [];
    byFile[m.file].push(m);
  }

  const patches = {};

  for (const [file, fileMatches] of Object.entries(byFile)) {
    // Ordenar por línea descendente para no romper offsets
    fileMatches.sort((a, b) => b.line - a.line);

    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Archivo no existe: ${file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    for (const match of fileMatches) {
      const lineIdx = match.line - 1; // 0-based
      if (lineIdx < 0 || lineIdx >= lines.length) {
        console.warn(`⚠️ Línea fuera de rango: ${file}:${match.line}`);
        continue;
      }

      let line = lines[lineIdx];
      const originalLine = line;

      if (match.type === 'jsx-text') {
        // Reemplazar texto entre > y <
        // Pattern: >Texto<
        const escapedText = match.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(>)${escapedText}(<)`);
        if (regex.test(line)) {
          line = line.replace(regex, `>{t('${match.key}')}$2`);
          modified = true;
        }
      } else if (match.type === 'jsx-prop') {
        // Reemplazar prop="Texto" o prop={'Texto'}
        const escapedText = match.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // prop="Texto"
        const regex1 = new RegExp(`(${match.prop}=)["']${escapedText}["']`);
        // prop={'Texto'}
        const regex2 = new RegExp(`(${match.prop}=)\\{['"]${escapedText}['"]\\}`);

        if (regex1.test(line)) {
          line = line.replace(regex1, `$1{t('${match.key}')}`);
          modified = true;
        } else if (regex2.test(line)) {
          line = line.replace(regex2, `$1{t('${match.key}')}`);
          modified = true;
        }
      }

      if (line !== originalLine) {
        lines[lineIdx] = line;
      }
    }

    if (modified) {
      patches[file] = lines.join('\n');
    }
  }

  return patches;
}

// ============ 5. APLICAR / MOSTRAR ============
function applyPatches(patches) {
  let applied = 0;

  for (const [file, newContent] of Object.entries(patches)) {
    const filePath = path.join(process.cwd(), file);

    if (DRY_RUN) {
      console.log(`\n📝 [DRY RUN] ${file}:`);
      const original = fs.readFileSync(filePath, 'utf8');
      const origLines = original.split('\n');
      const newLines = newContent.split('\n');

      // Mostrar diff simple
      for (let i = 0; i < Math.max(origLines.length, newLines.length); i++) {
        if (origLines[i] !== newLines[i]) {
          console.log(`  - ${origLines[i]?.trim() || '(empty)'}`);
          console.log(`  + ${newLines[i]?.trim() || '(empty)'}`);
        }
      }
    } else {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Aplicado: ${file}`);
      applied++;
    }
  }

  console.log(`\n${DRY_RUN ? '🔍 Dry run completado' : '✅ Migración completada'}: ${applied} archivos modificados`);
}

// ============ MAIN ============
async function main() {
  console.log('🚀 Iniciando auto-migración i18n...\n');

  // 1. Parsear audit
  const entries = parseAudit();

  // 2. Cargar diccionario
  const dict = loadDictionary();

  // 3. Match
  const { matches, noMatch } = matchEntries(entries, dict);

  // 4. Generar patches
  const patches = generatePatches(matches);

  console.log(`\n📦 Patches generados para ${Object.keys(patches).length} archivos`);

  // 5. Mostrar resumen por archivo
  for (const [file, _] of Object.entries(patches)) {
    const fileMatches = matches.filter(m => m.file === file);
    console.log(`  ${file}: ${fileMatches.length} reemplazos`);
  }

  // 6. Mostrar algunos sin match (para revisar)
  if (noMatch.length > 0) {
    console.log(`\n❌ Strings sin match (${noMatch.length}):`);
    const byFile = {};
    for (const m of noMatch) {
      if (!byFile[m.file]) byFile[m.file] = [];
      byFile[m.file].push(m.text);
    }
    for (const [file, texts] of Object.entries(byFile).slice(0, 10)) {
      console.log(`  ${file}: ${texts.slice(0, 5).join('; ')}${texts.length > 5 ? '...' : ''}`);
    }
  }

  // 7. Aplicar
  if (!DRY_RUN) {
    console.log('\n⚠️  Aplicando cambios en 3 segundos... (Ctrl+C para cancelar)');
    await new Promise(r => setTimeout(r, 3000));
  }

  applyPatches(patches);

  if (DRY_RUN) {
    console.log('\n💡 Para aplicar realmente, cambia DRY_RUN = false al inicio del script');
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});