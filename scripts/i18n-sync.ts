#!/usr/bin/env tsx
/**
 * Automated i18n Translation & Synchronization Pipeline
 * 
 * Compares src/locales/es.ts (Single Source of Truth) against
 * en.ts, de.ts, pt.ts, ko.ts and uses Google Gemini API to translate missing keys.
 * 
 * Usage:
 *   pnpm exec tsx scripts/i18n-sync.ts         # Sync & Translate missing keys via Gemini
 *   pnpm exec tsx scripts/i18n-sync.ts --check # Check dictionary completeness (CI mode)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

// Load .env.local manually if not in environment
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}

loadEnv()

const LOCALES_DIR = path.resolve(process.cwd(), 'src/locales')
const TARGET_LANGS = [
  { code: 'en', name: 'English', bcp47: 'en-US' },
  { code: 'de', name: 'German', bcp47: 'de-DE' },
  { code: 'pt', name: 'Portuguese', bcp47: 'pt-BR' },
  { code: 'ko', name: 'Korean', bcp47: 'ko-KR' }
]

const DOMAIN_PROMPT = `Eres un traductor experto en software empresarial SaaS ERP y formulación estratégica metodológica (matrices DAFO/SWOT, EFI/IFE, EFE, QSPM y CAME/TOWS de Fred R. David).
Traduce el siguiente objeto JSON de claves de interfaz desde Español hacia el idioma solicitado.

Reglas críticas:
1. Respeta fielmente la terminología académica de gestión estratégica (SWOT, IFE, EFE, QSPM, TOWS/CAME, AS, TAS).
2. Conserva intactas las variables de interpolación como {name}, {count}, {item}, etc.
3. Devuelve ÚNICAMENTE un objeto JSON válido con exactamente la misma estructura de claves anidadas que el input.
4. No incluyas explicaciones ni bloques de markdown adicionales.`

async function listAvailableModels(apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    if (res.ok) {
      const data = await res.json()
      const models = data?.models?.map((m: any) => m.name.replace('models/', '')) || []
      console.log('📋 [i18n-sync] Modelos disponibles para tu clave de API:', models.slice(0, 10))
      return models
    } else {
      const err = await res.text()
      console.warn('⚠️ [i18n-sync] No se pudo listar modelos:', err.slice(0, 150))
    }
  } catch (e) {
    console.warn('⚠️ [i18n-sync] Error listando modelos:', e)
  }
  return []
}

async function callGemini(apiKey: string, targetLangName: string, jsonToTranslate: object, availableModels: string[]): Promise<object | null> {
  const filtered = availableModels.filter(m => 
    !m.includes('tts') && 
    !m.includes('embedding') && 
    !m.includes('aqa') && 
    !m.includes('imagen') &&
    !m.includes('image')
  )

  // Prioritize aliases that are actively supported
  const prioritized = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash-lite',
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
    ...filtered
  ]

  const candidateModels = Array.from(new Set(prioritized))

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${DOMAIN_PROMPT}\n\nIdioma destino: ${targetLangName}\n\nJSON a traducir:\n${JSON.stringify(jsonToTranslate, null, 2)}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) {
          console.log(`✨ [i18n-sync] Traducción para ${targetLangName} exitosa usando modelo: ${model}`)
          return JSON.parse(rawText)
        }
      } else {
        const errorText = await response.text()
        console.warn(`[i18n-sync] Model ${model} returned ${response.status}: ${errorText.slice(0, 100)}... Trying next model...`)
      }
    } catch (err) {
      console.warn(`[i18n-sync] Network error with ${model}:`, err)
    }
  }

  console.error(`❌ Could not generate translation for ${targetLangName} across all candidate Gemini models.`)
  return null
}

// Deep diff finder: returns keys in base that are missing in target
function findMissingKeys(base: any, target: any): any {
  const missing: any = {}
  let hasMissing = false

  for (const key of Object.keys(base)) {
    if (!(key in target) || target[key] === '' || target[key] == null) {
      missing[key] = base[key]
      hasMissing = true
    } else if (typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
      const nested = findMissingKeys(base[key], target[key] || {})
      if (Object.keys(nested).length > 0) {
        missing[key] = nested
        hasMissing = true
      }
    }
  }

  return hasMissing ? missing : {}
}

// Deep merge
function deepMerge(target: any, source: any): any {
  const output = { ...target }
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key])
    } else {
      output[key] = source[key]
    }
  }
  return output
}

async function main() {
  const isCheckMode = process.argv.includes('--check')
  const apiKey = process.env.GEMINI_API_KEY

  console.log('🌐 [i18n-sync] Iniciando verificación del catálogo de traducciones...')

  const availableModels = apiKey ? await listAvailableModels(apiKey) : []

  // Import base dictionary
  const esUrl = pathToFileURL(path.join(LOCALES_DIR, 'es.ts')).href
  const { es } = await import(esUrl)
  if (!es) {
    console.error('❌ Error: No se pudo cargar src/locales/es.ts')
    process.exit(1)
  }

  let anyMissing = false

  for (const lang of TARGET_LANGS) {
    const langFile = path.join(LOCALES_DIR, `${lang.code}.ts`)
    if (!fs.existsSync(langFile)) {
      console.warn(`⚠️ Archivo faltante: ${langFile}`)
      anyMissing = true
      continue
    }

    const langUrl = pathToFileURL(langFile).href
    const mod = await import(langUrl)
    const targetDict = mod[lang.code] || mod.default

    const missing = findMissingKeys(es, targetDict)
    const missingCount = Object.keys(missing).length

    if (missingCount === 0) {
      console.log(`✅ [${lang.code}] ${lang.name}: 100% Completo y sincronizado.`)
      continue
    }

    anyMissing = true
    console.log(`⚠️ [${lang.code}] ${lang.name}: Se detectaron claves faltantes o pendientes en:`, Object.keys(missing))

    if (!isCheckMode) {
      if (!apiKey) {
        console.log(`ℹ️ [${lang.code}] Para auto-traducir con IA, configura GEMINI_API_KEY en tu archivo .env.local (obtenla gratis en https://aistudio.google.com).`)
      } else {
        console.log(`🤖 [${lang.code}] Solicitando traducción automática a Gemini API...`)
        const translated = await callGemini(apiKey, lang.name, missing, availableModels)
        if (translated) {
          const merged = deepMerge(targetDict, translated)
          const fileContent = `import type { TranslationSchema } from './es'\n\nexport const ${lang.code}: TranslationSchema = ${JSON.stringify(merged, null, 2)}\n\nexport default ${lang.code}\n`
          fs.writeFileSync(langFile, fileContent, 'utf8')
          console.log(`✨ [${lang.code}] Archivo src/locales/${lang.code}.ts actualizado con éxito.`)
        }
      }
    }
  }

  if (isCheckMode && anyMissing) {
    console.error('\n❌ Verificación fallida: Existen diccionarios incompletos.')
    process.exit(1)
  }

  console.log('\n🎉 [i18n-sync] Proceso completado exitosamente.')
}

main().catch(err => {
  console.error('Fatal error in i18n-sync:', err)
  process.exit(1)
})
