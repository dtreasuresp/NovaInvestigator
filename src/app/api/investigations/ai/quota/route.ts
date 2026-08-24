import { NextResponse } from 'next/server'
import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { getAiQuotaInfo } from '@/features/novai/service'
import { toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const principal = await requireInvestigationsPrincipal()
    const quota = await getAiQuotaInfo(principal)

    return NextResponse.json(quota)
  } catch (error) {
    return toErrorResponse(error)
  }
}
