import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { dafoProposalRequestSchema } from '@/features/novai/schema'
import { generateDafoProposal } from '@/features/novai/service'
import { toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = dafoProposalRequestSchema.parse(body)

    const result = await generateDafoProposal({
      principal,
      state: parsed.state,
      locale: parsed.locale
    })

    return Response.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
