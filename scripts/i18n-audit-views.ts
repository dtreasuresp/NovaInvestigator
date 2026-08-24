import fs from 'node:fs'
import path from 'node:path'

interface UntranslatedMatch {
  file: string
  line: number
  text: string
  type: 'jsx-text' | 'jsx-prop'
  propName?: string
}

const TARGET_DIRS = [
  path.join(process.cwd(), 'src', 'views'),
  path.join(process.cwd(), 'src', 'components', 'layout'),
  path.join(process.cwd(), 'src', 'components', 'shared')
]

// Common props that contain user-facing text
const TARGET_PROPS = new Set([
  'placeholder',
  'title',
  'aria-label',
  'description',
  'label',
  'alt',
  'helperText',
  'emptyText',
  'fallback'
])

// Props that should definitely NOT be flagged as user-facing text
const IGNORED_PROPS = new Set([
  'className',
  'class',
  'id',
  'key',
  'variant',
  'size',
  'type',
  'href',
  'src',
  'value',
  'name',
  'autoComplete',
  'role',
  'target',
  'rel',
  'as',
  'align',
  'side',
  'data-state',
  'data-slot',
  'orientation',
  'fill',
  'stroke',
  'strokeWidth',
  'd'
])

const TECHNICAL_OR_BRAND_TOKENS = new Set([
  'NovaStore',
  'NovaStore ERP',
  'Promise',
  'WebP',
  'QR',
  'INV',
  'EFI',
  'EFE',
  'DAFO',
  'QSPM',
  'CAME',
  'EUR',
  'USD',
  'CLP',
  'Total:',
  'Ponderación:',
  'EFI:',
  'EFE:',
  'onChange',
  'onBlur',
  'onSubmit',
  'onTouched',
  'Stripe Price ID',
  'price_1N...'
])

function isIgnoredString(raw: string): boolean {
  const str = raw.trim()

  if (!str) return true
  if (str.length <= 1) return true
  if (TECHNICAL_OR_BRAND_TOKENS.has(str)) return true

  // Ignore numbers, percentages, and currencies
  if (/^[\d.,%$€£¥+-]+$/.test(str)) return true

  // Ignore emails or sample handles
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) return true

  // Ignore single words that are technical identifiers, CSS values, routes, or URLs
  if (/^(http|https|\/|\.|#|flex|grid|hidden|block|inline|size-|w-|h-|p-|m-|text-|bg-|border-)/.test(str)) return true

  // Ignore common technical non-translatable values
  if (/^(submit|button|reset|text|email|password|number|search|tel|url|date|checkbox|radio|file)$/.test(str)) return true
  if (/^(true|false|null|undefined|auto|inherit|initial|none|outline|default|ghost|destructive|secondary|link)$/.test(str)) return true

  // Ignore code identifiers without spaces or uppercase CamelCase component names
  if (/^[A-Z][a-zA-Z0-9]+Icon$/.test(str)) return true
  
  // Ignore punctuation/symbols
  if (/^[-_—/\\|•:;,.<>()\[\]{}#@&!*?+=%]+$/.test(str)) return true

  // Ignore JavaScript ternary and logical expression fragments
  if (/(\&\&|\|\||\?|===|!==|=>|\$\{)/.test(str)) return true
  if (/^(=|>|<|>=|<=|\+|-|\*|\/)/.test(str)) return true
  if (/(\):\s*ColumnDef|\bColumnDef\b|\bReact\b|\bJSX\b)/.test(str)) return true

  return false
}

function scanFile(filePath: string): UntranslatedMatch[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const matches: UntranslatedMatch[] = []

  // Track if we are inside a multiline comment or interface/type block
  let inBlockComment = false
  let inTypeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1

    let line = lines[i].trim()

    if (!line) continue

    // Handle block comments
    if (line.includes('/*')) inBlockComment = true

    if (line.includes('*/')) {
      inBlockComment = false
      continue
    }

    if (inBlockComment || line.startsWith('//')) continue

    // Handle interface / type definitions
    if (/^(export\s+)?(interface|type)\s+[A-Za-z0-9_]+/.test(line)) {
      if (!line.includes('}')) inTypeBlock = true
      continue
    }
    
    if (inTypeBlock) {
      if (line.includes('}')) inTypeBlock = false
      continue
    }

    // 1. Scan JSX prop literals: prop="Some Text" or prop={'Some Text'}
    const propRegex = /([a-zA-Z0-9_-]+)=(?:"([^"]+)"|'([^']+)'|\{['"`]([^'"`]+)['"`]\})/g
    let propMatch: RegExpExecArray | null

    while ((propMatch = propRegex.exec(line)) !== null) {
      const propName = propMatch[1]
      const propValue = propMatch[2] ?? propMatch[3] ?? propMatch[4]

      if (TARGET_PROPS.has(propName) && propValue && !isIgnoredString(propValue)) {
        // Ensure it's not a t() call inside prop
        if (!line.includes(`t('`) && !line.includes(`t("`)) {
          matches.push({
            file: filePath,
            line: lineNumber,
            text: propValue.trim(),
            type: 'jsx-prop',
            propName
          })
        }
      }
    }

    // 2. Scan JSX Text: >Some Plain English/Spanish Text<
    // Matches content between > and <
    const jsxTextRegex = />\s*([^<>{}]+?)\s*</g
    let textMatch: RegExpExecArray | null

    while ((textMatch = jsxTextRegex.exec(line)) !== null) {
      const text = textMatch[1].trim()

      if (text && !isIgnoredString(text)) {
        // Exclude lines with t() or comments or template interpolation
        if (!line.includes(`t('`) && !line.includes(`t("`) && !text.startsWith('//') && !text.startsWith('/*')) {
          matches.push({
            file: filePath,
            line: lineNumber,
            text,
            type: 'jsx-text'
          })
        }
      }
    }
  }

  return matches
}

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        getFilesRecursively(fullPath, fileList)
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
      fileList.push(fullPath)
    }
  }

  return fileList
}

