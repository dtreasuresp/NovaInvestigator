// GET /api/billing/plans — public catalog of active plans (no auth
// required: the pricing page must be visible before any session exists).
import { NextRequest, NextResponse } from 'next/server'

import { asBillingClient } from '@/features/billing/db-types'
import { toErrorResponse } from '@/features/billing/http'
import { listPlans, listPlatformModules } from '@/features/billing/service'
import { localizeBillingPlans } from '@/features/billing/translation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const localeParam = url.searchParams.get('locale')
    const localeCookie = request.cookies.get('NEXT_LOCALE')?.value || request.cookies.get('novastore_locale')?.value
    const localeHeader = request.headers.get('x-locale') || request.headers.get('accept-language')
    const targetLocale = localeParam || localeCookie || localeHeader || 'es'

    const client = asBillingClient(await createSupabaseServerClient())
    const [rawPlans, modules] = await Promise.all([
      listPlans(client),
      listPlatformModules(client)
    ])

    const plans = await localizeBillingPlans(rawPlans, targetLocale)

    return NextResponse.json({ plans, modules })
  } catch (error) {
    return toErrorResponse(error)
  }
}
