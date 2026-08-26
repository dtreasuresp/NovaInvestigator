import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { BillingPlan } from '@/lib/billing/types'

// Cache to prevent duplicate Gemini API calls for identical plan content
const translationCache = new Map<string, { name: string; description: string | null }>()

// Mapping of standard plan codes to localization keys
const STANDARD_PLAN_MAP: Record<string, { nameKey: string; descKey: string }> = {
  trial: { nameKey: 'planTrialName', descKey: 'planTrialDesc' },
  free: { nameKey: 'planTrialName', descKey: 'planTrialDesc' },
  one_time: { nameKey: 'planOnetimeName', descKey: 'planOnetimeDesc' },
  onetime: { nameKey: 'planOnetimeName', descKey: 'planOnetimeDesc' },
  one_time_access: { nameKey: 'planOnetimeName', descKey: 'planOnetimeDesc' },
  basic: { nameKey: 'planIndividualName', descKey: 'planIndividualDesc' },
  individual: { nameKey: 'planIndividualName', descKey: 'planIndividualDesc' },
  team: { nameKey: 'planTeamName', descKey: 'planTeamDesc' },
  pro: { nameKey: 'planProName', descKey: 'planProDesc' },
  enterprise: { nameKey: 'planProName', descKey: 'planProDesc' },
  lifetime: { nameKey: 'planLifetimeName', descKey: 'planLifetimeDesc' }
}

const LOCALE_NAME_MAP: Record<string, string> = {
  en: 'English',
  de: 'German',
  pt: 'Portuguese',
  ko: 'Korean',
  es: 'Spanish'
}

/**
 * Calls Google Gemini API in the backend to translate custom/dynamic plan content.
 */
async function callGeminiTranslatePlan(
  name: string,
  description: string | null,
  targetLangName: string
): Promise<{ name: string; description: string | null } | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const prompt = `You are an expert translator for Enterprise ERP & SaaS software.
Translate the following software subscription plan name and description into ${targetLangName}.
Keep technical terms clear and concise. Return ONLY a valid JSON object with keys "name" and "description".

Input:
{
  "name": ${JSON.stringify(name)},
  "description": ${JSON.stringify(description || '')}
}`

  const candidateModels = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest'
  ]

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
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
          const parsed = JSON.parse(rawText) as { name?: string; description?: string }
          return {
            name: parsed.name || name,
            description: parsed.description || description
          }
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  return null
}

/**
 * Localizes a single BillingPlan for a target locale.
 * First checks standard catalog translations; if custom, calls Gemini AI backend hook with caching.
 */
export async function localizeBillingPlan(
  plan: BillingPlan,
  targetLocale: string
): Promise<BillingPlan> {
  const normLocale = targetLocale.toLowerCase().slice(0, 2)
  if (normLocale === 'es') {
    return plan
  }

  // 1. Check standard plan catalog
  const standardKey = STANDARD_PLAN_MAP[plan.code.toLowerCase()]
  if (standardKey) {
    try {
      const localePath = path.resolve(process.cwd(), `src/locales/${normLocale}.ts`)
      if (fs.existsSync(localePath)) {
        const mod = await import(pathToFileURL(localePath).href)
        const dict = mod[normLocale] || mod.default
        const pricingDict = dict?.pricingPage
        if (pricingDict) {
          const localizedName = pricingDict[standardKey.nameKey]
          const localizedDesc = pricingDict[standardKey.descKey]
          if (localizedName && localizedDesc) {
            return {
              ...plan,
              name: localizedName,
              description: localizedDesc
            }
          }
        }
      }
    } catch {
      // Fallback to dynamic translation
    }
  }

  // 2. For custom or unmapped plans, use backend AI translation with caching
  const cacheKey = `${normLocale}:${plan.name}:${plan.description || ''}`
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey)!
    return {
      ...plan,
      name: cached.name,
      description: cached.description
    }
  }

  const langName = LOCALE_NAME_MAP[normLocale] || normLocale
  const translated = await callGeminiTranslatePlan(plan.name, plan.description, langName)

  if (translated) {
    translationCache.set(cacheKey, translated)
    return {
      ...plan,
      name: translated.name,
      description: translated.description
    }
  }

  return plan
}

/**
 * Localizes an entire list of BillingPlans for the given target locale.
 */
export async function localizeBillingPlans(
  plans: BillingPlan[],
  targetLocale: string
): Promise<BillingPlan[]> {
  if (!targetLocale || targetLocale.startsWith('es')) {
    return plans
  }

  return Promise.all(plans.map(plan => localizeBillingPlan(plan, targetLocale)))
}