export function runAudit(): { total: number; byFile: Record<string, UntranslatedMatch[]> } {
  const allFiles = TARGET_DIRS.flatMap(dir => getFilesRecursively(dir))
  const allMatches: UntranslatedMatch[] = []
  const byFile: Record<string, UntranslatedMatch[]> = {}

  for (const file of allFiles) {
    const matches = scanFile(file)

    if (matches.length > 0) {
      const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/')

      byFile[relPath] = matches
      allMatches.push(...matches)
    }
  }

  console.log(`\n🔍 [i18n-audit] Escaneo de vistas y componentes completado:`)
  console.log(`   Archivos analizados: ${allFiles.length}`)
  console.log(`   Archivos con textos pendientes: ${Object.keys(byFile).length}`)
  console.log(`   Total de cadenas sin traducir detectadas: ${allMatches.length}\n`)

  if (allMatches.length > 0) {
    console.log(`📋 Detalle de textos pendientes por archivo:\n`)

    for (const [file, matches] of Object.entries(byFile)) {
      console.log(`📁 ${file} (${matches.length} textos pendientes):`)

      for (const match of matches.slice(0, 15)) {
        const prefix = match.type === 'jsx-prop' ? `[prop:${match.propName}]` : `[jsx-text]`

        console.log(`   L${match.line} ${prefix}: "${match.text}"`)
      }

      if (matches.length > 15) {
        console.log(`   ... y ${matches.length - 15} más en este archivo.\n`)
      } else {
        console.log('')
      }
    }
  } else {
    console.log(`✅ ¡Felicidades! Todos los componentes y vistas analizados utilizan el sistema de internacionalización useI18n / t().\n`)
  }

  return { total: allMatches.length, byFile }
}

if (process.argv[1]?.includes('i18n-audit-views')) {
  runAudit()
}
