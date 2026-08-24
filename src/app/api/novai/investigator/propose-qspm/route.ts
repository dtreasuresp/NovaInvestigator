import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { qspmProposalRequestSchema } from '@/features/novai/schema'
import { generateQspmProposal } from '@/features/novai/service'
import { toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = qspmProposalRequestSchema.parse(body)

    const result = await generateQspmProposal({
      principal,
      state: parsed.state,
      proposeStrategiesIfEmpty: parsed.proposeStrategiesIfEmpty,
      locale: parsed.locale
    })

    return Response.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
