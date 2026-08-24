#!/usr/bin/env tsx
// Detecta claves huérfanas: usadas en t() pero no definidas en es.ts, y definidas pero no usadas
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC_DIR = 'src'
const LOCALES_DIR = 'src/locales'

function getFiles(dir: string, exts: string[]): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory() && entry !== 'node_modules' && !entry.startsWith('.')) {
      out.push(...getFiles(full, exts))
    } else if (exts.some(ext => entry.endsWith(ext))) {
      out.push(full)
    }
  }
  return out
}

function extractTKeys(content: string): string[] {
  const keys: string[] = []
  const regex = /t\(\s*['"`]([A-Za-z0-9_\.]+)['"`]\s*[,)]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(content))) {
    if (m[1].includes('.')) keys.push(m[1])
  }
  return keys
}

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return []
  const out: string[] = []
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && typeof v !== 'string') {
      out.push(...flattenKeys(v, path))
    } else {
      out.push(path)
    }
  }
  return out
}

async function main() {
  const files = getFiles(SRC_DIR, ['.ts', '.tsx']).filter(f => !f.includes('locales'))
  const usedSet = new Set<string>()
  const usedByFile = new Map<string, string[]>()
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const keys = extractTKeys(content)
    for (const k of keys) {
      usedSet.add(k)
      if (!usedByFile.has(k)) usedByFile.set(k, [])
      usedByFile.get(k)!.push(relative(process.cwd(), file))
    }
  }

  // Load es.ts via dynamic import (needs esm)
  const esMod = await import(`file://${process.cwd()}/${LOCALES_DIR}/es.ts`)
  const esKeys = new Set(flattenKeys(esMod.es))

  const orphans = [...usedSet].filter(k => !esKeys.has(k)).sort()
  const unused = [...esKeys].filter(k => !usedSet.has(k)).sort()

  console.log(`\n📊 Orphan check — ${usedSet.size} used, ${esKeys.size} defined in es.ts`)
  console.log(`❌ Usadas pero NO definidas (orphan, faltan en es.ts): ${orphans.length}`)
  for (const k of orphans.slice(0, 20)) {
    console.log(`  - ${k}  →  ${(usedByFile.get(k) || []).slice(0, 2).join(', ')}`)
  }
  if (orphans.length > 20) console.log(`  ... y ${orphans.length - 20} más`)

  console.log(`\n♻️  Definidas pero NO usadas (unused, candidatas @deprecated): ${unused.length}`)
  for (const k of unused.slice(0, 20)) {
    console.log(`  - ${k}`)
  }
  if (unused.length > 20) console.log(`  ... y ${unused.length - 20} más`)

  if (orphans.length > 0) {
    console.log(`\n💡 Sugerencia: añade las ${orphans.length} a es.ts y luego pnpm run i18n:sync`)
  }
  if (unused.length > 0) {
    console.log(`💡 Revisa las ${unused.length} no usadas antes de borrar — pueden ser para futuro o t(variable) dinámico`)
  }

  process.exit(orphans.length > 0 ? 1 : 0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
