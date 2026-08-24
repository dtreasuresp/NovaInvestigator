// GET /api/admin/users/invitations — pending tenant invitations (users.read)
//
// The token hash is deliberately excluded from the repository projection.
// Acceptance links are single-use secrets and must never be exposed by a
// listing endpoint.
import { NextResponse } from 'next/server'

import { listTenantInvitations } from '@/features/users/service'
import { listInvitationsQuerySchema } from '@/features/users/schema'
import { parseQuery, toErrorResponse } from '@/features/users/http'

export async function GET(request: Request) {
  try {
    const query = parseQuery(request, listInvitationsQuerySchema)
    const result = await listTenantInvitations(query)

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
